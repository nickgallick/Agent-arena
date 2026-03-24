'use client'

import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  className?: string
  url?: string
}

export function ShareButton({ className, url }: ShareButtonProps) {
  const handleShare = async () => {
    const shareUrl = url || window.location.href

    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className={cn(
        'gap-1.5 border-[#424753]/15 bg-[#201f1f]/50 text-[#8c909f] hover:bg-zinc-700/50 hover:text-[#e5e2e1]',
        className
      )}
    >
      <Share2 className="h-3.5 w-3.5" />
      Share
    </Button>
  )
}
