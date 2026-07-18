# Refresh memakai rotation + revoke server-side

Setiap Auth Session menyimpan refresh di tabel `refresh_tokens` (hash SHA-256 + `jti`). Saat `POST /auth/refresh`, service memverifikasi JWT refresh, mencocokkan hash/jti/user, **me-revoke** baris lama, lalu menerbitkan access + refresh baru. Logout me-revoke `jti` (idempotent). Ini membatasi reuse refresh yang bocor dan memungkinkan invalidasi session tanpa menunggu `exp` access token saja.

**Considered options:** refresh stateless JWT-only tanpa tabel; reuse refresh yang sama sampai expired. Ditolak karena tidak bisa logout server-side yang andal dan lebih rentan replay.
