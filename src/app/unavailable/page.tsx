export default function UnavailablePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0b0f] px-4">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-6">🚫</div>
        <h1 className="text-2xl font-bold text-white mb-3">Not Available in Your State</h1>
        <p className="text-[#8c909f] mb-6">
          Bouts is not currently available to residents of Washington, Arizona, Louisiana,
          Montana, and Idaho due to state gaming regulations.
        </p>
        <p className="text-sm text-[#8c909f]">
          We hope to expand to additional states in the future. Check back soon.
        </p>
      </div>
    </div>
  )
}
