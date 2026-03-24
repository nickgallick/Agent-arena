import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/internal/screenshot
 * 
 * Takes an entry_id, renders its submission files via Playwright,
 * captures desktop + mobile screenshots, and uploads to Supabase Storage.
 * 
 * This endpoint is called internally after judging visual challenges.
 * It requires a valid internal secret to prevent abuse.
 * 
 * On Vercel (no Playwright available), returns graceful fallback.
 * Intended to be called from a VPS worker that has Playwright installed.
 */

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    // Verify internal auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${INTERNAL_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entry_id } = await request.json()
    if (!entry_id) {
      return NextResponse.json({ error: 'entry_id required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get entry with submission
    const { data: entry, error: entryError } = await supabase
      .from('challenge_entries')
      .select('id, submission_text, submission_files, challenge_id, challenge:challenges(has_visual_output)')
      .eq('id', entry_id)
      .single()

    if (entryError || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const challenge = entry.challenge as unknown as { has_visual_output: boolean } | null
    if (!challenge?.has_visual_output) {
      return NextResponse.json({ message: 'Not a visual challenge, skipping' })
    }

    // Try to load Playwright — graceful fallback if not available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chromium: any
    try {
      // Dynamic require to avoid build-time type checking
      // Playwright is only available on VPS, not Vercel
      chromium = (await (Function('return import("playwright")')() as Promise<{ chromium: unknown }>)).chromium
    } catch {
      return NextResponse.json({ 
        message: 'Playwright not available in this environment. Use VPS worker.',
        fallback: true 
      })
    }

    // Extract HTML content from submission
    const html = extractHtml(entry.submission_text, entry.submission_files as Record<string, string>[] | null)
    if (!html) {
      return NextResponse.json({ message: 'No HTML content found in submission' })
    }

    // Launch browser and capture screenshots
    const browser = await chromium.launch({ headless: true })
    const screenshots: { viewport: string; url: string }[] = []

    const viewports = [
      { name: 'desktop', width: 1280, height: 800 },
      { name: 'mobile', width: 375, height: 812 },
    ]

    for (const vp of viewports) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const page = await context.newPage()
      
      await page.setContent(html, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000) // Wait for animations

      const buffer = await page.screenshot({ fullPage: false, type: 'png' })
      await context.close()

      // Upload to Supabase Storage
      const path = `entries/${entry_id}/${vp.name}.png`
      const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(path, buffer, { contentType: 'image/png', upsert: true })

      if (uploadError) {
        console.error(`Screenshot upload failed (${vp.name}):`, uploadError)
        continue
      }

      const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(path)
      screenshots.push({ viewport: vp.name, url: urlData.publicUrl })
    }

    await browser.close()

    // Update entry with screenshot URLs
    if (screenshots.length > 0) {
      await supabase
        .from('challenge_entries')
        .update({ screenshot_urls: screenshots, updated_at: new Date().toISOString() })
        .eq('id', entry_id)
    }

    return NextResponse.json({ 
      screenshots, 
      entry_id,
      message: `Captured ${screenshots.length} screenshots` 
    })
  } catch (err) {
    console.error('[screenshot] Error:', err)
    return NextResponse.json({ error: 'Screenshot capture failed', fallback: true }, { status: 500 })
  }
}

function extractHtml(
  submissionText: string | null, 
  submissionFiles: Record<string, string>[] | null
): string | null {
  // Check submission_files for HTML files first
  if (submissionFiles && Array.isArray(submissionFiles)) {
    const htmlFile = submissionFiles.find(
      (f) => f.name?.endsWith('.html') || f.type === 'html'
    )
    if (htmlFile?.content) return htmlFile.content
  }

  // Check if submission_text itself is HTML
  if (submissionText) {
    const trimmed = submissionText.trim()
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<div')) {
      return trimmed
    }

    // Try to extract HTML from code blocks
    const htmlMatch = trimmed.match(/```html?\n([\s\S]*?)```/)
    if (htmlMatch?.[1]) return htmlMatch[1]

    // Look for inline CSS+HTML patterns
    if (trimmed.includes('<style>') || trimmed.includes('<svg')) {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${trimmed}</body></html>`
    }
  }

  return null
}
