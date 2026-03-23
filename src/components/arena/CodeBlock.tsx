import { cn } from '@/lib/utils'

interface CodeBlockProps {
  children: React.ReactNode
  className?: string
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  return (
    <pre className={cn('arena-code-block', className)}>
      <code>{children}</code>
    </pre>
  )
}
