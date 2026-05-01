import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

type Role = 'government' | 'contractor' | 'public' | 'auditor'

interface User {
  id: string
  walletAddress: string
  role: Role
  name: string
  email?: string
  organization?: string
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
  /** Primary auth method — Sign-In with Ethereum */
  authenticateWithWallet: (
    address: string,
    signMessageFn: (args: { message: string }) => Promise<string>
  ) => Promise<void>
  /** Demo-mode fallback — mock auth with a chosen role */
  demoLogin: (role: Role) => void
  logout: () => void
  refreshUser: () => Promise<void>
  clearError: () => void
  /** Override role (for on-chain role resolution) */
  setOnChainRole: (role: Role) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,

      authenticateWithWallet: async (address, signMessageFn) => {
        set({ isLoading: true, error: null })
        try {
          // Step 1: Get nonce from backend
          const { nonce } = await api.auth.getNonce()

          // Step 2: Construct EIP-4361 SIWE message
          const domain = window.location.host
          const origin = window.location.origin
          const message = [
            `${domain} wants you to sign in with your Ethereum account:`,
            address,
            '',
            'Sign in to GovChain — ZKP-Verified Tender Protocol',
            '',
            `URI: ${origin}`,
            `Version: 1`,
            `Chain ID: 11155111`,
            `Nonce: ${nonce}`,
            `Issued At: ${new Date().toISOString()}`,
          ].join('\n')

          // Step 3: Request wallet signature
          const signature = await signMessageFn({ message })

          // Step 4: Verify with backend
          const response = await api.auth.verifySIWE(message, signature)
          if (response.error) {
            set({ error: response.error, isLoading: false })
            throw new Error(response.error)
          }

          set({
            user: response.user,
            token: response.token,
            isLoggedIn: true,
            isLoading: false,
          })
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Wallet authentication failed'
          set({ error: msg, isLoading: false })
          throw error
        }
      },

      demoLogin: (role: Role) => {
        const mockUser: User = {
          id: 'demo-user',
          walletAddress: '0xDemoAddress0000000000000000000000000000',
          role,
          name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        }
        set({
          user: mockUser,
          token: 'demo-token',
          isLoggedIn: true,
          isLoading: false,
          error: null,
        })
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isLoggedIn: false,
          error: null,
        })
      },

      refreshUser: async () => {
        const { token } = get()
        if (!token || token === 'demo-token') return

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

      setOnChainRole: (role: Role) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, role } })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'govchain-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
)
