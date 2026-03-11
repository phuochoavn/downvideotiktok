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
- [x] Content script parse trang TikTok
- [x] TikTok Internal API (cookie auth)
- [x] Cascade engine (TikWM → page → API → so sánh bitrate)
- [x] Quality dropdown (Cao nhất / 1080p / HD / SD)
- [x] Push GitHub

### Tools
- [x] TikTok Link Collector (Python + Tkinter)
- [x] Build EXE (PyInstaller)

---

## 🔜 Kế hoạch tiếp theo

### v2.2 — UX Improvements
- [ ] Hiển thị bitrate/resolution thực tế bên cạnh mỗi video
- [ ] Progress bar khi tải (% hoàn thành)
- [ ] Chọn thư mục lưu tùy ý
- [ ] Dark/Light theme toggle
- [ ] Lưu quality preference vào storage

### v2.3 — TikTok Integration
- [ ] Content script auto-detect video đang xem trên trang TikTok
- [ ] Nút "Tải video này" nổi trên trang TikTok
- [ ] Tự lấy link video từ tab TikTok đang mở (không cần paste)

### v3.0 — Multi-platform
- [ ] Hỗ trợ Instagram Reels
- [ ] Hỗ trợ YouTube Shorts
- [ ] Hỗ trợ Facebook Reels
- [ ] API switcher (TikWM / SnapTik / cobalt.tools)

### v3.1 — Advanced Features
- [ ] Scheduler: hẹn giờ tải
- [ ] Tải audio MP3 (tách nhạc)
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
