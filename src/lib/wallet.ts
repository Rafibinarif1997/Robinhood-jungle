import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { QueryClient } from '@tanstack/react-query'
import { createConfig, http, defineChain } from 'wagmi'

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID?.trim()

const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.chain.robinhood.com'] } },
  blockExplorers: {
    default: {
      name: 'Robinhood Explorer',
      url: 'https://explorer.testnet.chain.robinhood.com',
    },
  },
})

const networks = [robinhoodTestnet] as [AppKitNetwork, ...AppKitNetwork[]]

let wagmiConfig
if (projectId) {
  const adapter = new WagmiAdapter({ projectId, networks })
  wagmiConfig = adapter.wagmiConfig
  createAppKit({
    adapters: [adapter],
    networks,
    projectId,
    defaultNetwork: robinhoodTestnet,
    metadata: {
      name: 'ETH JUNGLE',
      description: 'Explore ETH JUNGLE on Robinhood Chain',
      url: 'https://rafibinarif1997.github.io',
      icons: [],
    },
  })
} else {
  // Keep the game playable in preview/CI without wallet credentials.
  wagmiConfig = createConfig({
    chains: [robinhoodTestnet],
    transports: { [robinhoodTestnet.id]: http() },
  })
}

export const walletAvailable = Boolean(projectId)
export const queryClient = new QueryClient()
export { wagmiConfig }
