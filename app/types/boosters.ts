export interface BoosterPack {
  id: string
  name: string
  description: string | null
  price_usd: number
  multiplier: number
  duration_hours: number
  max_uses: number | null
  is_active: boolean
  created_at: string
}

export interface UserBooster {
  id: string
  user_id: string
  booster_pack_id: string
  purchased_at: string
  expires_at: string
  is_active: boolean
  transaction_hash: string | null
  booster_pack?: BoosterPack
}

export interface BoosterPurchaseRequest {
  boosterPackId: string
  paymentMethod: 'crypto' | 'card'
  walletAddress?: string
}
