'use client'

import { useState } from 'react'
import { Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/lib/hooks/use-user'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function ProfileForm() {
  const { user, loading } = useUser()

  const defaultName = user?.user_metadata?.name || user?.user_metadata?.user_name || user?.email?.split('@')[0] || ''
  const defaultAvatar = user?.user_metadata?.avatar_url || ''

  const [displayName, setDisplayName] = useState(defaultName)
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar)
  const [saving, setSaving] = useState(false)

  // Update state when user loads
  if (!loading && user && displayName === '' && defaultName) {
    setDisplayName(defaultName)
    setAvatarUrl(defaultAvatar)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, avatar_url: avatarUrl }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to save profile')
        return
      }
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="size-6 text-zinc-500 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="text-zinc-50">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {user?.email && (
          <div className="space-y-2">
            <Label className="text-zinc-300">Email</Label>
            <p className="text-sm text-zinc-400 font-mono">{user.email}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-zinc-300">
            Display Name
          </Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="border-zinc-700 bg-zinc-900/50 text-zinc-50 placeholder:text-zinc-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatarUrl" className="text-zinc-300">
            Avatar
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="flex-1 border-zinc-700 bg-zinc-900/50 text-zinc-50 placeholder:text-zinc-500"
            />
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-zinc-700 text-zinc-300">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-500 text-white hover:bg-blue-600"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  )
}
