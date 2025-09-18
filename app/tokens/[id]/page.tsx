'use client'

import { use } from 'react'
import { TokenCard } from '../../components/TokenCard'
import { ClickEffect } from '../../components/ClickEffect'

interface TokenPageProps {
  params: Promise<{ id: string }>
}

export default function TokenPage({ params }: TokenPageProps) {
  const { id } = use(params)

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
          <TokenCard tokenId={id} />
          <ClickEffect />
        </div>
      </div>
    </main>
  )
}