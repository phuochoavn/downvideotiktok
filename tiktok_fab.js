/**
 * ExVideo v3.2 — TikTok Floating Download Button
 * Hiển thị nút tải nổi trên mỗi video TikTok.
 * Khi bấm: gửi URL video về side panel để tải.
 */

(function() {
  'use strict';

  // Tránh inject 2 lần
  if (window.__exvideo_tiktok_injected) return;
  window.__exvideo_tiktok_injected = true;

  // CSS cho floating button
  const style = document.createElement('style');
  style.textContent = `
    .exvideo-fab {
      position: absolute;
      bottom: 80px;
      right: 16px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #FF0050, #00F2EA);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      transition: transform 0.2s, opacity 0.2s;
      opacity: 0.85;
    }
    .exvideo-fab:hover {
      transform: scale(1.15);
      opacity: 1;
    }
    .exvideo-fab svg {
      width: 22px;
      height: 22px;
      fill: white;
    }
    .exvideo-fab.done {
      background: #22c55e;
      pointer-events: none;
    }
    .exvideo-fab.done svg {
      display: none;
    }
    .exvideo-fab.done::after {
      content: '✓';
      font-size: 20px;
      color: white;
    }
  `;
  document.head.appendChild(style);

  const DOWNLOAD_SVG = `<svg viewBox="0 0 24 24"><path d="M12 16l-6-6h4V4h4v6h4l-6 6z"/><path d="M4 18h16v2H4z"/></svg>`;

  // Tìm URL video từ container
  function getVideoUrl(container) {
    // 1. Tìm link trong container
    const link = container.querySelector('a[href*="/video/"]') 
              || container.querySelector('a[href*="/@"]');
    if (link) return link.href;

    // 2. Từ URL hiện tại (nếu đang ở trang video)
    if (window.location.pathname.includes('/video/')) {
      return window.location.href;
    }

    // 3. Kiểm tra feed item data
    const videoEl = container.querySelector('video');
    if (videoEl) {
      const src = videoEl.src || videoEl.querySelector('source')?.src;
      if (src) return window.location.href; // Dùng page URL
    }

    return null;
  }

  // Thêm nút vào video container
  function addFabToContainer(container) {
    if (container.querySelector('.exvideo-fab')) return; // Đã có

    const fab = document.createElement('button');
    fab.className = 'exvideo-fab';
    fab.innerHTML = DOWNLOAD_SVG;
    fab.title = 'Tải video này (ExVideo)';

    fab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const url = getVideoUrl(container) || window.location.href;
      
      // Gửi về side panel qua background
      chrome.runtime.sendMessage({
        type: 'EXVIDEO_ADD_URL',
        url: url
      }, (response) => {
        fab.classList.add('done');
        setTimeout(() => fab.classList.remove('done'), 3000);
      });
    });

    // Container cần position relative
    const cs = getComputedStyle(container);
    if (cs.position === 'static') {
      container.style.position = 'relative';
    }

    container.appendChild(fab);
  }

  // Quét video containers
  function scanForVideos() {
    // TikTok feed — mỗi video nằm trong một item container
    const selectors = [
      // Feed principal
      '[data-e2e="recommend-list-item-container"]',
      '[class*="DivItemContainerV2"]',
      '[class*="DivItemContainer"]',
      // Player wrapper khi xem full
      '[class*="DivBasicPlayerWrapper"]',
      // Video card
      '[class*="DivVideoCardContainer"]',
    ];

    for (const sel of selectors) {
      const items = document.querySelectorAll(sel);
      items.forEach(item => addFabToContainer(item));
    }

    // Fallback: nếu không tìm được container, thêm vào body (trang /video/)
    if (window.location.pathname.includes('/video/') && !document.querySelector('.exvideo-fab')) {
      const player = document.querySelector('[class*="PlayerContainer"]') 
                  || document.querySelector('[class*="VideoPlayer"]')
                  || document.querySelector('video')?.closest('div[class*="Video"]');
      if (player) addFabToContainer(player);
    }
  }

  // MutationObserver — phát hiện video mới khi scroll
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      // Debounce
      clearTimeout(window.__exvideo_scan_timer);
      window.__exvideo_scan_timer = setTimeout(scanForVideos, 500);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Scan ban đầu + retry vì TikTok load chậm
  scanForVideos();
  setTimeout(scanForVideos, 2000);
  setTimeout(scanForVideos, 5000);

  // Lắng nghe navigation (SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(scanForVideos, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  console.log('[ExVideo] TikTok floating download button injected ✅');
})();
