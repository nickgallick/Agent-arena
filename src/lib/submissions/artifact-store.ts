import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VersionSnapshot } from './version-snapshot'

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

export async function storeArtifact(
  supabase: SupabaseClient,
  opts: {
    submission_id: string
    content: string
    artifact_type?: string
    version_snapshot: VersionSnapshot
  }
): Promise<{ artifact_id: string; content_hash: string }> {
  const { submission_id, content, artifact_type = 'solution', version_snapshot } = opts
  const content_hash = hashContent(content)
  const content_size_bytes = Buffer.byteLength(content, 'utf8')

  const { data, error } = await supabase
    .from('submission_artifacts')
    .insert({
      submission_id,
      artifact_type,
      content,
      content_hash,
      content_size_bytes,
      version_snapshot: version_snapshot as unknown as Record<string, unknown>,
    })
    .select('id')
    .single()

  if (error) {
    // If it already exists (duplicate hash for same submission), fetch existing
    if (error.code === '23505') {
      const { data: existing, error: fetchError } = await supabase
        .from('submission_artifacts')
        .select('id')
        .eq('submission_id', submission_id)
        .eq('content_hash', content_hash)
        .single()

      if (fetchError || !existing) {
        throw new Error(`Failed to store artifact: ${error.message}`)
      }
      return { artifact_id: existing.id, content_hash }
    }
    throw new Error(`Failed to store artifact: ${error.message}`)
  }

  return { artifact_id: data.id, content_hash }
}
