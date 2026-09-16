import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import {
  api,
  ApiError,
  clearSession,
  getToken,
  getUser,
  setSession,
} from "@/shared/api/client"

export interface UserProfile {
  id: string
  username?: string
  name: string
  businessName?: string
  email: string
  mobile: string
  role: "retailer" | "admin"
  status: string
  kycStatus: string
  emailVerifiedAt?: string
  createdAt: string
}

export interface WalletState {
  userId: string
  balance: number
  creditLimit: number
  pendingSettlement: number
  todayInflow?: number
  todayOutflow?: number
}

export interface AppContextType {
  // Auth state
  user: UserProfile | null
  token: string
  role: "retailer" | "admin"
  loggedIn: boolean
  authLoading: boolean
  authError: string
  login: (token: string, user: UserProfile) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<UserProfile | null>

  // Wallet state
  wallet: WalletState | null
  walletLoading: boolean
  refreshWallet: () => Promise<WalletState | null>
  setWallet: (wallet: WalletState | null) => void
  updateBalance: (newBalance: number) => void
}

const AppContext = createContext<AppContextType | null>(null)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string>(() => getToken())
  const [user, setUserState] = useState<UserProfile | null>(() =>
    getUser<UserProfile>(),
  )
  const [authLoading, setAuthLoading] = useState<boolean>(() =>
    Boolean(getToken()),
  )
  const [authError, setAuthError] = useState("")

  const [wallet, setWalletState] = useState<WalletState | null>(null)
  const [walletLoading, setWalletLoading] = useState<boolean>(false)

  const loggedIn = Boolean(token && user)
  const role: "retailer" | "admin" =
    user?.role === "admin" ? "admin" : "retailer"

  // Refresh user profile from backend
  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    setAuthError("")
    const sessionToken = getToken()
    if (!sessionToken) {
      setTokenState("")
      setUserState(null)
      setAuthLoading(false)
      return null
    }
    try {
      const data = await api<{ user: UserProfile }>("/auth/me")
      if (getToken() !== sessionToken) return null
      setUserState(data.user)
      setTokenState(sessionToken)
      setSession(sessionToken, data.user)
      return data.user
    } catch (error) {
      if (getToken() !== sessionToken) return null
      if (!(error instanceof ApiError) || ![401, 403].includes(error.status)) {
        setAuthError(
          "We could not verify your session. Check your connection and try again.",
        )
        return null
      }
      clearSession()
      setTokenState("")
      setUserState(null)
      return null
    } finally {
      setAuthLoading(false)
    }
  }, [])

  // Refresh wallet balance from backend
  const refreshWallet = useCallback(async (): Promise<WalletState | null> => {
    const sessionToken = getToken()
    if (!sessionToken) {
      setWalletState(null)
      return null
    }
    setWalletLoading(true)
    try {
      const data = await api<{ wallet: WalletState }>("/wallet")
      if (getToken() !== sessionToken) return null
      setWalletState(data.wallet)
      return data.wallet
    } catch {
      return null
    } finally {
      setWalletLoading(false)
    }
  }, [])

  // Update balance immediately (e.g. after recharge or top-up)
  const updateBalance = useCallback((newBalance: number) => {
    setWalletState((prev) =>
      prev ? { ...prev, balance: Number(newBalance) } : null,
    )
  }, [])

  // Set entire wallet
  const setWallet = useCallback((newWallet: WalletState | null) => {
    setWalletState(newWallet)
  }, [])

  // Login action
  const login = useCallback((newToken: string, newUser: UserProfile) => {
    setSession(newToken, newUser)
    setTokenState(newToken)
    setUserState(newUser)
    setWalletState(null)
    setAuthLoading(false)
    setAuthError("")
  }, [])

  // Logout action
  const logout = useCallback(async () => {
    const request = api("/auth/logout", { method: "POST" }).catch(() => {})
    clearSession()
    setTokenState("")
    setUserState(null)
    setWalletState(null)
    setAuthError("")
    await request
  }, [])

  // Check auth session on initial app load
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  useEffect(() => {
    const reset = () => {
      setTokenState("")
      setUserState(null)
      setWalletState(null)
      setAuthLoading(false)
    }
    const sync = (event: StorageEvent) => {
      if (event.key !== "ld_token" && event.key !== null) return
      if (!getToken()) reset()
      else {
        setAuthLoading(true)
        void refreshUser()
      }
    }
    window.addEventListener("ld-session-expired", reset)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("ld-session-expired", reset)
      window.removeEventListener("storage", sync)
    }
  }, [refreshUser])

  // Load wallet whenever a user is authenticated
  useEffect(() => {
    if (loggedIn) {
      refreshWallet()
    } else {
      setWalletState(null)
    }
  }, [loggedIn, token, refreshWallet])

  const value: AppContextType = {
    user,
    token,
    role,
    loggedIn,
    authLoading,
    authError,
    login,
    logout,
    refreshUser,
    wallet,
    walletLoading,
    refreshWallet,
    setWallet,
    updateBalance,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return ctx
}

export function useAuth() {
  const {
    user,
    token,
    role,
    loggedIn,
    authLoading,
    authError,
    login,
    logout,
    refreshUser,
  } = useApp()
  return {
    user,
    token,
    role,
    loggedIn,
    authLoading,
    authError,
    login,
    logout,
    refreshUser,
  }
}

export function useWallet() {
  const { wallet, walletLoading, refreshWallet, setWallet, updateBalance } =
    useApp()
  return { wallet, walletLoading, refreshWallet, setWallet, updateBalance }
}
