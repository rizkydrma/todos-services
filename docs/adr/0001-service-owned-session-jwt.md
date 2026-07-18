# Session API memakai JWT service (bukan token Firebase/Google)

Identity proof (password atau Firebase ID token) hanya dipakai di endpoint login. Setelah itu, protected routes memverifikasi **access JWT yang di-sign service** (`JWT_SECRET`), bukan token IdP. Ini memisahkan **siapa user** dari **session API**, memungkinkan revoke/refresh di sisi kita, TTL pendek untuk access, dan satu kontrak Bearer untuk semua metode login.

**Considered options:** pakai Firebase ID token sebagai Bearer di setiap request; session cookie httpOnly saja. Ditolak untuk mobile-first + kontrol session di D1 tanpa bergantung lifetime token Google.
