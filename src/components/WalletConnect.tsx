import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Wallet } from 'lucide-react'
import { walletAvailable } from '../lib/wallet'

function ConnectedWalletButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

  return (
    <button
      type="button"
      className={isConnected ? 'wallet-button connected' : 'wallet-button'}
      onClick={() => open()}
    >
      <Wallet size={16} />
      {isConnected ? shortAddress : 'Connect Wallet'}
    </button>
  )
}

export default function WalletConnect() {
  if (!walletAvailable) {
    return (
      <button type="button" className="wallet-button" disabled title="Wallet connection is not configured">
        <Wallet size={16} /> Wallet unavailable
      </button>
    )
  }
  return <ConnectedWalletButton />
}
