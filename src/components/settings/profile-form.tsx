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
      <Card className="border-white/5 bg-[#201f1f]/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="size-6 text-[#e5e2e1]0 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/5 bg-[#201f1f]/50">
      <CardHeader>
        <CardTitle className="text-[#e5e2e1]">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {user?.email && (
          <div className="space-y-2">
            <Label className="text-[#c2c6d5]">Email</Label>
            <p className="text-sm text-[#8c909f] font-mono">{user.email}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-[#c2c6d5]">
            Display Name
          </Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="border-white/5 bg-[#1c1b1b]/50 text-[#e5e2e1] placeholder:text-[#e5e2e1]0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatarUrl" className="text-[#c2c6d5]">
            Avatar
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="flex-1 border-white/5 bg-[#1c1b1b]/50 text-[#e5e2e1] placeholder:text-[#e5e2e1]0"
            />
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-[#2a2a2a] text-[#c2c6d5]">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#4d8efe] text-white hover:bg-[#adc6ff]"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  )
}
