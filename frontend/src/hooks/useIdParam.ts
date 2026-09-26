import { useParams } from 'react-router-dom'

/** A positive integer route param (e.g. `:certId`), or null when missing/invalid. */
export function useIdParam(name: string): number | null {
  const raw = useParams()[name]
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}
