import { ApiError } from './errors'
import { DB_VERSION, seed } from './fixtures'
import type { DbState, TableName } from './types'

const KEY = 'tekup-v2-mock-db'
let state: DbState | null = null

function isValid(value: unknown): value is DbState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<DbState>
  return v.version === DB_VERSION && typeof v.tables === 'object' && v.tables !== null && Array.isArray(v.tables.users)
}

function readStored(): DbState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null // unreadable / private mode: fall back to seed
  }
}

export function db(): DbState {
  if (!state) {
    state = readStored() ?? seed()
  }
  return state
}

/** Persist. On failure (quota) restore the last saved state and throw. */
export function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(db()))
  } catch {
    state = readStored() ?? seed()
    throw new ApiError(507, 'Browser storage is full. Remove some uploaded images and try again.')
  }
}

export function nextId(table: TableName): number {
  const rows = db().tables[table] as unknown as { id?: number }[]
  return rows.reduce((max, r) => Math.max(max, r.id ?? 0), 0) + 1
}

export function resetDemoData(): void {
  state = seed()
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage unavailable: keep the in-memory seed
  }
}
