import { ApiError } from './errors'

const UNREACHABLE = 'Cannot reach the server. Please make sure the backend is running and try again.'

function cookie(name: string): string | null {
  const hit = document.cookie.split('; ').find(c => c.startsWith(`${name}=`))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null
}

/** Django sends the csrftoken cookie on GET /api/auth/csrf/; every POST echoes it back. */
async function csrfToken(): Promise<string> {
  let token = cookie('csrftoken')
  if (!token) {
    await send('GET', '/api/auth/csrf/')
    token = cookie('csrftoken')
  }
  return token ?? ''
}

async function send(method: string, url: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') headers['X-CSRFToken'] = await csrfToken()
  try {
    return await fetch(url, {
      method, headers, credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, UNREACHABLE)
  }
}

/** JSON request to the Django API. Errors become ApiError(status, detail). */
export async function request<T>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<T> {
  const res = await send(method, url, body)
  const data: unknown = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail
    // No JSON detail: the dev proxy could not reach Django (or it crashed).
    const message = typeof detail === 'string' ? detail : res.status >= 500 ? UNREACHABLE : `Request failed (${res.status}).`
    throw new ApiError(res.status, message)
  }
  return data as T
}
