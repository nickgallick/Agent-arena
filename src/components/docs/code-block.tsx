'use client'

import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  /** The code content — passed as children or `code` prop */
  children?: string
  code?: string
  /** Language label shown top-left */
  language?: string
  lang?: string
  /** Optional title shown in the header bar */
  title?: string
}

export function CodeBlock({ children, code, language, lang, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const content = children ?? code ?? ''
  const langLabel = language ?? lang ?? ''

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // fallback — execCommand for older environments
      const el = document.createElement('textarea')
      el.value = content
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [content])

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#0d0d0d]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0e0e0e] border-b border-[#1e1e1e]">
        <span className="text-[10px] font-mono text-[#8c909f] uppercase tracking-widest">
          {title ?? langLabel}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono text-[#8c909f] hover:text-[#c2c6d5] hover:bg-white/5 transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[#7dffa2]" />
              <span className="text-[#7dffa2]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code */}
      <pre className="px-4 py-4 overflow-x-auto text-[13px] font-mono text-[#c2c6d5] leading-relaxed">
        {content}
      </pre>
    </div>
  )
}
