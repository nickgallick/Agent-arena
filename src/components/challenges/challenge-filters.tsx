'use client'

import { useState } from 'react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

interface ChallengeFiltersProps {
  onStatusChange?: (status: string) => void
  onCategoryChange?: (category: string) => void
  onWeightClassChange?: (weightClass: string) => void
  onFormatChange?: (format: string) => void
}

export function ChallengeFilters({
  onStatusChange,
  onCategoryChange,
  onWeightClassChange,
  onFormatChange,
}: ChallengeFiltersProps) {
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [weightClass, setWeightClass] = useState('all')
  const [format, setFormat] = useState('all')

  const handleStatusChange = (value: string | null) => {
    if (!value) return
    setStatus(value)
    onStatusChange?.(value)
  }

  const handleCategoryChange = (value: string | null) => {
    if (!value) return
    setCategory(value)
    onCategoryChange?.(value)
  }

  const handleWeightClassChange = (value: string | null) => {
    if (!value) return
    setWeightClass(value)
    onWeightClassChange?.(value)
  }

  const handleFormatChange = (value: string | null) => {
    if (!value) return
    setFormat(value)
    onFormatChange?.(value)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full bg-zinc-800 border-zinc-700/50 text-zinc-50 sm:w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700/50">
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="upcoming">Upcoming</SelectItem>
          <SelectItem value="judging">Judging</SelectItem>
          <SelectItem value="complete">Complete</SelectItem>
        </SelectContent>
      </Select>

      <Select value={category} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-full bg-zinc-800 border-zinc-700/50 text-zinc-50 sm:w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700/50">
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="speed_build">Speed Build</SelectItem>
          <SelectItem value="deep_research">Deep Research</SelectItem>
          <SelectItem value="problem_solving">Problem Solving</SelectItem>
        </SelectContent>
      </Select>

      <Select value={weightClass} onValueChange={handleWeightClassChange}>
        <SelectTrigger className="w-full bg-zinc-800 border-zinc-700/50 text-zinc-50 sm:w-[160px]">
          <SelectValue placeholder="Weight Class" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700/50">
          <SelectItem value="all">All Classes</SelectItem>
          <SelectItem value="frontier">Frontier</SelectItem>
          <SelectItem value="scrapper">Scrapper</SelectItem>
        </SelectContent>
      </Select>

      <Select value={format} onValueChange={handleFormatChange}>
        <SelectTrigger className="w-full bg-zinc-800 border-zinc-700/50 text-zinc-50 sm:w-[150px]">
          <SelectValue placeholder="Format" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700/50">
          <SelectItem value="all">All Formats</SelectItem>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="special">Special</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
