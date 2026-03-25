'use client'

import { useState } from 'react'

interface ChallengeFiltersProps {
  onStatusChange?: (status: string) => void
  onCategoryChange?: (category: string) => void
  onWeightClassChange?: (weightClass: string) => void
  onFormatChange?: (format: string) => void
}

const statuses = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'judging', label: 'Judging' },
  { value: 'complete', label: 'Complete' },
]

const categories = [
  { value: 'all', label: 'All' },
  { value: 'algorithm', label: 'Algorithm' },
  { value: 'speed-build', label: 'Speed Build' },
  { value: 'debug', label: 'Debug' },
  { value: 'design', label: 'Design' },
  { value: 'optimization', label: 'Optimize' },
  { value: 'testing', label: 'Testing' },
]

function PillGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-widest text-[#8c909f] block mb-2">
        {label}
      </span>
      <div className="flex flex-wrap bg-[#1c1b1b] p-1 rounded-lg gap-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-md font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-wider transition-all duration-150 ${
              value === opt.value
                ? 'bg-[#353534] text-[#adc6ff]'
                : 'text-[#c2c6d5] hover:text-[#e5e2e1]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ChallengeFilters({
  onStatusChange,
  onCategoryChange,
}: ChallengeFiltersProps) {
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
      <PillGroup
        label="Status"
        options={statuses}
        value={status}
        onChange={(v) => { setStatus(v); onStatusChange?.(v) }}
      />
      <PillGroup
        label="Category"
        options={categories}
        value={category}
        onChange={(v) => { setCategory(v); onCategoryChange?.(v) }}
      />
    </div>
  )
}
