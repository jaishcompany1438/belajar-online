# Belajar Online LMS MVP

Scaffold LMS full-stack sesuai PRD di [issu.md](./issu.md) dengan:

- Backend Node.js + Express + MySQL
- Frontend React + Vite
- Login email atau username
- Registrasi berbasis periode yang diatur admin
- Approval/rejection akun peserta oleh admin
- Relasi peserta ke banyak kelas
- CRUD materi + target kelas/angkatan
- YouTube iframe + watch session heartbeat server
- Banyak evaluasi per materi, satu attempt per peserta
- Ranking per kelas / angkatan berdasarkan skor lalu durasi
- Profil dan ubah password
- Laporan admin untuk progres dan hasil

## Struktur

- [server/](/E:/Website/PTQ Imam Ath Thobari/belajar/server) - Express API, schema SQL, seed, tests
- [client/](/E:/Website/PTQ Imam Ath Thobari/belajar/client) - React app
- [issu.md](/E:/Website/PTQ Imam Ath Thobari/belajar/issu.md) - PRD sumber

## Quick start

### 1. Install dependency

```bash
npm install
```

### 2. Siapkan environment

Salin:

- [server/.env.example](/E:/Website/PTQ Imam Ath Thobari/belajar/server/.env.example) -> `server/.env`
- [client/.env.example](/E:/Website/PTQ Imam Ath Thobari/belajar/client/.env.example) -> `client/.env`

### 3. Siapkan MySQL

Jalankan schema dan seed:

```sql
SOURCE server/database/schema.sql;
SOURCE server/database/seed.sql;
```

Atau copy-paste isi [schema.sql](/E:/Website/PTQ Imam Ath Thobari/belajar/server/database/schema.sql) lalu [seed.sql](/E:/Website/PTQ Imam Ath Thobari/belajar/server/database/seed.sql) ke MySQL client Anda.

`seed.sql` sudah membuat akun admin default:

- username: `admin`
- email: `admin@example.com`
- password: `Admin123!`

### 4. Jalankan backend

```bash
npm run dev --workspace server
```

Backend default di `http://localhost:4000`.

> XAMPP note: versi MariaDB lama pada XAMPP tidak menyediakan fungsi `JSON_ARRAYAGG`. Backend ini menggunakan query relasi terpisah untuk login dan profil agar tetap kompatibel dengan instalasi XAMPP umum. Jika database lama masih menyimpan struktur dari percobaan sebelumnya, jalankan schema dan seed kembali setelah memastikan database yang dipakai sama dengan `MYSQL_DATABASE` di `server/.env`.

### 5. Jalankan frontend

Di terminal kedua:

```bash
npm run dev --workspace client
```

Frontend default di `http://localhost:5173`.

## Script penting

```bash
npm run build --workspace client
npm run test --workspace server
```

## API utama

### Auth

- `POST /api/auth/login`
- `GET /api/auth/registration-status`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

### Peserta

- `GET /api/me`
- `PATCH /api/me`
- `GET /api/me/progress`
- `GET /api/dashboard`
- `GET /api/materials`
- `GET /api/materials/:id`
- `POST /api/materials/:id/watch-sessions`
- `POST /api/watch-sessions/:id/heartbeat`
- `POST /api/watch-sessions/:id/finish`
- `GET /api/materials/:id/progress`
- `GET /api/materials/:id/evaluations`
- `GET /api/evaluations/:id`
- `POST /api/evaluations/:id/attempts`
- `POST /api/attempts/:id/submit`
- `GET /api/attempts/:id/result`
- `GET /api/rankings`

### Admin

- `GET|POST|PATCH|DELETE /api/admin/users`
- `POST /api/admin/users/:id/approve`
- `POST /api/admin/users/:id/reject`
- `GET|PUT /api/admin/registration-settings`
- `POST /api/admin/registration-settings/open-now`
- `POST /api/admin/registration-settings/close-now`
- `GET|POST|PATCH|DELETE /api/admin/classes`
- `GET|POST|PATCH|DELETE /api/admin/cohorts`
- `GET|POST|PATCH|DELETE /api/admin/materials`
- `GET|POST|PATCH|DELETE /api/admin/evaluations`
- `GET /api/admin/reports/progress`
- `GET /api/admin/reports/results`

## UI notes

- Halaman login menampilkan tombol daftar hanya jika periode aktif.
- Detail materi menggunakan iframe YouTube dan tombol "Mulai menyimak". Heartbeat 15 detik dikirim ke server selama tab aktif.
- Halaman admin evaluasi memakai editor JSON sederhana untuk nested question/options agar scaffold tetap ringkas tetapi tetap fungsional.

## Pengujian

Test otomatis yang disediakan:

- unit test util ranking
- unit test validasi YouTube URL

## Batasan MVP scaffold

- Heartbeat mengandalkan tombol mulai + visibilitas tab, belum memakai YouTube IFrame Player API penuh.
- Tidak ada refresh token / revoke list; sesi memakai JWT sederhana.
- Pagination admin dasar bisa diperluas.
- Seed SQL hanya menyertakan data awal minimum.
