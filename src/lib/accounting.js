import { getAccounts, getJournalEntries } from './db'

// Direct port of utils/accounting.js → computeAgencyPayout from the web app.
// The math logic is identical; only the Supabase fetch helpers are mobile-specific.
//
// Returns { totalRevenue, totalExpenses, platformFees, netPayout, breakdown: { byAccount } }.
export async function computeAgencyPayout({ startDate, endDate } = {}) {
  const [entries, accounts] = await Promise.all([getJournalEntries(), getAccounts()])

  const inRange = (e) => {
    if (!startDate && !endDate) return true
    if (startDate && e.date < startDate) return false
    if (endDate   && e.date > endDate)   return false
    return true
  }
  const filtered = entries.filter(inRange)

  let totalRevenue  = 0
  let totalExpenses = 0
  let platformFees  = 0
  const byAccount   = {}

  filtered.forEach((e) => {
    // Journal entries reference accounts by `account_code` in the mobile schema
    // (snake_case from PostgreSQL); the web util used `accountCode` (camelCase).
    // We accept both forms for resilience.
    const code = e.account_code ?? e.accountCode
    const acc = accounts.find((a) => a.code === code)
    if (!acc) return

    const debit  = Number(e.debit  || 0)
    const credit = Number(e.credit || 0)

    if (acc.type === 'revenue') {
      const amount = credit - debit
      totalRevenue += amount
      byAccount[code] = byAccount[code] || { name: acc.name, amount: 0 }
      byAccount[code].amount += amount
    }

    if (acc.type === 'expense') {
      const amount = debit - credit
      totalExpenses += amount
      if (code === '4030') platformFees += amount
    }
  })

  const netPayout = totalRevenue - platformFees
  return { totalRevenue, totalExpenses, platformFees, netPayout, breakdown: { byAccount } }
}

// Bucket pending invoices by age (mirrors web AgedReceivablesView logic:
// buckets 0–30 / 31–60 / 61–90 / 90+ days from created_at).
export function bucketAgedReceivables(pendingInvoices, now = new Date()) {
  const buckets = { current: 0, mid: 0, late: 0, overdue: 0, count: { current: 0, mid: 0, late: 0, overdue: 0 } }
  pendingInvoices.forEach((inv) => {
    const createdAt = inv.created_at ? new Date(inv.created_at) : null
    if (!createdAt) return
    const days = Math.floor((now - createdAt) / 86400000)
    const amount = Number(inv.total_ttc || 0)
    if (days <= 30)      { buckets.current  += amount; buckets.count.current++ }
    else if (days <= 60) { buckets.mid      += amount; buckets.count.mid++ }
    else if (days <= 90) { buckets.late     += amount; buckets.count.late++ }
    else                 { buckets.overdue  += amount; buckets.count.overdue++ }
  })
  return buckets
}

// Per-vehicle utilization for the current month: days rented / days in month.
// Closed contracts only (mirrors the web util's "closed only" filter).
export function computeUtilization(contracts, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysInMonth = monthEnd.getDate()
  const byVehicle = {}

  for (const c of contracts) {
    if (c.status !== 'closed') continue
    const start = c.pickup_date ? new Date(c.pickup_date) : null
    const end   = c.return_date ? new Date(c.return_date) : null
    if (!start || !end || end <= start) continue
    // Clip to current month
    const s = start < monthStart ? monthStart : start
    const e = end   > monthEnd   ? monthEnd   : end
    if (e <= s) continue
    const days = Math.ceil((e - s) / 86400000)
    const key = c.vehicle_id || 'unknown'
    byVehicle[key] = byVehicle[key] || {
      vehicleId: key,
      label: c.vehicle_label || c.vehicle_name || 'Véhicule',
      days: 0,
    }
    byVehicle[key].days += days
  }

  return Object.values(byVehicle)
    .map(v => ({ ...v, pct: Math.min(100, Math.round((v.days / daysInMonth) * 100)) }))
    .sort((a, b) => b.days - a.days)
}
