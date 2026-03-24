#!/usr/bin/env npx tsx
/**
 * Screenshot Worker — runs on VPS with Playwright installed.
 * 
 * Processes visual challenge entries that need screenshots.
 * Can be run as a cron job or triggered manually.
 * 
 * Usage:
 *   npx tsx scripts/screenshot-worker.ts
 *   npx tsx scripts/screenshot-worker.ts --entry-id <uuid>
 */

import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gojpbtlajzigvyfkghrg.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface Viewport {
  name: string
  width: number
  height: number
}

const VIEWPORTS: Viewport[] = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 812 },
]

async function captureScreenshots(entryId: string): Promise<void> {
  console.log(`[screenshot] Processing entry ${entryId}`)

  // Get entry with challenge info
  const { data: entry, error } = await supabase
    .from('challenge_entries')
    .select('id, submission_text, submission_files, challenge_id, screenshot_urls')
    .eq('id', entryId)
    .single()

  if (error || !entry) {
    console.error(`[screenshot] Entry not found: ${entryId}`)
    return
  }

  // Skip if already has screenshots
  if (entry.screenshot_urls && Array.isArray(entry.screenshot_urls) && entry.screenshot_urls.length > 0) {
    console.log(`[screenshot] Entry ${entryId} already has screenshots, skipping`)
    return
  }

  // Extract renderable content
  const { html, needsBuild, files } = extractRenderableContent(
    entry.submission_text,
    entry.submission_files as Array<{ name: string; content: string; type?: string }> | null
  )

  if (!html && !needsBuild) {
    console.log(`[screenshot] No visual content found for entry ${entryId}`)
    return
  }

  const browser = await chromium.launch({ headless: true })
  const screenshots: Array<{ viewport: string; url: string }> = []

  try {
    let pageUrl: string

    if (needsBuild && files) {
      // Complex project — write to temp dir, install, build, serve
      pageUrl = await buildAndServe(files)
    } else if (html) {
      // Simple HTML — write to temp file
      const tmpDir = await mkdtemp(join(tmpdir(), 'arena-screenshot-'))
      const htmlPath = join(tmpDir, 'index.html')
      await writeFile(htmlPath, html, 'utf-8')
      pageUrl = `file://${htmlPath}`
    } else {
      console.log(`[screenshot] Cannot render entry ${entryId}`)
      return
    }

    for (const vp of VIEWPORTS) {
      try {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        })
        const page = await context.newPage()

        await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForTimeout(1500) // Wait for animations/rendering

        const buffer = await page.screenshot({ fullPage: false, type: 'png' })
        await context.close()

        // Upload to Supabase Storage
        const path = `entries/${entryId}/${vp.name}.png`
        const { error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(path, buffer, { contentType: 'image/png', upsert: true })

        if (uploadError) {
          console.error(`[screenshot] Upload failed (${vp.name}):`, uploadError.message)
          continue
        }

        const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(path)
        screenshots.push({ viewport: vp.name, url: urlData.publicUrl })
        console.log(`[screenshot] ✓ ${vp.name} captured for ${entryId}`)
      } catch (err) {
        console.error(`[screenshot] ${vp.name} failed:`, (err as Error).message)
      }
    }
  } finally {
    await browser.close()
  }

  // Update entry with screenshot URLs
  if (screenshots.length > 0) {
    const { error: updateError } = await supabase
      .from('challenge_entries')
      .update({ screenshot_urls: screenshots, updated_at: new Date().toISOString() })
      .eq('id', entryId)

    if (updateError) {
      console.error(`[screenshot] Failed to update entry:`, updateError.message)
    } else {
      console.log(`[screenshot] ✓ ${screenshots.length} screenshots saved for ${entryId}`)
    }
  }
}

function extractRenderableContent(
  submissionText: string | null,
  submissionFiles: Array<{ name: string; content: string; type?: string }> | null
): { html: string | null; needsBuild: boolean; files: Array<{ name: string; content: string }> | null } {
  // Check for package.json — needs build
  if (submissionFiles && Array.isArray(submissionFiles)) {
    const hasPackageJson = submissionFiles.some((f) => f.name === 'package.json')
    const htmlFile = submissionFiles.find((f) => f.name.endsWith('.html'))

    if (hasPackageJson) {
      return { html: null, needsBuild: true, files: submissionFiles }
    }

    if (htmlFile?.content) {
      // Check if it references CSS/JS files that are also in submission
      let html = htmlFile.content
      for (const file of submissionFiles) {
        if (file.name.endsWith('.css') && file.content) {
          html = html.replace(
            `<link rel="stylesheet" href="${file.name}">`,
            `<style>${file.content}</style>`
          )
          html = html.replace(
            `<link href="${file.name}" rel="stylesheet">`,
            `<style>${file.content}</style>`
          )
        }
      }
      return { html, needsBuild: false, files: null }
    }
  }

  // Check submission_text for HTML
  if (submissionText) {
    const trimmed = submissionText.trim()
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<div')) {
      return { html: trimmed, needsBuild: false, files: null }
    }

    const htmlMatch = trimmed.match(/```html?\n([\s\S]*?)```/)
    if (htmlMatch?.[1]) {
      return { html: htmlMatch[1], needsBuild: false, files: null }
    }

    if (trimmed.includes('<style>') || trimmed.includes('<svg')) {
      const wrapped = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${trimmed}</body></html>`
      return { html: wrapped, needsBuild: false, files: null }
    }
  }

  return { html: null, needsBuild: false, files: null }
}

async function buildAndServe(files: Array<{ name: string; content: string }>): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'arena-build-'))

  try {
    // Write all files
    for (const file of files) {
      const filePath = join(tmpDir, file.name)
      // Create subdirectories if needed
      const dir = filePath.substring(0, filePath.lastIndexOf('/'))
      if (dir !== tmpDir) {
        execSync(`mkdir -p "${dir}"`)
      }
      await writeFile(filePath, file.content, 'utf-8')
    }

    // Check for package.json and try to build
    const hasPackageJson = files.some((f) => f.name === 'package.json')
    if (hasPackageJson) {
      try {
        console.log(`[screenshot] Installing dependencies...`)
        execSync('npm install --production 2>&1', { cwd: tmpDir, timeout: 60000 })

        // Try common build commands
        try {
          execSync('npm run build 2>&1', { cwd: tmpDir, timeout: 60000 })
        } catch {
          // Build might not exist, that's OK
        }
      } catch (err) {
        console.warn(`[screenshot] npm install failed, trying as static files`)
      }
    }

    // Find an index.html to serve
    const indexHtml = join(tmpDir, 'index.html')
    const distIndex = join(tmpDir, 'dist', 'index.html')
    const buildIndex = join(tmpDir, 'build', 'index.html')

    for (const candidate of [indexHtml, distIndex, buildIndex]) {
      try {
        await import('fs').then((fs) => fs.accessSync(candidate))
        return `file://${candidate}`
      } catch {
        continue
      }
    }

    // Fallback: serve the temp dir
    return `file://${indexHtml}`
  } catch (err) {
    console.error(`[screenshot] Build failed:`, (err as Error).message)
    // Clean up
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    throw err
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const entryIdIndex = args.indexOf('--entry-id')

  if (entryIdIndex !== -1 && args[entryIdIndex + 1]) {
    // Process specific entry
    await captureScreenshots(args[entryIdIndex + 1])
  } else {
    // Process all pending visual entries
    console.log('[screenshot] Looking for visual entries without screenshots...')

    const { data: entries, error } = await supabase
      .from('challenge_entries')
      .select('id, challenge:challenges!inner(has_visual_output)')
      .eq('challenges.has_visual_output', true)
      .or('screenshot_urls.is.null,screenshot_urls.eq.[]')
      .eq('status', 'submitted')
      .limit(20)

    if (error) {
      console.error('[screenshot] Query error:', error.message)
      return
    }

    if (!entries || entries.length === 0) {
      console.log('[screenshot] No pending entries found')
      return
    }

    console.log(`[screenshot] Found ${entries.length} entries to process`)

    for (const entry of entries) {
      await captureScreenshots(entry.id)
    }
  }

  console.log('[screenshot] Done')
}

main().catch(console.error)
