import { supabase, getAgencyId } from './supabase'
import { apiGet, apiPost, apiPatch, apiDelete } from './api'

async function sbSelect(table, filters = {}) {
  const agencyId = await getAgencyId()
  if (!agencyId) return []
  let q = supabase.from(table).select('*').eq('agency_id', agencyId)
  Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v) })
  const { data, error } = await q.order('created_at', { ascending: false }).limit(200)
  if (error) { console.error(`[db] ${table}`, error); return [] }
  return data
}

async function sbUpsert(table, row) {
  const agencyId = await getAgencyId()
  if (!agencyId) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from(table)
    .upsert({ ...row, agency_id: agencyId }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Agency ─────────────────────────────────────────────────────
export async function getAgency() {
  const agencyId = await getAgencyId()
  if (!agencyId) return {}
  const { data } = await supabase.from('agencies').select('*').eq('id', agencyId).maybeSingle()
  return data ?? {}
}

// ── Fleet ──────────────────────────────────────────────────────
export async function getFleet() {
  return sbSelect('vehicles')
}

export async function saveVehicle(vehicle) {
  return sbUpsert('vehicles', vehicle)
}

export async function deleteVehicle(id) {
  const agencyId = await getAgencyId()
  if (!agencyId) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)
    .eq('agency_id', agencyId)
  if (error) throw error
}

// ── Clients ────────────────────────────────────────────────────
// Routed through Express `/clients` so the server can handle PII
// encryption (Law 09-08 Phase 5a). Mirrors the webapp's `api.getClients()` /
// `api.saveClient()`. Bypassing this path with Supabase direct will silently
// break once ENCRYPT_PII is enabled server-side.
export async function getClients() {
  try {
    return await apiGet('/clients')
  } catch (e) {
    console.error('[db] getClients', e?.message || e)
    return []
  }
}

export async function saveClient(client) {
  return apiPost('/clients', client)
}

export async function patchClient(id, partial) {
  return apiPatch(`/clients/${id}`, partial)
}

export async function deleteClient(id) {
  return apiDelete(`/clients/${id}`)
}

// ── Contracts ──────────────────────────────────────────────────
export async function getContracts() {
  const agencyId = await getAgencyId()
  if (!agencyId) return []
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      client:client_id ( first_name, last_name, phone ),
      vehicle:vehicle_id ( brand, model, plate_number )
    `)
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) { console.error('[db] contracts', error); return [] }
  // Flatten joined fields for easy display throughout the app
  return (data || []).map(c => ({
    ...c,
    client_name:   c.client  ? `${c.client.first_name || ''} ${c.client.last_name || ''}`.trim() : '—',
    vehicle_label: c.vehicle ? `${c.vehicle.brand || ''} ${c.vehicle.model || ''} · ${c.vehicle.plate_number || ''}`.trim() : '—',
  }))
}

export async function getActiveContracts() {
  // Returns all non-closed contracts (active + future bookings)
  // Includes joined client/vehicle data for display and availability checks
  const agencyId = await getAgencyId()
  if (!agencyId) return []
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      client:client_id ( first_name, last_name, phone ),
      vehicle:vehicle_id ( brand, model, plate_number )
    `)
    .eq('agency_id', agencyId)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) { console.error('[db] getActiveContracts', error); return [] }
  return (data || []).map(c => ({
    ...c,
    client_name:   c.client  ? `${c.client.first_name || ''} ${c.client.last_name || ''}`.trim() : '—',
    vehicle_label: c.vehicle ? `${c.vehicle.brand || ''} ${c.vehicle.model || ''} · ${c.vehicle.plate_number || ''}`.trim() : '—',
    vehicle_name:  c.vehicle ? `${c.vehicle.brand || ''} ${c.vehicle.model || ''}`.trim() : '—',
  }))
}

export async function saveContract(contract) {
  return sbUpsert('contracts', contract)
}

export async function updateContract(contract) {
  return saveContract(contract)
}

// ── Contract actions (Express API) ─────────────────────────────
// Mirrors `lib/api.js` in the web app. Each one needs auth.
export async function extendContract(id, body)    { return apiPost(`/contracts/${id}/extend`, body) }
export async function finalizeContract(id)        { return apiPost(`/contracts/${id}/finalize`) }
export async function closeContractApi(id, body)  { return apiPost(`/contracts/${id}/close`, body) }
export async function getSignedPdfUrl(id)         { return apiGet(`/contracts/${id}/signed-pdf-url`) }
export async function getUnsignedPdfBase64(id)    { return apiGet(`/contracts/${id}/unsigned-pdf`) }
export async function sendContractWhatsApp(id, pdf_base64) {
  return apiPost(`/contracts/${id}/send-whatsapp`, { pdf_base64 })
}
export async function sendContractEmail(id, pdf_base64) {
  return apiPost(`/contracts/${id}/send-email`, { pdf_base64 })
}
export async function sendFinalContract(id, payload) {
  return apiPost(`/contracts/${id}/send-final`, payload)
}

// AI damage detection — POST /ai/detect-damage
// body: { beforePhotos: string[], afterPhotos: string[], contractNumber, vehicleName, clientName }
// Photos are base64 data-URLs ("data:image/jpeg;base64,...").
export async function detectDamage(body) {
  return apiPost('/ai/detect-damage', body)
}

// Fetch a single contract with joined client + vehicle.
export async function getContractById(id) {
  const agencyId = await getAgencyId()
  if (!agencyId) return null
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      client:client_id ( first_name, last_name, phone, email, id_number ),
      vehicle:vehicle_id ( brand, model, plate_number, year )
    `)
    .eq('id', id)
    .eq('agency_id', agencyId)
    .maybeSingle()
  if (error) { console.error('[db] getContractById', error); return null }
  if (!data) return null
  return {
    ...data,
    client_name:   data.client  ? `${data.client.first_name || ''} ${data.client.last_name || ''}`.trim() : '—',
    vehicle_label: data.vehicle ? `${data.vehicle.brand || ''} ${data.vehicle.model || ''} · ${data.vehicle.plate_number || ''}`.trim() : '—',
  }
}

export async function saveInvoice(invoice) {
  return sbUpsert('invoices', invoice)
}

// ── Dashboard stats ────────────────────────────────────────────
export async function getDashboardStats() {
  const agencyId = await getAgencyId()
  if (!agencyId) return null
  const { data, error } = await supabase.rpc('get_dashboard_stats', { p_agency_id: agencyId })
  if (error) { console.error('[db] getDashboardStats', error); return null }
  return data
}

// ── Repairs ────────────────────────────────────────────────────
export async function getRepairs(vehicleId = null) {
  return sbSelect('repairs', vehicleId ? { vehicle_id: vehicleId } : {})
}

export async function saveRepair(repair) {
  return sbUpsert('repairs', repair)
}

// ── Leads (pending_demands via /leads/* Express routes) ────────
// Statuses are server-validated: pending | waiting | offer_sent | accepted | ignored
export async function getLeads(status = 'pending') {
  try {
    return await apiGet(`/leads?status=${encodeURIComponent(status)}`)
  } catch (e) {
    console.error('[db] getLeads', e?.message || e)
    return []
  }
}

export async function getLead(id) {
  return apiGet(`/leads/${id}`)
}

export async function updateLeadStatus(id, status, classification) {
  const body = classification !== undefined ? { status, classification } : { status }
  return apiPatch(`/leads/${id}/status`, body)
}

export async function updateLeadExtracted(id, extracted_data) {
  return apiPatch(`/leads/${id}/extracted`, { extracted_data })
}

export async function sendQuoteOfferWhatsapp(payload) {
  return apiPost('/whatsapp/send-offer', payload)
}

export async function sendQuoteOfferEmail(payload) {
  return apiPost('/email/send-offer', payload)
}

// Returns active contracts on `vehicleId` overlapping [startDate, endDate],
// excluding `excludeContractId` so a contract doesn't flag itself. Same
// overlap predicate as getAvailableVehicles below (and the web app's
// findVehicleConflicts) — half-open: a contract ending the same day a new
// one starts is NOT a conflict.
//
// Used by LeadDetailScreen to detect whether the original car attached to a
// prolongation request is already booked for the extension window; if so,
// the agent gets an amber warning + a smart-quote fallback to propose
// another available vehicle.
export async function findVehicleConflicts(vehicleId, startDate, endDate, excludeContractId) {
  if (!vehicleId || !startDate || !endDate) return []
  const agencyId = await getAgencyId()
  if (!agencyId) return []
  let q = supabase
    .from('contracts')
    .select('id, contract_number, pickup_date, return_date, client_name, vehicle_id')
    .eq('agency_id', agencyId)
    .eq('vehicle_id', vehicleId)
    .eq('status', 'active')
    .lt('pickup_date', endDate)
    .gt('return_date', startDate)
  if (excludeContractId) q = q.neq('id', excludeContractId)
  const { data, error } = await q
  if (error) { console.error('[db] findVehicleConflicts', error); return [] }
  return (data || []).map(c => ({
    id: c.id,
    contract_number: c.contract_number,
    pickup_date: c.pickup_date,
    return_date: c.return_date,
    client_name: c.client_name,
    vehicle_id: c.vehicle_id,
  }))
}

// Vehicles available between [startDate, endDate]. If dates are missing,
// returns vehicles with status='available'. Mirrors web's getAvailableVehicles
// — overlap rule: contract.pickup_date < endDate AND contract.return_date > startDate.
export async function getAvailableVehicles(startDate, endDate) {
  const agencyId = await getAgencyId()
  if (!agencyId) return []
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, brand, model, plate_number, status')
    .eq('agency_id', agencyId)
    .order('brand', { ascending: true })
  if (error) { console.error('[db] getAvailableVehicles', error); return [] }

  const ready = (vehicles || []).filter(v => v.status !== 'retired' && v.status !== 'maintenance')

  if (!startDate || !endDate) {
    return ready
      .filter(v => v.status !== 'rented')
      .map(v => ({ id: v.id, make: v.brand, model: v.model, plate: v.plate_number }))
  }

  // v1.14.24: predicate aligned with web's `get_available_vehicles` RPC and
  // `findVehicleConflicts` helper — both use `.eq('status', 'active')`.
  // The prior `.neq('closed').neq('cancelled')` was broader (would block on
  // draft / unknown statuses too), causing mobile and web to disagree about
  // availability for the same vehicle + date range. Active-only matches the
  // contract-state-machine documented in CLAUDE.md.
  const { data: overlapping, error: cErr } = await supabase
    .from('contracts')
    .select('vehicle_id, pickup_date, return_date')
    .eq('agency_id', agencyId)
    .eq('status', 'active')
    .lt('pickup_date', endDate)
    .gt('return_date', startDate)
  if (cErr) { console.error('[db] getAvailableVehicles overlap', cErr); return [] }

  const busyIds = new Set((overlapping || []).map(c => c.vehicle_id).filter(Boolean))
  return ready
    .filter(v => !busyIds.has(v.id))
    .map(v => ({ id: v.id, make: v.brand, model: v.model, plate: v.plate_number }))
}

// ── Invoices (Supabase direct — no /invoices route) ────────────
export async function getInvoices() {
  const agencyId = await getAgencyId()
  if (!agencyId) return []
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) { console.error('[db] getInvoices', error); return [] }
  return data || []
}

export async function getInvoiceById(id) {
  const agencyId = await getAgencyId()
  if (!agencyId) return null
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .maybeSingle()
  if (error) { console.error('[db] getInvoiceById', error); return null }
  return data || null
}

export async function setInvoiceStatus(id, status) {
  const agencyId = await getAgencyId()
  if (!agencyId) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function sendInvoiceWhatsApp({ to, clientName, invoiceNumber, totalTTC }) {
  return apiPost('/whatsapp/invoice', { to, clientName, invoiceNumber, totalTTC })
}

// ── Agency ─────────────────────────────────────────────────────
// /agency PATCH whitelist (verified): name, phone, city, address, email, ice,
// rc, if_number, patente, insurance_policy, retention_years.
export async function getAgencyApi() {
  return apiGet('/agency')
}

export async function patchAgency(partial) {
  return apiPatch('/agency', partial)
}

// ── Team (admin only — server enforces) ────────────────────────
export async function getTeam() {
  return apiGet('/team')
}

export async function inviteTeamMember(email, role = 'staff') {
  return apiPost('/team/invite', { email, role })
}

export async function setTeamMemberRole(id, role) {
  return apiPatch(`/team/${id}/role`, { role })
}

export async function removeTeamMember(id) {
  return apiDelete(`/team/${id}`)
}

// ── Gmail ──────────────────────────────────────────────────────
export async function getGmailStatus() {
  return apiGet('/gmail/status')
}

export async function saveGmailCredentials(gmail_address, gmail_app_password) {
  return apiPost('/gmail/credentials', { gmail_address, gmail_app_password })
}

export async function deleteGmailCredentials() {
  return apiDelete('/gmail/credentials')
}

export async function pollGmailNow() {
  return apiPost('/gmail/poll')
}

// ── WhatsApp status (read-only) ────────────────────────────────
export async function getWhatsappStatus() {
  return apiGet('/whatsapp/status')
}

// ── Fleet config (per-make maintenance schedules) ──────────────
export async function getFleetConfig() {
  const agencyId = await getAgencyId()
  if (!agencyId) return []
  const { data, error } = await supabase
    .from('fleet_config')
    .select('*')
    .eq('agency_id', agencyId)
    .order('make', { ascending: true })
  if (error) { console.error('[db] getFleetConfig', error); return [] }
  return data || []
}

// ── Network ────────────────────────────────────────────────────
export async function setVehicleVisibility(vehicleId, isVisible, dailyPrice) {
  return apiPatch(`/network/vehicles/${vehicleId}/visibility`, {
    is_network_visible: !!isVisible,
    network_daily_price: isVisible ? Number(dailyPrice) : null,
  })
}

export async function searchNetwork({ startDate, endDate, city, transmission }) {
  const qs = new URLSearchParams({ startDate, endDate })
  if (city) qs.set('city', city)
  if (transmission) qs.set('transmission', transmission)
  return apiGet(`/network/search?${qs.toString()}`)
}

export async function createNetworkRequest(body) {
  return apiPost('/network/requests', body)
}

export async function getNetworkOutgoing() {
  return apiGet('/network/requests/outgoing')
}

export async function getNetworkIncoming() {
  return apiGet('/network/requests/incoming')
}

export async function setNetworkRequestStatus(id, status, owner_notes) {
  const body = owner_notes !== undefined ? { status, owner_notes } : { status }
  return apiPatch(`/network/requests/${id}/status`, body)
}

export async function revealNetworkRequest(id) {
  return apiGet(`/network/requests/${id}/reveal`)
}

export async function getBorrowedFleet(startDate, endDate) {
  const qs = new URLSearchParams({ startDate, endDate })
  return apiGet(`/network/requests/borrowed-fleet?${qs.toString()}`)
}

// ── Deposits ───────────────────────────────────────────────────
// Schema columns after the web migration `20260608_accounting_schema_fix.sql`
// (applied to the shared Supabase project): id, agency_id, contract_id,
// client_id, client_name, vehicle_name, amount, status
// (held|released|partially_released|retained|forfeited),
// held_at, released_at, deductions (jsonb), released_amount,
// transaction_id, release_transaction_id, notes, created_at.

function depositToDb(d) {
  return {
    id:                     d.id,
    contract_id:            d.contractId  || d.contract_id  || null,
    client_id:              d.clientId    || d.client_id    || null,
    client_name:            d.clientName  || d.client_name  || null,
    vehicle_name:           d.vehicleName || d.vehicle_name || null,
    amount:                 Number(d.amount) || 0,
    status:                 d.status || 'held',
    held_at:                d.heldAt     || d.held_at     || null,
    released_at:            d.releasedAt || d.released_at || null,
    deductions:             d.deductions || [],
    released_amount:        d.releasedAmount !== undefined ? Number(d.releasedAmount) : (d.released_amount !== undefined ? Number(d.released_amount) : 0),
    transaction_id:         d.transactionId        || d.transaction_id        || null,
    release_transaction_id: d.releaseTransactionId || d.release_transaction_id || null,
    notes:                  d.notes || null,
  }
}

function depositFromDb(row) {
  if (!row) return row
  return {
    ...row,
    contractId:           row.contract_id,
    clientId:             row.client_id,
    clientName:           row.client_name,
    vehicleName:          row.vehicle_name,
    heldAt:               row.held_at,
    releasedAt:           row.released_at,
    releasedAmount:       row.released_amount,
    transactionId:        row.transaction_id,
    releaseTransactionId: row.release_transaction_id,
  }
}

export async function getDeposits(statusFilter = null) {
  const agencyId = await getAgencyId()
  if (!agencyId) return []
  let q = supabase
    .from('deposits')
    .select('*, contracts(client_name, vehicle_name)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (statusFilter) q = q.eq('status', statusFilter)
  const { data, error } = await q
  if (error) { console.error('[db] getDeposits', error); return [] }
  return (data || []).map(depositFromDb)
}

export async function saveDeposit(deposit) {
  const dbRow = depositToDb(deposit)
  Object.keys(dbRow).forEach(k => dbRow[k] === undefined && delete dbRow[k])
  const saved = await sbUpsert('deposits', dbRow)
  return depositFromDb(saved)
}

export async function getDepositByContract(contractId) {
  const agencyId = await getAgencyId()
  if (!agencyId) return null
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('contract_id', contractId)
    .maybeSingle()
  if (error) { console.error('[db] getDepositByContract', error); return null }
  return data ? depositFromDb(data) : null
}

// Legacy status-flip path kept for the DepositsScreen "Libérer" / "Confisquer"
// quick-actions. The full double-entry release lives in lib/accounting.js#releaseDeposit
// which the restitution flow uses.
export async function releaseDepositStatus(id, notes) {
  const agencyId = await getAgencyId()
  if (!agencyId) throw new Error('Not authenticated')
  const patch = { status: 'released', released_at: new Date().toISOString() }
  if (notes != null) patch.notes = notes
  const { data, error } = await supabase
    .from('deposits').update(patch)
    .eq('id', id).eq('agency_id', agencyId)
    .select().single()
  if (error) throw error
  return depositFromDb(data)
}

export async function forfeitDeposit(id, notes) {
  const agencyId = await getAgencyId()
  if (!agencyId) throw new Error('Not authenticated')
  const patch = { status: 'forfeited' }
  if (notes != null) patch.notes = notes
  const { data, error } = await supabase
    .from('deposits').update(patch)
    .eq('id', id).eq('agency_id', agencyId)
    .select().single()
  if (error) throw error
  return depositFromDb(data)
}

// ── Accounting (accounts, transactions, journal_entries) ───────

function accountToDb(a) {
  return {
    id:             a.id,
    code:           a.code,
    name:           a.name,
    type:           a.type,
    normal_balance: a.normalBalance || a.normal_balance,
    category:       a.category || null,
    is_system:      a.isSystem ?? a.is_system ?? false,
  }
}

function accountFromDb(row) {
  if (!row) return row
  return { ...row, normalBalance: row.normal_balance, isSystem: row.is_system }
}

export async function getAccounts() {
  const agencyId = await getAgencyId()
  if (!agencyId) return []
  const { data, error } = await supabase
    .from('accounts').select('*').eq('agency_id', agencyId)
  if (error) { console.error('[db] getAccounts', error); return [] }
  return (data || []).map(accountFromDb)
}

export async function saveAccount(account) {
  const dbRow = accountToDb(account)
  Object.keys(dbRow).forEach(k => dbRow[k] === undefined && delete dbRow[k])
  const saved = await sbUpsert('accounts', dbRow)
  return accountFromDb(saved)
}

function transactionToDb(t) {
  return {
    id:           t.id,
    reference:    t.reference   || null,
    date:         t.date        || null,
    description:  t.description || null,
    type:         t.type        || 'manual',
    total_amount: t.totalAmount !== undefined ? Number(t.totalAmount) : (t.total_amount !== undefined ? Number(t.total_amount) : null),
    amount:       t.totalAmount !== undefined ? Number(t.totalAmount) : (t.amount !== undefined ? Number(t.amount) : null),
    contract_id:  t.contractId  || t.contract_id  || null,
    invoice_id:   t.invoiceId   || t.invoice_id   || null,
  }
}

function transactionFromDb(row) {
  if (!row) return row
  return { ...row, totalAmount: row.total_amount, contractId: row.contract_id, invoiceId: row.invoice_id }
}

export async function getTransactions() {
  const rows = await sbSelect('transactions')
  return rows.map(transactionFromDb)
}

export async function saveTransaction(tx) {
  const dbRow = transactionToDb(tx)
  Object.keys(dbRow).forEach(k => dbRow[k] === undefined && delete dbRow[k])
  // Auto-generate a TXN-YYYYMMDD-XXXX reference if missing (mirror web util).
  if (!dbRow.reference) {
    const stamp = (dbRow.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
    const rand  = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
    dbRow.reference = `TXN-${stamp}-${rand}`
  }
  const saved = await sbUpsert('transactions', dbRow)
  return transactionFromDb(saved)
}

function journalEntryToDb(e) {
  return {
    id:              e.id,
    transaction_id:  e.transactionId  || e.transaction_id  || null,
    transaction_ref: e.transactionRef || e.transaction_ref || null,
    date:            e.date           || null,
    account_code:    e.accountCode    || e.account_code    || null,
    account_name:    e.accountName    || e.account_name    || null,
    description:     e.description    || null,
    debit:           Number(e.debit)  || 0,
    credit:          Number(e.credit) || 0,
  }
}

function journalEntryFromDb(row) {
  if (!row) return row
  return {
    ...row,
    transactionId:  row.transaction_id,
    transactionRef: row.transaction_ref,
    accountCode:    row.account_code,
    accountName:    row.account_name,
  }
}

export async function getEntriesForTransaction(txId) {
  const rows = await sbSelect('journal_entries', { transaction_id: txId })
  return rows.map(journalEntryFromDb)
}

export async function saveJournalEntries(entries) {
  const agencyId = await getAgencyId()
  if (!agencyId) return
  const rows = entries.map(e => {
    const r = journalEntryToDb(e)
    Object.keys(r).forEach(k => r[k] === undefined && delete r[k])
    return { ...r, agency_id: agencyId }
  })
  const { error } = await supabase.from('journal_entries').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

// ── Reservations ───────────────────────────────────────────────
// Server-side pagination + filtering. Status enum (verified):
//   PENDING | CONFIRMED | CANCELLED | COMPLETED.
// Source enum (verified): EMAIL | WHATSAPP | WEBSITE | IN_PERSON | DIRECT.
export async function getReservations({ page = 1, pageSize = 50, status, source, search, dateFrom, dateTo, sort = 'created_at', order = 'desc' } = {}) {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort, order })
  if (status)   qs.set('status', status)
  if (source)   qs.set('source', source)
  if (search)   qs.set('search', search)
  if (dateFrom) qs.set('dateFrom', dateFrom)
  if (dateTo)   qs.set('dateTo', dateTo)
  return apiGet(`/reservations?${qs.toString()}`)
}

export async function getReservationById(id) {
  return apiGet(`/reservations/${id}`)
}

export async function createReservation(body) {
  return apiPost('/reservations', body)
}

export async function updateReservation(id, partial) {
  return apiPatch(`/reservations/${id}`, partial)
}

export async function getJournalEntries() {
  const agencyId = await getAgencyId()
  if (!agencyId) return []
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('agency_id', agencyId)
    .order('date', { ascending: false })
    .limit(2000)
  if (error) { console.error('[db] getJournalEntries', error); return [] }
  return (data || []).map(journalEntryFromDb)
}

