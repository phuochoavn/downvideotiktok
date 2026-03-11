# ExVideo — TikTok Video Downloader (No Watermark)

Chrome Extension (Manifest V3) tải video TikTok không watermark với batch download.

## Tính năng

- 🎬 Tải video HD/SD không watermark
- 📋 Paste nhiều link cùng lúc (auto-detect & tách dòng)
- 📊 Import từ Excel/CSV
- ⚡ Tự động tải HD (toggle)
- 🧠 Nhớ link đã tải (không tải lại)
- 🔁 Retry link lỗi tự động
- 📌 Side Panel — không tắt khi lướt TikTok

## Cài đặt

1. Clone repo: `git clone https://github.com/phuochoavn/downvideotiktok.git`
2. Mở `chrome://extensions/`
3. Bật **Developer mode**
4. Bấm **Load unpacked** → chọn thư mục repo
5. Click icon extension → panel mở bên phải

## Sử dụng

1. Click icon ExVideo → mở Side Panel
2. Copy link TikTok → paste vào panel
3. Bấm **Lấy Video** hoặc bật **Tự động tải HD**
4. Video tải về thư mục `Downloads/TikTok/`

## Tech Stack

- Chrome Extension Manifest V3
- Side Panel API
- TikWM API
- SheetJS (Excel parser)
- Vanilla JS + CSS (Dark theme)
