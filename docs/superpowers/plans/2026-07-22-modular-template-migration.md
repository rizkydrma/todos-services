# Modular Template Migration — COMPLETED

**Status:** Completed 2026-07-22  
**Result:** Kode production memakai Modular Application Architecture.

Jangan ikuti langkah migrasi di dokumen lama — migrasi sudah selesai dan path legacy (`services/`, `repositories/`, shim) **sudah dihapus**.

## Hasil

| Area | Lokasi sekarang |
|------|-----------------|
| Composition root | `src/app/container.ts` |
| HTTP app | `src/app/create-app.ts` |
| Platform | `src/platform/` |
| Features | `src/modules/{auth,todos,categories,tags,uploads,users}/` |
| Route mount | `src/routes/index.ts` |
| Tests | `tests/modules/`, `tests/routes/`, `tests/lib/` |

## Dokumen hidup

- [`docs/architecture.md`](../../architecture.md)
- [`docs/architecture/module-skeleton.md`](../../architecture/module-skeleton.md)
- [`docs/adr/0007-modular-monolith-template.md`](../../adr/0007-modular-monolith-template.md)
