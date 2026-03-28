import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DB_URL = Deno.env.get('SUPABASE_DB_URL')!

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  
  const auth = req.headers.get('authorization') || ''
  if (!auth.includes(SERVICE_KEY)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const pool = new Pool(DB_URL, 1, true)
  const results: Record<string, string> = {}
  
  const statements: [string, string][] = [
    ['add_pipeline_status', `ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS pipeline_status text NOT NULL DEFAULT 'draft' CHECK (pipeline_status IN ('draft','draft_failed_validation','draft_review','needs_revision','approved_for_calibration','calibrating','passed','flagged','passed_reserve','queued','active','quarantined','retired','archived'))`],
    ['idx_pipeline_status', 'CREATE INDEX IF NOT EXISTS idx_challenges_pipeline_status ON public.challenges(pipeline_status)'],
    ['create_bundles', `CREATE TABLE IF NOT EXISTS public.challenge_bundles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bundle_id text UNIQUE NOT NULL, challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL, gauntlet_version text NOT NULL, generation_timestamp timestamptz NOT NULL, family text NOT NULL, weight_class text NOT NULL, format text NOT NULL, title text NOT NULL, public_description text NOT NULL, internal_brief text NOT NULL, prompt text NOT NULL, starter_state jsonb, visible_tests jsonb NOT NULL DEFAULT '[]', hidden_tests jsonb NOT NULL DEFAULT '[]', adversarial_tests jsonb NOT NULL DEFAULT '[]', judge_weights jsonb NOT NULL, scoring_rubric jsonb NOT NULL, evidence_map jsonb NOT NULL, failure_mode_targets jsonb NOT NULL DEFAULT '[]', difficulty_profile jsonb NOT NULL, calibration_expectations jsonb NOT NULL, contamination_notes text, freshness_score numeric, parent_bundle_id text, mutation_generation integer NOT NULL DEFAULT 0, mutation_type text, lineage jsonb, publish_recommendation text NOT NULL DEFAULT 'hold', asset_references jsonb DEFAULT '[]', content_hash text NOT NULL, validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending','passed','failed')), validation_results jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`],
    ['idx_bundles_challenge', 'CREATE INDEX IF NOT EXISTS idx_challenge_bundles_challenge_id ON public.challenge_bundles(challenge_id)'],
    ['idx_bundles_hash', 'CREATE INDEX IF NOT EXISTS idx_challenge_bundles_content_hash ON public.challenge_bundles(content_hash)'],
    ['create_forge_reviews', `CREATE TABLE IF NOT EXISTS public.challenge_forge_reviews (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE, bundle_id text REFERENCES public.challenge_bundles(bundle_id) ON DELETE SET NULL, reviewer text NOT NULL DEFAULT 'forge', verdict text NOT NULL CHECK (verdict IN ('approved_for_calibration','needs_revision')), objective_test_completeness text, fairness_assessment text, solvability_verdict text, exploit_surface_notes text, hidden_test_quality text, technical_credibility text, blocking_issues jsonb DEFAULT '[]', warnings jsonb DEFAULT '[]', positives jsonb DEFAULT '[]', revision_required text, created_at timestamptz NOT NULL DEFAULT now())`],
    ['create_inventory_decisions', `CREATE TABLE IF NOT EXISTS public.challenge_inventory_decisions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE, decision text NOT NULL CHECK (decision IN ('publish_now','hold_reserve','queue_for_later','mutate_before_release','quarantine','reject')), decided_by text NOT NULL DEFAULT 'operator', reason text, active_pool_size integer, reserve_pool_size integer, family_active_count integer, scheduled_publish_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())`],
    ['fn_transition_status', `CREATE OR REPLACE FUNCTION public.transition_pipeline_status(p_challenge_id uuid, p_new_status text, p_reason text DEFAULT NULL, p_actor text DEFAULT 'system') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $fn$ DECLARE v_old_status text; v_allowed boolean := false; BEGIN SELECT pipeline_status INTO v_old_status FROM public.challenges WHERE id = p_challenge_id; IF NOT FOUND THEN RETURN jsonb_build_object('error','challenge not found'); END IF; v_allowed := CASE v_old_status WHEN 'draft' THEN p_new_status IN ('draft_review','draft_failed_validation','archived') WHEN 'draft_failed_validation' THEN p_new_status IN ('draft','archived') WHEN 'draft_review' THEN p_new_status IN ('approved_for_calibration','needs_revision','archived') WHEN 'needs_revision' THEN p_new_status IN ('draft_review','archived') WHEN 'approved_for_calibration' THEN p_new_status IN ('calibrating','archived') WHEN 'calibrating' THEN p_new_status IN ('passed','flagged','archived') WHEN 'passed' THEN p_new_status IN ('active','passed_reserve','queued','needs_revision','archived') WHEN 'flagged' THEN p_new_status IN ('active','passed_reserve','queued','needs_revision','archived') WHEN 'passed_reserve' THEN p_new_status IN ('active','queued','archived') WHEN 'queued' THEN p_new_status IN ('active','archived') WHEN 'active' THEN p_new_status IN ('quarantined','retired','archived') WHEN 'quarantined' THEN p_new_status IN ('active','archived') WHEN 'retired' THEN p_new_status IN ('archived') ELSE false END; IF NOT v_allowed THEN RETURN jsonb_build_object('error',format('Illegal transition: %s -> %s',v_old_status,p_new_status)); END IF; UPDATE public.challenges SET pipeline_status=p_new_status,updated_at=now() WHERE id=p_challenge_id; INSERT INTO public.challenge_admin_actions (challenge_id,action,previous_status,new_status,reason,actor,created_at) VALUES (p_challenge_id,'pipeline_transition',v_old_status,p_new_status,p_reason,p_actor,now()); RETURN jsonb_build_object('ok',true,'challenge_id',p_challenge_id,'old_status',v_old_status,'new_status',p_new_status,'actor',p_actor); END; $fn$`],
    ['fn_forge_queue', `CREATE OR REPLACE FUNCTION public.get_forge_review_queue(p_limit integer DEFAULT 20) RETURNS TABLE(challenge_id uuid,title text,pipeline_status text,category text,challenge_type text,generated_by text,created_at timestamptz,bundle_id text) LANGUAGE plpgsql SECURITY DEFINER AS $fn$ BEGIN RETURN QUERY SELECT c.id,c.title,c.pipeline_status,c.category,c.challenge_type,c.generated_by,c.created_at,cb.bundle_id FROM public.challenges c LEFT JOIN public.challenge_bundles cb ON cb.challenge_id=c.id WHERE c.pipeline_status='draft_review' ORDER BY c.created_at ASC LIMIT p_limit; END; $fn$`],
    ['fn_inventory_queue', `CREATE OR REPLACE FUNCTION public.get_inventory_queue() RETURNS TABLE(challenge_id uuid,title text,pipeline_status text,calibration_verdict text,calibration_reason text,challenge_type text,category text,created_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER AS $fn$ BEGIN RETURN QUERY SELECT c.id,c.title,c.pipeline_status,c.calibration_verdict,c.calibration_reason,c.challenge_type,c.category,c.created_at FROM public.challenges c WHERE c.pipeline_status IN ('passed','flagged') ORDER BY c.calibration_completed_at ASC NULLS LAST; END; $fn$`],
    ['fn_can_activate', `CREATE OR REPLACE FUNCTION public.can_activate_challenge(p_challenge_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $fn$ DECLARE v_challenge public.challenges%ROWTYPE; v_family_active integer:=0; v_total_active integer:=0; BEGIN SELECT * INTO v_challenge FROM public.challenges WHERE id=p_challenge_id; IF NOT FOUND THEN RETURN jsonb_build_object('can_activate',false,'reason','challenge not found'); END IF; SELECT COUNT(*) INTO v_total_active FROM public.challenges WHERE status='active'; IF v_challenge.challenge_type IS NOT NULL THEN SELECT COUNT(*) INTO v_family_active FROM public.challenges WHERE challenge_type=v_challenge.challenge_type AND status='active' AND id!=p_challenge_id; END IF; IF v_family_active>=2 THEN RETURN jsonb_build_object('can_activate',false,'reason',format('Family cap reached: %s active of type %s',v_family_active,v_challenge.challenge_type),'family_active_count',v_family_active,'total_active',v_total_active); END IF; RETURN jsonb_build_object('can_activate',true,'family_active_count',v_family_active,'total_active',v_total_active); END; $fn$`],
    ['rls_bundles', 'ALTER TABLE public.challenge_bundles ENABLE ROW LEVEL SECURITY'],
    ['rls_reviews', 'ALTER TABLE public.challenge_forge_reviews ENABLE ROW LEVEL SECURITY'],
    ['rls_inventory', 'ALTER TABLE public.challenge_inventory_decisions ENABLE ROW LEVEL SECURITY'],
    ['policy_bundles', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='challenge_bundles' AND policyname='service_role_all_bundles') THEN CREATE POLICY service_role_all_bundles ON public.challenge_bundles FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$`],
  ]

  const client = await pool.connect()
  try {
    for (const [name, sql] of statements) {
      try {
        await client.queryObject(sql)
        results[name] = 'ok'
      } catch (e) {
        results[name] = `error: ${(e as Error).message.slice(0, 200)}`
      }
    }
  } finally {
    client.release()
    await pool.end()
  }

  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  })
})
