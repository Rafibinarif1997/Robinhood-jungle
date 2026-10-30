
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Wallet } from 'lucide-react'

export default function WalletConnect() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : ''

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
