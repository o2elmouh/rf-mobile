# Wave 1 — Complete the field flows

**Status as of writing:** Mobile is at branch `master`, untracked work present (rental + restitution wizards, onboarding). Web app is at **v1.10.7**.

**Goal of Wave 1.** A counter agent should be able to do an entire rental + return cycle on their phone alone: scan CIN → create contract → send contract via WhatsApp → return vehicle → AI damage detect → close. Fleet and Clients screens must be functional, not stubs.

---

## Prerequisites — Wave 0 plumbing (must ship before Wave 1 features)

These are infra changes Wave 1 depends on. Build them first.

### 0.1 Express API client (`src/lib/api.js`)

New file. Mirrors the web app's `lib/api.js` pattern (web file at `Rental flow app SAAS/lib/api.js` — read for reference).

```js
// src/lib/api.js
import Constants from 'expo-constants';
import { supabase } from './supabase';

const BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl;
if (!BASE_URL) throw new Error('Missing expoConfig.extra.apiBaseUrl');

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export class ApiError extends Error {
  constructor(status, body) {
    super(typeof body === 'string' ? body : body?.error || `HTTP ${status}`);
    this.status = status; this.body = body;
  }
}

async function request(method, path, { body, headers, isMultipart } = {}) {
  const url = `${BASE_URL}${path}`;
  const auth = await authHeader();
  const finalHeaders = { ...auth, ...(headers || {}) };
  let payload;
  if (isMultipart) {
    payload = body;                            // FormData
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers: finalHeaders, body: payload });
  const text = await res.text();
  const parsed = text ? safeJson(text) : null;
  if (!res.ok) throw new ApiError(res.status, parsed ?? text);
  return parsed;
}
const safeJson = (t) => { try { return JSON.parse(t); } catch { return t; } };

export const apiGet    = (p)         => request('GET', p);
export const apiPost   = (p, body)   => request('POST', p, { body });
export const apiPatch  = (p, body)   => request('PATCH', p, { body });
export const apiDelete = (p)         => request('DELETE', p);
export const apiPostMultipart = (p, formData) => request('POST', p, { body: formData, isMultipart: true });
```

**`app.json` extra:** add `extra.apiBaseUrl` (dev = local Express; prod = Railway URL). Read the web app's `.env.example` to find the production URL.

### 0.2 UserContext + role hook

New file `src/lib/UserContext.js` — provider stores `{ user, profile, role, agencyId }` and exposes `useUser()`. Profile is fetched once on login with `supabase.from('profiles').select('*').eq('id', user.id).single()`.

New file `src/lib/useRole.js`:
```js
import { useUser } from './UserContext';
export function useRole() {
  const { role } = useUser();
  return { role, isAdmin: role === 'admin' };
}
```

Roles confirmed from `server/middleware/auth.js`: `'admin'` and `'staff'`. Default fallback is `'staff'`.

### 0.3 i18n (fr/ar/en with RTL)

Add deps (request approval first per project CLAUDE.md rule about new packages):
- `i18next`, `react-i18next`, `expo-localization`

New file `src/lib/i18n.js`. Load namespaces: `common, auth, onboarding, dashboard, fleet, contracts, clients, invoices, restitution, settings`. **Reuse** translation files from the web app — copy `Rental flow app SAAS/public/locales/{fr,ar,en}/*` into `assets/locales/{fr,ar,en}/` via a `metro.config.js` asset rule, or check them into `src/locales/` directly (simpler; the files are stable).

RTL toggle: on language switch to `ar`, call `I18nManager.forceRTL(true)` + reload (use `expo-updates` reload or `DevSettings.reload()` in dev). Persist language in AsyncStorage.

New component `src/components/LanguageSelector.jsx` modeled on web `components/LanguageSelector.jsx`.

### 0.4 Push notifications

`expo-notifications` and `expo-device` are already in `package.json` per inventory. Extend `src/lib/notifications.js`:

1. On login: request permission, get Expo push token, upsert into new `device_tokens` table.
2. On notification tap: route via deep link (`rentaflow://lead/:id`, `rentaflow://contract/:id`).
3. Foreground handler shows a banner.

New Supabase migration `supabase/migrations/00X_device_tokens.sql`:
```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT CHECK (platform IN ('ios','android')),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tokens" ON device_tokens FOR ALL USING (user_id = auth.uid());
```

Backend hook (Wave 1 ships only the table + token registration; the *trigger* code on the server is layered in during Wave 2 when leads notifications matter — keep this in mind).

### 0.5 Version constant

New file `src/lib/version.js`:
```js
export const APP_VERSION = 'v1.10.8'; // bump in lockstep with web Sidebar.jsx
```
Display on `LoginScreen` footer. Wire into a future Settings → About in Wave 3.

### 0.6 Error banner pattern

New `src/components/ApiErrorBanner.jsx` — renders an `ApiError`'s message, a retry button, and a dismiss. Every screen that calls `apiPost/apiGet` should use it.

### 0.7 CLAUDE.md rule update

Edit mobile `CLAUDE.md` and add under "Code Quality Rules":
> **Versioning:** Bump `APP_VERSION` in `src/lib/version.js` before any commit that you intend to push. Keep it aligned with the web app's `components/Sidebar.jsx` version.

### Wave 0 acceptance

- Login → API ping succeeds (`apiGet('/health')` returns OK).
- Language selector flips fr/ar/en; Arabic forces RTL.
- Push token registered in `device_tokens` after first login.
- Version visible on Login screen.

---

## Wave 1 features

For each feature: target file(s), exact data shapes, and acceptance criteria. **Field names below are verified against `supabase/migrations/001_initial_schema.sql` — use them exactly.**

### 1.1 Fleet CRUD — `src/screens/FleetScreen.js`

Replace the current stub with full vehicle management.

**Schema reference (`vehicles` table):**
- `id UUID`, `agency_id UUID`
- `plate_number TEXT UNIQUE` *(not `plate`)*
- `brand TEXT` *(not `make`)*
- `model TEXT`, `year INT`
- `fuel_type` enum: `'gasoline' | 'diesel' | 'electric' | 'hybrid'`
- `daily_rate NUMERIC(10,2)`
- `status` enum: `'available' | 'rented' | 'maintenance' | 'retired'`

**UI:**
- Top: search bar (filter by plate, brand, model), status filter chips.
- Pull-to-refresh list with vehicle card (plate, brand/model, status badge, daily_rate).
- FAB → "Add vehicle" modal form.
- Tap row → navigate to `FleetDetailScreen` (1.2).
- Long-press → delete confirm (`supabase.from('vehicles').delete().eq('id', id)`).

**Data calls:** Supabase direct.

### 1.2 Fleet detail — `src/screens/FleetDetailScreen.js` (new)

Tabs or sections:
- **Info:** editable fields above.
- **Photos:** carousel of reference photos. Tap to add. **Storage bucket to verify** — the cross-check found `signed_contracts` and `agency-templates` but no dedicated vehicle photos bucket. Open web app's Fleet page (`pages/Fleet.jsx`) before coding this and identify the bucket/folder convention. If none exists, propose a new bucket `vehicle-photos/{agencyId}/{vehicleId}/{filename}` and add a migration for it.
- **Maintenance:** list of upcoming maintenance reminders (read-only for v1; the web app has automatic maintenance schedules in `FleetConfigTab` — out of scope for mobile until Wave 3 Settings).
- **Repairs:** list of `repairs` table rows for this vehicle. Add-repair form.
  - `repairs` schema: `vehicle_id UUID`, `contract_id UUID NULL`, `type TEXT`, `cost NUMERIC`, `date DATE`, `is_sinistre BOOLEAN`, `sinistre_id TEXT`, `insurance_ref`, `insurance_reimbursement`, `client_franchise`.

### 1.3 Reference photos upload

Use `expo-image-picker` + `supabase.storage.from(<bucket>).upload(...)`. Compress on-device (`expo-image-manipulator`) to <500KB before upload. Store the public/signed URL on a vehicle-photos row or on the vehicle record itself — match whatever convention `pages/Fleet.jsx` uses.

### 1.4 Clients CRUD — `src/screens/ClientsScreen.js`

Replace stub. Schema reference (`clients` table, exact fields):
- `first_name`, `last_name`
- `id_number` *(not `cin_number`)*, `id_type` (`'cin' | 'passport'`, default `'cin'`)
- `id_expiry DATE`
- `driving_license_num`, `driving_license_expiry DATE`
- `date_of_birth DATE`
- `phone`, `email`
- `nationality` (default `'MA'`), `address`, `city`, `country` (default `'MA'`)
- `agency_id UUID`

**UI:** search by name/phone/id_number; list with avatar (initials); add/edit form (all fields above); delete with confirm. Supabase direct.

### 1.5 Client detail — `src/screens/ClientDetailScreen.js` (new)

- Header card with client info.
- **Rental history:** `contracts` where `client_id = :id`, ordered by `pickup_date DESC`.
- **Quick actions:** Call (`Linking.openURL('tel:...')`), WhatsApp (`Linking.openURL('https://wa.me/...')`), Edit, Delete.
- Notes field (free text on `clients.notes` — verify column exists in schema before relying on it; if not, add a `notes TEXT` column via migration).

### 1.6 Contract list polish — `src/screens/ContractsScreen.js`

Existing screen already fetches contracts with joined client/vehicle. Add:
- Status filter chips: `draft | active | closed | cancelled` (exact enum values from schema).
- Search by plate or client name (client-side filter against fetched list — fine until list >500 contracts).
- Sort: `pickup_date DESC` default; toggle for `return_date ASC`.
- Tap row → navigate to `ContractDetailScreen` (1.7).

### 1.7 Contract detail + actions — `src/screens/ContractDetailScreen.js` (new)

The biggest feature in Wave 1. Renders full contract + signing PDF + action buttons.

**Data load:**
- `supabase.from('contracts').select('*, clients(*), vehicles(*)').eq('id', id).single()`
- If `signed_pdf_path` exists, call `GET /contracts/:id/signed-pdf-url` → returns `{ url, expires_in: 60 }`. Open in `expo-web-browser` or `react-native-pdf` viewer.

**Actions (admin or contract owner):**

| Action | Endpoint | Body | Notes |
|---|---|---|---|
| Send WhatsApp | `POST /contracts/:id/send-whatsapp` | `{ pdf_base64: 'data:application/pdf;base64,...' }` | Returns `{ success, sign_url, expires_at }`. The PDF is the unsigned contract; generate locally or fetch from `unsigned_pdf_path`. |
| Send Email | `POST /contracts/:id/send-email` | `{ pdf_base64 }` | Same shape. Note: `email/contract` is a placeholder in the web app — the **`/contracts/:id/send-email` route** is what actually works. |
| Extend | `POST /contracts/:id/extend` | `{ newEndDate: 'YYYY-MM-DD', dailyRate?: number }` | Returns `{ contract, extraDays, extraAmount }`. |
| Close | `POST /contracts/:id/close` | `{ returnKm, returnFuelLevel, damages?, extraFees? }` | Returns `{ contract }`. |
| Finalize | `POST /contracts/:id/finalize` | `{}` | Returns `{ contract, alreadyFinalized? }`. |
| Send final invoice | `POST /contracts/:id/send-final` | `{ channel: 'email' \| 'whatsapp', pdf_base64, recipient? }` | Returns `{ success, channel, note? }`. |

**Closure flow** is already covered by the Restitution wizard; the Close button on this screen is a shortcut that opens the wizard prefilled with this contract.

**PDF generation:** the web app generates the unsigned PDF somewhere (likely `lib/pdfGenerator.js` or similar — verify). For mobile, either:
- (a) Generate the same PDF locally with `expo-print` and the same template, OR
- (b) Add a new server endpoint `GET /contracts/:id/unsigned-pdf` that returns the rendered PDF as base64.

**Recommendation:** (b) — keeps PDF generation in one place. **Decision deferred to implementation.** Open the web app's PDF generation code before choosing.

### 1.8 OCR via Express — refactor `MRZScannerScreen.js` + `DocumentCameraScreen.js`

Endpoint: `POST /ocr/scan-claude`
- **Request:** `multipart/form-data` with field name `document` (image binary), optional body field `hint` ∈ `['cin','license','passport']`.
- **Response:** `{ id_number, id_expiry, first_name, last_name, date_of_birth, driving_license_num, driving_license_expiry, nationality }`.

Use the new `apiPostMultipart(path, formData)` helper. Keep MRZ on-device as a fast hint (autofill while waiting), but make the server response the source of truth. Map response fields directly to client form state.

### 1.9 Damage AI in Restitution — `src/screens/restitution/ReturnPhotosStep.js` + new `src/screens/restitution/AiDamagePanel.jsx`

Endpoint: `POST /ai/detect-damage`
- **Request:**
  ```json
  {
    "beforePhotos": ["data:image/jpeg;base64,..."],
    "afterPhotos":  ["data:image/jpeg;base64,..."],
    "contractNumber": "CNT-2026-001",
    "vehicleName": "Renault Clio - 1234-A-56",
    "clientName": "Mohamed El Alami"
  }
  ```
  Max 6 photos per array. Server returns 400 if exceeded.
- **Response:**
  ```json
  {
    "hasDamage": true,
    "confidence": "high|medium|low",
    "damages": [{ "zone": "Pare-choc avant", "description": "Rayure 15cm", "severity": "minor|major|cosmetic" }],
    "summary": "...",
    "recommendation": "Facturer... | Aucun frais... | Vérification...",
    "analysedAt": "ISO timestamp"
  }
  ```

**`AiDamagePanel.jsx`** — renders the damages list with severity badges, recommendation banner, and lets the user **edit before save** (add/remove zones, override severity). The edited list is what gets passed to `POST /contracts/:id/close` as the `damages` field.

**Image compression mandatory** — base64 of a raw camera photo will blow up the request. Pipe each photo through `expo-image-manipulator` (resize to max 1600px, quality 0.7) before encoding.

### 1.10 Contract creation — *no change to backend pattern*

Cross-check confirmed: web app uses `lib/db.js:287 saveContract()` → `sbUpsert('contracts', ...)` (Supabase direct). Mobile `Step4ConfirmScreen.js` keeps the same approach. Verify field name mapping matches web's `contractToDb()` (in `lib/db.js:199-229`):

| JS camelCase | DB snake_case |
|---|---|
| `startDate` | `pickup_date` |
| `endDate` | `return_date` |
| `returnDate` | `actual_return_date` |
| `returnMileage` / `mileageIn` | `mileage_end` |
| `returnFuelLevel` | `fuel_level_end` |

`contracts.status` enum: `'draft' | 'active' | 'closed' | 'cancelled'`. New contracts default to `'active'` (or `'draft'` if signing pending — confirm by reading web app).

---

## Storage bucket conventions (verified + to verify)

| Purpose | Bucket | Status |
|---|---|---|
| Unsigned + signed contract PDFs | `signed_contracts` | Verified — paths in `contracts.unsigned_pdf_path`, `contracts.signed_pdf_path`. |
| Agency contract templates | `agency-templates` | Verified — path `{agencyId}/contract.pdf`. |
| Vehicle reference photos | TBD | **Verify before 1.3.** No dedicated bucket found in cross-check; check `pages/Fleet.jsx`. |
| Rental pickup/return photos | TBD | `contract_photos` table exists with `url` column, but bucket name not confirmed. Check `pages/NewRental.jsx` photo upload and `pages/Restitution.jsx`. |

---

## Open questions to resolve during Wave 1 implementation

1. **PDF generation location** (1.7): generate on mobile with `expo-print`, or add a server endpoint?
2. **Vehicle photos bucket** (1.2/1.3): which existing bucket, or do we add a new one?
3. **Rental photos bucket** (used by Step3PhotosScreen, already implemented partially): confirm naming.
4. **Maintenance reminders source** (1.2 Maintenance tab): how does the web app surface them? Just read whatever query `pages/Fleet.jsx` uses.
5. **Push trigger wiring** — Wave 0 only adds the device_tokens table + client registration. The actual *trigger* (server-side `expo-server-sdk` send) lives in Wave 2 because lead notifications are the first real use case.

---

## Wave 1 acceptance criteria

A counter agent on a fresh install can:

1. Log in, pick language (fr/ar/en), see version on login screen.
2. Open Fleet, add a vehicle, edit it, upload a reference photo, delete it.
3. Open Clients, search, add a new client with full CIN + license fields, view their rental history.
4. Start a new rental: scan CIN → server-OCR autofills client → pick vehicle → take pickup photos → sign/confirm → contract appears in Contracts list.
5. From Contracts → contract detail → send by WhatsApp (or email) → receive Twilio confirmation.
6. Return vehicle via Restitution wizard → upload return photos → AI damage panel populates → edit/confirm → close contract → finalize.
7. Admin sees admin-only actions; staff doesn't.
8. All actions show retry banner on transient failures.

---

## Estimate

- Wave 0: 3–4 dev days.
- Wave 1: 10–14 dev days.
- Total Wave 1 ship: ~3 calendar weeks for one developer at full focus.

---

## Files this wave creates or modifies (summary)

**New files:**
- `src/lib/api.js`
- `src/lib/UserContext.js`
- `src/lib/useRole.js`
- `src/lib/i18n.js`
- `src/lib/version.js`
- `src/locales/{fr,ar,en}/*.json` (copies of web)
- `src/components/LanguageSelector.jsx`
- `src/components/ApiErrorBanner.jsx`
- `src/screens/FleetDetailScreen.js`
- `src/screens/ClientDetailScreen.js`
- `src/screens/ContractDetailScreen.js`
- `src/screens/restitution/AiDamagePanel.jsx`
- `supabase/migrations/00X_device_tokens.sql`
- (maybe) `supabase/migrations/00Y_vehicle_photos_bucket.sql`

**Modified:**
- `src/screens/FleetScreen.js` (stub → full)
- `src/screens/ClientsScreen.js` (stub → full)
- `src/screens/ContractsScreen.js` (filters/search)
- `src/screens/rental/MRZScannerScreen.js`
- `src/screens/rental/DocumentCameraScreen.js`
- `src/screens/rental/Step4ConfirmScreen.js` (verify field mapping)
- `src/screens/restitution/ReturnPhotosStep.js`
- `src/lib/notifications.js`
- `App.js` (wrap with UserContext + i18n)
- `app.json` (add `extra.apiBaseUrl`)
- `package.json` (i18next deps — request approval first)
- `CLAUDE.md` (versioning rule)
