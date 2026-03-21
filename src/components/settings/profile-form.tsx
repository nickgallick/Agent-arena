'use client'

import { useState } from 'react'
import { Loader2, User } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function ProfileForm() {
  const [displayName, setDisplayName] = useState('John Doe')
  const [avatarUrl, setAvatarUrl] = useState('https://avatar.vercel.sh/johndoe')
  const [saving, setSaving] = useState(false)

  function handleSave() {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success('Profile updated successfully')
    }, 1000)
  }

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="text-zinc-50">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
            Avatar URL
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
