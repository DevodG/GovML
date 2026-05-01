import { createConfig, http } from 'wagmi'
import { polygonMumbai } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [polygonMumbai],
  connectors: [
    injected(),
  ],
  transports: {
    [polygonMumbai.id]: http('https://rpc-mumbai.maticvigil.com'),
  },
})
