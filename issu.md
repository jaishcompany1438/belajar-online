# PRD dan Planning - Learning Management System

## 1. Ringkasan Produk

Learning Management System (LMS) berbasis web untuk mengelola pembelajaran peserta berdasarkan kelas dan tahun masuk. Peserta dapat masuk ke sistem, melihat materi harian berupa video YouTube, menyelesaikan waktu minimal menyimak, mengerjakan evaluasi, melihat peringkat, dan memperbarui profil.

Sistem dibangun menggunakan:

- Backend: Node.js dan Express.js
- Frontend: React
- Database: MySQL
- Integrasi media: YouTube melalui iframe/embed

## 2. Tujuan

1. Menyediakan satu tempat untuk distribusi materi pembelajaran harian.
2. Memastikan peserta benar-benar menyimak materi selama durasi minimum yang ditentukan.
3. Mengukur pemahaman peserta melalui evaluasi setelah materi.
4. Menampilkan peringkat berdasarkan ketepatan jawaban dan kecepatan menyelesaikan evaluasi.
5. Memudahkan pengelola mengatur peserta, kelas, angkatan, materi, dan soal.

## 3. Sasaran Pengguna dan Peran

### 3.1 Peserta

- Login ke sistem.
- Melihat materi yang tersedia untuk kelas dan tahun masuknya.
- Membuka video YouTube dalam iframe.
- Melihat penghitung waktu menyimak saat video dibuka.
- Menyelesaikan durasi minimum materi.
- Mengerjakan evaluasi yang tersedia.
- Melihat nilai, waktu pengerjaan, dan peringkat.
- Mengubah password dan biodata singkat.

### 3.2 Admin/Pengelola

- Login ke halaman admin.
- Mengatur periode pendaftaran peserta, termasuk waktu buka dan waktu tutup.
- Mengelola data peserta.
- Mengelola kelas dan tahun masuk.
- Membuat, mengubah, menerbitkan, dan mengarsipkan materi.
- Menentukan jadwal materi harian dan durasi minimum menyimak.
- Membuat soal, pilihan jawaban, kunci jawaban, dan bobot.
- Melihat hasil evaluasi dan peringkat.

## 4. Ruang Lingkup MVP

### Termasuk

- Autentikasi login dan logout.
- Pendaftaran peserta dari menu login dengan periode yang dapat dikonfigurasi admin.
- Otorisasi berdasarkan peran.
- Pengelompokan peserta berdasarkan kelas dan tahun masuk.
- Dashboard peserta.
- Materi harian dengan iframe YouTube.
- Timer waktu menyimak yang berjalan ketika materi dibuka.
- Validasi penyelesaian durasi minimum.
- Evaluasi pilihan ganda.
- Penilaian otomatis.
- Peringkat peserta.
- Profil dan perubahan password.
- Dashboard dan CRUD inti untuk admin.
- REST API Express.js dan database MySQL.

### Tidak termasuk pada MVP

- Upload video ke server.
- Live streaming.
- Chat atau forum diskusi.
- Sertifikat otomatis.
- Pembayaran atau subscription.
- Aplikasi mobile native.
- Integrasi SSO eksternal.

## 5. Aturan Bisnis Utama

1. Peserta hanya dapat melihat materi yang ditujukan untuk kelas dan tahun masuknya.
2. Materi memiliki tanggal publikasi, status, dan durasi minimum menyimak.
3. Timer dimulai ketika halaman materi berhasil dibuka dan peserta menekan tombol mulai/menonton video.
4. Timer berhenti ketika peserta meninggalkan halaman, menutup sesi menonton, atau koneksi terputus.
5. Waktu menyimak dicatat di server berdasarkan event berkala; timer di frontend tidak menjadi satu-satunya sumber kebenaran.
6. Peserta hanya dapat membuka evaluasi setelah materi terkait mencapai durasi minimum.
7. Satu materi dapat memiliki satu atau lebih evaluasi aktif.
8. Peserta hanya dapat mengirim masing-masing evaluasi satu kali dan evaluasi tidak dapat diulang.
9. Nilai utama ditentukan oleh jumlah jawaban benar.
10. Jika nilai sama, peserta dengan waktu pengerjaan lebih cepat mendapat peringkat lebih tinggi.
11. Jika nilai dan waktu sama, peserta yang mengirim lebih dahulu mendapat peringkat lebih tinggi.
12. Jawaban benar, waktu mulai, waktu selesai, dan nilai disimpan di server.
13. Password disimpan dalam bentuk hash, tidak pernah disimpan sebagai plaintext.
14. Admin dapat mengubah materi atau soal, tetapi hasil evaluasi yang sudah terkirim harus tetap dapat diaudit.
15. Menu pendaftaran tersedia dari halaman login hanya ketika pendaftaran sedang dibuka.
16. Periode pendaftaran ditentukan oleh waktu buka dan waktu tutup yang disimpan di server.
17. Jika pendaftaran ditutup, sistem tidak menerima pendaftaran baru dan menampilkan pesan bahwa pendaftaran belum tersedia.
18. Admin dapat membuka, menutup, atau menjadwalkan periode pendaftaran tanpa mengubah kode aplikasi.

## 6. Alur Pengguna

### 6.1 Alur Peserta

1. Peserta membuka halaman login.
2. Jika pendaftaran dibuka, peserta dapat memilih menu Daftar dan mengisi formulir pendaftaran.
3. Jika pendaftaran ditutup, menu/form pendaftaran tidak dapat digunakan dan sistem menampilkan pesan "Pendaftaran belum tersedia".
4. Setelah pendaftaran berhasil, sistem membuat akun berstatus `pending` dan mengirim kode acak 6 digit serta link verifikasi ke email peserta.
5. Peserta membuka link verifikasi, memasukkan kode yang diterima, dan akun berubah menjadi `active` setelah valid.
6. Kode dan link verifikasi berlaku selama 24 jam; akun yang belum diverifikasi tidak dapat login.
7. Peserta mengisi username atau email dan password pada halaman login.
8. Sistem memvalidasi kredensial dan status verifikasi, lalu mengarahkan peserta aktif ke dashboard.
9. Dashboard menampilkan ringkasan materi hari ini, progres menyimak, evaluasi yang belum dikerjakan, dan peringkat.
10. Peserta membuka menu Materi.
11. Peserta memilih materi yang tersedia untuk kelas dan tahun masuknya.
12. Sistem menampilkan detail materi, iframe YouTube, durasi minimum, dan timer.
13. Peserta menonton hingga durasi minimum terpenuhi.
14. Sistem menandai materi sebagai selesai dan membuka tombol evaluasi.
15. Peserta mengerjakan soal dan mengirim jawaban.
16. Sistem menghitung nilai, waktu pengerjaan, dan peringkat.
17. Peserta dapat melihat hasil dan memperbarui profil.

### 6.2 Alur Admin

1. Admin login melalui halaman admin.
2. Admin membuat kelas dan tahun masuk bila belum tersedia.
3. Admin menambahkan peserta ke kelas dan tahun masuk.
4. Admin membuat materi, memasukkan URL YouTube, jadwal tayang, dan durasi minimum.
5. Admin menambahkan evaluasi dan soal untuk materi.
6. Admin menerbitkan materi.
7. Admin memantau progres menyimak, hasil evaluasi, dan peringkat.

## 7. Modul dan Kebutuhan Fungsional

### 7.1 Autentikasi dan Otorisasi

- Login dengan email atau username dan password.
- Menu Daftar pada halaman login.
- Form pendaftaran minimal berisi nama lengkap, email, username, password, dan data awal yang diperlukan.
- Validasi duplikasi email/username dan validasi password.
- Akun baru berstatus `pending` sampai disetujui admin.
- Peserta dengan status `pending` atau `rejected` tidak dapat login.
- Admin dapat menyetujui atau menolak pendaftar.
- Pendaftaran hanya diproses jika waktu server berada di antara `registration_open_at` dan `registration_close_at`.
- Saat periode tertutup atau belum dikonfigurasi, form tidak dapat dikirim dan UI menampilkan "Pendaftaran belum tersedia".
- Admin dapat mengatur waktu buka dan waktu tutup pendaftaran dari dashboard.
- Perubahan periode pendaftaran dicatat dalam audit log.
- Logout dan penghapusan sesi/token.
- Middleware autentikasi pada endpoint terlindungi.
- Middleware role `admin` dan `peserta`.
- Password di-hash menggunakan bcrypt atau algoritma setara.
- Validasi input dan pesan error yang aman.
- Rate limit pada endpoint login.

### 7.2 Dashboard Peserta

Menampilkan:

- Sapaan dan biodata ringkas.
- Jumlah materi tersedia, selesai, dan belum selesai.
- Materi harian terbaru.
- Evaluasi yang dapat atau harus dikerjakan.
- Nilai terakhir.
- Peringkat peserta dalam kelas dan tahun masuk.
- Progres pembelajaran dalam bentuk persentase.

### 7.3 Manajemen Materi

Data materi minimal:

- Judul.
- Deskripsi.
- URL atau video ID YouTube yang telah divalidasi.
- Thumbnail opsional.
- Kelas target.
- Tahun masuk target.
- Tanggal tayang.
- Durasi minimum menyimak dalam detik.
- Status `draft`, `published`, atau `archived`.

Fitur peserta:

- Daftar materi dengan filter status dan tanggal.
- Detail materi dan iframe YouTube.
- Timer dan progres durasi.
- Status `belum mulai`, `sedang menyimak`, atau `selesai`.
- Tombol evaluasi aktif setelah syarat terpenuhi.

### 7.4 Pelacakan Menyimak

- Buat sesi menonton ketika peserta memulai materi.
- Kirim heartbeat/progres ke server secara berkala, misalnya setiap 15-30 detik.
- Simpan total durasi unik yang telah disimak agar refresh halaman tidak menggandakan waktu.
- Tangani pause, tab tidak aktif, navigasi keluar, dan koneksi terputus.
- Gunakan YouTube IFrame Player API bila diperlukan untuk mendeteksi status play/pause.
- Jangan menganggap video selesai hanya karena halaman dibuka.
- Endpoint penyelesaian harus melakukan validasi server terhadap durasi minimum.

Catatan: kontrol penuh terhadap perilaku pemutaran dan keaslian waktu menonton pada iframe YouTube memiliki keterbatasan browser. Sistem harus mengurangi manipulasi melalui heartbeat, validasi sesi, dan pencatatan audit, bukan mengklaim pencegahan absolut.

### 7.5 Evaluasi

Fitur admin:

- Membuat satu atau lebih evaluasi untuk sebuah materi.
- Membuat, mengubah, mengurutkan, dan menghapus soal.
- Menambahkan pilihan jawaban dan kunci jawaban.
- Menentukan bobot/nilai soal.
- Evaluasi tidak memiliki percobaan ulang pada MVP.

Fitur peserta:

- Melihat daftar evaluasi pada materi yang telah memenuhi prasyarat.
- Membuka evaluasi yang dipilih setelah memenuhi prasyarat.
- Menampilkan satu atau beberapa soal pilihan ganda.
- Menyimpan waktu mulai di server.
- Mengirim jawaban sekali dengan validasi server.
- Menampilkan nilai, jumlah benar, dan waktu pengerjaan setelah dikirim.

### 7.6 Peringkat

- Peringkat dapat difilter berdasarkan kelas, tahun masuk, dan periode.
- Urutan: total jawaban benar/nilai tertinggi, waktu pengerjaan tercepat, lalu waktu pengiriman paling awal.
- Peserta melihat peringkatnya sendiri dan peringkat teratas.
- Admin dapat melihat detail hasil setiap peserta.
- Peringkat tidak boleh mengungkap jawaban peserta lain.

### 7.7 Profil

- Lihat dan ubah nama lengkap.
- Lihat dan ubah email/nomor telepon sesuai kebutuhan.
- Ubah biodata singkat.
- Ubah password dengan verifikasi password lama.
- Validasi panjang dan kompleksitas password.
- Tidak mengizinkan peserta mengubah kelas atau tahun masuknya sendiri.

### 7.8 Pendaftaran Peserta

Fitur admin:

- Melihat status pendaftaran saat ini: `belum dibuka`, `dibuka`, atau `ditutup`.
- Mengatur tanggal dan waktu buka pendaftaran.
- Mengatur tanggal dan waktu tutup pendaftaran.
- Membuka pendaftaran segera atau menjadwalkan periode mendatang.
- Menutup pendaftaran segera.
- Melihat riwayat perubahan periode pendaftaran.

Fitur publik:

- Menampilkan tombol Daftar hanya saat periode aktif.
- Menampilkan formulir pendaftaran dan hasil validasi yang jelas.
- Menampilkan pesan "Pendaftaran belum tersedia" ketika pendaftaran belum dibuka, sudah ditutup, atau belum memiliki jadwal aktif.
- Tidak membocorkan detail konfigurasi admin kepada pengguna yang tidak berwenang.

## 8. Rancangan Data MySQL

Tabel inti yang disarankan:

- `users`: id, username, email, password_hash, role, full_name, bio, status (`pending`, `active`, `rejected`, `suspended`), created_at, updated_at.
- `registration_settings`: id, registration_open_at, registration_close_at, status, updated_by, created_at, updated_at.
- `registration_setting_logs`: id, registration_setting_id, action, old_open_at, old_close_at, new_open_at, new_close_at, changed_by, created_at.
- `cohorts`: id, name, admission_year, status, created_at, updated_at.
- `classes`: id, name, cohort_id, description, status, created_at, updated_at.
- `user_classes`: user_id, class_id, joined_at.
- `materials`: id, title, description, youtube_url, youtube_video_id, publish_at, min_watch_seconds (default 180 detik/3 menit), status, created_by, created_at, updated_at.
- `material_targets`: material_id, class_id, cohort_id.
- `watch_sessions`: id, user_id, material_id, started_at, last_heartbeat_at, ended_at, accumulated_seconds, status.
- `material_progress`: user_id, material_id, watched_seconds, completed_at, updated_at.
- `evaluations`: id, material_id, title, instructions, duration_limit_seconds, status, created_at, updated_at.
- `questions`: id, evaluation_id, question_text, points, sort_order, created_at, updated_at.
- `question_options`: id, question_id, option_text, is_correct, sort_order.
- `evaluation_attempts`: id, evaluation_id, user_id, started_at, submitted_at, duration_seconds, score, correct_count, status.
- `attempt_answers`: id, attempt_id, question_id, selected_option_id, is_correct, earned_points.
- `audit_logs`: id, user_id, action, entity_type, entity_id, metadata_json, created_at.

Ketentuan database:

- Gunakan foreign key dan index untuk kolom relasi serta filter ranking.
- Gunakan transaksi saat submit evaluasi dan saat menghitung hasil.
- Tambahkan unique constraint untuk progres peserta-materi dan relasi peserta-kelas.
- Simpan waktu dalam UTC di database dan konversi ke zona waktu tampilan.

## 9. Rancangan API REST

### Auth

- `POST /api/auth/login`
- `GET /api/auth/registration-status`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

### Peserta dan Profil

- `GET /api/me`
- `PATCH /api/me`
- `GET /api/me/progress`

### Materi

- `GET /api/materials`
- `GET /api/materials/:id`
- `POST /api/materials/:id/watch-sessions`
- `POST /api/watch-sessions/:id/heartbeat`
- `POST /api/watch-sessions/:id/finish`
- `GET /api/materials/:id/progress`

### Evaluasi

- `GET /api/materials/:id/evaluations`
- `POST /api/evaluations/:id/attempts`
- `POST /api/attempts/:id/submit`
- `GET /api/attempts/:id/result`

### Dashboard dan Ranking

- `GET /api/dashboard`
- `GET /api/rankings`

### Admin

- `GET|POST|PATCH|DELETE /api/admin/users`
- `POST /api/admin/users/:id/approve`
- `POST /api/admin/users/:id/reject`
- `GET /api/admin/registration-settings`
- `PUT /api/admin/registration-settings`
- `POST /api/admin/registration-settings/open-now`
- `POST /api/admin/registration-settings/close-now`
- `GET|POST|PATCH|DELETE /api/admin/classes`
- `GET|POST|PATCH|DELETE /api/admin/cohorts`
- `GET|POST|PATCH|DELETE /api/admin/materials`
- `GET|POST|PATCH|DELETE /api/admin/evaluations`
- `GET /api/admin/reports/progress`
- `GET /api/admin/reports/results`

### Notifikasi (opsional)

- Notifikasi materi baru dapat ditambahkan jika diperlukan.
- Kanal notifikasi dapat berupa notifikasi in-app terlebih dahulu, dengan email/WhatsApp sebagai pengembangan lanjutan.
- Fitur notifikasi harus dapat diaktifkan atau dinonaktifkan tanpa memengaruhi alur utama materi dan evaluasi.

Semua endpoint harus memiliki schema validasi request, format response konsisten, HTTP status yang tepat, dan error handler terpusat.

## 10. Struktur Frontend React

Halaman peserta:

- `/login`
- `/register`
- `/dashboard`
- `/materi`
- `/materi/:id`
- `/evaluasi/:id`
- `/hasil/:attemptId`
- `/peringkat`
- `/profil`

Halaman admin:

- `/admin`
- `/admin/pendaftaran`
- `/admin/peserta`
- `/admin/kelas`
- `/admin/tahun-masuk`
- `/admin/materi`
- `/admin/materi/:id/evaluasi`
- `/admin/laporan`

Komponen reusable:

- Protected route dan role guard.
- Layout dan sidebar.
- Card materi.
- Video player wrapper.
- Watch timer dan progress bar.
- Evaluation form.
- Ranking table.
- Form profil dan form CRUD admin.
- Loading, empty, error, dan confirmation states.

## 11. Non-Fungsional

- Responsive pada desktop, tablet, dan mobile.
- UI mudah digunakan dan memiliki state loading/error/empty yang jelas.
- API menggunakan HTTPS pada production.
- Validasi dan sanitasi input di client serta server.
- CORS hanya mengizinkan origin frontend yang dikonfigurasi.
- Password dan token tidak dicatat ke log.
- Endpoint admin terlindungi dari akses peserta.
- Pagination pada daftar peserta, materi, hasil, dan ranking.
- Index database dan query terukur untuk ranking.
- Backup database terjadwal pada production.
- Logging terstruktur untuk error dan aktivitas penting.

## 12. Kriteria Penerimaan MVP

1. Peserta dengan kelas/tahun masuk tertentu hanya melihat materi targetnya.
2. Materi draft tidak tampil di sisi peserta.
3. Ketika periode pendaftaran aktif, tombol Daftar dan form pendaftaran tersedia di halaman login.
4. Ketika periode pendaftaran tidak aktif, pendaftaran ditolak di server dan UI menampilkan "Pendaftaran belum tersedia".
5. Pendaftar dapat mengisi email dan username, dan masing-masing harus unik.
6. Akun pendaftar berstatus pending dan tidak dapat login sebelum disetujui admin.
7. Admin dapat menyetujui atau menolak akun pendaftar.
8. Admin dapat mengatur waktu buka dan waktu tutup pendaftaran dari dashboard.
9. Iframe hanya menerima URL YouTube yang valid dan aman.
10. Durasi minimum menyimak default adalah 180 detik (3 menit).
11. Timer mulai setelah sesi menonton dimulai, bukan saat hanya membuka daftar materi.
12. Refresh halaman tidak menghapus progres menyimak yang sudah tersimpan.
13. Evaluasi terkunci sebelum durasi minimum terpenuhi.
14. Peserta hanya dapat mengirim evaluasi satu kali dan sistem menolak submit kedua.
15. Nilai dan durasi tersimpan setelah submit dan dapat ditampilkan kembali.
16. Ranking mengurutkan nilai benar terlebih dahulu dan waktu pengerjaan sebagai tie-breaker.
17. Peserta tidak dapat mengakses data peserta lain melalui perubahan ID pada URL/API.
18. Peserta dapat mengubah password dengan password lama yang benar.
19. Admin dapat mengelola data inti tanpa mengubah database secara manual.
20. Error API tidak menampilkan stack trace atau informasi sensitif kepada pengguna.
21. Fitur utama dapat digunakan pada ukuran layar mobile dan desktop.

## 13. Tahapan Implementasi

### Fase 1 - Setup dan Fondasi

- Inisialisasi workspace backend Express dan frontend React.
- Konfigurasi environment, linting, formatting, dan struktur folder.
- Konfigurasi koneksi MySQL dan migration/seeder.
- Buat model inti dan error handler.

### Fase 2 - Autentikasi dan Master Data

- Implementasi login dengan email atau username, logout, pendaftaran, verifikasi email mandiri, session/token, dan role guard.
- Implementasi konfigurasi periode pendaftaran serta status buka/tutup.
- CRUD user, kelas, dan tahun masuk.
- Seeder akun admin dan data contoh.

### Fase 3 - Materi dan Pelacakan Waktu

- CRUD materi dan target kelas/tahun masuk.
- Daftar/detail materi peserta.
- Integrasi iframe YouTube.
- Watch session, heartbeat, progres, dan validasi durasi minimum.

### Fase 4 - Evaluasi dan Penilaian

- CRUD evaluasi, soal, pilihan, dan kunci jawaban.
- Alur pengerjaan peserta.
- Submit transaksional dan penilaian otomatis.
- Halaman hasil evaluasi.

### Fase 5 - Dashboard, Ranking, dan Profil

- Dashboard ringkasan.
- Query ranking dan filter.
- Profil, biodata, dan perubahan password.
- Laporan admin.

### Fase 6 - Quality Assurance dan Rilis

- Unit test service penilaian dan ranking.
- Integration test auth, progres, dan submit evaluasi.
- End-to-end test alur peserta dan admin.
- Uji responsive dan error state.
- Security review, optimasi query, backup, dan deployment.

## 14. Strategi Pengujian

- Unit test: validasi URL YouTube, aturan ranking, kalkulasi nilai, durasi menonton, dan status akun.
- Integration test: autentikasi, pendaftaran, periode pendaftaran, otorisasi, CRUD, heartbeat, dan submit evaluasi.
- E2E test: pendaftaran/login -> materi -> timer -> evaluasi -> hasil -> ranking.
- Negative test: pendaftaran saat ditutup, login sebelum verifikasi email, kode/link verifikasi salah atau kedaluwarsa, akses role salah, ID milik user lain, submit evaluasi ganda, URL tidak valid, dan input kosong.
- Performance test: query ranking dengan data peserta besar dan heartbeat serentak.

## 15. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Peserta memanipulasi timer | Progres tidak akurat | Validasi server, heartbeat, sesi, audit log, dan deteksi anomali |
| Perubahan soal setelah peserta submit | Hasil sulit diaudit | Simpan snapshot jawaban dan nilai pada `attempt_answers` |
| Video YouTube dihapus atau dibatasi | Materi tidak dapat diputar | Validasi URL saat dibuat dan tampilkan status/error yang jelas |
| Beban heartbeat tinggi | Beban database meningkat | Interval terukur, upsert progres, index, dan throttling |
| Ranking lambat | UX buruk | Index, agregasi yang tepat, pagination, dan cache bila diperlukan |
| Kredensial bocor | Akses tidak sah | Hash password, HTTPS, rate limit, secret dari environment |

## 16. Definition of Done

- Seluruh acceptance criteria MVP terpenuhi.
- Migration dan seeder dapat dijalankan dari environment baru.
- Endpoint terlindungi dan tervalidasi.
- Tidak ada error lint/type-check yang terkait perubahan.
- Test otomatis utama berhasil.
- Dokumentasi setup lokal dan environment tersedia.
- Tidak ada secret di repository.
- Build production frontend dan backend berhasil.

## 17. Pertanyaan yang Perlu Diputuskan Sebelum Implementasi

1. Login menggunakan email atau username; keduanya harus tersedia dan unik.
2. Akun hasil pendaftaran harus disetujui admin sebelum dapat login.
3. Satu peserta dapat berada di lebih dari satu kelas.
4. Durasi minimum menyimak default adalah 3 menit (180 detik); admin dapat menyesuaikannya per materi bila diperlukan.
5. Evaluasi tidak dapat diulang.
6. Ranking berlaku per kelas dan per tahun masuk.
7. Admin dapat membuat lebih dari satu evaluasi untuk satu materi.
8. Notifikasi materi baru ditambahkan jika diperlukan.
