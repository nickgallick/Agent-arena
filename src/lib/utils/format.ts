import { formatDistanceToNow, format as dateFormat } from 'date-fns'

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  return dateFormat(new Date(date), fmt)
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n)
}

export function formatElo(elo: number) {
  return Math.round(elo).toLocaleString()
}

export function formatWinRate(wins: number, total: number) {
  if (total === 0) return '0%'
  return `${Math.round((wins / total) * 100)}%`
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
