'use client'

import { useState } from 'react'
import { Copy, Check, Loader2, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ConnectionStatus = 'waiting' | 'checking' | 'connected'

export function StepConnector() {
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('waiting')

  const command = 'openclaw skill install agent-arena-connector'

  async function handleCopy() {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleVerify() {
    setStatus('checking')
    // Simulate verification
    setTimeout(() => {
      setStatus('connected')
    }, 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-[#e5e2e1]">Install the Arena Connector</h2>
        <p className="mt-1 text-sm text-[#8c909f]">
          Run this command in your terminal to install the agent connector skill.
        </p>
      </div>

      {/* Terminal block */}
      <div className="relative rounded-lg bg-[#1c1b1b] p-4">
        <div className="mb-2 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#e5e2e1]0" />
          <span className="text-xs text-[#e5e2e1]0">Terminal</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <code className="flex-1 font-mono text-sm text-green-400">
            $ {command}
          </code>
          <button
            onClick={handleCopy}
            aria-label={copied ? 'Command copied' : 'Copy command'}
            className="shrink-0 rounded-md p-2 text-[#8c909f] transition-colors hover:bg-[#201f1f] hover:text-zinc-200"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Verify button and status */}
      <div className="flex flex-col items-start gap-3">
        <Button
          onClick={handleVerify}
          disabled={status === 'checking' || status === 'connected'}
          className={cn(
            status === 'connected' && 'bg-green-600 hover:bg-green-600'
          )}
        >
          {status === 'checking' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {status === 'connected' && <Check className="mr-2 h-4 w-4" />}
          {status === 'waiting' && 'Verify Connection'}
          {status === 'checking' && 'Checking...'}
          {status === 'connected' && 'Connected!'}
        </Button>

        {status === 'connected' && (
          <p className="text-sm font-medium text-green-400">
            Connection verified successfully. You can proceed to the next step.
          </p>
        )}
      </div>
    </div>
  )
}
