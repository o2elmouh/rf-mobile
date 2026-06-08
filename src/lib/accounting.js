import {
  getAccounts,
  getJournalEntries,
  saveTransaction,
  saveJournalEntries,
  saveDeposit,
  getDepositByContract,
  getDeposits,
  getContractById,
} from './db'

// ══════════════════════════════════════════════════════════════
// Direct ports of utils/accounting.js from the web app. The math and
// double-entry semantics are identical; the only mobile-specific bits
// are (a) using snake_case contract columns in generateRentalInvoice,
// (b) using getContractById instead of getContract.
// ══════════════════════════════════════════════════════════════

// ── Find account by code ──────────────────────────────────────
export async function getAccountByCode(code, accounts = null) {
  const accts = accounts || await getAccounts()
  return accts.find(a => a.code === code) || null
}

// ── Post a balanced double-entry transaction ──────────────────
// entries: [{ accountCode, debit, credit, description }]
export async function postTransaction({ date, description, type, contractId, invoiceId, entries }) {
  const totalDebits  = entries.reduce((s, e) => s + (Number(e.debit)  || 0), 0)
  const totalCredits = entries.reduce((s, e) => s + (Number(e.credit) || 0), 0)

  const diff = Math.abs(totalDebits - totalCredits)
  if (diff > 0.01) {
    throw new Error(
      `Transaction déséquilibrée: débits=${totalDebits.toFixed(2)} ≠ crédits=${totalCredits.toFixed(2)}`
    )
  }

  const tx = await saveTransaction({
    date: date || new Date().toISOString().slice(0, 10),
    description,
    type: type || 'manual',
    contractId: contractId || null,
    invoiceId:  invoiceId  || null,
    totalAmount: totalDebits,
  })

  const accts = await getAccounts()
  const journalLines = entries.map(e => ({
    transactionId:  tx.id,
    transactionRef: tx.reference,
    date: tx.date,
    accountCode: e.accountCode,
    accountName: accts.find(a => a.code === e.accountCode)?.name || e.accountCode,
    description: e.description || description,
    debit:  Number(e.debit)  || 0,
    credit: Number(e.credit) || 0,
  }))

  await saveJournalEntries(journalLines)
  return tx
}

// ── Generate rental invoice journal entries ───────────────────
// Mobile contracts use snake_case columns. The fee shape on mobile differs
// from web: there's a lumped `extra_fees` column, not separate
// extra_km_fee / fuel_fee / damage_fee. We treat `extra_fees` as
// "restitution fees" (3020) when present; pure-rental contracts won't
// have it set so the entry collapses to base CA + TVA.
export async function generateRentalInvoice(contractId) {
  const contract = await getContractById(contractId)
  if (!contract) throw new Error('Contrat introuvable')

  const totalHT  = Number(contract.total_ht  ?? contract.totalHT  ?? 0)
  const tva      = Number(contract.tva       ?? 0)
  const totalTTC = Number(contract.total_ttc ?? contract.total_amount ?? contract.totalTTC ?? 0)
  const extraFees = Number(contract.extra_fees ?? contract.extraFees ?? 0)
  // baseCA is whatever revenue isn't tagged as a restitution fee.
  const baseCA = Math.max(0, totalHT - extraFees)

  const entries = []
  entries.push({ accountCode: '1100', debit: totalTTC, credit: 0, description: `Créance — ${contract.client_name || ''}` })
  if (baseCA > 0)    entries.push({ accountCode: '3000', debit: 0, credit: baseCA,   description: `CA Location — ${contract.contract_number || ''}` })
  if (extraFees > 0) entries.push({ accountCode: '3020', debit: 0, credit: extraFees, description: 'Frais de restitution' })
  if (tva > 0)       entries.push({ accountCode: '2100', debit: 0, credit: tva,       description: 'TVA collectée 20%' })

  return postTransaction({
    date: contract.return_date || contract.actual_return_date || new Date().toISOString().slice(0, 10),
    description: `Facture location — ${contract.contract_number || ''} — ${contract.client_name || ''}`,
    type: 'invoice',
    contractId,
    entries,
  })
}

// ── Hold a security deposit ───────────────────────────────────
export async function holdDeposit({ contractId, clientName, vehicleName, amount, date }) {
  const amt = Number(amount)
  const tx = await postTransaction({
    date: date || new Date().toISOString().slice(0, 10),
    description: `Dépôt de garantie — ${clientName} — ${vehicleName}`,
    type: 'deposit_hold',
    contractId,
    entries: [
      { accountCode: '1200', debit: amt, credit: 0, description: 'Dépôt à recevoir' },
      { accountCode: '2000', debit: 0, credit: amt, description: 'Dépôt client' },
    ],
  })

  return saveDeposit({
    contractId,
    clientName,
    vehicleName,
    amount: amt,
    status: 'held',
    heldAt: date || new Date().toISOString().slice(0, 10),
    deductions: [],
    releasedAmount: 0,
    transactionId: tx.id,
  })
}

// ── Release a security deposit (partial or full) ──────────────
// deductions: [{ reason: string, amount: number, accountCode: string }]
export async function releaseDeposit({ depositId, deductions = [] }) {
  const deposits = await getDeposits()
  const deposit = deposits.find(d => d.id === depositId)
  if (!deposit) throw new Error('Dépôt introuvable')

  const totalDeductions = deductions.reduce((s, d) => s + Number(d.amount), 0)
  const refundAmount    = deposit.amount - totalDeductions

  const entries = []
  // Debit 2000 — reverse the liability (full deposit amount)
  entries.push({ accountCode: '2000', debit: deposit.amount, credit: 0, description: 'Libération dépôt client' })
  // Credit 1200 — reduce the asset (refunded portion)
  if (refundAmount > 0) {
    entries.push({ accountCode: '1200', debit: 0, credit: refundAmount, description: 'Remboursement dépôt au client' })
  }
  // Debit 1100 — book the excess (deductions > deposit) as additional receivable
  // so the journal stays balanced. (Web bug-fix from v1.16.0.)
  if (refundAmount < 0) {
    entries.push({ accountCode: '1100', debit: -refundAmount, credit: 0, description: 'Créance — retenues > dépôt' })
  }
  // Credit revenue accounts for each deduction
  deductions.forEach(ded => {
    const code = ded.accountCode || '3020'
    entries.push({ accountCode: code, debit: 0, credit: Number(ded.amount), description: ded.reason || 'Retenue sur dépôt' })
  })

  const tx = await postTransaction({
    date: new Date().toISOString().slice(0, 10),
    description: `Libération dépôt — ${deposit.clientName || ''}`,
    type: 'deposit_release',
    contractId: deposit.contractId,
    entries,
  })

  const status = totalDeductions > 0 && refundAmount > 0
    ? 'partially_released'
    : refundAmount <= 0 ? 'retained' : 'released'

  return saveDeposit({
    ...deposit,
    status,
    deductions,
    releasedAmount: refundAmount,
    releasedAt: new Date().toISOString().slice(0, 10),
    releaseTransactionId: tx.id,
  })
}

// ── P&L summary ───────────────────────────────────────────────
export async function computePL({ startDate, endDate } = {}) {
  const { totalRevenue, totalExpenses } = await computeAgencyPayout({ startDate, endDate })
  return {
    revenue:  totalRevenue,
    expenses: totalExpenses,
    profit:   totalRevenue - totalExpenses,
  }
}

// ══════════════════════════════════════════════════════════════
// Original mobile read-helpers (kept as-is — these are pre-existing).
// ══════════════════════════════════════════════════════════════

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
