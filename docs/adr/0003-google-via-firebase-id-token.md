# Google login: backend memverifikasi Firebase ID token

Client melakukan Google Sign-In native, menukar Google idToken ke Firebase (`signInWithCredential`), lalu mengirim **Firebase ID token** ke `POST /auth/google`. Service memverifikasi JWT lewat Google JWKS (`securetoken.google.com/{projectId}`), lalu find/create/link User di D1 dan mengeluarkan Auth Session JWT service.

**Considered options:** verifikasi Google OAuth idToken murni (`accounts.google.com`) di backend tanpa Firebase client. Mungkin nanti; path sekarang sengaja pakai Firebase exchange agar selaras project Firebase Android yang sudah ada (OAuth clients, `google-services.json`).
