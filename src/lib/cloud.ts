import type { LedgerState } from '../types.ts'

export interface CloudCredentials {
  name: string
  pin: string
}

const SUPABASE_URL = 'https://ubrzcdapixblknxajtpj.supabase.co'
const SUPABASE_KEY = 'sb_publishable_CBA1SJvznBOUMfcA0uq3Fw_JN6dR9Gn'
const TABLE_URL = `${SUPABASE_URL}/rest/v1/orbit_ledgers`

function headers(prefer?: string): HeadersInit {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  }
}

async function check(response: Response): Promise<Response> {
  if (response.ok) return response
  const body = await response.text()
  if (response.status === 404 || body.includes('orbit_ledgers')) {
    throw new Error('Cloud storage is not set up yet. Run supabase/setup.sql in the Supabase SQL Editor.')
  }
  throw new Error(body || `Cloud request failed (${response.status})`)
}

export async function loadCloudLedger(credentials: CloudCredentials): Promise<LedgerState | null> {
  const query = new URLSearchParams({
    select: 'profile_name,pin,ledger',
    profile_name: `eq.${credentials.name}`,
    limit: '1',
  })
  const response = await check(await fetch(`${TABLE_URL}?${query}`, { headers: headers() }))
  const rows = (await response.json()) as { profile_name: string; pin: string; ledger: LedgerState }[]
  const row = rows[0]
  if (!row) return null
  if (row.pin !== credentials.pin) throw new Error('That PIN does not match this cloud profile.')
  return row.ledger
}

export async function saveCloudLedger(credentials: CloudCredentials, ledger: LedgerState): Promise<void> {
  await check(
    await fetch(TABLE_URL, {
      method: 'POST',
      headers: headers('resolution=merge-duplicates,return=minimal'),
      body: JSON.stringify({
        profile_name: credentials.name,
        pin: credentials.pin,
        ledger,
        updated_at: new Date().toISOString(),
      }),
    }),
  )
}
