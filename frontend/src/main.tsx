import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import { wagmiConfig } from './config/wagmi'
import { connectWebSocket } from './lib/api'
import { useAuthStore } from './store/authStore'
import './index.css'
import '@fontsource/inter'
import '@fontsource/jetbrains-mono'

const queryClient = new QueryClient()

function Root() {
  const { token, refreshUser } = useAuthStore()

  useEffect(() => {
    // Refresh user data on mount if token exists
    if (token) {
      refreshUser()
    }

    // Initialize WebSocket connection
    const ws = connectWebSocket()

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [token, refreshUser])

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Root />
        <Toaster theme="dark" position="top-right" />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
