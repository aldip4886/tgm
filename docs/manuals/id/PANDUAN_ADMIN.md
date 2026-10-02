# Buku Panduan Pengguna: Administrator (`ADMIN`)

**Identitas Role:** `ADMIN`  
**Portal Login Staf:** `http://localhost:3000/login`  
**Halaman Utama (Beranda):** Command Homepage (`http://localhost:3000/`)

---

## 1. Gambaran Umum Peran & Wewenang

Sebagai **Administrator (`ADMIN`)**, Anda bertugas mengelola operasional harian akun fasilitator, peserta, serta penjadwalan dan penugasan sesi pelatihan di dalam **Training Game Management System (TGMS)**.

### Wewenang Utama Anda
- **Mengelola Akun Fasilitator & Peserta**: Membuat akun baru (tunggal maupun massal), memeriksa profil detail (**View Profile**), mengubah informasi akun, serta menghapus pengguna dengan role `FACILITATOR`, `PARTICIPANT`, atau `ADMIN` setara.
- **Menugaskan Sesi ke Fasilitator (*Assign Session*)**: Membuat sesi pelatihan dan menugaskan atau memindahkan kepemilikan sesi kepada fasilitator mana pun.
- **Mendampingi & Memoderasi Sesi Pelatihan**: Membuka **Facilitator Dashboard** atau **Projector View** pada sesi mana pun untuk membantu jalannya presentasi, memoderasi *Live Chat*, mengatur waktu (*timer*), serta memberikan poin dan penghargaan.
- **Mengekspor Dataset Sesi & Peserta**: Mengunduh seluruh data interaksi sesi maupun per peserta dalam format JSON.

### Batasan Keamanan (`ADMIN` vs. `SUPER_ADMIN`)
> **Batasan Penting:** Pengguna dengan role `ADMIN` **tidak dapat** membuat, mengubah data/kata sandi, mengganti role, atau menghapus akun **`SUPER_ADMIN`**. Seluruh tindakan modifikasi terhadap akun `SUPER_ADMIN` dikunci oleh sistem demi keamanan hierarki.

---

## 2. Cara Login & Navigasi Beranda Komando

### 2.1 Login melalui Portal Staf (`/login`)
1. Buka `http://localhost:3000/login` (**Facilitator & Admin Sign In**).
   > **Catatan:** Jangan gunakan kolom *Session Code* di halaman `/`. Kolom *Session Code* hanya digunakan oleh peserta pelatihan.
2. Masukkan **Username** Anda (contoh akun bawaan: `admin_alex` atau `admin_clara`) dan **Password**.
3. Klik **Sign In to Command Center** untuk masuk ke **Beranda Komando (`/`)**.

### 2.2 Tampilan Beranda Komando (`/`)
- **Daftar Sesi Terpaginasi**: Menampilkan daftar sesi pelatihan (`6` sesi per halaman) dengan tombol halaman **Previous** dan **Next**. Riwayat pesan, poin, dan interaksi dari sesi sebelumnya disembunyikan dari beranda agar tampilan tetap bersih dan fokus.
- **Navigasi Cepat**: Akses langsung ke menu **Sessions (`/sessions`)**, **Activities (`/activities`)**, **Users (`/users`)**, serta **Avatar Pengguna** di pojok kanan atas.

---

## 3. Manajemen Pengguna & Pemeriksaan Profil (`/users`)

Buka halaman **Users (`/users`)** melalui bilah navigasi atas.

### 3.1 Mendaftarkan Fasilitator dan Peserta Baru
1. **Pembuatan Akun Tunggal**:
   - Isi **Nama Lengkap**, **Username**, **Email**, **Password**, lalu pilih role `FACILITATOR` atau `PARTICIPANT` (atau `ADMIN`).
   - Klik **Create User**.
2. **Pembuatan Akun Massal (*Bulk Create*)**:
   - Gunakan panel **Bulk Create** untuk menghasilkan banyak akun peserta atau fasilitator sekaligus sebelum kelas dimulai.

### 3.2 Memeriksa Detail Pengguna melalui Tombol "View Profile"
Pada tabel pengguna di `/users`, klik tombol **View Profile** pada baris pengguna mana pun:
- **Saat Memeriksa Profil Fasilitator (`FACILITATOR`)**:
  - Menampilkan **Informasi Profil** (Nama, Username, Email, Organisasi, Bio).
  - Menampilkan ringkasan **Jumlah Sesi yang Dibuat / Dipandu (*Sessions Created / Hosted*)**, jumlah sesi aktif, dan total aktivitas.
  - Buka tab **Created Sessions** untuk melihat rincian lengkap setiap sesi yang pernah dibuat oleh fasilitator tersebut (Judul Sesi, Kode Sesi 6 Karakter, Status `WAITING`/`ACTIVE`/`CONCLUDED`, Jumlah Peserta, Jumlah Aktivitas, Tanggal Pembuatan, serta tombol untuk langsung membuka dashboard sesi).
- **Saat Memeriksa Profil Peserta (`PARTICIPANT`)**:
  - Menampilkan ringkasan sesi, total poin yang diraih, sisa *Peer Point Budget*, dan tim.
  - Tab **Interactions**: Menampilkan daftar jawaban, *sticky notes*, *whiteboard*, pesan *Live Presentation Chat*, serta komentar/balasan yang dikirim peserta.
  - Tab **Points & Awards**: Menampilkan rincian perolehan poin dan lencana penghargaan (*Badges*).
  - Klik **Download JSON** untuk mengunduh laporan data peserta tersebut dalam format `.json`.

### 3.3 Mengubah Data atau Menghapus Akun Pengguna
- Gunakan tab **Edit Info & Settings** di dalam jendela **View Profile** untuk memperbarui nama, username, email, organisasi, bio, warna avatar, atau mereset password fasilitator/peserta.
- Klik tombol **Delete** pada tabel `/users` untuk menghapus akun `PARTICIPANT` atau `FACILITATOR` yang sudah tidak digunakan.

---

## 4. Pengelolaan Sesi & Penugasan Fasilitator (`/sessions`)

### 4.1 Menugaskan Sesi kepada Fasilitator Lain
Berbeda dengan Fasilitator (yang hanya dapat mengelola sesinya sendiri), **Administrator memiliki hak untuk menugaskan sesi kepada fasilitator mana pun**:
1. Buka halaman `/sessions` (atau `/sessions/create` saat membuat sesi baru).
2. Pilih sesi yang ingin diatur, lalu pilih nama fasilitator tujuan pada menu **Assign Facilitator**.
3. Simpan perubahan (`PATCH /api/sessions/[id]/assign`). Sesi tersebut akan langsung tampil di beranda fasilitator yang bersangkutan.

### 4.2 Memantau Sesi Langsung & Mengakhiri Sesi
1. Dari `/` atau `/sessions`, klik **Facilitator Dashboard** (`/sessions/[id]/facilitator`) pada sesi yang ingin dipantau.
2. Anda dapat membantu menautkan/mengunggah slide presentasi, memproyeksikan layar, mengatur **Interactive Navigation**, memoderasi **Presentation Live Chat**, menjalankan timer, hingga memberikan poin dan badge.
3. Saat sesi selesai, klik **End Session** di bilah atas untuk mengubah status sesi menjadi `CONCLUDED` dan kembali ke tampilan Beranda Komando (`/`) yang bersih.

### 4.3 Mengekspor Data Sesi ke JSON
- Klik tombol **Export JSON** pada kartu sesi di `/sessions` atau di dalam Facilitator Dashboard untuk mengunduh seluruh riwayat interaksi, papan tulis *whiteboard*, percakapan *live chat*, poin, dan penghargaan dalam format `.json`.

---

## 5. Pengaturan Profil & Akun Pribadi (`/settings`)

Klik ikon **Avatar** Anda di pojok kanan atas layar kapan saja untuk:
- Melihat profil dan riwayat sesi yang Anda buat.
- Mengubah **Nama Tampilan**, **Username**, **Email**, **Organisasi**, **Bio**, **Warna Avatar**, dan **Kata Sandi** melalui tab **Edit Info & Settings** atau halaman penuh `/settings`.
