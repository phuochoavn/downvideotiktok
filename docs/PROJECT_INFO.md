# ExVideo — Thông tin Dự án

## Tổng quan

| Thuộc tính | Giá trị |
|------------|---------|
| **Tên dự án** | ExVideo (TikTok Video Downloader) |
| **Phiên bản** | v2.1.0 |
| **Loại** | Chrome Extension (Manifest V3) |
| **Tác giả** | phuochoavn |
| **GitHub** | [phuochoavn/downvideotiktok](https://github.com/phuochoavn/downvideotiktok) |
| **Ngày bắt đầu** | 11/03/2026 |
| **License** | Private |
| **Ngôn ngữ** | JavaScript, CSS, HTML |

## Mục đích

Extension Chrome tải video TikTok **không watermark** ở **chất lượng cao nhất** có thể, hỗ trợ tải hàng loạt (batch download) với giao diện Side Panel không tự đóng khi lướt web.

## Tính năng chính

### 1. Batch Download
- Paste nhiều link cùng lúc (auto-detect, tách dòng, loại trùng)
- Import từ file Excel/CSV (dùng SheetJS)
- Queue real-time hiển thị trạng thái từng video

### 2. Quality Cascade (v2.1)
- **3 nguồn video**: TikWM API → Parse trang TikTok → TikTok Internal API
- **4 mức chất lượng**: 🏆 Cao nhất | 📺 1080p | 🎬 HD | 📱 SD
- So sánh bitrate từ tất cả nguồn → chọn URL cao nhất
- Fallback thông minh: nguồn nào fail → dùng nguồn khác

### 3. Smart Download
- **Lịch sử tải**: Lưu vĩnh viễn (`chrome.storage.local`, max 2000 link)
- **Bỏ qua link đã tải**: Hiện ⏭️, không tải lại
- **Retry link lỗi**: Nút 🔄 tự xuất hiện khi có lỗi
- **Auto-download**: Bật toggle → paste xong 1.5s → tự tải

### 4. Side Panel
- Không tự đóng khi lướt TikTok/Zalo
- Nút X để đóng khi muốn
- Full-height responsive layout

## Kiến trúc

```
ExVideo/
├── manifest.json          # Manifest V3 config
├── background.js          # Service worker: side panel + message relay + TikTok API
├── content.js             # Content script: parse trang TikTok lấy bitrateInfo
├── popup.js               # Logic chính: cascade engine, queue, download
├── sidepanel.html          # UI Side Panel (nút X, quality dropdown)
├── sidepanel.css           # Styles dark theme
├── popup.html              # UI popup (backup, không dùng)
├── popup.css               # Styles popup (backup)
├── libs/
│   └── xlsx.mini.min.js    # SheetJS v0.18.5 (Excel parser)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── tools/
│   └── link_collector.py   # Tool thu thập link (Python, độc lập)
└── docs/
    ├── PROJECT_INFO.md     # File này
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
| TikWM API | Lấy video HD/SD không watermark | `tikwm.com/api/` |
| TikTok Internal API | Lấy bitrateInfo chất lượng cao | `tiktok.com/api/item/detail/` |
| SheetJS | Parse Excel/CSV | `xlsx.mini.min.js` |
| Chrome Side Panel API | UI persistent | Chrome 114+ |
| Chrome Downloads API | Trigger tải file | MV3 |
| Chrome Storage API | Lưu lịch sử | MV3 |

## Tool phụ trợ

### TikTok Link Collector (`tools/link_collector.py`)
- App Python + Tkinter chạy độc lập
- Tự theo dõi clipboard mỗi 0.5s
- Thu thập link TikTok tự động, loại trùng
- Bấm "Copy tất cả" → paste vào ExVideo
- Cũng có bản `.exe` (PyInstaller)
