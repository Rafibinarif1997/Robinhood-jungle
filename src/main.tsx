import React from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider, type Config } from 'wagmi'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles.css'
import { wagmiAdapter, queryClient } from './lib/wallet'

const wagmiConfig = wagmiAdapter.wagmiConfig as Config

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)
