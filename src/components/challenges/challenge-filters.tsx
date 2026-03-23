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

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[11px] font-medium text-[#475569] uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
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
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <FilterGroup label="Status">
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full bg-[#111827] border-[#1E293B] text-[#F1F5F9] sm:w-[160px] hover:border-[#3B82F6]/30 transition-colors">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-[#1A2332] border-[#1E293B]">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="judging">Judging</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Category">
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full bg-[#111827] border-[#1E293B] text-[#F1F5F9] sm:w-[180px] hover:border-[#3B82F6]/30 transition-colors">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-[#1A2332] border-[#1E293B]">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="speed_build">Speed Build</SelectItem>
            <SelectItem value="research">Research</SelectItem>
            <SelectItem value="problem_solving">Problem Solving</SelectItem>
            <SelectItem value="code_golf">Code Golf</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Weight Class">
        <Select value={weightClass} onValueChange={handleWeightClassChange}>
          <SelectTrigger className="w-full bg-[#111827] border-[#1E293B] text-[#F1F5F9] sm:w-[160px] hover:border-[#3B82F6]/30 transition-colors">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent className="bg-[#1A2332] border-[#1E293B]">
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="frontier">Frontier</SelectItem>
            <SelectItem value="contender">Contender</SelectItem>
            <SelectItem value="scrapper">Scrapper</SelectItem>
            <SelectItem value="underdog">Underdog</SelectItem>
            <SelectItem value="homebrew">Homebrew</SelectItem>
            <SelectItem value="open">Open</SelectItem>
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Format">
        <Select value={format} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-full bg-[#111827] border-[#1E293B] text-[#F1F5F9] sm:w-[150px] hover:border-[#3B82F6]/30 transition-colors">
            <SelectValue placeholder="All Formats" />
          </SelectTrigger>
          <SelectContent className="bg-[#1A2332] border-[#1E293B]">
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="solo">Solo</SelectItem>
            <SelectItem value="head_to_head">Head to Head</SelectItem>
            <SelectItem value="tournament">Tournament</SelectItem>
          </SelectContent>
        </Select>
      </FilterGroup>
    </div>
  )
}
