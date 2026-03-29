'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { Loader2, Plus, X, Globe, Tag, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { ClaimBadge } from '@/components/shared/claim-badge'

interface DiscoverySettings {
  capability_tags: string[]
  domain_tags: string[]
  availability_status: 'available' | 'unavailable' | 'unknown'
  contact_opt_in: boolean
  description: string
  website_url: string
  runtime_metadata: {
    model_name: string
    framework: string
    version: string
  }
}

interface AgentDiscoverySettingsProps {
  agentId: string
  agentName: string
  initialSettings?: Partial<DiscoverySettings>
}

const AVAILABILITY_OPTIONS = [
  { value: 'available',   label: 'Available',   color: 'text-[#7dffa2]', bg: 'bg-[#7dffa2]/10 border-[#7dffa2]/30' },
  { value: 'unavailable', label: 'Unavailable', color: 'text-[#ffb4ab]', bg: 'bg-[#ffb4ab]/10 border-[#ffb4ab]/30' },
  { value: 'unknown',     label: 'Unknown',     color: 'text-[#8c909f]', bg: 'bg-[#353534] border-[#8c909f]/20' },
] as const

function TagInput({
  label,
  tags,
  onAdd,
  onRemove,
  max,
  placeholder,
  colorClass,
}: {
  label: string
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
  max: number
  placeholder: string
  colorClass: string
}) {
  const [input, setInput] = useState('')

  function handleAdd() {
    const trimmed = input.trim().toLowerCase().replace(/\s+/g, '-')
    if (!trimmed || tags.includes(trimmed) || tags.length >= max) return
    if (trimmed.length > 50) {
      toast.error('Tag too long — max 50 characters')
      return
    }
    onAdd(trimmed)
    setInput('')
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAdd()
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemove(tags[tags.length - 1])
    }
  }

  return (
    <div>
      <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] mb-2">
        {label} <span className="text-[#454443]">({tags.length}/{max})</span>
      </label>
      <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#131313] border border-[#353534] rounded-lg min-h-[44px] focus-within:border-[#adc6ff]/40 transition-colors">
        {tags.map(tag => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${colorClass} font-['JetBrains_Mono'] text-xs`}
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemove(tag)}
              className="hover:opacity-70 transition-opacity"
              aria-label={`Remove ${tag}`}
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
        {tags.length < max && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            onBlur={handleAdd}
            placeholder={tags.length === 0 ? placeholder : ''}
            maxLength={50}
            className="flex-1 min-w-[120px] bg-transparent text-[#e5e2e1] text-xs font-['JetBrains_Mono'] placeholder-[#454443] outline-none"
          />
        )}
      </div>
      <p className="font-['JetBrains_Mono'] text-[10px] text-[#8c909f] mt-1">
        Press Enter or comma to add. Tags are normalized to lowercase-hyphenated.
      </p>
    </div>
  )
}

export function AgentDiscoverySettings({ agentId, agentName, initialSettings }: AgentDiscoverySettingsProps) {
  const [settings, setSettings] = useState<DiscoverySettings>({
    capability_tags: initialSettings?.capability_tags ?? [],
    domain_tags: initialSettings?.domain_tags ?? [],
    availability_status: initialSettings?.availability_status ?? 'unknown',
    contact_opt_in: initialSettings?.contact_opt_in ?? false,
    description: initialSettings?.description ?? '',
    website_url: initialSettings?.website_url ?? '',
    runtime_metadata: {
      model_name: initialSettings?.runtime_metadata?.model_name ?? '',
      framework: initialSettings?.runtime_metadata?.framework ?? '',
      version: initialSettings?.runtime_metadata?.version ?? '',
    },
  })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Track changes
  useEffect(() => {
    setDirty(true)
  }, [settings])

  function addCapabilityTag(tag: string) {
    setSettings(s => ({ ...s, capability_tags: [...s.capability_tags, tag] }))
  }
  function removeCapabilityTag(tag: string) {
    setSettings(s => ({ ...s, capability_tags: s.capability_tags.filter(t => t !== tag) }))
  }
  function addDomainTag(tag: string) {
    setSettings(s => ({ ...s, domain_tags: [...s.domain_tags, tag] }))
  }
  function removeDomainTag(tag: string) {
    setSettings(s => ({ ...s, domain_tags: s.domain_tags.filter(t => t !== tag) }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        capability_tags: settings.capability_tags,
        domain_tags: settings.domain_tags,
        availability_status: settings.availability_status,
        contact_opt_in: settings.contact_opt_in,
        description: settings.description || undefined,
        website_url: settings.website_url || null,
      }

      // Only include runtime_metadata if any field is filled
      const rm = settings.runtime_metadata
      if (rm.model_name || rm.framework || rm.version) {
        payload.runtime_metadata = {
          ...(rm.model_name && { model_name: rm.model_name }),
          ...(rm.framework && { framework: rm.framework }),
          ...(rm.version && { version: rm.version }),
        }
      } else {
        payload.runtime_metadata = {}
      }

      const res = await fetch(`/api/v1/agents/${agentId}/discovery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to save discovery settings')
        return
      }

      toast.success('Discovery settings saved', {
        description: `${agentName} discovery profile updated.`,
      })
      setDirty(false)
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#e5e2e1] font-['Manrope']">Discovery Settings</h3>
          <p className="text-xs text-[#8c909f] mt-0.5">
            All information here is self-reported and labeled accordingly on the public profile.
          </p>
        </div>
        <ClaimBadge verified={false} />
      </div>

      {/* Availability Status */}
      <div>
        <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] mb-3">
          Availability Status
        </label>
        <div className="flex gap-2 flex-wrap">
          {AVAILABILITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSettings(s => ({ ...s, availability_status: opt.value }))}
              className={`px-4 py-2 rounded-lg border font-['JetBrains_Mono'] text-xs font-bold uppercase tracking-widest transition-all ${
                settings.availability_status === opt.value
                  ? `${opt.bg} ${opt.color}`
                  : 'border-[#353534] bg-[#131313] text-[#8c909f] hover:border-[#454443]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="font-['JetBrains_Mono'] text-[10px] text-[#8c909f] mt-1.5">
          Signal whether this agent is open for new work or projects. Self-reported — not enforced by the platform.
        </p>
      </div>

      {/* Contact Opt-In */}
      <div className="rounded-xl border border-[#353534] bg-[#1c1b1b] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-[#e5e2e1]">Accept Contact Requests</p>
            </div>
            <p className="text-xs text-[#8c909f] leading-relaxed">
              Allow other platform users to send interest signals to you about this agent.
              You'll receive an in-app notification — your contact info is never exposed.
              {settings.contact_opt_in && (
                <span className="text-[#7dffa2] block mt-1">
                  ✓ Contact requests are currently enabled.
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettings(s => ({ ...s, contact_opt_in: !s.contact_opt_in }))}
            className="shrink-0 mt-0.5"
            aria-label="Toggle contact opt-in"
          >
            {settings.contact_opt_in ? (
              <ToggleRight className="size-8 text-[#7dffa2]" />
            ) : (
              <ToggleLeft className="size-8 text-[#8c909f]" />
            )}
          </button>
        </div>
      </div>

      {/* Capability Tags */}
      <TagInput
        label="Capability Tags"
        tags={settings.capability_tags}
        onAdd={addCapabilityTag}
        onRemove={removeCapabilityTag}
        max={20}
        placeholder="e.g. code-review, data-analysis, research..."
        colorClass="bg-[#adc6ff]/10 border-[#adc6ff]/20 text-[#adc6ff]"
      />

      {/* Domain Tags */}
      <TagInput
        label="Domain Tags"
        tags={settings.domain_tags}
        onAdd={addDomainTag}
        onRemove={removeDomainTag}
        max={10}
        placeholder="e.g. finance, healthcare, software-engineering..."
        colorClass="bg-[#7dffa2]/10 border-[#7dffa2]/20 text-[#7dffa2]"
      />

      {/* Description */}
      <div>
        <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] mb-2">
          Description <span className="text-[#454443]">(max 1000 chars)</span>
        </label>
        <textarea
          value={settings.description}
          onChange={(e) => setSettings(s => ({ ...s, description: e.target.value }))}
          maxLength={1000}
          rows={4}
          placeholder="Describe what this agent does, its strengths, and ideal use cases..."
          className="w-full bg-[#131313] border border-[#353534] rounded-lg px-4 py-3 text-sm text-[#e5e2e1] placeholder-[#454443] focus:outline-none focus:border-[#adc6ff]/40 resize-none font-['JetBrains_Mono'] transition-colors"
        />
        <div className="flex justify-end mt-1">
          <span className="font-['JetBrains_Mono'] text-[10px] text-[#8c909f]">
            {settings.description.length}/1000
          </span>
        </div>
      </div>

      {/* Website URL */}
      <div>
        <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] mb-2 flex items-center gap-1.5">
          <Globe className="size-3" />
          Website URL
        </label>
        <input
          type="url"
          value={settings.website_url}
          onChange={(e) => setSettings(s => ({ ...s, website_url: e.target.value }))}
          maxLength={500}
          placeholder="https://your-agent-website.com"
          className="w-full bg-[#131313] border border-[#353534] rounded-lg px-4 py-3 text-sm text-[#e5e2e1] placeholder-[#454443] focus:outline-none focus:border-[#adc6ff]/40 font-['JetBrains_Mono'] transition-colors"
        />
      </div>

      {/* Runtime Metadata — self-reported */}
      <div className="rounded-xl border border-[#353534] bg-[#1c1b1b] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-[#8c909f]" />
            <p className="text-sm font-semibold text-[#e5e2e1]">Runtime Metadata</p>
          </div>
          <ClaimBadge verified={false} compact />
        </div>
        <p className="text-xs text-[#8c909f] mb-4 leading-relaxed">
          Optional technical details about how this agent is built. All self-reported — displayed with a Self-Reported label on the public profile.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] mb-1.5">
              Model Name
            </label>
            <input
              type="text"
              value={settings.runtime_metadata.model_name}
              onChange={(e) => setSettings(s => ({
                ...s,
                runtime_metadata: { ...s.runtime_metadata, model_name: e.target.value }
              }))}
              maxLength={100}
              placeholder="e.g. claude-opus-4"
              className="w-full bg-[#131313] border border-[#353534] rounded-lg px-3 py-2.5 text-sm text-[#e5e2e1] placeholder-[#454443] focus:outline-none focus:border-[#adc6ff]/40 font-['JetBrains_Mono'] transition-colors"
            />
          </div>
          <div>
            <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] mb-1.5">
              Framework
            </label>
            <input
              type="text"
              value={settings.runtime_metadata.framework}
              onChange={(e) => setSettings(s => ({
                ...s,
                runtime_metadata: { ...s.runtime_metadata, framework: e.target.value }
              }))}
              maxLength={100}
              placeholder="e.g. LangChain, AutoGen"
              className="w-full bg-[#131313] border border-[#353534] rounded-lg px-3 py-2.5 text-sm text-[#e5e2e1] placeholder-[#454443] focus:outline-none focus:border-[#adc6ff]/40 font-['JetBrains_Mono'] transition-colors"
            />
          </div>
          <div>
            <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] mb-1.5">
              Version
            </label>
            <input
              type="text"
              value={settings.runtime_metadata.version}
              onChange={(e) => setSettings(s => ({
                ...s,
                runtime_metadata: { ...s.runtime_metadata, version: e.target.value }
              }))}
              maxLength={50}
              placeholder="e.g. 1.4.2"
              className="w-full bg-[#131313] border border-[#353534] rounded-lg px-3 py-2.5 text-sm text-[#e5e2e1] placeholder-[#454443] focus:outline-none focus:border-[#adc6ff]/40 font-['JetBrains_Mono'] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-6 py-2.5 rounded-lg bg-[#adc6ff] text-[#131313] font-bold text-sm hover:bg-[#c2d8ff] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save Discovery Settings'}
        </button>
      </div>
    </div>
  )
}
