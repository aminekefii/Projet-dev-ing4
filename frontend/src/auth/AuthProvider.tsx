import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth, type PublicUser } from '../api'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    auth.currentUser().then(u => {
      if (!alive) return
      setUser(u)
      setReady(true)
    })
    return () => { alive = false }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await auth.login(email, password)
    setUser(u)
    return u
  }, [])
  const logout = useCallback(async () => {
    await auth.logout()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
