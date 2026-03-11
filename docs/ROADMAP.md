# ExVideo — Roadmap

## ✅ Đã hoàn thành

### v1.0 — Extension cơ bản
- [x] Chrome Extension Manifest V3
- [x] UI dark theme TikTok
- [x] TikWM API integration
- [x] Tải 1 video HD/SD

### v2.0 — Batch Download
- [x] Paste nhiều link
- [x] Import Excel/CSV (SheetJS)
- [x] Queue real-time + rate limiting
- [x] Auto-download toggle (1.5s debounce)
- [x] Download history (`chrome.storage.local`)
- [x] Skip link đã tải + Retry link lỗi
- [x] Auto-format paste (detect + tách link TikTok)

### v2.1 — Quality Cascade + Side Panel
- [x] Side Panel API (không tự đóng)
- [x] Nút X đóng panel
- [x] Content script parse trang TikTok (`__UNIVERSAL_DATA_FOR_REHYDRATION__`)
- [x] TikTok Internal API (cookie auth, 8s timeout)
- [x] Cascade engine (TikWM → page parse → Internal API → so sánh bitrate)
- [x] Quality dropdown (🏆 Cao nhất | 📺 1080p | 🎬 HD | 📱 SD)
- [x] Fix clipboard Side Panel (`execCommand('paste')`)
- [x] Lọc chỉ link TikTok khi paste
- [x] Push GitHub

### v3.0 — Multi-Platform (cobalt.tools)
- [x] Tích hợp cobalt.tools API (3 endpoints fallback)
- [x] Hỗ trợ 8 nền tảng: TikTok, Facebook, Instagram, YouTube, Twitter/X, Reddit, Pinterest, Vimeo
- [x] Unified fetch engine: TikWM (TikTok) → cobalt (tất cả)
- [x] Auto-detect platform từ URL + hiện icon (🎵📘📷🎥🐦🤖📌🎬)
- [x] Mở rộng URL regex cho tất cả platforms
- [x] Download folder đổi từ `TikTok/` → `ExVideo/`
- [x] Cập nhật manifest v3.0.0 + host_permissions cho cobalt endpoints

### Tools
- [x] TikTok Link Collector (Python + Tkinter, always-on-top)
- [x] Build EXE (PyInstaller, 11.4 MB)

---

## 🔜 Kế hoạch tiếp theo

### v3.1 — UX Improvements
- [ ] Hiển thị bitrate/resolution thực tế bên cạnh mỗi video
- [ ] Progress bar khi tải (% hoàn thành)
- [ ] Chọn thư mục lưu tùy ý
- [ ] Dark/Light theme toggle
- [ ] Lưu quality preference vào storage

### v3.2 — TikTok Integration
- [ ] Content script auto-detect video đang xem trên trang TikTok
- [ ] Nút "Tải video này" nổi trên trang TikTok
- [ ] Tự lấy link video từ tab TikTok đang mở (không cần paste)

### v4.0 — Advanced Features
- [ ] Scheduler: hẹn giờ tải
- [ ] Tải audio MP3 (tách nhạc từ cobalt: `downloadMode: 'audio'`)
- [ ] Export danh sách link ra Excel
- [ ] Statistics: tổng video đã tải, dung lượng, author phổ biến
- [ ] Cloud sync lịch sử tải (Google Drive / Dropbox)

---

## 💡 Ý tưởng tương lai
- Chrome Web Store publish
- Firefox Add-on port
- Edge Add-on port
- Tích hợp AI: tự phân loại video theo nội dung
- Tích hợp Zalo: content script scan tin nhắn Zalo Web → auto-collect links
- Self-host cobalt instance để tránh rate limit
