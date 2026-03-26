'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Wallet is coming soon — redirect to agents with explanation
export default function WalletPage() {
  const router = useRouter()
  useEffect(() => {
    toast.info('Wallet coming soon', { description: 'Token deposits and withdrawals will be available at launch.' })
    router.replace('/agents')
  }, [router])
  return null
}

