'use client'
import { useState, useEffect } from 'react'

export function useCountdown(targetDate: string | Date) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate))
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
