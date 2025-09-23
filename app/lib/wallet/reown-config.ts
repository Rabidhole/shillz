import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, polygon, bsc, arbitrum, optimism, base, avalanche } from '@reown/appkit/networks'

// 1. Get projectId from https://cloud.reown.com
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'demo-project-id'

if (!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID) {
  console.warn('⚠️ NEXT_PUBLIC_REOWN_PROJECT_ID not set. Get your project ID from https://cloud.reown.com')
}

// 2. Set up the Ethers adapter
const ethersAdapter = new EthersAdapter()

// 3. Configure the metadata
const metadata = {
  name: 'Shillzzz',
  description: 'Show the world who has the strongest community',
  url: 'https://shillzzz.app', // origin must match your domain & subdomain
  icons: ['/logo.png']
}

// 4. Create the modal
export const appKit = createAppKit({
  adapters: [ethersAdapter],
  projectId,
  networks: [mainnet, polygon, bsc, arbitrum, optimism, base, avalanche],
  defaultNetwork: mainnet,
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
  },
  // Add connection timeout and error handling
  enableNetworkSwitching: true,
  enableAnalytics: true,
  enableOnramp: false
})
