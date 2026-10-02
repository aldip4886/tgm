# Training Game Management System (TGMS) — Buku Panduan Pengguna Lengkap (Bahasa Indonesia)

Selamat datang di **Buku Panduan Pengguna Resmi Training Game Management System (TGMS)**. Sistem ini dirancang dengan empat peran pengguna (*role*) yang memiliki portal login, tampilan beranda, dan hak akses yang disesuaikan dengan tugas masing-masing.

---

## 1. Daftar Buku Panduan Berdasarkan Role Pengguna

Silakan klik panduan sesuai dengan peran (*role*) Anda untuk membaca langkah-langkah penggunaan secara lengkap:

1. **[Buku Panduan Super Administrator (`SUPER_ADMIN`)](./manuals/id/PANDUAN_SUPER_ADMIN.md)**
   - Otoritas penuh atas sistem: membuat/mengubah/menghapus seluruh pengguna (termasuk `SUPER_ADMIN` dan `ADMIN`), memeriksa profil & riwayat sesi fasilitator (**View Profile**), menugaskan sesi ke fasilitator, memantau jalannya sesi, dan mengekspor dataset JSON lengkap.
2. **[Buku Panduan Administrator (`ADMIN`)](./manuals/id/PANDUAN_ADMIN.md)**
   - Pengelolaan operasional harian: membuat akun `FACILITATOR` dan `PARTICIPANT` (tunggal maupun massal), memeriksa profil fasilitator dan daftar sesi yang dibuatnya, menugaskan sesi kepada fasilitator, serta mengunduh laporan data JSON.
3. **[Buku Panduan Fasilitator (`FACILITATOR`)](./manuals/id/PANDUAN_FACILITATOR.md)**
   - Panduan lengkap memandu kelas: membuat sesi, menautkan presentasi Canva (atau menghapus tautan) & mengunggah slide (`PDF`, `Gambar`, `PPTX`), memproyeksikan layar ke peserta, mengatur **Interactive Navigation** (navigasi bebas vs. sinkron otomatis dengan slide presenter), memoderasi **Presentation Live Chat** (beserta tombol *Hide/Show Chat* dan pemberian poin/badge langsung), menjalankan **Miro Collaborative Whiteboard** dengan 6 template, serta mengakhiri sesi kembali ke beranda terpaginasi.
4. **[Buku Panduan Peserta (`PARTICIPANT`)](./manuals/id/PANDUAN_PARTICIPANT.md)**
   - Panduan mengikuti sesi pelatihan: bergabung menggunakan **Kode Sesi 6 Karakter** di `/`, membuka jendela proyeksi slide presentasi (*floating* maupun *fullscreen*), berdiskusi di **Presentation Live Chat**, berkolaborasi di papan tulis **Miro Whiteboard**, menghadiahkan **Poin Rekan** (`+1`, `+3`, `+5` dari kuota 20 poin), serta mengelola profil melalui **Avatar di Pojok Kanan Atas**.

---

## 2. Tabel Perbandingan Hak Akses & Fitur Antar Role

| Fitur / Tindakan | `SUPER_ADMIN` | `ADMIN` | `FACILITATOR` | `PARTICIPANT` |
| :--- | :---: | :---: | :---: | :---: |
| **Halaman Login / Masuk** | `/login` | `/login` | `/login` | `/` (dengan Kode Sesi 6 Karakter) |
| **Halaman Utama Setelah Login** | Beranda Komando (`/`) | Beranda Komando (`/`) | Beranda Komando (`/`) | Ruang Kerja Sesi Peserta |
| **Membuat / Mengubah / Menghapus Akun `SUPER_ADMIN`** | ✅ | ❌ | ❌ | ❌ |
| **Membuat / Mengubah / Menghapus Akun `ADMIN`, `FACILITATOR`, `PARTICIPANT`** | ✅ | ✅ | ❌ | ❌ |
| **Melihat Profil Detail ("View Profile" di `/users` & Daftar Peserta)** | ✅ (Semua + Edit) | ✅ (Semua + Edit) | ✅ (Hanya Baca) | ✅ (Profil Sendiri & Rekan Sesi) |
| **Mengubah Profil & Pengaturan Akun Sendiri (`/settings` / Avatar Kanan Atas)** | ✅ | ✅ | ✅ | ✅ |
| **Membuat Sesi Pelatihan Baru** | ✅ | ✅ | ✅ | ❌ |
| **Menugaskan / Mengalihkan Sesi ke Fasilitator Lain** | ✅ | ✅ | ❌ | ❌ |
| **Menautkan / Menghapus Link Canva & Mengunggah Slide (`PDF`, `Gambar`, `PPTX`)** | ✅ | ✅ | ✅ (Sesi Miliknya) | ❌ |
| **Memproyeksikan Slide & Mengatur Mode Navigasi Interaktif / Sinkron** | ✅ | ✅ | ✅ (Sesi Miliknya) | Melihat Proyeksi Slide |
| **Mengaktifkan / Menonaktifkan & Menyembunyikan / Menampilkan Live Chat** | ✅ | ✅ | ✅ (Sesi Miliknya) | Berdiskusi & Hide/Show Chat |
| **Memberikan Feedback, Poin Bonus & Badge di Live Chat** | ✅ | ✅ | ✅ (Sesi Miliknya) | Menerima Notifikasi & Poin |
| **Menggunakan *Miro Collaborative Whiteboard* & 6 Template Siap Pakai** | ✅ | ✅ | ✅ | ✅ |
| **Menghadiahkan Poin Rekan (`+1`, `+3`, `+5` dari Kuota 20 Poin)** | N/A | N/A | Memberi Poin Bonus | ✅ |
| **Mengakhiri Sesi (`End Session`) & Kembali ke Beranda Terpaginasi** | ✅ | ✅ | ✅ (Sesi Miliknya) | Menerima Status Selesai |
| **Mengekspor Dataset Lengkap Sesi atau Peserta ke Format JSON** | ✅ | ✅ | ✅ (Sesi Miliknya) | JSON Milik Sendiri |

---

## 3. Daftar Akun Uji Coba Bawaan (*Seeded Accounts*)

Untuk keperluan simulasi dan pengujian lokal, database telah dilengkapi dengan akun bawaan untuk setiap role:

| Role | Username Bawaan | Halaman Masuk |
| :--- | :--- | :--- |
| **`SUPER_ADMIN`** | `superadmin_sarah`, `superadmin_david` | `http://localhost:3000/login` |
| **`ADMIN`** | `admin_alex`, `admin_clara` | `http://localhost:3000/login` |
| **`FACILITATOR`** | `facilitator_maya`, `facilitator_sam` | `http://localhost:3000/login` |
| **`PARTICIPANT`** | `participant_john`, `participant_jane` (atau langsung masuk menggunakan Kode Sesi) | `http://localhost:3000/` |
