# Wave 3 — Money & ops

**Prereqs:** Wave 1 (plumbing) + Wave 2 (push triggers wired) shipped. Admin gating from Wave 0's `useRole()` is in active use.

**Goal of Wave 3.** Invoices fully managed on mobile (generate, send, mark paid). Settings tabs reachable on mobile so an admin can run the agency from a phone: agency info, team, integrations (Gmail IMAP, WhatsApp status), signature template, fleet config, telematics.

---

## 3.1 Invoices list — `src/screens/InvoicesScreen.js` (new)

**No `/invoices` route exists** — invoices are Supabase-direct.

**Schema reference (`invoices` table):**
```
id, agency_id, contract_id, client_id,
invoice_number (text unique), contract_number, client_name, vehicle_name,
total_ht numeric(12,2), tva numeric(12,2), total_ttc numeric(12,2),
days int, start_date, end_date,
status text CHECK (status IN ('pending','paid','cancelled')) default 'pending',
created_at
```

**UI:**
- Filter chips: `Toutes | En attente (pending) | Payées (paid) | Annulées (cancelled)`.
- Each row: invoice_number, client_name, total_ttc, status pill, due date.
- Tap → `InvoiceDetailScreen`.
- Pull to refresh.

**Data:** `supabase.from('invoices').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false })`.

## 3.2 Invoice detail — `src/screens/InvoiceDetailScreen.js` (new)

- Header card with invoice metadata.
- Line items: derive from the linked contract (`contracts` table). For v1, render a single line `{days} × {daily_rate} = total_ht` and the TVA breakdown.
- Buttons:
  - **Marquer payée** → `supabase.from('invoices').update({ status: 'paid' }).eq('id', id)`.
  - **Annuler** → status `cancelled` with confirm dialog.
  - **Envoyer par WhatsApp** → `POST /whatsapp/invoice` body `{ to, clientName, invoiceNumber, totalTTC }`. The to phone comes from `clients.phone`.
  - **Envoyer par email** → no server endpoint exists; show as "bientôt disponible" or skip for v1.

**PDF generation for invoices** — verify web app behavior. If web generates a PDF, port (`expo-print` template). For v1, the WhatsApp send is text-only with a payment-due message, which doesn't need a PDF.

## 3.3 Invoice generation — auto-from-contract

When a contract is closed via the existing Restitution flow, the web app generates an invoice (verify in `lib/db.js` `closeContract` / `finalizeContract`). Make sure the mobile Restitution wizard does the same:

- After successful `POST /contracts/:id/close`, the server should auto-create an `invoices` row. **If it doesn't**, mobile creates one via Supabase direct after the close call returns.
- After `POST /contracts/:id/finalize`, ensure invoice exists with status `pending` and `total_ttc` populated.

**Verify before coding:** Read `server/routes/contracts.js` close/finalize handlers and confirm whether they create invoices. If not, add an invoice insert here on mobile (idempotent — only if `invoices` row doesn't exist for the contract).

---

## 3.4 Settings hub — `src/screens/SettingsScreen.js` (new)

A tabs/cards layout listing sub-screens. Each sub-screen is admin-gated via `useRole().isAdmin` except Privacy.

```
Réglages
├── Agence (admin)
├── Équipe (admin)
├── Intégrations (admin)
│    ├── WhatsApp
│    ├── Gmail
├── Modèle de contrat (admin)
├── Parc & maintenance (admin)
├── Télématique (admin)
├── Confidentialité (everyone)
└── À propos (everyone)
```

Non-admin sees: Confidentialité + À propos only.

## 3.5 Agency settings — `src/screens/settings/AgencyScreen.js` (new)

**Endpoints:**
- `GET /agency` (existing) — returns agency row.
- `PATCH /agency` (admin) — body: partial agency fields (`name`, `ice`, `rc`, `city`, `address`, `phone`, `email`, `logo_url`, branding colors).

**UI:**
- Logo uploader (Supabase Storage, bucket TBD — verify which bucket the web app uses).
- Form fields for the agency identity.
- Brand colors (if web app supports — verify).

## 3.6 Team management — `src/screens/settings/TeamScreen.js` (new)

**Endpoints (`server/routes/team.js`, all `requireAdmin`):**

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/team` | — | `[{ id, full_name, email, role, created_at }]` |
| `POST` | `/team/invite` | `{ email, role?: 'admin' \| 'staff' }` | `{ invited: true, email, role, id, elapsedMs }` — sends Supabase magic-link with metadata `{ agency_id, role, invited_by }` |
| `PATCH` | `/team/:id/role` | `{ role: 'admin' \| 'staff' }` | updated row |
| `DELETE` | `/team/:id` | — | soft delete (sets `agency_id=null, role=null`). Server rejects self-removal. |

**UI:**
- List of members (avatar, name, email, role chip).
- "+ Inviter" FAB → modal with email + role picker → `POST /team/invite`.
- Long-press a row → change role / remove.
- Disable remove on the current user's own row.

## 3.7 Integrations — Gmail IMAP — `src/screens/settings/GmailScreen.js` (new)

**Cross-check note:** the web app does **not** use OAuth — it uses Gmail IMAP + App Password. Mobile UX is therefore just a form.

**Endpoints:**
- `GET /gmail/status` → `{ connected: bool, gmail_address: string|null, last_polled: ISO|null }`
- `POST /gmail/credentials` (no auth — see security note below) body `{ gmail_address, gmail_app_password }` → encrypted server-side.
- `DELETE /gmail/credentials` → clears.

**Security note:** the cross-check flagged that `POST /gmail/credentials` is listed as "no auth required, plain HTTP". **Verify this is gated behind `requireAuth` + `requireAdmin` in the actual `server/routes/gmail.js` middleware chain before exposing the form on mobile.** If it isn't, fix the backend first — credentials must never be writable without auth.

**UI:**
- If connected: show status badge, masked email, last poll time, "Déconnecter" button.
- If not: form with `gmail_address` + `gmail_app_password` (hide-by-default eye toggle) + a help link to Google's app-password docs.

## 3.8 Integrations — WhatsApp — `src/screens/settings/WhatsappScreen.js` (new)

**Cross-check note:** WhatsApp is Twilio-backed, configured via env vars on Railway. Mobile **cannot reconfigure** Twilio credentials. The screen is informational only.

**Endpoint:** `GET /whatsapp/status` → `{ status: 'twilio', connected: true }` (always).

**UI:**
- Status pill (connected via Twilio).
- "Numéro WhatsApp configuré" — surface the agency's `whatsapp_number` field from `agencies` table for display.
- Help text: "Pour modifier la connexion WhatsApp, contactez le support."

## 3.9 Contract template — `src/screens/settings/ContractTemplateScreen.js` (new)

**Endpoints (`server/routes/agency.js`, admin):**
- `POST /agency/contract-template` — multipart, field `template` (PDF). Server validates magic bytes (`%PDF`), uploads to `agency-templates/{agencyId}/contract.pdf`, generates 1-year signed URL, stores in `agencies.contract_template_url`. Response: `{ contract_template_url }`.
- `DELETE /agency/contract-template` — clears.

**UI:**
- Current template preview (open in browser via `Linking.openURL(contract_template_url)`).
- "Remplacer" button → `expo-document-picker` (PDF only) → `apiPostMultipart('/agency/contract-template', formData)`.
- "Supprimer" with confirm.

## 3.10 Fleet & maintenance config — `src/screens/settings/FleetConfigScreen.js` (new)

The web app has automatic maintenance schedules per vehicle brand. **Verify table name and structure** in the web app (likely `maintenance_schedules` or in `agency_settings`).

**UI (v1, simplified):**
- List of vehicle brands with default service intervals (oil, timing belt, etc.).
- Read-only for v1 unless the web exposes an editor — port editing in a follow-up.

## 3.11 Telematics — `src/screens/settings/TelematicsScreen.js` (new)

The web app supports configurable GPS device integration. Endpoints in `server/routes/telemetry.js`:
- `GET /telemetry/devices` — paired devices.
- `GET /telemetry/positions` — current positions.

**Mobile UI for v1:**
- Read-only list of paired devices + their last known position (latitude/longitude). Render a map (`react-native-maps` — request approval) with markers.
- Pairing flow is **out of scope** for v1 (admin uses the web for that).

## 3.12 Privacy — `src/screens/settings/PrivacyScreen.js` (new)

Surface user-visible privacy controls: data export request, anonymization request. Hook into existing `POST /admin/clients/:id/anonymize` for admins; for staff, show only the user's own data.

## 3.13 About — `src/screens/settings/AboutScreen.js` (new)

- App version (from `src/lib/version.js`).
- Backend URL (masked).
- Build number from `expo-constants`.
- Link to opensource credits, terms, privacy.

## 3.14 Versioning

Bump `APP_VERSION` again at start of wave (e.g. v1.11.x → v1.12.0). Update lockstep with web `Sidebar.jsx`.

---

## Files this wave creates or modifies

**New (mobile):**
- `src/screens/InvoicesScreen.js`
- `src/screens/InvoiceDetailScreen.js`
- `src/screens/SettingsScreen.js`
- `src/screens/settings/AgencyScreen.js`
- `src/screens/settings/TeamScreen.js`
- `src/screens/settings/GmailScreen.js`
- `src/screens/settings/WhatsappScreen.js`
- `src/screens/settings/ContractTemplateScreen.js`
- `src/screens/settings/FleetConfigScreen.js`
- `src/screens/settings/TelematicsScreen.js`
- `src/screens/settings/PrivacyScreen.js`
- `src/screens/settings/AboutScreen.js`

**Modified (mobile):**
- `src/navigation/*` — add Settings entry to tab bar or hamburger.
- Possibly `package.json` — `react-native-maps`, `expo-document-picker` (request approval).

**Possibly modified (web/server):**
- `server/routes/gmail.js` — fix middleware if `POST /credentials` lacks `requireAuth + requireAdmin`. **Verify first.**

---

## Wave 3 acceptance criteria

1. Admin opens Invoices → sees agency invoices → marks one as paid → sees status update.
2. Closing a contract auto-creates an invoice (verify path).
3. Admin opens Team → invites a new staff member → they receive a magic link.
4. Admin opens Gmail integration → enters app password → status flips to connected → leads start flowing again.
5. Admin uploads a new contract template PDF → next sent contract uses it.
6. Staff opens Settings → sees only Privacy + À propos.

---

## Estimate

Wave 3: 8–10 dev days.

---

## Open questions to resolve during implementation

1. **Invoice auto-creation** — does the web `closeContract` create the invoice, or does the UI? Verify and mirror.
2. **Gmail credentials endpoint security** — confirm middleware chain. Fix if missing.
3. **Maintenance schedules** — where is the data? Read `pages/OtherPages.jsx` (FleetConfigTab) before designing 3.10.
4. **Logo upload bucket** — which Supabase bucket does the web use for agency logos? Check `pages/OtherPages.jsx` (AgenceTab).
5. **Telematics vendor specifics** — the device pairing UX depends on the vendor. Keep mobile read-only for v1; revisit when telematics becomes a paying feature.
