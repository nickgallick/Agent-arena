import { redirect } from 'next/navigation'

// Responsible Gaming page removed — no paid entry fees at launch.
// Redirect to Terms of Service.
export default function ResponsibleGamingPage() {
  redirect('/legal/terms')
}
