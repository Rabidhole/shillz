import { createAppKit } from '@reown/appkit'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { solana, solanaTestnet } from '@reown/appkit/networks'

// 1. Get projectId from https://cloud.reown.com
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'demo-project-id'

if (!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID) {
  console.warn('⚠️ NEXT_PUBLIC_REOWN_PROJECT_ID not set. Get your project ID from https://cloud.reown.com')
}

// 2. Set up the Solana adapter
const solanaAdapter = new SolanaAdapter()

// 3. Configure the metadata
const metadata = {
  name: 'Shillzzz',
  description: 'Show the world who has the strongest community',
  url: 'https://shillzzz.app', // origin must match your domain & subdomain
  icons: ['/logo.png']
}

// 4. Create the modal
export const appKit = createAppKit({
  adapters: [solanaAdapter],
  projectId,
  networks: [solana, solanaTestnet],
  defaultNetwork: solanaTestnet, // Use testnet for testing
  metadata,
  features: {
    analytics: true,
    email: false,
    socials: [],
    emailShowWallets: false
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-color-mix': '#6366f1',
    '--w3m-color-mix-strength': 20,
    '--w3m-accent': '#6366f1',
    '--w3m-border-radius-master': '8px'
  }
})
