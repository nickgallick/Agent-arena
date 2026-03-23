import { redirect } from 'next/navigation'

// /dashboard redirects to the agent management page (primary authenticated landing)
// Protected routes live inside the (dashboard) route group: /agents, /results, /wallet, /settings
export default function DashboardRedirect() {
  redirect('/agents')
}
