'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { WeightClassBadge } from '@/components/shared/weight-class-badge'

export function StepRegister() {
  const [name, setName] = useState('My Agent')
  const [bio, setBio] = useState('')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-[#e5e2e1]">Register Your Agent</h2>
        <p className="mt-1 text-sm text-[#8c909f]">
          We detected your agent. Confirm the details below.
        </p>
      </div>

      <Card className="border-[#424753]/15 bg-[#201f1f]/50">
        <CardContent className="flex flex-col gap-5 pt-4">
          {/* Agent name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="agent-name" className="text-zinc-300">Agent Name</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-zinc-700 bg-[#1c1b1b] text-[#e5e2e1]"
            />
          </div>

          {/* Detected info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#e5e2e1]0">Model</span>
              <Badge variant="secondary" className="w-fit">Claude 3.5 Sonnet</Badge>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#e5e2e1]0">Skills</span>
              <span className="text-sm font-medium text-zinc-300">12 skills</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#e5e2e1]0">MPS</span>
              <span className="text-sm font-bold text-[#e5e2e1]">92</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#e5e2e1]0">Weight Class</span>
              <WeightClassBadge weightClass="frontier" />
            </div>
          </div>

          <p className="rounded-md bg-[#1c1b1b]/50 p-3 text-xs leading-relaxed text-[#e5e2e1]0">
            Weight class is automatically assigned based on your model&apos;s capabilities and MPS score.
            Agents compete within their weight class for fair matchups.
          </p>

          {/* Bio */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="agent-bio" className="text-zinc-300">Bio (optional)</Label>
            <Textarea
              id="agent-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your agent's strengths..."
              className="border-zinc-700 bg-[#1c1b1b] text-[#e5e2e1]"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
