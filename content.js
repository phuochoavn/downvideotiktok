// ===== ExVideo Content Script =====
// Inject vào trang tiktok.com để extract video data từ page JSON

(function() {
  'use strict';

  // Lắng nghe message từ background/sidepanel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'EXTRACT_VIDEO_DATA') {
      const data = extractVideoData();
      sendResponse({ success: !!data, data: data });
    }
    if (request.type === 'EXTRACT_VIDEO_BY_URL') {
      const data = extractVideoDataByUrl(request.url);
      sendResponse({ success: !!data, data: data });
    }
    return true; // keep channel open for async
  });

  /**
   * Extract video data từ __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON trong page
   * Returns: { videoId, playAddr, downloadAddr, bitrateInfo, width, height, duration }
   */
  function extractVideoData() {
    try {
      // Cách 1: Tìm script tag chứa UNIVERSAL_DATA
      const scriptTag = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
      if (scriptTag) {
        const json = JSON.parse(scriptTag.textContent);
        return parseUniversalData(json);
      }

      // Cách 2: Tìm script tag chứa SIGI_STATE (cấu trúc cũ hơn)
      const sigiScript = document.getElementById('SIGI_STATE');
      if (sigiScript) {
        const json = JSON.parse(sigiScript.textContent);
        return parseSigiState(json);
      }

      // Cách 3: Scan tất cả script tag tìm video data
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        if (text.includes('playAddr') && text.includes('bitrateInfo')) {
          // Tìm JSON object chứa video data
          const match = text.match(/\{[^{}]*"playAddr"[^{}]*"bitrateInfo"[^}]*\}/);
          if (match) {
            try {
              const json = JSON.parse(match[0]);
              return extractFromVideoObject(json);
            } catch (e) { /* continue */ }
          }
        }
      }

      return null;
    } catch (err) {
      console.error('[ExVideo] Error extracting video data:', err);
      return null;
    }
  }

  /**
   * Extract video data cho một URL cụ thể (tìm trong page data)
   */
  function extractVideoDataByUrl(targetUrl) {
    try {
      // Extract video ID từ URL
      const videoIdMatch = targetUrl.match(/video\/(\d+)/);
      if (!videoIdMatch) return extractVideoData(); // fallback

      const targetVideoId = videoIdMatch[1];

      const scriptTag = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
      if (scriptTag) {
        const json = JSON.parse(scriptTag.textContent);
        return parseUniversalDataById(json, targetVideoId);
      }

      return extractVideoData(); // fallback
    } catch (err) {
      console.error('[ExVideo] Error extracting by URL:', err);
      return null;
    }
  }

  // ===== Parse Functions =====

  function parseUniversalData(json) {
    try {
      // Navigate qua các cấu trúc JSON đã biết
      const defaultScope = json['__DEFAULT_SCOPE__'];
      if (!defaultScope) return null;

      // TikTok dùng nhiều key khác nhau
      const videoDetail = defaultScope['webapp.video-detail']
        || defaultScope['webapp.video.detail'];
      
      if (!videoDetail) return null;

      const itemStruct = videoDetail.itemInfo?.itemStruct 
        || videoDetail.itemStruct;
      
      if (!itemStruct) return null;

      return extractFromItemStruct(itemStruct);
    } catch (err) {
      console.error('[ExVideo] Parse universal data error:', err);
      return null;
    }
  }

  function parseUniversalDataById(json, videoId) {
    // Tìm video cụ thể theo ID trong data
    try {
      const result = parseUniversalData(json);
      if (result && result.videoId === videoId) return result;

      // Scan deeper
      const str = JSON.stringify(json);
      if (str.includes(videoId)) {
        return parseUniversalData(json); // Nếu page đang xem đúng video
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  function parseSigiState(json) {
    try {
      const itemModule = json.ItemModule;
      if (!itemModule) return null;

      // Lấy video đầu tiên
      const firstKey = Object.keys(itemModule)[0];
      if (!firstKey) return null;

      return extractFromItemStruct(itemModule[firstKey]);
    } catch (err) {
      return null;
    }
  }

  function extractFromItemStruct(item) {
    if (!item || !item.video) return null;

    const video = item.video;
    const bitrateInfo = video.bitrateInfo || [];

    // Sort bitrateInfo theo bitrate giảm dần
    const sortedBitrates = [...bitrateInfo].sort((a, b) => {
      return (b.Bitrate || b.bitrate || 0) - (a.Bitrate || a.bitrate || 0);
    });

    // Lấy tất cả quality levels
    const qualityLevels = sortedBitrates.map(br => ({
      bitrate: br.Bitrate || br.bitrate || 0,
      qualityType: br.QualityType || br.qualityType || 0,
      url: extractUrl(br.PlayAddr || br.playAddr),
      width: (br.PlayAddr || br.playAddr)?.Width || (br.PlayAddr || br.playAddr)?.width || 0,
      height: (br.PlayAddr || br.playAddr)?.Height || (br.PlayAddr || br.playAddr)?.height || 0,
    })).filter(q => q.url);

    return {
      videoId: item.id || '',
      author: item.author?.uniqueId || item.author?.unique_id || '',
      title: item.desc || '',
      playAddr: extractUrl(video.playAddr),
      downloadAddr: extractUrl(video.downloadAddr),
      qualityLevels: qualityLevels,
      bestUrl: qualityLevels.length > 0 ? qualityLevels[0].url : extractUrl(video.playAddr),
      bestBitrate: qualityLevels.length > 0 ? qualityLevels[0].bitrate : 0,
      bestWidth: qualityLevels.length > 0 ? qualityLevels[0].width : (video.width || 0),
      bestHeight: qualityLevels.length > 0 ? qualityLevels[0].height : (video.height || 0),
      width: video.width || 0,
      height: video.height || 0,
      duration: video.duration || 0,
      source: 'page_parse',
    };
  }

  function extractFromVideoObject(obj) {
    return {
      videoId: '',
      playAddr: extractUrl(obj.playAddr),
      downloadAddr: extractUrl(obj.downloadAddr),
      qualityLevels: [],
      bestUrl: extractUrl(obj.downloadAddr) || extractUrl(obj.playAddr),
      bestBitrate: 0,
      source: 'page_scan',
    };
  }

  /**
   * TikTok URLs có thể là string hoặc object { UrlList: [...] }
   */
  function extractUrl(addr) {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    if (addr.UrlList && addr.UrlList.length > 0) return addr.UrlList[0];
    if (addr.urlList && addr.urlList.length > 0) return addr.urlList[0];
    if (addr.url_list && addr.url_list.length > 0) return addr.url_list[0];
    return '';
  }

})();
