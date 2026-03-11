"""
TikTok Link Collector — Thu thập link TikTok từ clipboard
Cửa sổ nhỏ gọn, luôn nổi trên cùng, tự theo dõi clipboard.
Copy link TikTok từ Zalo/bất kỳ đâu → tự thêm vào danh sách.
Bấm "Copy tất cả" → paste vào ExVideo → tải hết.
"""

import tkinter as tk
from tkinter import messagebox
import re
import threading

class TikTokCollector:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("📋 TikTok Collector")
        self.root.geometry("380x480")
        self.root.resizable(True, True)
        self.root.attributes('-topmost', True)  # Luôn nổi trên cùng
        self.root.configure(bg='#1a1a2e')

        self.links = []
        self.last_clipboard = ''
        self.monitoring = True

        self.setup_ui()
        self.poll_clipboard()

    def setup_ui(self):
        # Header
        header = tk.Frame(self.root, bg='#16213e', pady=8)
        header.pack(fill='x')
        
        tk.Label(header, text="🎬 TikTok Link Collector", 
                 font=('Segoe UI', 13, 'bold'), fg='#00f2ea', bg='#16213e').pack()
        tk.Label(header, text="Copy link từ Zalo → tự thêm vào danh sách", 
                 font=('Segoe UI', 9), fg='#888', bg='#16213e').pack()

        # Status bar
        self.status_frame = tk.Frame(self.root, bg='#0f3460', pady=6)
        self.status_frame.pack(fill='x')
        
        self.status_label = tk.Label(self.status_frame, text="🟢 Đang theo dõi clipboard...", 
                                     font=('Segoe UI', 10), fg='#22c55e', bg='#0f3460')
        self.status_label.pack(side='left', padx=10)
        
        self.count_label = tk.Label(self.status_frame, text="0 link", 
                                     font=('Segoe UI', 10, 'bold'), fg='#00f2ea', bg='#0f3460')
        self.count_label.pack(side='right', padx=10)

        # Link list
        list_frame = tk.Frame(self.root, bg='#1a1a2e')
        list_frame.pack(fill='both', expand=True, padx=8, pady=4)

        scrollbar = tk.Scrollbar(list_frame)
        scrollbar.pack(side='right', fill='y')

        self.listbox = tk.Listbox(list_frame, bg='#16213e', fg='#e4e4e7', 
                                   selectbackground='#ff0050', selectforeground='white',
                                   font=('Consolas', 10), borderwidth=0, highlightthickness=0,
                                   yscrollcommand=scrollbar.set)
        self.listbox.pack(fill='both', expand=True)
        scrollbar.config(command=self.listbox.yview)

        # Buttons
        btn_frame = tk.Frame(self.root, bg='#1a1a2e', pady=8)
        btn_frame.pack(fill='x', padx=8)

        self.copy_btn = tk.Button(btn_frame, text="📋 Copy tất cả", 
                                   command=self.copy_all,
                                   bg='#ff0050', fg='white', font=('Segoe UI', 11, 'bold'),
                                   relief='flat', padx=16, pady=6, cursor='hand2')
        self.copy_btn.pack(side='left', expand=True, fill='x', padx=(0, 4))

        self.clear_btn = tk.Button(btn_frame, text="🗑 Xóa", 
                                    command=self.clear_all,
                                    bg='#27272a', fg='#a1a1aa', font=('Segoe UI', 11),
                                    relief='flat', padx=16, pady=6, cursor='hand2')
        self.clear_btn.pack(side='right', padx=(4, 0))

        # Toggle monitor button
        toggle_frame = tk.Frame(self.root, bg='#1a1a2e', pady=4)
        toggle_frame.pack(fill='x', padx=8)

        self.toggle_btn = tk.Button(toggle_frame, text="⏸ Tạm dừng", 
                                     command=self.toggle_monitor,
                                     bg='#16213e', fg='#888', font=('Segoe UI', 9),
                                     relief='flat', cursor='hand2')
        self.toggle_btn.pack(side='left')

        self.delete_btn = tk.Button(toggle_frame, text="❌ Xóa mục chọn", 
                                     command=self.delete_selected,
                                     bg='#16213e', fg='#888', font=('Segoe UI', 9),
                                     relief='flat', cursor='hand2')
        self.delete_btn.pack(side='right')

    def extract_tiktok_links(self, text):
        """Trích xuất tất cả link TikTok từ text"""
        pattern = r'https?://[^\s,;"\'<>]*tiktok[^\s,;"\'<>]*'
        matches = re.findall(pattern, text, re.IGNORECASE)
        return matches

    def poll_clipboard(self):
        """Theo dõi clipboard mỗi 500ms"""
        if not self.monitoring:
            self.root.after(500, self.poll_clipboard)
            return

        try:
            current = self.root.clipboard_get()
            if current != self.last_clipboard:
                self.last_clipboard = current
                links = self.extract_tiktok_links(current)
                
                new_count = 0
                for link in links:
                    if link not in self.links:
                        self.links.append(link)
                        self.listbox.insert('end', link)
                        self.listbox.see('end')
                        new_count += 1
                
                if new_count > 0:
                    self.count_label.config(text=f"{len(self.links)} link")
                    self.status_label.config(text=f"✅ +{new_count} link mới!", fg='#22c55e')
                    # Flash effect
                    self.root.after(2000, lambda: self.status_label.config(
                        text="🟢 Đang theo dõi clipboard...", fg='#22c55e'))
        except tk.TclError:
            pass  # Clipboard trống hoặc không phải text

        self.root.after(500, self.poll_clipboard)

    def copy_all(self):
        """Copy tất cả link vào clipboard"""
        if not self.links:
            self.status_label.config(text="⚠ Chưa có link nào!", fg='#f59e0b')
            return

        all_links = '\n'.join(self.links)
        self.root.clipboard_clear()
        self.root.clipboard_append(all_links)

        self.status_label.config(text=f"📋 Đã copy {len(self.links)} link!", fg='#00f2ea')
        self.last_clipboard = all_links  # Tránh tự add lại

    def clear_all(self):
        """Xóa tất cả link"""
        self.links.clear()
        self.listbox.delete(0, 'end')
        self.count_label.config(text="0 link")
        self.status_label.config(text="🗑 Đã xóa tất cả", fg='#f59e0b')

    def delete_selected(self):
        """Xóa link đang chọn"""
        selection = self.listbox.curselection()
        if not selection:
            return
        idx = selection[0]
        self.links.pop(idx)
        self.listbox.delete(idx)
        self.count_label.config(text=f"{len(self.links)} link")

    def toggle_monitor(self):
        """Bật/tắt theo dõi clipboard"""
        self.monitoring = not self.monitoring
        if self.monitoring:
            self.toggle_btn.config(text="⏸ Tạm dừng")
            self.status_label.config(text="🟢 Đang theo dõi clipboard...", fg='#22c55e')
        else:
            self.toggle_btn.config(text="▶ Tiếp tục")
            self.status_label.config(text="⏸ Đã tạm dừng", fg='#f59e0b')

    def run(self):
        self.root.mainloop()

if __name__ == '__main__':
    app = TikTokCollector()
    app.run()
