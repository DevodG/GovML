import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

type Role = 'government' | 'contractor' | 'public' | 'auditor'

interface User {
  id: string
  email: string
  role: Role
  name: string
  organization?: string
  walletAddress?: string
  reputationScore?: number
  completedProjects?: number
  kycVerified?: boolean
  aadhaarVerified?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  connectWallet: (walletAddress: string) => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.auth.login(email, password)
          if (response.error) {
            set({ error: response.error, isLoading: false })
            throw new Error(response.error)
          }
          set({
            user: response.user,
            token: response.token,
            isLoggedIn: true,
            isLoading: false
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false
          })
          throw error
        }
      },

      register: async (data: any) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.auth.register(data)
          if (response.error) {
            set({ error: response.error, isLoading: false })
            throw new Error(response.error)
          }
          set({
            user: response.user,
            token: response.token,
            isLoggedIn: true,
            isLoading: false
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false
          })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isLoggedIn: false,
          error: null
        })
      },

      connectWallet: async (walletAddress: string) => {
        const { token } = get()
        if (!token) throw new Error('Not authenticated')

        set({ isLoading: true, error: null })
        try {
          const response = await api.auth.connectWallet(token, walletAddress)
          if (response.error) {
            set({ error: response.error, isLoading: false })
            throw new Error(response.error)
          }
          set({
            user: { ...get().user, walletAddress: response.walletAddress },
            isLoading: false
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Wallet connection failed',
            isLoading: false
          })
          throw error
        }
      },

      refreshUser: async () => {
        const { token } = get()
        if (!token) return

        set({ isLoading: true })
        try {
          const response = await api.auth.getMe(token)
          if (response.user) {
            set({ user: response.user, isLoading: false })
          }
        } catch (error) {
          console.error('Failed to refresh user:', error)
          set({ isLoading: false })
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'govchain-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn
      })
    }
  )
)
