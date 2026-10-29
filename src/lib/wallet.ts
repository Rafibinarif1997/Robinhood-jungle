
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { defineChain } from 'viem'

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID?.trim()

if (!projectId) {
  throw new Error(
    'Missing VITE_REOWN_PROJECT_ID. Check GitHub Actions variables.'
  )
}

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.chain.robinhood.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Robinhood Testnet Explorer',
      url: 'https://explorer.testnet.chain.robinhood.com',
    },
  },
})

const networks = [robinhoodTestnet] as [
  AppKitNetwork,
  ...AppKitNetwork[],
]

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
})

export const queryClient = new (await import('@tanstack/react-query'))
  .QueryClient()

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  defaultNetwork: robinhoodTestnet,
  metadata: {
    name: 'ETH JUNGLE',
    description: 'Explore the jungle on Robinhood Chain',
    url: 'https://rafibinarif1997.github.io',
    icons: [],
  },
})
