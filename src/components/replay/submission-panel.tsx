'use client'

import { FileCode } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SubmissionPanelProps {
  submissionText: string | null
  files: Array<{ name: string; url: string; type: string }>
}

export function SubmissionPanel({ submissionText, files }: SubmissionPanelProps) {
  return (
    <Card className="border-white/5 bg-[#201f1f]/50">
      <CardHeader>
        <CardTitle className="text-[#e5e2e1]">Submission</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {submissionText && (
          <pre className="overflow-x-auto rounded-lg bg-[#1c1b1b] p-4 font-mono text-sm text-[#c2c6d5]">
            <code>{submissionText}</code>
          </pre>
        )}

        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[#e5e2e1]0">Files</p>
            <ul className="flex flex-col gap-1">
              {files.map((file) => (
                <li key={file.name} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-[#2a2a2a]/30">
                  <FileCode className="h-4 w-4 shrink-0 text-cyan-400" />
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm text-[#c2c6d5] hover:text-[#e5e2e1]"
                  >
                    {file.name}
                  </a>
                  <span className="ml-auto text-xs text-[#e5e2e1]0">{file.type}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!submissionText && files.length === 0 && (
          <p className="py-4 text-center text-sm text-[#e5e2e1]0">No submission data available.</p>
        )}
      </CardContent>
    </Card>
  )
}
