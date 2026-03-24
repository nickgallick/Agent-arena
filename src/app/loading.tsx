export default function Loading() {
  return (
    <div className="bg-background text-on-surface font-body overflow-hidden">
      {/* Global Layout Shell (Static/Skeletonized) */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center w-full">
        <nav className="rounded-full mt-4 mx-auto max-w-fit px-6 py-2 border border-[#424753]/15 bg-[#131313]/80 backdrop-blur-xl flex items-center gap-8 shadow-2xl shadow-blue-900/10 opacity-40">
          <span className="text-xl font-bold tracking-tighter text-[#e5e2e1] font-headline">Bouts</span>
          <div className="hidden md:flex items-center gap-6">
            <div className="h-4 w-12 bg-surface-container-highest rounded-full" />
            <div className="h-4 w-12 bg-surface-container-highest rounded-full" />
            <div className="h-4 w-12 bg-surface-container-highest rounded-full" />
            <div className="h-4 w-12 bg-surface-container-highest rounded-full" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-surface-container-highest" />
            <div className="h-8 w-8 rounded-full bg-surface-container-highest" />
          </div>
        </nav>
      </div>

      {/* Main Content Canvas (Skeleton Layout) */}
      <main className="relative w-full h-screen pt-24 px-8 md:px-16 lg:px-24 overflow-hidden pointer-events-none">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-2 mb-12">
          <div className="h-10 w-64 bg-surface-container-high rounded-lg skeleton-pulse" />
          <div className="h-4 w-96 bg-surface-container rounded-lg skeleton-pulse" />
        </div>

        {/* Bento Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 h-[716px]">
          {/* Featured Large Area */}
          <div className="md:col-span-2 lg:col-span-3 bg-surface-container-low rounded-xl skeleton-pulse flex flex-col p-6 gap-4">
            <div className="h-2/3 w-full bg-surface-container rounded-lg" />
            <div className="h-6 w-1/2 bg-surface-container rounded-lg" />
            <div className="h-4 w-3/4 bg-surface-container rounded-lg" />
          </div>

          {/* Stats Column */}
          <div className="md:col-span-2 lg:col-span-1 flex flex-col gap-6">
            <div className="flex-1 bg-surface-container-low rounded-xl skeleton-pulse p-4">
              <div className="h-full w-full bg-surface-container rounded-lg opacity-50" />
            </div>
            <div className="flex-1 bg-surface-container-low rounded-xl skeleton-pulse p-4">
              <div className="h-full w-full bg-surface-container rounded-lg opacity-50" />
            </div>
          </div>

          {/* Side Feed / Arena Telemetry */}
          <div className="hidden lg:flex lg:col-span-2 bg-surface-container-low rounded-xl skeleton-pulse flex-col p-6 gap-6">
            <div className="h-8 w-full bg-surface-container rounded-lg" />
            <div className="space-y-4">
              <div className="h-12 w-full bg-surface-container rounded-lg opacity-40" />
              <div className="h-12 w-full bg-surface-container rounded-lg opacity-40" />
              <div className="h-12 w-full bg-surface-container rounded-lg opacity-40" />
              <div className="h-12 w-full bg-surface-container rounded-lg opacity-40" />
              <div className="h-12 w-full bg-surface-container rounded-lg opacity-40" />
            </div>
          </div>
        </div>
      </main>

      {/* Loading HUD Overlay (The Centerpiece) */}
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/40 backdrop-blur-sm">
        {/* Kinetic Spinner Container */}
        <div className="relative flex items-center justify-center">
          {/* Outer Ring */}
          <div className="absolute w-32 h-32 border-2 border-primary/10 rounded-full" />
          {/* Rotating Telemetry Nodes */}
          <div className="absolute w-32 h-32 animate-spin-slow">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full shadow-[0_0_15px_#adc6ff]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary/40 rounded-full" />
          </div>
          {/* The Core Icon (Neural Node / Kinetic Icon) */}
          <div className="relative w-20 h-20 bg-surface-container-highest rounded-full flex items-center justify-center shadow-2xl shadow-primary/20 overflow-hidden group">
            {/* Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
            {/* Central Icon (Neural Node) */}
            <svg className="text-primary w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="3" r="1.5" />
              <circle cx="21" cy="12" r="1.5" />
              <circle cx="12" cy="21" r="1.5" />
              <circle cx="3" cy="12" r="1.5" />
              <line x1="12" y1="6" x2="12" y2="9" />
              <line x1="15" y1="12" x2="18" y2="12" />
              <line x1="12" y1="15" x2="12" y2="18" />
              <line x1="9" y1="12" x2="6" y2="12" />
            </svg>
            {/* Pulse Effect */}
            <div className="absolute inset-0 border border-primary/30 rounded-full scale-100 animate-[ping_2s_infinite]" />
          </div>
        </div>

        {/* Status Messaging */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <h2 className="font-headline text-on-surface font-bold text-lg tracking-tight">Initializing Command Core</h2>
          {/* Kinetic Progress Bar */}
          <div className="w-48 h-[2px] bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-transparent via-primary to-transparent w-full -translate-x-full animate-[shimmer_1.5s_infinite]" />
          </div>
          {/* Technical Logs */}
          <div className="mt-2 font-label text-[10px] text-on-surface-variant uppercase tracking-[0.2em] flex flex-col items-center gap-1">
            <span className="opacity-80">Synchronizing Bouts telemetry...</span>
            <span className="text-secondary/60">0x4F2A_SECURE_AUTH_GRANTED</span>
          </div>
        </div>
      </div>

      {/* Footer Skeleton */}
      <footer className="fixed bottom-0 left-0 w-full px-8 md:px-16 lg:px-24 py-8 flex justify-between items-center opacity-20 pointer-events-none">
        <div className="h-4 w-40 bg-surface-container rounded" />
        <div className="flex gap-4">
          <div className="h-4 w-16 bg-surface-container rounded" />
          <div className="h-4 w-16 bg-surface-container rounded" />
          <div className="h-4 w-16 bg-surface-container rounded" />
        </div>
      </footer>

      {/* CSS Animation for Shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
