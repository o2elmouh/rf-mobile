import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

Deno.serve(async () => {
  const today = new Date().toISOString().slice(0, 10)

  // 1. Find all contracts ending today
  const { data: endingToday, error: e1 } = await supabase
    .from('contracts')
    .select('id, vehicle_id, client_name, return_date, agency_id')
    .eq('return_date', today)
    .neq('status', 'closed')

  if (e1) return new Response(JSON.stringify({ error: e1.message }), { status: 500 })
  if (!endingToday?.length) return new Response('No turnovers today', { status: 200 })

  // 2. For each, check if a new contract starts today for the same vehicle
  const turnovers = []
  for (const contract of endingToday) {
    const { data: startingToday } = await supabase
      .from('contracts')
      .select('id, client_name, pickup_date')
      .eq('vehicle_id', contract.vehicle_id)
      .eq('pickup_date', today)
      .neq('id', contract.id)
      .neq('status', 'closed')

    if (startingToday?.length) {
      turnovers.push({
        ...contract,
        newClient: startingToday[0].client_name,
      })
    }
  }

  if (!turnovers.length) return new Response('No same-day turnovers', { status: 200 })

  // 3. Get push tokens for affected agencies
  const agencyIds = [...new Set(turnovers.map(t => t.agency_id))]
  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, push_token')
    .in('id', agencyIds)

  const tokenMap = Object.fromEntries((agencies || []).map(a => [a.id, a.push_token]))

  // 4. Build and send push notifications
  const messages = turnovers
    .filter(t => tokenMap[t.agency_id])
    .map(t => ({
      to:    tokenMap[t.agency_id],
      title: '🔄 Retour & remise prévu aujourd\'hui',
      body:  `${t.client_name} restitue son véhicule aujourd'hui. ${t.newClient} attend ce même véhicule. Assurez-vous que le retour est bien effectué.`,
      data:  { contractId: t.id },
      sound: 'default',
    }))

  if (!messages.length) return new Response('No valid push tokens', { status: 200 })

  const response = await fetch(EXPO_PUSH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify(messages),
  })

  const result = await response.json()
  console.log('[notify-same-day-turnovers] Sent:', JSON.stringify(result))

  return new Response(JSON.stringify({ sent: messages.length, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
