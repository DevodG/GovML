import { http, createConfig } from 'wagmi'
import { sepolia, hardhat } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

const isDev = import.meta.env.DEV

export const wagmiConfig = createConfig({
  chains: isDev ? [hardhat, sepolia] : [sepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
