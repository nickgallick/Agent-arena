'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Building2, Plus, Trash2, ChevronDown, ChevronRight, UserPlus,
  UserMinus, Loader2, Copy, Check, Users, Shield, Crown, AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Org {
  id: string
  name: string
  slug: string
  plan: 'free' | 'private'
  description: string | null
  owner_id: string
  role: 'owner' | 'admin' | 'member'
  member_count: number
  created_at: string
}

interface OrgMember {
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  profiles: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface Invitation {
  id: string
  email: string
  role: string
  token: string
  invite_url: string
  expires_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getJwt(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function apiFetch(path: string, options?: RequestInit) {
  const jwt = await getJwt()
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...(options?.headers ?? {}),
    },
  })
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; color: string }> = {
    owner: { label: 'OWNER', color: 'bg-[#7dffa2]/10 text-[#7dffa2] border border-[#7dffa2]/30' },
    admin: { label: 'ADMIN', color: 'bg-[#adc6ff]/10 text-[#adc6ff] border border-[#adc6ff]/30' },
    member: { label: 'MEMBER', color: 'bg-[#353534] text-[#c2c6d5] border border-[#353534]' },
  }
  const c = config[role] ?? config.member
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest ${c.color}`}>
      {c.label}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function OrgManagement() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [orgMembers, setOrgMembers] = useState<Record<string, OrgMember[]>>({})
  const [membersLoading, setMembersLoading] = useState<Record<string, boolean>>({})

  // Create org modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', slug: '', description: '' })

  // Invite modal
  const [inviteOrgId, setInviteOrgId] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' })
  const [lastInvitation, setLastInvitation] = useState<Invitation | null>(null)

  // Delete org modal
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Copy state
  const [copied, setCopied] = useState(false)

  // ── Fetch orgs ──────────────────────────────────────────────────────────────

  const fetchOrgs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/v1/orgs')
      if (!res.ok) throw new Error('Failed to fetch organizations')
      const json = await res.json()
      setOrgs(json.data ?? [])
    } catch {
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  // ── Fetch members for expanded org ─────────────────────────────────────────

  const fetchMembers = useCallback(async (orgId: string) => {
    setMembersLoading((p) => ({ ...p, [orgId]: true }))
    try {
      const res = await apiFetch(`/api/v1/orgs/${orgId}/members`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setOrgMembers((p) => ({ ...p, [orgId]: json.data ?? [] }))
    } catch {
      toast.error('Failed to load members')
    } finally {
      setMembersLoading((p) => ({ ...p, [orgId]: false }))
    }
  }, [])

  const handleToggleOrg = (orgId: string) => {
    if (expandedOrg === orgId) {
      setExpandedOrg(null)
    } else {
      setExpandedOrg(orgId)
      if (!orgMembers[orgId]) {
        fetchMembers(orgId)
      }
    }
  }

  // ── Create org ──────────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.name.trim() || !createForm.slug.trim()) return

    setCreateLoading(true)
    try {
      const res = await apiFetch('/api/v1/orgs', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name,
          slug: createForm.slug,
          description: createForm.description || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to create organization')
        return
      }
      toast.success(`Organization "${createForm.name}" created!`)
      setCreateForm({ name: '', slug: '', description: '' })
      setCreateOpen(false)
      fetchOrgs()
    } catch {
      toast.error('Failed to create organization')
    } finally {
      setCreateLoading(false)
    }
  }

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setCreateForm((f) => ({
      ...f,
      name,
      slug: f.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }))
  }

  // ── Invite member ───────────────────────────────────────────────────────────

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteOrgId || !inviteForm.email.trim()) return

    setInviteLoading(true)
    try {
      const res = await apiFetch(`/api/v1/orgs/${inviteOrgId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteForm.email, role: inviteForm.role }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to create invitation')
        return
      }
      setLastInvitation(json.data)
      setInviteForm({ email: '', role: 'member' })
      fetchMembers(inviteOrgId)
    } catch {
      toast.error('Failed to create invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  // ── Remove member ───────────────────────────────────────────────────────────

  const handleRemoveMember = async (orgId: string, userId: string, memberRole: string) => {
    if (memberRole === 'owner') {
      toast.error('Cannot remove the organization owner')
      return
    }
    try {
      const res = await apiFetch(`/api/v1/orgs/${orgId}/members/${userId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to remove member')
        return
      }
      toast.success('Member removed')
      fetchMembers(orgId)
      fetchOrgs()
    } catch {
      toast.error('Failed to remove member')
    }
  }

  // ── Delete org ──────────────────────────────────────────────────────────────

  const handleDeleteOrg = async () => {
    if (!deleteOrgId) return
    setDeleteLoading(true)
    try {
      const res = await apiFetch(`/api/v1/orgs/${deleteOrgId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to delete organization')
        return
      }
      toast.success('Organization deleted')
      setDeleteOrgId(null)
      fetchOrgs()
    } catch {
      toast.error('Failed to delete organization')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Copy invite URL ─────────────────────────────────────────────────────────

  const handleCopyInvite = (token: string) => {
    const url = `${window.location.origin}/join/${token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Invite URL copied to clipboard')
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#7dffa2]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#7dffa2]" />
            Organizations
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Private tracks and team workspaces. Challenges assigned to an org are hidden from public discovery.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#7dffa2] text-[#131313] hover:bg-[#a0ffb8] font-bold text-xs uppercase tracking-widest px-4 py-2"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Org
        </Button>
      </div>

      {/* Org list */}
      {orgs.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No organizations yet</p>
          <p className="text-sm mt-1">Create an org to host private challenges for your team.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => {
            const isExpanded = expandedOrg === org.id
            const members = orgMembers[org.id] ?? []
            const isMembersLoading = membersLoading[org.id]
            const canManage = ['owner', 'admin'].includes(org.role)

            return (
              <div
                key={org.id}
                className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden"
              >
                {/* Org header row */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer hover:bg-surface-container-highest/30 transition-colors"
                  onClick={() => handleToggleOrg(org.id)}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#7dffa2]/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-[#7dffa2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-on-surface truncate">{org.name}</span>
                      <span className="text-xs text-on-surface-variant font-mono">/{org.slug}</span>
                      <RoleBadge role={org.role} />
                      {org.plan === 'private' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-[#f9a8d4]/10 text-[#f9a8d4] border border-[#f9a8d4]/20">
                          PRIVATE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-on-surface-variant flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {org.member_count} {org.member_count === 1 ? 'member' : 'members'}
                      </span>
                      {org.description && (
                        <span className="text-xs text-on-surface-variant truncate">{org.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-on-surface-variant">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-outline-variant/10 p-5 space-y-6">
                    {/* Members list */}
                    <div>
                      <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Members
                      </h3>

                      {isMembersLoading ? (
                        <div className="flex items-center gap-2 text-on-surface-variant text-sm py-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading members...
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {members.map((m) => {
                            const profile = m.profiles
                            const displayName = profile?.display_name ?? profile?.username ?? 'Unknown'
                            const memberId = profile?.id
                            return (
                              <div
                                key={memberId ?? m.joined_at}
                                className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-highest/20"
                              >
                                <div className="w-8 h-8 rounded-full bg-[#353534] flex items-center justify-center flex-shrink-0 text-xs font-bold text-on-surface">
                                  {displayName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-on-surface truncate block">
                                    {displayName}
                                  </span>
                                  {profile?.username && (
                                    <span className="text-xs text-on-surface-variant">@{profile.username}</span>
                                  )}
                                </div>
                                <RoleBadge role={m.role} />
                                {canManage && m.role !== 'owner' && memberId && (
                                  <button
                                    onClick={() => handleRemoveMember(org.id, memberId, m.role)}
                                    className="ml-2 p-1.5 rounded hover:bg-[#ffb4ab]/10 text-on-surface-variant hover:text-[#ffb4ab] transition-colors"
                                    title="Remove member"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )
                          })}
                          {members.length === 0 && (
                            <p className="text-sm text-on-surface-variant">No members yet.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Invite form */}
                    {canManage && (
                      <div>
                        <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
                          <UserPlus className="w-4 h-4" />
                          Invite Member
                        </h3>

                        {/* Show last invitation result */}
                        {lastInvitation && inviteOrgId === org.id && (
                          <div className="mb-4 p-4 bg-[#7dffa2]/5 border border-[#7dffa2]/20 rounded-lg">
                            <p className="text-sm text-[#7dffa2] font-medium mb-2">
                              ✓ Invitation created for {lastInvitation.email}
                            </p>
                            <p className="text-xs text-on-surface-variant mb-2">
                              Share this URL manually — email delivery coming soon.
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs font-mono bg-[#201f1f] px-3 py-2 rounded border border-outline-variant/20 text-on-surface truncate">
                                {`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${lastInvitation.token}`}
                              </code>
                              <button
                                onClick={() => handleCopyInvite(lastInvitation.token)}
                                className="p-2 rounded hover:bg-[#353534] transition-colors text-on-surface-variant"
                              >
                                {copied ? <Check className="w-4 h-4 text-[#7dffa2]" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                            <button
                              onClick={() => setLastInvitation(null)}
                              className="mt-2 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}

                        <form
                          onSubmit={(e) => {
                            setInviteOrgId(org.id)
                            handleInvite(e)
                          }}
                          className="flex items-end gap-3"
                        >
                          <div className="flex-1">
                            <Label className="text-xs text-on-surface-variant mb-1 block">Email</Label>
                            <Input
                              type="email"
                              placeholder="teammate@example.com"
                              value={inviteForm.email}
                              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                              className="bg-surface-container-highest border-outline-variant/20 text-on-surface text-sm"
                              required
                            />
                          </div>
                          <div className="w-28">
                            <Label className="text-xs text-on-surface-variant mb-1 block">Role</Label>
                            <select
                              value={inviteForm.role}
                              onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                              className="w-full h-10 px-3 rounded-md bg-surface-container-highest border border-outline-variant/20 text-on-surface text-sm"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <Button
                            type="submit"
                            disabled={inviteLoading || !inviteForm.email}
                            className="bg-[#adc6ff]/10 text-[#adc6ff] hover:bg-[#adc6ff]/20 border border-[#adc6ff]/20 text-xs font-bold uppercase tracking-widest h-10"
                          >
                            {inviteLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5 mr-1" />
                                Invite
                              </>
                            )}
                          </Button>
                        </form>
                      </div>
                    )}

                    {/* Danger zone — owner only */}
                    {org.role === 'owner' && (
                      <div className="border-t border-outline-variant/10 pt-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#ffb4ab]">Danger Zone</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              Deleting removes all members and private challenge assignments.
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteOrgId(org.id)}
                            className="bg-[#ffb4ab]/10 text-[#ffb4ab] hover:bg-[#ffb4ab]/20 border border-[#ffb4ab]/20 text-xs font-bold uppercase tracking-widest"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Delete Org
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Org Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-surface-container border border-outline-variant/20 text-on-surface max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#7dffa2]" />
              Create Organization
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-on-surface-variant mb-1 block">Organization Name</Label>
              <Input
                placeholder="Acme AI Lab"
                value={createForm.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="bg-surface-container-highest border-outline-variant/20 text-on-surface"
                required
                maxLength={100}
              />
            </div>
            <div>
              <Label className="text-xs text-on-surface-variant mb-1 block">
                Slug <span className="text-on-surface-variant/60">(lowercase, hyphens only)</span>
              </Label>
              <div className="flex items-center gap-1">
                <span className="text-on-surface-variant text-sm">bouts.gg/</span>
                <Input
                  placeholder="acme-ai-lab"
                  value={createForm.slug}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    }))
                  }
                  className="bg-surface-container-highest border-outline-variant/20 text-on-surface flex-1"
                  required
                  minLength={2}
                  maxLength={50}
                  pattern="^[a-z0-9-]+$"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-on-surface-variant mb-1 block">
                Description <span className="text-on-surface-variant/60">(optional)</span>
              </Label>
              <Input
                placeholder="A brief description of your org"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-surface-container-highest border-outline-variant/20 text-on-surface"
                maxLength={500}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                className="flex-1 text-on-surface-variant"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createLoading || !createForm.name || !createForm.slug}
                className="flex-1 bg-[#7dffa2] text-[#131313] hover:bg-[#a0ffb8] font-bold text-xs uppercase tracking-widest"
              >
                {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Organization'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal */}
      <Dialog open={!!deleteOrgId} onOpenChange={(o) => !o && setDeleteOrgId(null)}>
        <DialogContent className="bg-surface-container border border-outline-variant/20 text-on-surface max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-[#ffb4ab]">
              <AlertTriangle className="w-5 h-5" />
              Delete Organization
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              This will permanently delete the organization and remove all members. Challenges assigned to this org will become public (their org_id will be cleared).
            </p>
            <p className="text-sm font-medium text-[#ffb4ab]">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setDeleteOrgId(null)}
                className="flex-1 text-on-surface-variant"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteOrg}
                disabled={deleteLoading}
                className="flex-1 bg-[#ffb4ab]/10 text-[#ffb4ab] hover:bg-[#ffb4ab]/20 border border-[#ffb4ab]/20 font-bold text-xs uppercase tracking-widest"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Organization'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
