# ExVideo — Thông tin Dự án

## Tổng quan

| Thuộc tính | Giá trị |
|------------|---------|
| **Tên dự án** | ExVideo (Multi-Platform Video Downloader) |
| **Phiên bản** | v3.0.0 |
| **Loại** | Chrome Extension (Manifest V3) |
| **Tác giả** | phuochoavn |
| **GitHub** | [phuochoavn/downvideotiktok](https://github.com/phuochoavn/downvideotiktok) |
| **Ngày bắt đầu** | 11/03/2026 |
| **License** | Private |
| **Ngôn ngữ** | JavaScript, CSS, HTML, Python |

## Mục đích

Extension Chrome tải video từ **8 nền tảng** (TikTok, Facebook, Instagram, YouTube, Twitter/X, Reddit, Pinterest, Vimeo) ở **chất lượng cao nhất** có thể, hỗ trợ tải hàng loạt (batch download) với giao diện Side Panel.

## Tính năng chính

### 1. Batch Download
- Paste nhiều link cùng lúc (auto-detect, tách dòng, loại trùng)
- Import từ file Excel/CSV (dùng SheetJS)
- Queue real-time hiển thị trạng thái từng video

### 2. Multi-Platform (v3.0)
- **8 nền tảng**: 🎵 TikTok | 📘 Facebook | 📷 Instagram | 🎥 YouTube | 🐦 Twitter/X | 🤖 Reddit | 📌 Pinterest | 🎬 Vimeo
- **cobalt.tools API**: 3 endpoints fallback, hỗ trợ tất cả platforms
- **Unified fetch**: TikTok → TikWM trước → cobalt fallback | Platform khác → cobalt
- Auto-detect platform từ URL → hiện icon trong queue

### 3. Quality Cascade (v2.1)
- **4 nguồn video**: TikWM API → cobalt.tools → Parse trang TikTok → TikTok Internal API
- **4 mức chất lượng**: 🏆 Cao nhất | 📺 1080p | 🎬 HD | 📱 SD
- So sánh bitrate từ tất cả nguồn → chọn URL cao nhất

### 4. Smart Download
- **Lịch sử tải**: Lưu vĩnh viễn (`chrome.storage.local`, max 2000 link)
- **Bỏ qua link đã tải**: Hiện ⏭️, không tải lại
- **Retry link lỗi**: Nút 🔄 tự xuất hiện khi có lỗi
- **Auto-download**: Bật toggle → paste xong 1.5s → tự tải

### 5. Side Panel
- Không tự đóng khi lướt web
- Nút X để đóng khi muốn
- Full-height responsive layout

## Kiến trúc

```
ExVideo/
├── manifest.json          # Manifest V3 config (v3.0.0)
├── background.js          # Service worker: side panel + message relay + TikTok API
├── content.js             # Content script: parse trang TikTok lấy bitrateInfo
├── popup.js               # Logic chính: cobalt API, cascade engine, queue, download
├── sidepanel.html         # UI Side Panel (quality dropdown, nút X)
├── sidepanel.css          # Styles dark theme
├── popup.html             # UI popup (backup)
├── popup.css              # Styles popup (backup)
├── libs/
│   └── xlsx.mini.min.js   # SheetJS v0.18.5 (Excel parser)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── tools/
│   ├── link_collector.py  # Tool thu thập link (Python, độc lập)
│   └── TikTokCollector.exe # Bản build (PyInstaller, 11.4 MB)
└── docs/
    ├── PROJECT_INFO.md    # File này
    ├── DEVELOPMENT_JOURNAL.md
    └── ROADMAP.md
```

## Permissions

| Permission | Mục đích |
|-----------|---------|
| `downloads` | Trigger download video |
| `storage` | Lưu lịch sử tải |
| `sidePanel` | Mở Side Panel |
| `activeTab` | Truy cập tab hiện tại |
| `scripting` | Inject content script |

## APIs & Dependencies

| API/Lib | Mục đích | URL |
|---------|---------|-----|
| **cobalt.tools** | Tải video đa nền tảng (8 platforms) | `api.cobalt.tools` + 2 fallback |
| TikWM API | Lấy video TikTok HD/SD không watermark | `tikwm.com/api/` |
| TikTok Internal API | Lấy bitrateInfo chất lượng cao | `tiktok.com/api/item/detail/` |
| SheetJS | Parse Excel/CSV | `xlsx.mini.min.js` |
| Chrome Side Panel API | UI persistent | Chrome 114+ |
| Chrome Downloads API | Trigger tải file | MV3 |
| Chrome Storage API | Lưu lịch sử | MV3 |

## Tool phụ trợ

### TikTok Link Collector
- **Source**: `tools/link_collector.py`
- **EXE**: `tools/TikTokCollector.exe` (11.4 MB, PyInstaller)
- App Python + Tkinter chạy độc lập, always-on-top
- Tự theo dõi clipboard mỗi 0.5s
- Thu thập link TikTok tự động, loại trùng
- Bấm "Copy tất cả" → paste vào ExVideo
