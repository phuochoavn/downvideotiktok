# ExVideo — Nhật ký Phát triển

> Mới nhất ở trên. Ghi theo ngày.

---

## 11/03/2026 — Ngày khởi tạo

### Buổi sáng: Khởi tạo dự án
- Tạo extension Chrome Manifest V3 cơ bản
- UI dark theme với gradient TikTok (hồng → xanh)
- Tích hợp TikWM API để lấy video HD/SD không watermark
- Tải 1 link → xem thumbnail + info → download

### Buổi trưa: Nâng cấp Batch Download (v2.0)
- Thay textarea single-link → multi-link (mỗi dòng 1 link)
- Thêm Import Excel/CSV (SheetJS v0.18.5)
- Hệ thống queue real-time: ⏳→🔄→✅→⬇️→✓
- Tải hàng loạt HD/SD với rate limiting (500ms API, 300ms download)
- Auto-download toggle: paste → 1.5s debounce → tự tải HD

### Buổi trưa: Smart Download History
- Thêm `storage` permission
- Lưu lịch sử tải vào `chrome.storage.local` (max 2000 link)
- Link đã tải → hiện ⏭️ bỏ qua, không tải lại
- Retry link lỗi: nút 🔄 xuất hiện khi có ❌
- Auto-format paste: detect link TikTok, tách dòng, loại trùng

### Buổi chiều: Side Panel + Quality Cascade (v2.1)
- **Side Panel**: Chuyển từ popup → Side Panel API (Chrome 114+)
  - Không tự đóng khi lướt web
  - Nút X đóng panel
  - Full-height responsive layout
- **Content Script** (`content.js`): Parse `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON
  - Hỗ trợ cả SIGI_STATE (cấu trúc cũ)
  - Extract bitrateInfo, qualityLevels
- **Background Service Worker** (`background.js`):
  - Message relay sidepanel ↔ content script
  - TikTok Internal API fetcher (cookie auth, 8s timeout)
  - bitrateInfo parser
- **Quality Cascade Engine**:
  - TikWM → Parse trang → TikTok Internal API
  - So sánh bitrate → chọn cao nhất
  - Fallback thông minh
- **Quality Dropdown**: 🏆 Cao nhất | 📺 1080p | 🎬 HD | 📱 SD
- **Updated manifest.json**: content_scripts, activeTab, scripting permissions
- **Push GitHub**: `phuochoavn/downvideotiktok`
  - Commit `8ef2182`: v2.0-initial
  - Commit `5e21488`: v2.1-quality-cascade

### Buổi chiều: Fix Clipboard + Link Collector Tool
- Fix paste button không hoạt động trong Side Panel
  - Dùng `execCommand('paste')` thay `navigator.clipboard.readText()`
- Lọc chỉ lấy link TikTok từ clipboard (bỏ text rác)
- **TikTok Link Collector** (`tools/link_collector.py`):
  - App Python + Tkinter độc lập
  - Cửa sổ always-on-top
  - Tự theo dõi clipboard mỗi 0.5s
  - Auto-collect link TikTok, loại trùng
  - "Copy tất cả" → paste vào ExVideo
  - Build EXE bằng PyInstaller

---

## Bugs đã fix

| Bug | Nguyên nhân | Fix |
|-----|-----------|-----|
| Paste không hoạt động trong Side Panel | `navigator.clipboard` bị chặn | Dùng `execCommand('paste')` |
| Paste dán cả text rác | `autoFormatUrls` trả rawText khi không có TikTok URL | Trả `''` + hiện thông báo lỗi |
