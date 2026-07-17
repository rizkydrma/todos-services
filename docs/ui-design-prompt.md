# Prompt Desain UI — Todo App

Kami sedang membangun sebuah aplikasi **Todo Management** dengan REST API backend yang sudah jadi. Sekarang kami butuh desain UI/UX yang clean, modern, dan produktif. Berikut penjelasan lengkap tentang aplikasi dan fitur-fiturnya.

---

## Tentang Aplikasi

Ini adalah aplikasi manajemen tugas (todo) berbasis web, di mana user bisa mengelola daftar tugas pribadi mereka. Aplikasi punya dua sisi:

1. **Sisi User Biasa** — untuk mengelola todo pribadi
2. **Sisi Admin** — untuk mengelola data master (kategori, tag, dan user lain)

Setiap user harus login dulu menggunakan akun Google/Firebase Auth. Tidak ada registrasi email-password tradisional — semua lewat Firebase Authentication (Google Sign-In, dll).

---

## Role Pengguna

| Role   | Hak Akses                                                                 |
| ------ | -------------------------------------------------------------------------- |
| User   | Kelola todo milik sendiri, lihat kategori & tag, lihat profil sendiri      |
| Admin  | Semua hak user + kelola kategori, kelola tag, kelola user lain (CRUD + ubah role) |

---

## Fitur-Fitur (Urutan Alur Pengguna)

### 1. Authentication Flow

- **Register** : User yang baru pertama kali login dengan akun Google harus diregistrasikan ke sistem. Setelah itu baru bisa akses aplikasi penuh.
- **Login** : User yang sudah terdaftar tinggal login — dapatkan profil dan token akses.
- **Profil Saya** : User bisa melihat data profilnya (nama, email, role).

### 2. Todo Management (Fitur Utama)

#### List Todo (Dashboard Utama)

- Menampilkan daftar todo milik user yang sedang login
- Setiap item todo menampilkan: **title**, **status** (selesai/belum), **priority** (low/medium/high), **category** (jika ada), **tags** (jika ada), **due date** (jika ada)
- Bisa **filter** berdasarkan:
  - Status: `completed` (sudah selesai) atau `active` (belum selesai)
  - Kategori: pilih kategori tertentu
  - Tag: pilih tag tertentu
  - Prioritas: `low`, `medium`, atau `high`
- Bisa **cari** berdasarkan kata kunci di title todo
- Bisa **sorting**: berdasarkan `createdAt` (default, terbaru dulu), atau field lain
- **Pagination**: menampilkan jumlah item per halaman (default 20), dengan navigasi halaman
- Ada tombol **batch actions**: "Tandai Semua Selesai" dan "Hapus yang Selesai"

#### Buat Todo Baru

- Form dengan field:
  - **Title** (wajib)
  - **Description** (opsional, textarea)
  - **Priority**: pilihan low / medium / high (default: medium)
  - **Category**: dropdown pilih kategori yang ada
  - **Tags**: multi-select tags
  - **Due Date**: date picker (opsional)

#### Detail Todo

- Melihat detail satu todo lengkap dengan semua field

#### Edit Todo

- Bisa update semua field (title, description, completed toggle, priority, category, tags, due date)

#### Hapus Todo

- Konfirmasi sebelum hapus

#### Batch Actions

- **Complete All**: menandai semua todo user sebagai selesai
- **Delete Completed**: menghapus semua todo yang sudah selesai

### 3. Kategori (Category Management)

- Kategori adalah pengelompokan todo, misalnya: "Work", "Personal", "Health"
- Setiap kategori punya **nama** dan **warna** (color)
- **User biasa**: hanya bisa **melihat** daftar kategori (untuk dipilih saat buat todo)
- **Admin**: bisa **membuat**, **mengedit** (nama & warna), dan **menghapus** kategori

### 4. Tag Management

- Tag adalah label tambahan, bisa lebih dari satu per todo, misalnya: "urgent", "meeting", "follow-up"
- Tag punya **nama** dan **warna**
- Relasi many-to-many: satu todo bisa punya banyak tag, satu tag bisa dipakai banyak todo
- **User biasa**: hanya bisa **melihat** daftar tag
- **Admin**: bisa **membuat**, **mengedit** (nama & warna), dan **menghapus** tag

### 5. User Management (Admin Only)

- Halaman khusus admin untuk mengelola user terdaftar
- **List User**: tabel yang menampilkan nama, email, role, dan tanggal bergabung semua user
- **Detail User**: melihat profil lengkap seorang user
- **Edit Role**: admin bisa mengganti role user dari `user` ke `admin` atau sebaliknya
- **Hapus User**: admin bisa menghapus user (dan semua todo-nya)

---

## Data Model yang Perlu Ditampilkan di UI

### Todo

- `id`, `title`, `description`, `completed` (boolean), `priority` (low/medium/high), `dueDate`, `category` (nama & warna), `tags` (array nama & warna), `createdAt`, `updatedAt`

### Category

- `id`, `name`, `color`

### Tag

- `id`, `name`, `color`

### User

- `id`, `email`, `name`, `role` (user/admin), `createdAt`

### Pagination Meta

- `page`, `limit`, `total`, `totalPages`

---

## Kebutuhan Halaman / Screen

| No  | Halaman                    | Untuk Role     |
| --- | -------------------------- | -------------- |
| 1   | Login / Register           | Public         |
| 2   | Dashboard (List Todo)      | User & Admin   |
| 3   | Form Buat Todo             | User & Admin   |
| 4   | Detail Todo                | User & Admin   |
| 5   | Edit Todo                  | User & Admin   |
| 6   | Profil Saya                | User & Admin   |
| 7   | Manajemen Kategori         | Admin          |
| 8   | Form Tambah/Edit Kategori  | Admin          |
| 9   | Manajemen Tag              | Admin          |
| 10  | Form Tambah/Edit Tag       | Admin          |
| 11  | Manajemen User             | Admin          |
| 12  | Detail User                | Admin          |

---

## UI/UX Requirements

- **Responsive**: bisa dipakai di desktop dan mobile
- **Dark & Light mode**
- **Loading states**: skeleton loader saat fetch data
- **Empty states**: ilustrasi saat belum ada todo / data
- **Error states**: toast atau inline message untuk error (validasi, network, dll)
- **Optimistic UI**: toggle todo completed langsung berubah tanpa nunggu response server
- **Infinite scroll atau pagination** di list todo
- **Filter chips/tabs** untuk filtering aktif yang mudah dihapus
- **Color indicators** untuk kategori dan tag (dot, badge, atau chip berwarna)
- **Priority visual**: indikator warna berbeda untuk low (hijau), medium (kuning), high (merah)
- **Navigation sidebar** dengan menu yang berubah berdasarkan role (admin lihat lebih banyak menu)

---

## Tech Stack Frontend (Referensi)

Backend sudah pakai Hono + Cloudflare Workers. Untuk frontend bisa pakai:

- **React / Next.js** + TailwindCSS + shadcn/ui (direkomendasikan)
- Atau framework lain yang nyaman
