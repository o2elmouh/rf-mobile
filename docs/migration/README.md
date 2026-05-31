# RentaFlow Mobile — Migration Plan (Web → Mobile)

This folder holds the phased plan for bringing the RentaFlow mobile app to full parity with the web app at `C:\Users\otman\Downloads\01-RentaFlow-SAAS\Rental flow app SAAS`.

## Decisions locked at brainstorm time

| Decision | Choice |
|---|---|
| Primary user | Both field staff and admin/owner — full parity over time |
| Backend strategy | **Hybrid.** Supabase direct for reads/simple writes; Express API for anything needing server secrets (OCR, damage AI, WhatsApp/Gmail send, leads pipeline, network, team admin). |
| Offline support | **Online-only.** Fail gracefully with retry banners. |
| Push notifications | **In scope, high priority.** Lead arrival, contract signed, return due, payment. |
| Phasing approach | **A — vertical by user journey.** Each wave ships a complete user-visible story. |
| i18n | French / Arabic (RTL) / English — reuse web's 10 namespaces verbatim. |
| Current versions | Mobile starts at v1.10.8 (one bump above web v1.10.7). Bump in lockstep going forward. |

## The four waves

| File | Wave | Goal | Estimate |
|---|---|---|---|
| [WAVE1-field-flows.md](./WAVE1-field-flows.md) | Wave 0 + Wave 1 | Plumbing (Express client, push, i18n, roles, error banner) + complete the field flows (Fleet, Clients, Contracts actions, OCR via Express, AI damage detection in Restitution). | ~3 weeks |
| [WAVE2-lead-funnel.md](./WAVE2-lead-funnel.md) | Wave 2 | Leads inbox + SmartQuotePanel + Reservations + Calendar + push triggers wired server-side. | ~2 weeks |
| [WAVE3-money-ops.md](./WAVE3-money-ops.md) | Wave 3 | Invoices + full Settings (Agency, Team, Gmail IMAP, WhatsApp status, Contract template, Telematics read-only). | ~2 weeks |
| [WAVE4-network-accounting.md](./WAVE4-network-accounting.md) | Wave 4 | Inter-agency Network (cross_agency_requests) + phone-lite Accounting (PnL, aged receivables, utilization, deposits, bilan). | ~1.5 weeks |

## How to use these docs

1. Read this README + the wave you're starting.
2. Open the matching web app files referenced in the "Verify before implementing" sections of each wave — never assume DB column names or endpoint signatures; they have been cross-checked but the docs may drift.
3. Follow the mobile project's `CLAUDE.md` rules (verify Supabase fields against `Rental flow app SAAS/supabase/migrations/001_initial_schema.sql` before any new query).
4. Bump `src/lib/version.js` `APP_VERSION` at the start of each wave.
5. Do not push to `master` without explicit user instruction (mirror the web `staging` rule).

## Explicit non-goals (apply to every wave)

- Offline-first sync.
- E-signature capture on the device (customer signs via web).
- Contract template PDF generation/upload — admin file mgmt stays desktop.
- Accounting journal grid, plan comptable editor, PDF/CSV export.
- Telematics device pairing UI.

## Key endpoint reference (one-page)

| Endpoint | Method | Auth | Used in wave |
|---|---|---|---|
| `/health` | GET | none | 0 (smoke) |
| `/ocr/scan-claude` | POST multipart | auth | 1 |
| `/ai/detect-damage` | POST | auth | 1 |
| `/contracts/:id/send-whatsapp` | POST | auth | 1 |
| `/contracts/:id/send-email` | POST | auth | 1 |
| `/contracts/:id/extend` | POST | auth | 1 |
| `/contracts/:id/close` | POST | auth | 1 |
| `/contracts/:id/finalize` | POST | auth | 1 |
| `/contracts/:id/send-final` | POST | auth | 1 |
| `/contracts/:id/signed-pdf-url` | GET | auth | 1 |
| `/leads` | GET | auth | 2 |
| `/leads/:id` | GET | auth | 2 |
| `/leads/:id/status` | PATCH | auth | 2 |
| `/leads/:id/extracted` | PATCH | auth | 2 |
| `/leads/media` | GET | auth | 2 |
| `/whatsapp/send-offer` | POST | auth | 2 |
| `/email/send-offer` | POST | auth | 2 |
| `/whatsapp/invoice` | POST | auth | 3 |
| `/reservations` | GET/POST/PATCH | auth | 2 |
| `/team` | GET/POST/PATCH/DELETE | admin | 3 |
| `/gmail/credentials` | POST/DELETE | (verify auth!) | 3 |
| `/gmail/status` | GET | auth | 3 |
| `/whatsapp/status` | GET | auth | 3 |
| `/agency` | GET/PATCH | auth/admin | 3 |
| `/agency/contract-template` | POST multipart / DELETE | admin | 3 |
| `/network/search` | GET | auth | 4 |
| `/network/requests` | POST | auth | 4 |
| `/network/requests/incoming` | GET | auth | 4 |
| `/network/requests/outgoing` | GET | auth | 4 |
| `/network/requests/borrowed-fleet` | GET | auth | 4 |
| `/network/requests/:id/status` | PATCH | auth | 4 |
| `/network/requests/:id/reveal` | GET | auth | 4 |
| `/telemetry/devices` | GET | auth | 3 |
| `/telemetry/positions` | GET | auth | 3 |

## Schema corrections to remember

These tripped up the planning; bake them into mobile code.

- Vehicles: `brand` (not `make`), `plate_number` (not `plate`).
- Clients: `id_number` (not `cin_number`).
- Contracts: `actual_return_date` (not `return_date_actual`), `pickup_date`, `return_date`.
- Profiles: NO `email` column (live DB). Email lives on `auth.users`.
- Leads: the DB table is **`pending_demands`**, not `leads`.
- Network requests: table **`cross_agency_requests`**, status **UPPERCASE** (`PENDING|APPROVED|REJECTED|COMPLETED|CANCELLED`).
- Reservations `source_channel`: UPPERCASE (`IN_PERSON|EMAIL|WHATSAPP|WEBSITE|DIRECT`).
- Vehicle network visibility: column `is_network_visible` + `network_daily_price` on `vehicles`.

## Total estimate

Solo developer at full focus: ~8–9 calendar weeks to reach full Wave 4 parity. Each wave is independently shippable.
