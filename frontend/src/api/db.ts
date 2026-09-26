import { ApiError } from './errors'
import { DB_VERSION, seed } from './fixtures'
import type { DbState, TableName } from './types'

const KEY = 'tekup-v2-mock-db'
const TABLES = Object.keys(seed().tables) as TableName[]

export const STORAGE_FULL = 'Browser storage is full, so this change was not saved. Use "Reset demo data" at the bottom of the page to free space.'

let state: DbState | null = null
/** JSON of the last state known to be persisted (or just loaded) — the rollback point. */
let lastSaved: string | null = null
/** False when the browser blocks storage (private mode, blocked site data): keep working in memory. */
let persist = true

function isValid(value: unknown): value is DbState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<DbState>
  if (v.version !== DB_VERSION) return false
  if (v.sessionUserId !== null && typeof v.sessionUserId !== 'number') return false
  if (typeof v.tables !== 'object' || v.tables === null) return false
  const tables = v.tables as Partial<Record<TableName, unknown>>
  return TABLES.every(name => Array.isArray(tables[name]))
}

function load(): DbState {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    persist = false
  }
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isValid(parsed)) {
        lastSaved = raw
        return parsed
      }
    } catch {
      // unreadable: fall back to the seed
    }
  }
  const fresh = seed()
  lastSaved = JSON.stringify(fresh)
  return fresh
}

export function db(): DbState {
  if (!state) state = load()
  return state
}

function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014)
}

/**
 * Persist. When storage is full, roll the in-memory state back to the last
 * saved version and throw 507; when storage is blocked, keep going in memory.
 */
export function save(): void {
  const json = JSON.stringify(db())
  if (!persist) {
    lastSaved = json
    return
  }
  try {
    localStorage.setItem(KEY, json)
    lastSaved = json
  } catch (e) {
    if (isQuotaError(e)) {
      state = lastSaved ? (JSON.parse(lastSaved) as DbState) : seed()
      throw new ApiError(507, STORAGE_FULL)
    }
    persist = false
    lastSaved = json
  }
}

export function nextId(table: TableName): number {
  const rows = db().tables[table] as unknown as { id?: number }[]
  return rows.reduce((max, r) => Math.max(max, r.id ?? 0), 0) + 1
}

export function resetDemoData(): void {
  state = seed()
  lastSaved = JSON.stringify(state)
  if (!persist) return
  try {
    localStorage.setItem(KEY, lastSaved)
  } catch {
    // storage unavailable: keep the in-memory seed
  }
}

// Another tab saved: drop our copy so the next read picks up its changes
// instead of overwriting them with stale data.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === KEY || e.key === null) state = null
  })
}
