# RentaFlow Mobile — Claude Instructions

## Code Quality Rules

### Versioning
- Bump `APP_VERSION` in `src/lib/version.js` before any commit you intend to push.
- Keep it aligned with the web app's `components/Sidebar.jsx` version (mobile is one bump ahead during a wave, lockstep otherwise).
- Mobile currently at **v1.10.12**, web staging at **v1.10.7**.

### Dependencies
- Do NOT install new npm packages without explicit user approval first.

### Always verify before submitting
- Before writing any code that touches Supabase (inserts, RPCs, upserts), cross-check **every field name** against `C:\Users\otman\Downloads\Rental flow app SAAS\supabase\migrations\001_initial_schema.sql`
- Never assume a column exists — read the schema file first
- Never assume an RPC signature — read the function definition first
- Never ASsume anything, always stick to what is done in webapp, if confused, ask me 
- If a field name is uncertain, grep the schema file before using it

### Database field reference (live schema)
| Table | Key fields to verify |
|-------|---------------------|
| `profiles` | `id, full_name, phone, role, agency_id` — NO `email` column in live DB |
| `clients` | `id_number` (not `cin_number`), `id_expiry`, `driving_license_num`, `driving_license_expiry`, `date_of_birth` |
| `contracts` | `pickup_date`, `return_date`, `total_days`, `fuel_level_start`, `mileage_start`, `payment_method` (string, no enum constraint) |
| `vehicles` | `plate_number` (not `plate`), `status` enum: `available/rented/maintenance/retired` |
| `invoices` | `total_ht`, `tva`, `total_ttc`, `client_id`, `contract_id` |

### RPC signatures (live Supabase)
- `onboard_new_agency(p_user_id, p_agency_name, p_full_name, p_email, p_phone, p_city, p_ice?, p_rc?)` — does NOT insert email into profiles
- `get_dashboard_stats(p_agency_id)`
- `get_available_vehicles(p_agency_id, p_start_date, p_end_date)`

## Project Context
- Expo / React Native app for Moroccan car rental agencies
- Supabase project: `apzarvjxvwtlphdqirjm.supabase.co`
- Same database as web app at `C:\Users\otman\Downloads\Rental flow app SAAS`
- Deep link scheme: `rentaflow://`
