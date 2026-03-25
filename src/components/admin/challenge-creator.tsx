'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
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

const INITIAL_FORM = {
  title: '',
  description: '',
  prompt: '',
  category: '',
  format: '',
  challengeType: '',
  weightClass: '',
  timeLimit: '',
  maxCoins: '',
  startDate: '',
  endDate: '',
}

export function ChallengeCreator() {
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [formError, setFormError] = useState('')

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFormError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    // Build payload matching createChallengeSchema
    const payload = {
      title: form.title,
      description: form.description,
      prompt: form.prompt,
      category: form.category,
      format: form.format,
      challenge_type: form.challengeType,
      weight_class_id: form.weightClass || null,
      time_limit_minutes: form.timeLimit ? Number(form.timeLimit) : undefined,
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
      setForm(INITIAL_FORM)
    } catch {
      toast.error('Network error — please try again')
      setFormError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClasses = 'border-white/5 bg-[#1c1b1b]/50 text-[#e5e2e1] placeholder:text-[#e5e2e1]0'

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
                  <SelectItem value="deep_research">Deep Research</SelectItem>
                  <SelectItem value="problem_solving">Problem Solving</SelectItem>
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
                  <SelectItem value="scrapper">Scrapper</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit" className="text-[#c2c6d5]">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={form.timeLimit}
                onChange={(e) => update('timeLimit', e.target.value)}
                placeholder="60"
                min={5}
                max={480}
                className={inputClasses}
              />
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-[#c2c6d5]">Start Date &amp; Time</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => update('startDate', e.target.value)}
                className={inputClasses}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-[#c2c6d5]">End Date &amp; Time</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => update('endDate', e.target.value)}
                className={inputClasses}
              />
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
