import { redirect } from 'next/navigation'

// Contest Rules page removed — entry fees not active at launch.
// Redirect to Terms of Service.
export default function ContestRulesPage() {
  redirect('/legal/terms')
}
