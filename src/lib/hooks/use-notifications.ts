'use client'

import { useState, useEffect, useCallback } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  data: Record<string, unknown> | null
  created_at: string
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  markAsRead: (ids: string[]) => Promise<void>
  refetch: () => void
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchNotifications() {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/notifications')
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to fetch notifications (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          setNotifications(data.notifications ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchNotifications()
    return () => { cancelled = true }
  }, [refreshKey])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return

    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to mark as read (${res.status})`)
      }

      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
      )
    } catch (err) {
      // Re-fetch on error to ensure consistency
      setRefreshKey((k) => k + 1)
      throw err
    }
  }, [])

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return { notifications, unreadCount, isLoading, error, markAsRead, refetch }
}
