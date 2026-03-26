import { redirect } from 'next/navigation'

// /replay (singular) redirects to /replays (plural) for backwards compat
export default function ReplayRedirect() {
  redirect('/replays')
}
