// ===== DOM Elements =====
const urlTextarea = document.getElementById('urlTextarea');
const pasteBtn = document.getElementById('pasteBtn');
const fetchBtn = document.getElementById('fetchBtn');
const importBtn = document.getElementById('importBtn');
const fileInput = document.getElementById('fileInput');
const statusMsg = document.getElementById('statusMsg');
const queueSection = document.getElementById('queueSection');
const queueList = document.getElementById('queueList');
const queueCounter = document.getElementById('queueCounter');
const clearQueueBtn = document.getElementById('clearQueueBtn');
const downloadAllBest = document.getElementById('downloadAllBest');
const downloadBtnLabel = document.getElementById('downloadBtnLabel');
const autoDownloadToggle = document.getElementById('autoDownload');
const retryBtn = document.getElementById('retryBtn');
const qualitySelect = document.getElementById('qualitySelect');

// ===== State =====
/** @type {Array<{url: string, status: 'pending'|'fetching'|'ready'|'downloading'|'done'|'error'|'skipped', data: object|null, cascadeData: object|null, error: string|null}>} */
let queue = [];
let autoDebounceTimer = null;
/** @type {Set<string>} URLs đã tải thành công (persistent) */
let downloadHistory = new Set();

// ===== Download History (chrome.storage.local) =====
async function loadHistory() {
  return new Promise((resolve) => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['downloadHistory'], (result) => {
        if (result.downloadHistory && Array.isArray(result.downloadHistory)) {
          downloadHistory = new Set(result.downloadHistory);
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function saveHistory() {
  if (chrome.storage && chrome.storage.local) {
    // Giữ tối đa 2000 link gần nhất
    const arr = [...downloadHistory].slice(-2000);
    chrome.storage.local.set({ downloadHistory: arr });
  }
}

function isAlreadyDownloaded(url) {
  return downloadHistory.has(url);
}

function markAsDownloaded(url) {
  downloadHistory.add(url);
}

// ===== Utils =====
function isValidTikTokUrl(url) {
  return /tiktok\.com/i.test(url) || /vm\.tiktok\.com/i.test(url);
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

function showStatus(message, type = 'error') {
  statusMsg.textContent = message;
  statusMsg.className = `status-msg ${type}`;
  statusMsg.classList.remove('hidden');
}

function hideStatus() {
  statusMsg.classList.add('hidden');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Parse URLs =====
function parseUrlsFromText(text) {
  const lines = text.split(/[\n\r]+/);
  const urls = [];
  const seen = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Trích xuất URL từ dòng (có thể chứa text khác)
    const urlMatch = trimmed.match(/https?:\/\/[^\s,;"'<>]+tiktok[^\s,;"'<>]*/i);
    const url = urlMatch ? urlMatch[0] : trimmed;

    if (isValidTikTokUrl(url) && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

function parseUrlsFromExcel(workbook) {
  const urls = [];
  const seen = new Set();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    for (const row of data) {
      for (const cell of row) {
        if (typeof cell !== 'string') continue;
        const trimmed = cell.trim();
        if (isValidTikTokUrl(trimmed) && !seen.has(trimmed)) {
          seen.add(trimmed);
          urls.push(trimmed);
        }
      }
    }
  }
  return urls;
}

// ===== API: TikWM =====
async function fetchVideoInfo(url) {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  });

  if (!response.ok) {
    throw new Error(`API lỗi: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.msg || 'Không thể xử lý video này');
  }

  return data.data;
}

// ===== Cascade Engine =====
// Thử lấy video data từ nhiều nguồn, chọn URL có bitrate cao nhất
async function fetchCascadeData(url) {
  const results = { tikwm: null, pageParse: null, tiktokApi: null };

  // Tiếp cận 1: Parse trang TikTok (đang mở)
  try {
    if (chrome.runtime && chrome.runtime.sendMessage) {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'GET_TIKTOK_PAGE_DATA', url },
          (resp) => resolve(resp)
        );
      });
      if (response && response.success && response.data) {
        results.pageParse = response.data;
      }
    }
  } catch (e) { /* Page parse không khả dụng */ }

  // Tiếp cận 2: TikTok Internal API
  const selectedQuality = qualitySelect ? qualitySelect.value : 'hd';
  if (selectedQuality === 'best' || selectedQuality === '1080') {
    try {
      const videoIdMatch = url.match(/video\/(\d+)/);
      if (videoIdMatch && chrome.runtime && chrome.runtime.sendMessage) {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'FETCH_TIKTOK_API', videoId: videoIdMatch[1] },
            (resp) => resolve(resp)
          );
        });
        if (response && response.success && response.data) {
          results.tiktokApi = response.data;
        }
      }
    } catch (e) { /* Internal API không khả dụng */ }
  }

  return results;
}

/**
 * Chọn URL tốt nhất dựa trên quality preference và cascade data
 */
function getBestDownloadUrl(tikwmData, cascadeData, quality) {
  const candidates = [];

  // TikWM candidates
  if (tikwmData) {
    if (tikwmData.hdplay) {
      candidates.push({ url: tikwmData.hdplay, bitrate: 2000000, source: 'tikwm_hd' });
    }
    if (tikwmData.play) {
      candidates.push({ url: tikwmData.play, bitrate: 1000000, source: 'tikwm_sd' });
    }
  }

  // Page parse candidates
  if (cascadeData && cascadeData.pageParse) {
    const pp = cascadeData.pageParse;
    if (pp.qualityLevels && pp.qualityLevels.length > 0) {
      for (const ql of pp.qualityLevels) {
        if (ql.url) {
          candidates.push({ url: ql.url, bitrate: ql.bitrate || 0, source: 'page_parse', width: ql.width, height: ql.height });
        }
      }
    } else if (pp.bestUrl) {
      candidates.push({ url: pp.bestUrl, bitrate: pp.bestBitrate || 3000000, source: 'page_parse' });
    }
  }

  // TikTok API candidates
  if (cascadeData && cascadeData.tiktokApi) {
    const api = cascadeData.tiktokApi;
    if (api.qualityLevels && api.qualityLevels.length > 0) {
      for (const ql of api.qualityLevels) {
        if (ql.url) {
          candidates.push({ url: ql.url, bitrate: ql.bitrate || 0, source: 'tiktok_api', width: ql.width, height: ql.height });
        }
      }
    } else if (api.bestUrl) {
      candidates.push({ url: api.bestUrl, bitrate: api.bestBitrate || 3000000, source: 'tiktok_api' });
    }
  }

  if (candidates.length === 0) return null;

  // Filter theo quality preference
  let filtered = candidates;
  if (quality === 'sd') {
    // Chọn bitrate thấp nhất
    filtered.sort((a, b) => a.bitrate - b.bitrate);
    return filtered[0];
  } else if (quality === 'hd') {
    // Chọn TikWM HD hoặc tương đương
    const tikwmHd = filtered.find(c => c.source === 'tikwm_hd');
    return tikwmHd || filtered.sort((a, b) => b.bitrate - a.bitrate)[0];
  } else {
    // 'best' hoặc '1080': chọn bitrate cao nhất
    filtered.sort((a, b) => b.bitrate - a.bitrate);
    return filtered[0];
  }
}

function getQualityLabel(quality) {
  const labels = { best: 'Cao nhất', '1080': '1080p', hd: 'HD', sd: 'SD' };
  return labels[quality] || 'HD';
}

function updateDownloadBtnLabel() {
  if (downloadBtnLabel && qualitySelect) {
    downloadBtnLabel.textContent = `Tải tất cả (${getQualityLabel(qualitySelect.value)})`;
  }
}

// ===== Download =====
function triggerDownload(url, filename) {
  return new Promise((resolve) => {
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download error:', chrome.runtime.lastError);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

function getFilename(data, quality) {
  const authorName = (data.author?.unique_id || data.author?.nickname || 'tiktok')
    .replace(/[^a-zA-Z0-9_.\-]/g, '_');
  const videoId = data.id || Date.now();
  const suffixMap = { best: '_BEST', '1080': '_1080p', hd: '_HD', sd: '_SD' };
  const suffix = suffixMap[quality] || '_HD';
  return `TikTok/${authorName}_${videoId}${suffix}.mp4`;
}

// ===== Queue Management =====
function addToQueue(urls) {
  const existingUrls = new Set(queue.map(q => q.url));
  let added = 0;
  let skipped = 0;

  for (const url of urls) {
    if (existingUrls.has(url)) continue;

    if (isAlreadyDownloaded(url)) {
      queue.push({ url, status: 'skipped', data: null, cascadeData: null, error: null });
      existingUrls.add(url);
      skipped++;
    } else {
      queue.push({ url, status: 'pending', data: null, cascadeData: null, error: null });
      existingUrls.add(url);
      added++;
    }
  }
  return { added, skipped };
}

function renderQueue() {
  if (queue.length === 0) {
    queueSection.classList.add('hidden');
    downloadAllHD.disabled = true;
    downloadAllSD.disabled = true;
    return;
  }

  queueSection.classList.remove('hidden');
  queueList.innerHTML = '';

  const doneCount = queue.filter(q => q.status === 'done' || q.status === 'skipped').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  queueCounter.textContent = `${doneCount}/${queue.length}`;

  const hasReadyItems = queue.some(q => q.status === 'ready');
  if (downloadAllBest) downloadAllBest.disabled = !hasReadyItems;

  // Hiện nút Retry nếu có link lỗi
  const hasErrors = queue.some(q => q.status === 'error');
  retryBtn.classList.toggle('hidden', !hasErrors);

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const el = document.createElement('div');
    el.className = `queue-item ${item.status}`;

    // Thumbnail or placeholder
    let thumbHtml;
    if (item.data) {
      const thumbUrl = item.data.origin_cover || item.data.cover || '';
      thumbHtml = `<img class="qi-thumb" src="${thumbUrl}" alt="">`;
    } else {
      thumbHtml = `<div class="qi-placeholder">${i + 1}</div>`;
    }

    // Info
    let infoHtml;
    if (item.data) {
      const author = `@${item.data.author?.unique_id || item.data.author?.nickname || 'unknown'}`;
      const title = item.data.title || 'Không có mô tả';
      infoHtml = `
        <div class="qi-info">
          <div class="qi-author">${escapeHtml(author)}</div>
          <div class="qi-title">${escapeHtml(title)}</div>
        </div>`;
    } else {
      const shortUrl = item.url.length > 45 ? item.url.substring(0, 45) + '...' : item.url;
      infoHtml = `
        <div class="qi-info">
          <div class="qi-url">${escapeHtml(shortUrl)}</div>
          ${item.error ? `<div class="qi-title" style="color:#fca5a5">${escapeHtml(item.error)}</div>` : ''}
        </div>`;
    }

    // Status icon
    const statusIcons = {
      pending: '⏳',
      fetching: '🔄',
      ready: '✅',
      downloading: '⬇️',
      done: '✓',
      error: '❌',
      skipped: '⏭️',
    };
    const statusIcon = statusIcons[item.status] || '⏳';
    const statusStyle = item.status === 'done' ? 'color:#22c55e' : (item.status === 'skipped' ? 'color:#71717a' : '');

    el.innerHTML = `${thumbHtml}${infoHtml}<div class="qi-status" style="${statusStyle}">${statusIcon}</div>`;
    queueList.appendChild(el);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Batch Fetch =====
async function fetchAllVideoInfo() {
  const pendingItems = queue.filter(q => q.status === 'pending');
  if (pendingItems.length === 0) return;

  const btnText = fetchBtn.querySelector('.btn-text');
  const spinner = fetchBtn.querySelector('.spinner');
  btnText.textContent = 'Đang xử lý...';
  spinner.classList.remove('hidden');
  fetchBtn.disabled = true;
  urlTextarea.disabled = true;

  let successCount = 0;
  let errorCount = 0;

  for (const item of pendingItems) {
    item.status = 'fetching';
    renderQueue();

    try {
      item.data = await fetchVideoInfo(item.url);
      item.status = 'ready';
      successCount++;

      // Cascade: lấy thêm data từ page/API (không block)
      const selectedQuality = qualitySelect ? qualitySelect.value : 'hd';
      if (selectedQuality === 'best' || selectedQuality === '1080') {
        try {
          item.cascadeData = await fetchCascadeData(item.url);
        } catch (e) { /* cascade fail = ok, có TikWM rồi */ }
      }
    } catch (err) {
      item.status = 'error';
      item.error = err.message || 'Lỗi không xác định';
      errorCount++;
    }

    renderQueue();

    // Rate-limit delay giữa các request
    await sleep(500);
  }

  // Auto-download nếu toggle bật
  if (autoDownloadToggle.checked && successCount > 0) {
    const quality = qualitySelect ? qualitySelect.value : 'hd';
    await downloadAll(quality);
  }

  // Reset UI
  btnText.textContent = 'Lấy Video';
  spinner.classList.add('hidden');
  fetchBtn.disabled = !urlTextarea.value.trim();
  urlTextarea.disabled = false;

  // Status summary
  if (errorCount === 0) {
    showStatus(`✓ Lấy thành công ${successCount} video`, 'success');
  } else {
    showStatus(`${successCount} thành công, ${errorCount} lỗi`, errorCount > 0 ? 'error' : 'success');
  }
}

// ===== Batch Download =====
async function downloadAll(quality) {
  const readyItems = queue.filter(q => q.status === 'ready');
  if (readyItems.length === 0) return;

  if (downloadAllBest) downloadAllBest.disabled = true;

  let successCount = 0;

  for (const item of readyItems) {
    if (!item.data) continue;

    item.status = 'downloading';
    renderQueue();

    // Dùng cascade engine để chọn URL tốt nhất
    const best = getBestDownloadUrl(item.data, item.cascadeData, quality);
    
    let url;
    if (best && best.url) {
      url = best.url;
    } else {
      // Fallback về TikWM
      url = quality === 'sd' ? item.data.play : (item.data.hdplay || item.data.play);
    }

    if (!url) {
      item.status = 'error';
      item.error = 'Không tìm thấy link video';
      renderQueue();
      continue;
    }

    const fullUrl = url.startsWith('http') ? url : `https://www.tikwm.com${url}`;
    const filename = getFilename(item.data, quality);

    const ok = await triggerDownload(fullUrl, filename);
    if (ok) {
      item.status = 'done';
      markAsDownloaded(item.url);
      successCount++;
    } else {
      item.status = 'error';
      item.error = 'Lỗi tải xuống';
    }
    renderQueue();

    // Delay giữa các download
    await sleep(300);
  }

  // Lưu history
  await saveHistory();

  // Rà soát: còn link lỗi không?
  const failedCount = queue.filter(q => q.status === 'error').length;
  if (failedCount > 0) {
    showStatus(`✓ Đã tải ${successCount}/${readyItems.length} video — ${failedCount} link lỗi (bấm Thử lại)`, 'info');
  } else {
    showStatus(`✓ Đã tải ${successCount}/${readyItems.length} video`, 'success');
  }
}

// ===== Retry Failed =====
async function retryFailed() {
  const failedItems = queue.filter(q => q.status === 'error');
  if (failedItems.length === 0) {
    showStatus('Không có link lỗi nào cần thử lại', 'info');
    return;
  }

  // Reset failed items về pending
  for (const item of failedItems) {
    item.status = 'pending';
    item.error = null;
    item.data = null;
  }
  renderQueue();
  showStatus(`🔄 Đang thử lại ${failedItems.length} link...`, 'info');
  await fetchAllVideoInfo();
}

// ===== Auto-format URLs =====
function autoFormatUrls(rawText) {
  // Chỉ lấy link TikTok, bỏ hết text khác
  const matches = rawText.match(/https?:\/\/[^\s,;"'<>]*tiktok[^\s,;"'<>]*/gi);
  if (!matches || matches.length === 0) return '';

  // Loại duplicate, mỗi link 1 dòng
  const unique = [...new Set(matches)];
  return unique.join('\n');
}

// ===== Event Listeners =====

// Paste trực tiếp vào textarea — auto-format chỉ lấy link TikTok
urlTextarea.addEventListener('paste', (e) => {
  e.preventDefault();
  const rawText = e.clipboardData.getData('text');
  const formatted = autoFormatUrls(rawText);

  if (!formatted) {
    showStatus('Không tìm thấy link TikTok trong clipboard', 'error');
    return;
  }

  if (urlTextarea.value.trim()) {
    urlTextarea.value = urlTextarea.value.trimEnd() + '\n' + formatted;
  } else {
    urlTextarea.value = formatted;
  }
  urlTextarea.dispatchEvent(new Event('input'));
});

// Paste button — focus textarea rồi paste bằng execCommand (hoạt động trong Side Panel)
pasteBtn.addEventListener('click', () => {
  urlTextarea.focus();
  // execCommand('paste') sẽ trigger sự kiện 'paste' ở trên → auto-format
  const ok = document.execCommand('paste');
  if (!ok) {
    showStatus('Hãy dán trực tiếp bằng Ctrl+V vào ô nhập link', 'info');
  }
});

// Textarea input validation + auto-download debounce
urlTextarea.addEventListener('input', () => {
  const val = urlTextarea.value.trim();
  fetchBtn.disabled = !val;
  hideStatus();

  // Auto-download: debounce 1.5s sau khi ngừng gõ/paste
  if (autoDownloadToggle.checked && val) {
    clearTimeout(autoDebounceTimer);
    autoDebounceTimer = setTimeout(() => {
      fetchBtn.click();
    }, 1500);
  }
});

// Ctrl+Enter hoặc Enter submit
urlTextarea.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !fetchBtn.disabled) {
    fetchBtn.click();
  }
});

// Import button
importBtn.addEventListener('click', () => {
  fileInput.click();
});

// File input change
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  if (file.name.endsWith('.csv')) {
    reader.onload = (evt) => {
      const text = evt.target.result;
      const urls = parseUrlsFromText(text);
      processImportedUrls(urls, file.name);
    };
    reader.readAsText(file);
  } else {
    // Excel file
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const urls = parseUrlsFromExcel(workbook);
        processImportedUrls(urls, file.name);
      } catch (err) {
        showStatus(`Lỗi đọc file: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // Reset file input
  fileInput.value = '';
});

function processImportedUrls(urls, filename) {
  if (urls.length === 0) {
    showStatus(`Không tìm thấy link TikTok trong ${filename}`, 'error');
    return;
  }

  const { added, skipped } = addToQueue(urls);
  renderQueue();
  const parts = [`${added} mới`];
  if (skipped > 0) parts.push(`${skipped} đã tải`);
  showStatus(`✓ Tìm thấy ${urls.length} link từ ${filename} (${parts.join(', ')})`, 'success');

  // Tự động fill vào textarea
  urlTextarea.value = urls.join('\n');
  fetchBtn.disabled = false;
}

// Fetch button
fetchBtn.addEventListener('click', async () => {
  const text = urlTextarea.value.trim();
  if (!text) return;

  const urls = parseUrlsFromText(text);
  
  if (urls.length === 0) {
    showStatus('Không tìm thấy link TikTok hợp lệ', 'error');
    return;
  }

  hideStatus();
  const { added, skipped } = addToQueue(urls);
  
  if (added === 0 && queue.every(q => q.status !== 'pending')) {
    if (skipped > 0) {
      showStatus(`Tất cả ${skipped} link đã được tải trước đó ⏭️`, 'info');
    } else {
      showStatus('Tất cả link đã có trong danh sách', 'info');
    }
    renderQueue();
    return;
  }

  if (skipped > 0) {
    showStatus(`⏭️ Bỏ qua ${skipped} link đã tải — xử lý ${added} link mới`, 'info');
    await sleep(1000);
  }

  renderQueue();
  await fetchAllVideoInfo();
});

// Download all button
if (downloadAllBest) {
  downloadAllBest.addEventListener('click', () => {
    const quality = qualitySelect ? qualitySelect.value : 'hd';
    downloadAll(quality);
  });
}

// Quality selector change
if (qualitySelect) {
  qualitySelect.addEventListener('change', () => {
    updateDownloadBtnLabel();
  });
}

// Retry failed
retryBtn.addEventListener('click', () => retryFailed());

// Clear queue
clearQueueBtn.addEventListener('click', () => {
  queue = [];
  renderQueue();
  hideStatus();
  urlTextarea.value = '';
  fetchBtn.disabled = true;
});

// Close side panel (nút X)
const closeBtn = document.getElementById('closeBtn');
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    window.close();
  });
}

// ===== Init =====
(async () => {
  await loadHistory();
  updateDownloadBtnLabel();
  urlTextarea.focus();
})();
