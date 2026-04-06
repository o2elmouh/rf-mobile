import { supabase, getAgencyId } from './supabase'

async function sbSelect(table, filters = {}) {
  const agencyId = await getAgencyId()
  if (!agencyId) return []
  let q = supabase.from(table).select('*').eq('agency_id', agencyId)
  Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v) })
  const { data, error } = await q.order('created_at', { ascending: false })
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

// ── Clients ────────────────────────────────────────────────────
export async function getClients() {
  return sbSelect('clients')
}

export async function saveClient(client) {
  return sbUpsert('clients', client)
}

// ── Contracts ──────────────────────────────────────────────────
export async function getContracts() {
  return sbSelect('contracts')
}

export async function getActiveContracts() {
  return sbSelect('contracts', { status: 'active' })
}

export async function saveContract(contract) {
  return sbUpsert('contracts', contract)
}

export async function updateContract(contract) {
  return saveContract(contract)
}

// ── Invoices ───────────────────────────────────────────────────
export async function getInvoices() {
  return sbSelect('invoices')
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
