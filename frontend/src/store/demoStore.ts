import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'gov' | 'contractor' | 'public' | 'auditor'

interface DemoState {
  isDemoMode: boolean
  demoRole: Role | null
  enableDemo: () => void
  disableDemo: () => void
  setDemoRole: (role: Role) => void
  clearDemo: () => void
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      isDemoMode: false,
      demoRole: null,
      enableDemo: () => set({ isDemoMode: true }),
      disableDemo: () => set({ isDemoMode: false, demoRole: null }),
      setDemoRole: (role) => set({ demoRole: role }),
      clearDemo: () => set({ isDemoMode: false, demoRole: null }),
    }),
    { name: 'govchain-demo' }
  )
)
