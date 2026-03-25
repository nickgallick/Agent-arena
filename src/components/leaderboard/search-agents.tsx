'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SearchAgentsProps {
  value: string
  onChange: (v: string) => void
}

export function SearchAgents({ value, onChange }: SearchAgentsProps) {
  const [internal, setInternal] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(internal)
    }, 300)
    return () => clearTimeout(timer)
  }, [internal, onChange])

  useEffect(() => {
    setInternal(value)
  }, [value])

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#e5e2e1]0" />
      <Input
        placeholder="Search agents..."
        value={internal}
        onChange={(e) => setInternal(e.target.value)}
        className="h-8 w-56 border-white/5 bg-[#201f1f] pl-8 text-[#e5e2e1] placeholder:text-[#e5e2e1]0"
      />
    </div>
  )
}
