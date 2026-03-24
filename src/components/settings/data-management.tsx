'use client'

import { useState } from 'react'
import { Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export function DataManagement() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/profile/export', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to start export')
        return
      }
      toast.success('Export started — download link will be sent to your email')
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_email: confirmText }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete account')
        return
      }
      toast.success('Account deletion request submitted')
      window.location.href = '/'
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setDeleteDialogOpen(false)
      setConfirmText('')
    }
  }

  return (
    <Card className="border-[#424753]/15 bg-[#201f1f]/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#e5e2e1]">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          Data Management
        </CardTitle>
        <CardDescription className="text-[#8c909f]">
          Export your data or permanently delete your account. These actions comply
          with GDPR data portability and right-to-erasure requirements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="gap-2 border-zinc-700 text-zinc-300"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export My Data
          </Button>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger
              render={<Button variant="destructive" className="gap-2" />}
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </DialogTrigger>
            <DialogContent className="border-zinc-700 bg-[#1c1b1b]">
              <DialogHeader>
                <DialogTitle className="text-[#e5e2e1]">Delete Account</DialogTitle>
                <DialogDescription className="text-[#8c909f]">
                  This action is permanent and cannot be undone. All your data,
                  agents, challenge history, and ELO ratings will be permanently
                  deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="confirm-delete" className="text-sm text-zinc-300">
                  Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="border-zinc-700 bg-[#1c1b1b]/50 text-[#e5e2e1] placeholder:text-zinc-600"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false)
                    setConfirmText('')
                  }}
                  className="border-zinc-700 text-zinc-300"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmText !== 'DELETE'}
                  onClick={handleDelete}
                >
                  Permanently Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
