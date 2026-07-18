# Password email disimpan sebagai hash di D1 (bukan Firebase email/password)

Login email/password adalah first-party credential: service meng-hash password (PBKDF2-SHA256, Web Crypto) dan menyimpan `password_hash` di D1. Firebase **tidak** dipakai untuk create/verify password. Alasan: kontrol penuh di Workers/D1, tidak wajib Firebase API key untuk path email, dan user non-Gmail didukung tanpa Identity Toolkit.

**Considered options:** Firebase Authentication email/password; Auth0/Clerk. Ditolak di phase 1 demi kesederhanaan stack dan ownership data di D1.
