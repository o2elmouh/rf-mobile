import Constants from 'expo-constants'
import { supabase } from './supabase'

const BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3001'

export class ApiError extends Error {
  constructor(status, body) {
    super(typeof body === 'string' ? body : body?.error || `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function authHeader(forceRefresh = false) {
  if (forceRefresh) {
    const { data: { session } } = await supabase.auth.refreshSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

function safeJson(text) {
  try { return JSON.parse(text) } catch { return text }
}

async function doFetch(method, path, { body, headers, isMultipart, forceRefresh } = {}) {
  const url = `${BASE_URL}${path}`
  const auth = await authHeader(forceRefresh)
  const finalHeaders = { ...auth, ...(headers || {}) }
  let payload
  if (isMultipart) {
    payload = body
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  return fetch(url, { method, headers: finalHeaders, body: payload })
}

async function request(method, path, opts = {}) {
  let res = await doFetch(method, path, opts)
  if (res.status === 401) {
    res = await doFetch(method, path, { ...opts, forceRefresh: true })
  }
  const text = await res.text()
  const parsed = text ? safeJson(text) : null
  if (!res.ok) throw new ApiError(res.status, parsed ?? text)
  return parsed
}

export const apiGet           = (p)         => request('GET',    p)
export const apiPost          = (p, body)   => request('POST',   p, { body })
export const apiPatch         = (p, body)   => request('PATCH',  p, { body })
export const apiDelete        = (p)         => request('DELETE', p)
export const apiPostMultipart = (p, formData) => request('POST', p, { body: formData, isMultipart: true })

export const apiBaseUrl = BASE_URL
