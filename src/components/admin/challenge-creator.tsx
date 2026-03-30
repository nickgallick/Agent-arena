'use client'

import { useState } from 'react'
import { Plus, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Defaults (Launch timing model) ────────────────────────────────────────────
// Challenge window:    48 hours  (starts_at → ends_at)
// Per-entry session:   60 minutes  (time_limit_minutes — starts when user opens workspace)
//
// These are SEPARATE concepts. The challenge window is how long the challenge is open
// for new entries. The per-entry session is the individual timer that starts
// when a competitor opens the workspace.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SESSION_MINUTES = 60
const DEFAULT_WINDOW_HOURS = 48

function defaultStartDate(): string {
  const d = new Date()
  // Round up to next hour
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return toLocalDatetimeInputValue(d)
}

function defaultEndDate(startStr: string): string {
  const d = startStr ? new Date(startStr) : new Date()
  d.setHours(d.getHours() + DEFAULT_WINDOW_HOURS)
  return toLocalDatetimeInputValue(d)
}

function toLocalDatetimeInputValue(d: Date): string {
  // datetime-local input expects "YYYY-MM-DDTHH:MM"
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const INITIAL_FORM = {
  title: '',
  description: '',
  prompt: '',
  category: '',
  format: '',
  challengeType: '',
  weightClass: '',
  sessionDurationMinutes: String(DEFAULT_SESSION_MINUTES),
  maxCoins: '',
  startDate: defaultStartDate(),
  endDate: '',
}

export function ChallengeCreator() {
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(() => {
    const start = defaultStartDate()
    return { ...INITIAL_FORM, startDate: start, endDate: defaultEndDate(start) }
  })
  const [formError, setFormError] = useState('')

  function update(key: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // When startDate changes, auto-update endDate to start + 48h (only if endDate hasn't been manually changed)
      if (key === 'startDate' && value) {
        const autoEnd = defaultEndDate(value)
        // Only auto-update if endDate is currently at the default offset from old startDate
        const expectedOldEnd = defaultEndDate(prev.startDate)
        if (!prev.endDate || prev.endDate === expectedOldEnd) {
          next.endDate = autoEnd
        }
      }
      return next
    })
    setFormError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    // Validate: ends_at must be after starts_at
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate)
      const end = new Date(form.endDate)
      if (end <= start) {
        setFormError('Challenge close time must be after open time.')
        return
      }
      const windowHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      if (windowHours < 1) {
        setFormError('Challenge window must be at least 1 hour.')
        return
      }
    }

    setSubmitting(true)

    const payload = {
      title: form.title,
      description: form.description,
      prompt: form.prompt,
      category: form.category,
      format: form.format,
      challenge_type: form.challengeType,
      weight_class_id: form.weightClass || null,
      // time_limit_minutes = per-entry session duration
      time_limit_minutes: form.sessionDurationMinutes ? Number(form.sessionDurationMinutes) : DEFAULT_SESSION_MINUTES,
      max_coins: form.maxCoins ? Number(form.maxCoins) : undefined,
      starts_at: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      ends_at: form.endDate ? new Date(form.endDate).toISOString() : undefined,
    }

    try {
      const res = await fetch('/api/admin/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.error ?? 'Failed to create challenge'
        setFormError(msg)
        toast.error(msg)
        return
      }

      toast.success('Challenge created successfully')
      const next = defaultStartDate()
      setForm({ ...INITIAL_FORM, startDate: next, endDate: defaultEndDate(next) })
    } catch {
      toast.error('Network error — please try again')
      setFormError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClasses = 'border-white/5 bg-[#1c1b1b]/50 text-[#e5e2e1] placeholder:text-[#8c909f]'

  // Preview challenge window duration
  const windowPreview = (() => {
    if (!form.startDate || !form.endDate) return null
    try {
      const diff = new Date(form.endDate).getTime() - new Date(form.startDate).getTime()
      if (diff <= 0) return null
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      return m > 0 ? `${h}h ${m}m window` : `${h}h window`
    } catch { return null }
  })()

  return (
    <Card className="border-white/5 bg-[#201f1f]/50">
      <CardHeader>
        <CardTitle className="text-[#e5e2e1]">Create Challenge</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[#c2c6d5]">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Challenge title"
              className={inputClasses}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[#c2c6d5]">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Brief description of the challenge"
              className={inputClasses}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-[#c2c6d5]">Prompt</Label>
            <Textarea
              id="prompt"
              value={form.prompt}
              onChange={(e) => update('prompt', e.target.value)}
              placeholder="The full challenge prompt agents will receive"
              className={inputClasses}
              rows={6}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-[#c2c6d5]">Category</Label>
              <Select value={form.category} onValueChange={(v) => v && update('category', v)}>
                <SelectTrigger aria-label="Select category" className={inputClasses}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="border-white/5 bg-[#1c1b1b]">
                  <SelectItem value="speed_build">Speed Build</SelectItem>
                  <SelectItem value="algorithm">Algorithm</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="problem_solving">Problem Solving</SelectItem>
                  <SelectItem value="optimization">Optimization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#c2c6d5]">Format</Label>
              <Select value={form.format} onValueChange={(v) => v && update('format', v)}>
                <SelectTrigger aria-label="Select format" className={inputClasses}>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="border-white/5 bg-[#1c1b1b]">
                  <SelectItem value="sprint">Sprint</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="marathon">Marathon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#c2c6d5]">Challenge Type</Label>
              <Select value={form.challengeType} onValueChange={(v) => v && update('challengeType', v)}>
                <SelectTrigger aria-label="Select challenge type" className={inputClasses}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="border-white/5 bg-[#1c1b1b]">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly_featured">Weekly Featured</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-[#c2c6d5]">Weight Class</Label>
              <Select value={form.weightClass} onValueChange={(v) => v && update('weightClass', v)}>
                <SelectTrigger aria-label="Select weight class" className={inputClasses}>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="border-white/5 bg-[#1c1b1b]">
                  <SelectItem value="frontier">Frontier</SelectItem>
                  <SelectItem value="heavyweight">Heavyweight</SelectItem>
                  <SelectItem value="middleweight">Middleweight</SelectItem>
                  <SelectItem value="lightweight">Lightweight</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="sessionDuration" className="text-[#c2c6d5]">Per-Entry Session</Label>
                <span title="This is the individual competitor timer — starts when a user opens the workspace. Separate from the challenge window." className="cursor-help">
                  <Info className="w-3 h-3 text-[#8c909f]" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="sessionDuration"
                  type="number"
                  value={form.sessionDurationMinutes}
                  onChange={(e) => update('sessionDurationMinutes', e.target.value)}
                  placeholder="60"
                  min={0}
                  max={1440}
                  className={inputClasses}
                />
                <span className="text-xs text-[#8c909f] flex-shrink-0">min</span>
              </div>
              <p className="text-[10px] text-[#8c909f] font-mono">Timer starts when competitor opens workspace. 0 = no limit (sandbox).</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCoins" className="text-[#c2c6d5]">Max Coins</Label>
              <Input
                id="maxCoins"
                type="number"
                value={form.maxCoins}
                onChange={(e) => update('maxCoins', e.target.value)}
                placeholder="500"
                min={0}
                max={10000}
                className={inputClasses}
              />
            </div>
          </div>

          {/* Challenge Window — visually grouped and labeled */}
          <div className="rounded-lg border border-white/5 bg-[#1a1919]/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-[#c2c6d5] text-sm font-semibold">Challenge Window</Label>
                <span title="How long this challenge is open for new entries. Recommended: 48 hours. Separate from the per-entry session timer." className="cursor-help">
                  <Info className="w-3 h-3 text-[#8c909f]" />
                </span>
              </div>
              {windowPreview && (
                <span className="text-[10px] font-mono text-[#7dffa2] bg-[#7dffa2]/10 px-2 py-0.5 rounded">
                  {windowPreview}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#8c909f] font-mono">
              When competitors may enter. Default: 48 hours. New entries blocked after close. In-progress sessions may finish after close.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-[#8c909f] text-xs">Opens</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => update('startDate', e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-[#8c909f] text-xs">Closes</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => update('endDate', e.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-sm text-[#ffb4ab]">{formError}</p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 bg-[#4d8efe] text-white hover:bg-[#adc6ff]"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create Challenge
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
