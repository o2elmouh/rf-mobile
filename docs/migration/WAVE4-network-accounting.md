# Wave 4 — Network + Accounting (lite)

**Prereqs:** Wave 1–3 shipped. Admin gating active. Fleet detail screen exists (Wave 1) — we extend it with a network-visibility toggle.

**Goal of Wave 4.** Bring inter-agency vehicle borrowing (Network) and a phone-readable accounting summary to mobile. The accounting view is intentionally a *lite* version of the web — no journal grid, no plan comptable editor on phone.

---

## Network (4.1 – 4.7)

### 4.1 Network visibility toggle — extend `src/screens/FleetDetailScreen.js` (Wave 1)

Add to the Info section of each vehicle:

- Switch: "Visible sur le réseau" (`is_network_visible`).
- Number input (shown only when visible): "Tarif journalier inter-agence (MAD)" (`network_daily_price`).

**Data write:** Supabase direct.
```js
await supabase.from('vehicles')
  .update({ is_network_visible: visible, network_daily_price: price })
  .eq('id', vehicleId);
```

**Verify during implementation:** the web inventory mentioned a `PATCH /network/vehicles/:id/visibility` endpoint but the cross-check did not confirm it exists in `server/routes/network.js`. If the route exists, prefer it (server may enforce additional invariants like requiring `network_daily_price > 0`). If not, the Supabase update above is the canonical path.

### 4.2 Network search — `src/screens/NetworkSearchScreen.js` (new)

**Endpoint:** `GET /network/search`
- **Query (required):** `startDate`, `endDate` (ISO).
- **Query (optional):** `city`, `transmission`.
- **Response:** `{ results: MaskedCarDTO[], total }`. Owning agency identity is **masked** until a request is approved.

**UI:**
- Top filter bar: date range picker (required), city autocomplete (optional, ILIKE on `agencies.city`), transmission filter (`manual | automatic` — verify enum).
- Result cards: vehicle brand/model, year, transmission, price/day, agency city (no agency name until approved).
- Tap → request modal (see 4.3).

### 4.3 Send borrow request — modal in NetworkSearchScreen

**Endpoint:** `POST /network/requests`
- **Body:** `{ vehicle_id, start_date, end_date, requester_notes? }`
- **Server behavior:** computes `agreed_price = network_daily_price * days`, rejects on date overlap with existing `PENDING`/`APPROVED` for the same vehicle.
- **Response:** `{ request: CrossAgencyRequest }` (201).

UI: a confirm sheet showing the computed total + notes textarea + "Envoyer la demande".

### 4.4 My outgoing requests — `src/screens/NetworkOutgoingScreen.js` (new)

**Endpoint:** `GET /network/requests/outgoing` → `{ requests: CrossAgencyRequest[] }`.

Each row: vehicle name, dates, agreed_price, status pill, owner_notes if set.

**Status enum (UPPERCASE):** `PENDING | APPROVED | REJECTED | COMPLETED | CANCELLED`.

**Actions allowed (requester side):**
- `PENDING` → "Annuler" → `PATCH /network/requests/:id/status` body `{ status: 'CANCELLED' }`.
- `APPROVED` → "Annuler" (same).
- `APPROVED`/`COMPLETED` → "Voir les coordonnées" → `GET /network/requests/:id/reveal` returns `{ request, agencies, vehicle }` with the owning agency's phone/email/address.

### 4.5 Incoming requests (owner) — `src/screens/NetworkIncomingScreen.js` (new)

**Endpoint:** `GET /network/requests/incoming` → server **strips requesting agency identity** (only vehicle + dates visible) until approved.

**Actions (owner side):**
- `PENDING` → "Approuver" / "Rejeter" with optional `owner_notes` → `PATCH /network/requests/:id/status` body `{ status: 'APPROVED' | 'REJECTED', owner_notes? }`.
- `APPROVED` → "Marquer terminé" → status `COMPLETED`.

**Side effects of approval (server-managed):** the underlying vehicle's `status` flips to `rented`. Don't replicate this client-side.

### 4.6 Borrowed fleet (use someone else's car) — extend NewRentalScreen

**Endpoint:** `GET /network/requests/borrowed-fleet?startDate=&endDate=` → `{ vehicles: VehiclePickerDTO[] }`. These are vehicles the agency has been approved to use, shaped for the rental picker. Daily rate comes from `network_daily_price`.

**Integration:** in the existing Step2DetailsScreen vehicle picker, merge the available-vehicles list with the borrowed-fleet list. Add a "Réseau" badge on borrowed vehicles. The downstream contract creation should record the cross-agency context — **verify** how the web app does this on contract insert.

### 4.7 Network notifications

Add push triggers (extending Wave 2 work):
- New incoming request → notify owning agency admins → `{ type: 'network_request', id }`.
- Request status change (approved/rejected/completed) → notify counterparty.

Wire in `server/routes/network.js` after `POST /network/requests` and `PATCH /network/requests/:id/status`.

---

## Accounting — phone-lite (4.8 – 4.11)

The web `pages/Accounting.jsx` has 5 tabs (Dashboard, Plan Comptable, Journal, Deposits, Bilan). On mobile we ship only the consumption views (Dashboard + Deposits + Bilan); the editor views (Plan Comptable, Journal) stay desktop-only.

### 4.8 Accounting hub — `src/screens/AccountingScreen.js` (new)

Top-level cards/tabs (admin only):
- KPIs (revenue this month, expenses, net)
- Aged receivables
- Utilization
- Deposits
- Bilan (payout summary)

### 4.9 Accounting Dashboard

All computations are **client-side aggregations** (confirmed by cross-check — no server RPCs). Data sources:
- `supabase.from('contracts').select('*').eq('agency_id', agencyId)` — for revenue + utilization.
- `supabase.from('accounts').select('*').eq('agency_id', agencyId)` — chart of accounts (used to bucket journal entries by code).
- `supabase.from('journal_entries').select('*').eq('agency_id', agencyId)` — for expenses (if table exists; verify name).

**Components:**
- **PnL card:** Sum `contracts.total_ht` (closed only) → revenue. Sum journal entries grouped by account category `'expense'` → expenses. Net = revenue − expenses.
- **Utilization card:** For each vehicle: `daysUsed = Σ contract.total_days (closed)`; `utilization% = daysUsed / 30` for the current month. Render a horizontal bar list (no chart library needed if minimal; otherwise `victory-native` — request approval).
- **Aged receivables card:** From `invoices` table where `status='pending'`, bucket by age (`< 30d`, `30–60`, `60–90`, `> 90`) using `created_at`. Pure JS. Mirror `pages/accounting/AgedReceivablesView.jsx` logic.

### 4.10 Deposits — `src/screens/accounting/DepositsScreen.js` (new)

**Table `deposits` schema (from migration `005_missing_tables.sql`):**
```
id, agency_id, contract_id, client_name, vehicle_name,
amount NUMERIC, status (held|released|forfeited|partially_released|retained),
held_at, released_at, released_amount NUMERIC,
deductions JSONB, transaction_id, release_transaction_id, created_at
```

**UI:**
- Filter chips: `Tous | Conservés (held) | Libérés (released) | Confisqués (forfeited)`.
- Row: client name, vehicle, amount, status pill, held_at.
- Tap → detail with release form (`released_amount`, `deductions` JSON editor — keep simple: a list of `{ reason, amount }` rows).
- Save → `supabase.from('deposits').update({...}).eq('id', id)` direct.

### 4.11 Bilan (agency payout) — `src/screens/accounting/BilanScreen.js` (new)

**Source:** the web has a util function `computeAgencyPayout({ startDate?, endDate? })` in `utils/accounting.js`. Returns `{ totalRevenue, totalExpenses, platformFees, netPayout, breakdown }`.

**Approach:** port the util function to `src/lib/accounting.js` on mobile (pure JS, no dependencies on web framework). Read inputs from Supabase directly. Mirror calculation exactly — do not reinvent.

**UI:**
- Date range picker (default: current month).
- Five KPI rows: Revenue, Expenses, Platform fees, Net payout, Breakdown.

### 4.12 Versioning

Bump `APP_VERSION` (e.g. v1.12.x → v1.13.0). Final wave — at the end, mobile and web should be at functional parity for the features in scope.

---

## Files this wave creates or modifies

**New (mobile):**
- `src/screens/NetworkSearchScreen.js`
- `src/screens/NetworkOutgoingScreen.js`
- `src/screens/NetworkIncomingScreen.js`
- `src/screens/AccountingScreen.js`
- `src/screens/accounting/DepositsScreen.js`
- `src/screens/accounting/BilanScreen.js`
- `src/lib/accounting.js` — port of web `utils/accounting.js`
- `src/components/NetworkRequestCard.jsx`
- `src/components/AgedReceivablesCard.jsx`
- `src/components/UtilizationBars.jsx`

**Modified (mobile):**
- `src/screens/FleetDetailScreen.js` — add visibility toggle + network price.
- `src/screens/rental/Step2DetailsScreen.js` — merge borrowed-fleet into vehicle picker.
- `src/navigation/*` — add Network entry under a "Plus" tab or in Settings.

**Possibly modified (web/server):**
- `server/routes/network.js` — add push trigger calls (request created, status changed). Verify whether the vehicle visibility endpoint exists; if missing, fine — we use Supabase direct.

---

## Wave 4 acceptance criteria

1. Admin toggles a vehicle as network-visible, sets a price → another agency sees it in search.
2. Searching the network with dates + city returns masked results within 1s.
3. Sending a request results in a `PENDING` row visible in Outgoing and (on the other side, masked) in Incoming.
4. Owner approves → vehicle status flips to `rented` server-side → requester gets push and sees contact details via Reveal.
5. Borrowed fleet appears in NewRental vehicle picker with a Réseau badge.
6. Accounting dashboard shows correct revenue, utilization, and aged receivables computed on-device.
7. Deposits screen lists held deposits and allows release with deductions.
8. Bilan matches the web app's computation for the same date range (cross-test).

---

## Estimate

Wave 4: 7–9 dev days.

---

## Open questions to resolve during implementation

1. **Vehicle visibility endpoint vs Supabase direct** — confirm by reading `server/routes/network.js` whether a `PATCH /network/vehicles/:id/visibility` route exists. Use it if present.
2. **Borrowed contract context** — when a contract uses a borrowed vehicle, does the web app stamp a `cross_agency_request_id` on `contracts`? If yes, mobile must do the same.
3. **`journal_entries` table name** — verify the exact name. The cross-check referenced `getJournalEntries()` but the table name wasn't quoted from the migration.
4. **Utility function port** — `utils/accounting.js` may import other web-only deps. Read it before porting; isolate the pure logic.
5. **Charting library** — if any chart beyond a bar list is needed (utilization heatmap, e.g.), pick a library that works in Expo Go (e.g. `victory-native`). Request approval before adding.

---

## Out-of-scope for Wave 4 (and the whole port)

These are explicit non-goals — do not attempt on mobile:

- **Plan comptable editor.** Account creation/edit stays desktop-only. Mobile only reads `accounts` to bucket expenses.
- **Journal grid.** Multi-column ledger view is unusable on phone. Skip.
- **Telematics device pairing.** Read-only map only (Wave 3 already noted this).
- **Contract template PDF upload from mobile.** Wave 3 ships the replace flow but the canonical management stays on web for admin convenience.
- **E-signature capture on mobile.** Customer signs via the existing web `SignContract` page deep-linked from WhatsApp/email.
- **Accounting PDF/CSV export.** Web doesn't expose this either — out of scope until the web ships it.
- **Offline-first sync.** Online-only by explicit decision.
