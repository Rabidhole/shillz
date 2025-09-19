// ReOwn AppKit Configuration
// This will be expanded once packages are installed

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'your-project-id'

// EVM Chains Configuration
export const evmChains = [
  {
    chainId: 1,
    name: 'Ethereum',
    currency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    rpcUrl: 'https://ethereum.publicnode.com'
  },
  {
    chainId: 137,
    name: 'Polygon',
    currency: 'MATIC',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl: 'https://polygon.publicnode.com'
  },
  {
    chainId: 56,
    name: 'BSC',
    currency: 'BNB',
    explorerUrl: 'https://bscscan.com',
    rpcUrl: 'https://bsc.publicnode.com'
  },
  {
    chainId: 42161,
    name: 'Arbitrum',
    currency: 'ETH',
    explorerUrl: 'https://arbiscan.io',
    rpcUrl: 'https://arbitrum.publicnode.com'
  },
  {
    chainId: 10,
    name: 'Optimism',
    currency: 'ETH',
    explorerUrl: 'https://optimistic.etherscan.io',
    rpcUrl: 'https://optimism.publicnode.com'
  },
  {
    chainId: 8453,
    name: 'Base',
    currency: 'ETH',
    explorerUrl: 'https://basescan.org',
    rpcUrl: 'https://base.publicnode.com'
  }
]

// Solana Configuration
export const solanaConfig = {
  chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  name: 'Solana',
  currency: 'SOL',
  explorerUrl: 'https://solscan.io',
  rpcUrl: 'https://api.mainnet-beta.solana.com'
}

// Sui Configuration
export const suiConfig = {
  chainId: 'sui:mainnet',
  name: 'Sui',
  currency: 'SUI',
  explorerUrl: 'https://suiscan.xyz',
  rpcUrl: 'https://fullnode.mainnet.sui.io'
}

export const metadata = {
  name: 'Shillzzz',
  description: 'Show the world who has the strongest community',
  url: 'https://shillzzz.app',
  icons: ['/logo.png']
}
