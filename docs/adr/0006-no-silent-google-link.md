# Google login tidak silent-link by email

`POST /auth/google` **tidak** lagi meng-set `firebase_uid` pada User yang cocok email-nya tetapi `firebase_uid` null (password account). Jika email sudah terpakai → **409** `EMAIL_REGISTERED_USE_PASSWORD` (atau `IDENTITY_CONFLICT` bila `firebase_uid` beda). User baru Google dibuat dengan `email_verified_at` terisi; path by `firebase_uid` boleh backfill verified. Token Firebase wajib claim `email_verified === true`.

**Considered options:** tetap auto-link by email (perilaku lama di design JWT session); “Google wins” hapus akun password unverified. Auto-link ditolak karena memungkinkan **account takeover**: penyerang register email korban, korban Google-login, lalu masuk ke row penyerang. Explicit link setelah password session ditunda ke phase terpisah.
