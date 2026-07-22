# Modular monolith + per-module use cases/ports sebagai template kanonik kecil→besar

**Status:** accepted · implemented

Service ini adalah **contoh arsitektur tunggal** dari project kecil sampai besar. Kita menolak technical folders global (`routes/` + `services/` + `repositories/`) sebagai end-state, microservices-first, dan Clean Architecture ritual berlebih.

**Keputusan:** **Modular Application Architecture** — top-level `modules/<feature>` (`domain` → `application` + ports → `infrastructure` → `http`), `platform/` untuk HTTP/error/authn/observability, **satu composition root** di `app/container.ts`. Unit aplikasi = use case per aksi. Cross-module lewat public API + wiring container.

**Consequences:** lebih banyak file tipis di skala kecil (sengaja); onboarding = tiru skeleton; extract service = pindah module folder. Auth (ADR 0001–0006) tidak berubah secara behaviour.

**As-built:** [`docs/architecture.md`](../architecture.md) · skeleton [`docs/architecture/module-skeleton.md`](../architecture/module-skeleton.md)
