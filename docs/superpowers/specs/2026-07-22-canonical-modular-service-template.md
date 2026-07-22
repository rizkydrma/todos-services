# Canonical Modular Service Template

**Status:** Implemented (as-built)  
**Date:** 2026-07-22  

Spesifikasi target sudah diimplementasikan. **Sumber kebenaran sekarang:**

- [`docs/architecture.md`](../../architecture.md)
- [`docs/architecture/module-skeleton.md`](../../architecture/module-skeleton.md)
- [`docs/adr/0007-modular-monolith-template.md`](../../adr/0007-modular-monolith-template.md)

## Inti (tidak berubah)

1. Top-level = **modules** per domain, bukan `routes/services/repos` global.
2. Dalam module: `domain` → `application` (+ ports) → `infrastructure` → `http`.
3. Use case = satu aksi; composition root tunggal di `app/container.ts`.
4. Platform untuk envelope, AppError, auth middleware, logger.
5. Besar = tambah module; extract service nanti = pindah folder module (pola internal sama).

Detail dan checklist: ikuti dua dokumen “sumber kebenaran” di atas.
