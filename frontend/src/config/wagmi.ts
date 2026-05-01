import { sepolia } from 'wagmi/chains'
import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'

const SEPOLIA_RPC = import.meta.env.VITE_SEPOLIA_RPC || 'https://rpc.sepolia.org'

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC),
  },
})
