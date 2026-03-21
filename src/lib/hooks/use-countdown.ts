'use client'
import { useState, useEffect } from 'react'

const INITIAL_STATE = { hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: false, mounted: false }

export function useCountdown(targetDate: string | Date) {
  const [timeLeft, setTimeLeft] = useState(INITIAL_STATE)

  useEffect(() => {
    // Only compute on client to avoid SSR/client mismatch
    setTimeLeft({ ...getTimeLeft(targetDate), mounted: true })

    const timer = setInterval(() => {
      setTimeLeft({ ...getTimeLeft(targetDate), mounted: true })
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return timeLeft
}

function getTimeLeft(target: string | Date) {
  const diff = new Date(target).getTime() - Date.now()
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: true }
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
    isExpired: false,
  }
}
