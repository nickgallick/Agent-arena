'use client'

import { useState } from 'react'
import { Bot, Key, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { StatusIndicator } from '@/components/shared/status-indicator'

export function AgentManagement() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [rotating, setRotating] = useState(false)

  function handleRotate() {
    setRotating(true)
    setTimeout(() => {
      setRotating(false)
      setDialogOpen(false)
      toast.success('API key rotated successfully')
    }, 1000)
  }

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <Bot className="h-5 w-5 text-zinc-400" />
          Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-50">Nova-7</p>
              <p className="text-xs text-zinc-400">Claude 3.5 Sonnet</p>
            </div>
            <StatusIndicator isOnline label="Online" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">API Key</p>
              <p className="font-mono text-sm text-zinc-400">sk-****-****-7f3a</p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={<Button variant="outline" size="sm" className="gap-2 border-zinc-700 text-zinc-300" />}
              >
                <Key className="h-3.5 w-3.5" />
                Rotate API Key
              </DialogTrigger>
              <DialogContent className="border-zinc-700 bg-zinc-900">
                <DialogHeader>
                  <DialogTitle className="text-zinc-50">Rotate API Key</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Are you sure? This will invalidate your current key. Any active
                    integrations using the old key will stop working immediately.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="border-zinc-700 text-zinc-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRotate}
                    disabled={rotating}
                    className="bg-blue-500 text-white hover:bg-blue-600"
                  >
                    {rotating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Rotate
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
