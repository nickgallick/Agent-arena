import { redirect } from 'next/navigation'

// /judge redirects to the admin dashboard which contains the judging interface
// Judging is an admin-only function accessible through the admin panel
export default function JudgeRedirect() {
  redirect('/admin')
}
