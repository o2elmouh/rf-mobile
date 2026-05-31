# Wave 2 — Lead-to-rental funnel

**Prereqs:** Wave 1 must be shipped (API client, UserContext, i18n, push registration, error banner). This wave activates the *trigger* side of push notifications.

**Goal of Wave 2.** Surface inbound WhatsApp/Gmail leads on the phone in real time, let the agent build & send a quote, track reservations, and view the rental calendar. Convert a lead → reservation → contract entirely from mobile.

---

## Key correction from cross-check

The DB table is **`pending_demands`** — not `leads`. The Express routes are `/leads/*` but the underlying table is `pending_demands`. When querying Supabase directly, use `pending_demands`.

---

## 2.1 Leads inbox — `src/screens/LeadsScreen.js` (new)

**Endpoint:** `GET /leads`
- Query params: `status` (default `'pending'`), `classification` (optional: `'alert' | 'normal' | 'spam'`)
- Valid status filter values: `pending | waiting | offer_sent | accepted | ignored`
- Response: array of lead objects with fields:
  ```
  id, agency_id, sender_id, source ('whatsapp'|'gmail'),
  channel, status, classification, extracted_data (jsonb),
  summary_for_agent, offered_vehicle_id, offered_price_total,
  media_urls (text[]), created_at, updated_at
  ```

**UI:**
- Tab bar at the top: `Nouveaux (pending) | En attente (waiting) | Devis envoyé (offer_sent) | Acceptés (accepted) | Ignorés (ignored)`.
- Each row: source badge (WhatsApp/Gmail icon), classification badge (`alert` = red, `normal` = green, `spam` = grey), `summary_for_agent`, time ago.
- Pull to refresh. Tap → `LeadDetailScreen`.

**Data fetch:** `apiGet('/leads?status=waiting')` etc.

**TanStack Query** recommended here (cache + invalidate on status change). Same library Wave 1 introduces is fine for everything.

## 2.2 Lead detail — `src/screens/LeadDetailScreen.js` (new)

**Endpoint:** `GET /leads/:id` returns the lead plus a `conversation` jsonb field — an array of `{ role, type, text, timestamp }` messages from the original thread.

**UI sections:**
1. **Header.** Source, sender id (phone/email), status pill (tap to change → `PATCH /leads/:id/status`).
2. **Summary banner.** `summary_for_agent` text. AI-generated 1-sentence summary.
3. **Extracted data.** Form fields editable inline:
   - `requested_car`, `start_date`, `end_date`, `pickup_location`, `return_location`, `requested_extra_days`, `has_id_documents`.
   - Save → `PATCH /leads/:id/extracted` body `{ extracted_data: {...} }`.
4. **Conversation thread.** Render messages in chat-bubble style. Show media via the media proxy (2.5).
5. **CTA bar.** Buttons depending on status:
   - `pending`/`waiting` → "Préparer un devis" (opens SmartQuotePanel).
   - `offer_sent` → "Renvoyer" + "Marquer accepté" (`PATCH status=accepted`).
   - `accepted` → "Créer le contrat" → routes to `NewRentalScreen` prefilled with lead data.

## 2.3 SmartQuotePanel — `src/components/SmartQuotePanel.jsx` (new)

Mirror of web `components/SmartQuotePanel.jsx`.

**Visibility:** Only render when `lead.status === 'waiting' || lead.status === 'offer_sent'`.

**Fields:**
- Vehicle picker — list filtered by availability for the date range using existing `getAvailableVehicles(agencyId, startDate, endDate)` RPC (already wired in mobile lib).
- `startDate`, `endDate` — prefill from `extracted_data` when present.
- `priceTotal` — numeric input in MAD.
- `notes` — optional textarea.

**Send button → endpoint depends on source:**
| `lead.source` | Endpoint | Body |
|---|---|---|
| `'whatsapp'` | `POST /whatsapp/send-offer` | `{ leadId, vehicleId, priceTotal, startDate, endDate, notes? }` |
| `'gmail'` | `POST /email/send-offer` | same |

**After send:** show success state with green confirmation; status auto-transitions to `offer_sent` server-side. Refresh the lead and disable resend (mirror `done = true` web behavior).

## 2.4 Lead status transitions

Endpoint: `PATCH /leads/:id/status`
- Body: `{ status: <new>, classification?: 'lead'|'alert'|'normal'|'spam' }`
- Valid statuses (server-enforced): `pending | processed | ignored | waiting | offer_sent | accepted | converted`

Surface as a popover menu on the status pill in the header. Optimistic update with TanStack Query.

## 2.5 Media proxy — used by 2.2 conversation display

Endpoint: `GET /leads/media?url=<full https url from Supabase>` returns the image bytes with `Cache-Control: public, max-age=86400`.

Render in `<Image source={{ uri: \`${BASE_URL}/leads/media?url=${encodeURIComponent(originalUrl)}\` }} />` so the auth header from `api.js` is attached. (Note: `Image` doesn't use our fetch wrapper by default — you need either `expo-image` with header support or download via `apiGet` and cache locally. Choose during implementation.)

## 2.6 Reservations — `src/screens/ReservationsScreen.js` (new)

**Endpoints:**

| Method | Path | Notes |
|---|---|---|
| `GET` | `/reservations` | Paginated. Response: `{ data: Reservation[], page, pageSize, total }`. Query params via `applyReservationFilters()` — status, date range, vehicle, customer. |
| `GET` | `/reservations/:id` | Single, with joined `clients` + `vehicles`. |
| `POST` | `/reservations` | Body allowed fields: `customer_name, customer_contact, car_model, vehicle_id, client_id, start_date, end_date, total_price, source_channel, status, notes, pickup_location, return_location, daily_rate, extras`. Server fills `agency_id`, `created_by`. |
| `PATCH` | `/reservations/:id` | Partial. Server strips `id`, `agency_id`, `created_at`, `created_by`. |

**`source_channel` enum (uppercase!):** `IN_PERSON | EMAIL | WHATSAPP | WEBSITE | DIRECT`.

**UI:**
- List view with date filters (today / this week / custom range) and source filter.
- Card shows: customer, car, dates, source badge, status pill.
- FAB "+ Nouvelle réservation" → form prefilled with optional `client_id`/`vehicle_id` if navigated from elsewhere.
- Tap row → detail with edit/cancel actions.

**Data:** Express endpoints (server-side filtering and pagination already implemented).

## 2.7 Calendar view — `src/screens/CalendarScreen.js` (new)

The web app's calendar is a month grid of all active rentals + reservations. For mobile, simpler is fine:

- Use `react-native-calendars` (request approval before adding dep).
- Marked dates derived from `contracts` (status='active') and `reservations` between `start_date` and `end_date`.
- Tap a date → bottom sheet listing rentals/reservations starting or ending that day.
- Tap an item → opens contract detail or reservation detail.

**Verify during implementation:** read `pages/Calendar.jsx` (or wherever the web app's monthly grid lives) and match its data source. The cross-check didn't fully verify the file path — confirm before implementation.

## 2.8 Push notification triggers (server-side work)

Wave 1 set up `device_tokens` + client registration. Wave 2 activates server triggers.

**Backend changes (in `Rental flow app SAAS/server/...`):**

1. Add `server/lib/pushNotifications.js`:
   ```js
   import { Expo } from 'expo-server-sdk';
   const expo = new Expo();
   export async function sendToAgency(agencyId, title, body, data) {
     const { data: tokens } = await supabaseAdmin
       .from('device_tokens').select('token').eq('agency_id', agencyId);
     const messages = tokens
       .filter(t => Expo.isExpoPushToken(t.token))
       .map(t => ({ to: t.token, sound: 'default', title, body, data }));
     for (const chunk of expo.chunkPushNotifications(messages)) {
       await expo.sendPushNotificationsAsync(chunk);
     }
   }
   ```

2. Wire triggers:
   - In `server/routes/leads.js` after a webhook ingest completes triage and inserts a new lead → call `sendToAgency(agencyId, 'Nouvelle demande', summary_for_agent, { type: 'lead', id })`.
   - In `server/routes/contracts.js` after `/sign/:token/sign-native` succeeds → push `{ type: 'contract_signed', id }`.
   - On reservation close (return due) — a future job (skip for now).

3. Add `expo-server-sdk` to web app `package.json` (request approval).

**Mobile deep-link handler** (extend `src/lib/notifications.js`): on tap, parse `data.type` → navigate to `LeadDetailScreen` or `ContractDetailScreen`.

## 2.9 Versioning

Bump `APP_VERSION` at the start of the wave (e.g. v1.10.8 → v1.11.0 — minor since new screens land). Confirm web app's Sidebar.jsx matches before pushing.

---

## Files this wave creates or modifies

**New (mobile):**
- `src/screens/LeadsScreen.js`
- `src/screens/LeadDetailScreen.js`
- `src/screens/ReservationsScreen.js`
- `src/screens/ReservationDetailScreen.js`
- `src/screens/CalendarScreen.js`
- `src/components/SmartQuotePanel.jsx`
- `src/components/LeadStatusPill.jsx`
- `src/components/ConversationThread.jsx`
- `src/components/SourceBadge.jsx`

**Modified (mobile):**
- `src/navigation/*` — add tabs/stacks for Leads, Reservations, Calendar (likely promote to a 5–6 tab bar or move some to a "Plus" tab).
- `src/lib/notifications.js` — deep-link routing.

**New (web/server, in `Rental flow app SAAS/`):**
- `server/lib/pushNotifications.js`
- `package.json` — add `expo-server-sdk` (request approval).
- Trigger calls in `server/routes/leads.js` and `server/routes/contracts.js`.

---

## Wave 2 acceptance criteria

1. New WhatsApp/Gmail lead arrives → device receives push within seconds → tap → opens `LeadDetailScreen`.
2. Agent edits extracted fields, builds a quote in SmartQuotePanel, sends — status flips to `offer_sent`.
3. Lead accepted → "Créer le contrat" → flows into existing NewRental wizard prefilled with client + dates from the lead.
4. Reservations list works with filters; new reservation can be created and edited.
5. Calendar shows the current month with rental/reservation markers.
6. Status transitions are optimistic and survive a refresh.

---

## Estimate

Wave 2: 8–12 dev days.

---

## Open questions to resolve during implementation

1. **Calendar source of truth.** Confirm the web app's calendar file path and query.
2. **`expo-image` vs custom auth-fetch** for media proxy display.
3. **Conversion of lead → contract.** The web app likely flips `pending_demands.status` to `'converted'` and stamps a contract id. Confirm how (server endpoint or client-side) before wiring the "Créer le contrat" button.
4. **Reservation → contract path.** Does the web have a "convert reservation to contract" button? If yes, port it.
5. **Push notification i18n.** Title/body strings should come from a server-side i18n catalog keyed on the agency's preferred language (or default to French). For v1, hardcode French — fine.
