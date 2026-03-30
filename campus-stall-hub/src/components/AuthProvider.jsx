import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getMe,
  logout,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  verifyEmailToken,
} from '../lib/auth.js'

import { AuthContext } from '../lib/auth-context.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  const refresh = useCallback(async () => {
    try {
      const next = await getMe()
      setUser(next)
    } catch {
      setUser(null)
    } finally {
      setStatus('ready')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const signIn = useCallback(
    async (payload) => {
      const result = await signInWithEmailPassword(payload)
      if (result?.ok) setUser(result.user)
      return result
    },
    [setUser],
  )

  const signUp = useCallback(
    async (payload) => {
      const result = await signUpWithEmailPassword(payload)
      if (result?.ok) setUser(result.user)
      return result
    },
    [setUser],
  )

  const signOut = useCallback(async () => {
    await logout()
    setUser(null)
  }, [])

  const resendVerification = useCallback(async () => {
    return resendVerificationEmail()
  }, [])

  const verifyEmail = useCallback(
    async (token) => {
      const result = await verifyEmailToken(token)
      if (result?.ok) await refresh()
      return result
    },
    [refresh],
  )

  const forgotPassword = useCallback(async (email) => requestPasswordReset(email), [])
  const setNewPassword = useCallback(async ({ token, password }) => resetPassword({ token, password }), [])

  const value = useMemo(
    () => ({
      user,
      status,
      refresh,
      signIn,
      signUp,
      signOut,
      resendVerification,
      verifyEmail,
      forgotPassword,
      setNewPassword,
    }),
    [
      user,
      status,
      refresh,
      signIn,
      signUp,
      signOut,
      resendVerification,
      verifyEmail,
      forgotPassword,
      setNewPassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
