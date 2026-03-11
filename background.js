// ===== ExVideo Background Service Worker =====

// Mở side panel khi click icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ===== Message Relay =====
// Relay messages giữa sidepanel ↔ content scripts

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // Sidepanel yêu cầu extract data từ trang TikTok đang mở
  if (request.type === 'GET_TIKTOK_PAGE_DATA') {
    getTikTokPageData(request.url)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  // Sidepanel yêu cầu gọi TikTok Internal API
  if (request.type === 'FETCH_TIKTOK_API') {
    fetchTikTokInternalAPI(request.videoId)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // FAB trên trang TikTok gửi URL để thêm vào side panel
  if (request.type === 'EXVIDEO_ADD_URL') {
    // Broadcast đến tất cả extension views (side panel)
    chrome.runtime.sendMessage({
      type: 'SIDEPANEL_ADD_URL',
      url: request.url
    }).catch(() => {}); // Side panel có thể chưa mở
    sendResponse({ success: true });
    return false;
  }

  // Side panel yêu cầu URL tab đang active
  if (request.type === 'GET_CURRENT_TAB_URL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        sendResponse({ success: true, url: tabs[0].url });
      } else {
        sendResponse({ success: false });
      }
    });
    return true;
  }
});

/**
 * Tìm tab TikTok đang mở và gửi message để extract video data
 */
async function getTikTokPageData(targetUrl) {
  const tabs = await chrome.tabs.query({ url: '*://*.tiktok.com/*' });
  
  if (tabs.length === 0) {
    throw new Error('Không tìm thấy tab TikTok nào đang mở');
  }

  // Thử inject content script vào tab TikTok (nếu chưa inject)
  for (const tab of tabs) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (e) {
      // Content script đã inject rồi, bỏ qua
    }
  }

  // Gửi message đến tất cả tabs TikTok
  for (const tab of tabs) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_VIDEO_BY_URL',
        url: targetUrl
      });
      
      if (response && response.success && response.data) {
        return response.data;
      }
    } catch (e) {
      // Tab không respond, thử tab tiếp
      continue;
    }
  }

  throw new Error('Không thể extract data từ trang TikTok');
}

/**
 * Gọi TikTok Internal API để lấy video detail
 * Sử dụng cookies tự động từ browser context
 */
async function fetchTikTokInternalAPI(videoId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://www.tiktok.com/api/item/detail/?itemId=${videoId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://www.tiktok.com/',
        },
        credentials: 'include', // Gửi cookies user
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`TikTok API trả về ${response.status}`);
    }

    const data = await response.json();
    
    if (data.statusCode !== 0 && data.status_code !== 0) {
      throw new Error('TikTok API không trả về dữ liệu hợp lệ');
    }

    const itemStruct = data.itemInfo?.itemStruct || data.item_info?.item_struct;
    if (!itemStruct || !itemStruct.video) {
      throw new Error('Không tìm thấy video data trong response');
    }

    const video = itemStruct.video;
    const bitrateInfo = video.bitrateInfo || [];

    // Sort theo bitrate giảm dần
    const sortedBitrates = [...bitrateInfo].sort((a, b) => {
      return (b.Bitrate || b.bitrate || 0) - (a.Bitrate || a.bitrate || 0);
    });

    const qualityLevels = sortedBitrates.map(br => ({
      bitrate: br.Bitrate || br.bitrate || 0,
      qualityType: br.QualityType || br.qualityType || 0,
      url: extractUrl(br.PlayAddr || br.playAddr),
      width: (br.PlayAddr || br.playAddr)?.Width || 0,
      height: (br.PlayAddr || br.playAddr)?.Height || 0,
    })).filter(q => q.url);

    return {
      videoId: itemStruct.id || videoId,
      author: itemStruct.author?.uniqueId || '',
      title: itemStruct.desc || '',
      qualityLevels: qualityLevels,
      bestUrl: qualityLevels.length > 0 ? qualityLevels[0].url : extractUrl(video.playAddr),
      bestBitrate: qualityLevels.length > 0 ? qualityLevels[0].bitrate : 0,
      width: video.width || 0,
      height: video.height || 0,
      duration: video.duration || 0,
      source: 'tiktok_api',
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function extractUrl(addr) {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (addr.UrlList && addr.UrlList.length > 0) return addr.UrlList[0];
  if (addr.urlList && addr.urlList.length > 0) return addr.urlList[0];
  if (addr.url_list && addr.url_list.length > 0) return addr.url_list[0];
  return '';
}
