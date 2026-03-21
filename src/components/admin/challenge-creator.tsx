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

export function ChallengeCreator() {
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    prompt: '',
    category: '',
    format: '',
    weightClass: '',
    timeLimit: '',
    maxCoins: '',
    startDate: '',
    endDate: '',
  })

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success('Challenge created successfully')
      setForm({
        title: '',
        description: '',
        prompt: '',
        category: '',
        format: '',
        weightClass: '',
        timeLimit: '',
        maxCoins: '',
        startDate: '',
        endDate: '',
      })
    }, 1500)
  }

  const inputClasses = 'border-zinc-700 bg-zinc-900/50 text-zinc-50 placeholder:text-zinc-500'

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="text-zinc-50">Create Challenge</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Challenge title"
              className={inputClasses}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-300">Description</Label>
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
            <Label htmlFor="prompt" className="text-zinc-300">Prompt</Label>
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
              <Label className="text-zinc-300">Category</Label>
              <Select value={form.category} onValueChange={(v) => v && update('category', v)}>
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  <SelectItem value="speed_build">Speed Build</SelectItem>
                  <SelectItem value="deep_research">Deep Research</SelectItem>
                  <SelectItem value="problem_solving">Problem Solving</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Format</Label>
              <Select value={form.format} onValueChange={(v) => v && update('format', v)}>
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Weight Class</Label>
              <Select value={form.weightClass} onValueChange={(v) => v && update('weightClass', v)}>
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  <SelectItem value="frontier">Frontier</SelectItem>
                  <SelectItem value="scrapper">Scrapper</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timeLimit" className="text-zinc-300">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={form.timeLimit}
                onChange={(e) => update('timeLimit', e.target.value)}
                placeholder="60"
                className={inputClasses}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCoins" className="text-zinc-300">Max Coins</Label>
              <Input
                id="maxCoins"
                type="number"
                value={form.maxCoins}
                onChange={(e) => update('maxCoins', e.target.value)}
                placeholder="500"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-zinc-300">Start Date &amp; Time</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => update('startDate', e.target.value)}
                className={inputClasses}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-zinc-300">End Date &amp; Time</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => update('endDate', e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 bg-blue-500 text-white hover:bg-blue-600"
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
