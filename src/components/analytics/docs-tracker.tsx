'use client'
import { useEffect, useRef } from 'react'

export function DocsTracker({ page }: { page: string }) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    // Fire to our internal analytics endpoint
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'docs_page_viewed', metadata: { page } }),
    }).catch(() => {}) // fire-and-forget
  }, [page])

  return null
}

export function TrackableButton({
  eventType,
  metadata,
  onClick,
  children,
  ...props
}: {
  eventType: string
  metadata?: Record<string, unknown>
  onClick?: () => void
  children: React.ReactNode
  [key: string]: unknown
}) {
  function handleClick() {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, metadata }),
    }).catch(() => {})
    onClick?.()
  }

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  )
}
