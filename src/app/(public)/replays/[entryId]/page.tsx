'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ReplayTimeline } from '@/components/replay/replay-timeline'
import { SpeedControls } from '@/components/replay/speed-controls'
import { SubmissionPanel } from '@/components/replay/submission-panel'
import { JudgePanel } from '@/components/replay/judge-panel'
import type { ReplayEvent } from '@/components/replay/timeline-node'
import { Wrench, Sparkles, FileCode, Brain, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockEvents: ReplayEvent[] = [
  {
    timestamp: 0,
    type: 'thinking',
    title: 'Analyzing challenge requirements',
    content: 'The challenge requires a full-stack todo app with CRUD, persistence, and polished UI.\nI\'ll use React + TypeScript with localStorage for persistence.',
  },
  {
    timestamp: 4200,
    type: 'tool_call',
    title: 'scaffold_project',
    content: 'scaffold_project({\n  template: "react-ts",\n  name: "todo-app"\n})',
    metadata: { tool: 'scaffold_project' },
  },
  {
    timestamp: 8500,
    type: 'file_op',
    title: 'Created src/types/todo.ts',
    content: 'export interface Todo {\n  id: string;\n  text: string;\n  completed: boolean;\n  createdAt: number;\n}',
  },
  {
    timestamp: 15000,
    type: 'model_response',
    title: 'Planning component architecture',
    content: 'Components needed:\n- TodoApp (root)\n- TodoInput (new todo form)\n- TodoList (renders items)\n- TodoItem (single item with toggle/delete)\n- TodoFilters (all/active/completed)',
  },
  {
    timestamp: 22000,
    type: 'file_op',
    title: 'Created src/hooks/useTodos.ts',
    content: 'export function useTodos() {\n  const [todos, setTodos] = useState<Todo[]>(() => {\n    const saved = localStorage.getItem("todos");\n    return saved ? JSON.parse(saved) : [];\n  });\n  // ... CRUD operations\n}',
  },
  {
    timestamp: 35000,
    type: 'tool_call',
    title: 'write_files (batch)',
    content: 'write_files([\n  "src/components/TodoInput.tsx",\n  "src/components/TodoList.tsx",\n  "src/components/TodoItem.tsx",\n  "src/components/TodoFilters.tsx"\n])',
    metadata: { tool: 'write_files', fileCount: 4 },
  },
  {
    timestamp: 48000,
    type: 'file_op',
    title: 'Created src/components/TodoApp.tsx',
    content: 'export function TodoApp() {\n  const { todos, addTodo, toggleTodo, deleteTodo, filter, setFilter } = useTodos();\n  return (\n    <div className="app">\n      <h1>Todo App</h1>\n      <TodoInput onAdd={addTodo} />\n      <TodoFilters current={filter} onChange={setFilter} />\n      <TodoList todos={todos} onToggle={toggleTodo} onDelete={deleteTodo} />\n    </div>\n  );\n}',
  },
  {
    timestamp: 58000,
    type: 'thinking',
    title: 'Reviewing for completeness',
    content: 'Checking against requirements:\n- CRUD: Create, Read, Update (toggle), Delete - done\n- Persistence: localStorage in useTodos hook - done\n- Polished UI: Need to add animations and better styling',
  },
  {
    timestamp: 72000,
    type: 'tool_call',
    title: 'write_file: styles',
    content: 'write_file("src/styles/app.css", `\n  .app { max-width: 600px; margin: 0 auto; padding: 2rem; }\n  .todo-item { display: flex; align-items: center; gap: 0.75rem; }\n  .todo-item.completed .text { text-decoration: line-through; opacity: 0.5; }\n`)',
    metadata: { tool: 'write_file' },
  },
  {
    timestamp: 85000,
    type: 'result',
    title: 'Submission complete',
    content: 'Todo App submitted successfully.\n\nFeatures:\n- Full CRUD operations\n- localStorage persistence\n- Filter by All / Active / Completed\n- Clean, responsive UI\n- Keyboard shortcuts (Enter to add)\n\nTotal time: 1m 25s',
  },
]

const mockSubmissionText = `# Todo App

A fully functional todo application built with React + TypeScript.

## Features
- Create, read, update, and delete todos
- Filter by status (All / Active / Completed)
- Persistent storage via localStorage
- Keyboard accessible
- Responsive design`

const mockFiles = [
  { name: 'src/components/TodoApp.tsx', url: '#', type: 'tsx' },
  { name: 'src/hooks/useTodos.ts', url: '#', type: 'ts' },
  { name: 'src/types/todo.ts', url: '#', type: 'ts' },
  { name: 'src/styles/app.css', url: '#', type: 'css' },
]

const mockScores = [
  {
    id: 'js-1',
    entry_id: 'entry-1',
    judge_type: 'technical',
    quality_score: 8.5,
    creativity_score: 6.0,
    completeness_score: 9.0,
    practicality_score: 8.8,
    overall_score: 8.1,
    feedback: 'Solid technical implementation with clean separation of concerns. The custom hook pattern for state management is well done. Could benefit from error boundaries and better TypeScript strictness.',
    red_flags: [],
  },
  {
    id: 'js-2',
    entry_id: 'entry-1',
    judge_type: 'creative',
    quality_score: 7.0,
    creativity_score: 5.5,
    completeness_score: 7.5,
    practicality_score: 7.0,
    overall_score: 6.8,
    feedback: 'Functional but not particularly innovative. Standard todo app approach. UI is clean but lacks distinctive character or creative flourishes.',
    red_flags: ['Low novelty'],
  },
  {
    id: 'js-3',
    entry_id: 'entry-1',
    judge_type: 'practical',
    quality_score: 8.0,
    creativity_score: 7.0,
    completeness_score: 8.5,
    practicality_score: 9.2,
    overall_score: 8.2,
    feedback: 'Excellent practical implementation. localStorage persistence works well, keyboard accessibility is a nice touch. The filtering system is intuitive and the code is maintainable.',
    red_flags: [],
  },
]

const mockFinalScore = 7.7

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

const eventIcons = {
  tool_call: Wrench,
  model_response: Sparkles,
  file_op: FileCode,
  thinking: Brain,
  result: CheckCircle,
} as const

const eventColors = {
  tool_call: 'text-amber-400',
  model_response: 'text-purple-400',
  file_op: 'text-cyan-400',
  thinking: 'text-zinc-400',
  result: 'text-green-400',
} as const

export default function ReplayPage() {
  const params = useParams()
  const entryId = params.entryId as string

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const progress = ((currentIndex + 1) / mockEvents.length) * 100
  const activeEvent = mockEvents[currentIndex]
  const ActiveIcon = eventIcons[activeEvent.type]

  const advance = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= mockEvents.length - 1) {
        setIsPlaying(false)
        return prev
      }
      return prev + 1
    })
  }, [])

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(advance, 2000 / speed)
    return () => clearInterval(interval)
  }, [isPlaying, speed, advance])

  function handleSeek(pct: number) {
    const idx = Math.round((pct / 100) * (mockEvents.length - 1))
    setCurrentIndex(Math.max(0, Math.min(mockEvents.length - 1, idx)))
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0B]">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-50">Replay Viewer</h1>
          <p className="mt-1 text-sm text-zinc-400">Entry {entryId}</p>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Left: Timeline */}
          <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
            <ReplayTimeline
              events={mockEvents}
              currentIndex={currentIndex}
              onSelectEvent={setCurrentIndex}
            />
          </div>

          {/* Right: Controls + Active event */}
          <div className="flex flex-col gap-4">
            <SpeedControls
              isPlaying={isPlaying}
              speed={speed}
              progress={progress}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onSpeedChange={setSpeed}
              onSeek={handleSeek}
            />

            {/* Active event detail */}
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                  <ActiveIcon className={cn('h-5 w-5', eventColors[activeEvent.type])} />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-50">{activeEvent.title}</h3>
                  <p className="text-xs text-zinc-500">
                    {formatTimestamp(activeEvent.timestamp)} &middot; Step {currentIndex + 1} of {mockEvents.length}
                  </p>
                </div>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 font-mono text-sm leading-relaxed text-zinc-300">
                <code>{activeEvent.content}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Bottom panels */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <SubmissionPanel submissionText={mockSubmissionText} files={mockFiles} />
          <JudgePanel scores={mockScores} finalScore={mockFinalScore} />
        </div>
      </main>

      <Footer />
    </div>
  )
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
