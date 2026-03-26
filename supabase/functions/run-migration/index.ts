// One-time migration runner - has full postgres access via pg module in Deno
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

const MIGRATION_SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DB_URL = Deno.env.get('SUPABASE_DB_URL')!

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  
  const auth = req.headers.get('authorization') || ''
  if (!auth.includes(MIGRATION_SECRET)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const pool = new Pool(DB_URL, 1, true)
  const results: Record<string, string> = {}
  
  const statements = [
    ['add_integrity_columns', `ALTER TABLE public.challenge_entries ADD COLUMN IF NOT EXISTS integrity_flag text CHECK (integrity_flag IN ('clean','suspicious','flagged','disqualified')) DEFAULT 'clean', ADD COLUMN IF NOT EXISTS integrity_reason text, ADD COLUMN IF NOT EXISTS reported_model text, ADD COLUMN IF NOT EXISTS integrity_checked_at timestamptz`],
    ['create_violations_table', `CREATE TABLE IF NOT EXISTS public.violations (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, accused_agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE, entry_id uuid REFERENCES public.challenge_entries(id) ON DELETE SET NULL, challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL, reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 2000), evidence text, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','confirmed','dismissed')), admin_notes text, reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`],
    ['violations_rls', `ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY`],
    ['violations_insert_policy', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='violations' AND policyname='Authenticated users can submit violations') THEN CREATE POLICY "Authenticated users can submit violations" ON public.violations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); END IF; END $$`],
    ['create_weight_class_stats', `CREATE TABLE IF NOT EXISTS public.weight_class_stats (weight_class_id text PRIMARY KEY, avg_score real NOT NULL DEFAULT 5.0, stddev_score real NOT NULL DEFAULT 2.0, sample_count integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now())`],
    ['seed_weight_class_stats', `INSERT INTO public.weight_class_stats (weight_class_id, avg_score, stddev_score, sample_count) VALUES ('frontier',7.2,1.4,0),('contender',6.1,1.6,0),('scrapper',5.0,1.8,0),('underdog',4.2,1.7,0),('homebrew',3.5,1.6,0),('open',5.0,2.0,0) ON CONFLICT (weight_class_id) DO NOTHING`],
    ['create_check_integrity_fn', `CREATE OR REPLACE FUNCTION public.check_entry_integrity(p_entry_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $fn$ DECLARE v_entry record; v_stats record; v_zscore real; v_flag text := 'clean'; v_reason text := null; BEGIN SELECT ce.id,ce.final_score,ce.reported_model,a.weight_class_id,a.model_name INTO v_entry FROM public.challenge_entries ce JOIN public.agents a ON a.id=ce.agent_id WHERE ce.id=p_entry_id; IF NOT FOUND OR v_entry.final_score IS NULL THEN RETURN; END IF; SELECT avg_score,stddev_score INTO v_stats FROM public.weight_class_stats WHERE weight_class_id=v_entry.weight_class_id; IF NOT FOUND THEN RETURN; END IF; IF v_stats.stddev_score>0 THEN v_zscore:=(v_entry.final_score-v_stats.avg_score)/v_stats.stddev_score; ELSE v_zscore:=0; END IF; IF v_zscore>=2.5 THEN v_flag:='suspicious'; v_reason:=format('Score %.1f is %.1fσ above %s avg (μ=%.1f σ=%.1f z=%.2f)',v_entry.final_score,v_zscore,v_entry.weight_class_id,v_stats.avg_score,v_stats.stddev_score,v_zscore); END IF; IF v_entry.reported_model IS NOT NULL AND v_entry.reported_model!='' THEN IF v_entry.weight_class_id IN ('homebrew','underdog','scrapper') THEN IF v_entry.reported_model ILIKE '%opus%' OR v_entry.reported_model ILIKE '%gpt-5%' OR v_entry.reported_model ILIKE '%gpt-4o%' OR v_entry.reported_model ILIKE '%sonnet%' OR v_entry.reported_model ILIKE '%gemini-2%' THEN v_flag:='flagged'; v_reason:=coalesce(v_reason||' | ','')||format('Connector reported model "%s" inconsistent with weight class "%s".',v_entry.reported_model,v_entry.weight_class_id); END IF; END IF; END IF; UPDATE public.challenge_entries SET integrity_flag=v_flag,integrity_reason=v_reason,integrity_checked_at=now() WHERE id=p_entry_id; UPDATE public.weight_class_stats SET sample_count=sample_count+1,avg_score=(avg_score*sample_count+v_entry.final_score)/(sample_count+1),stddev_score=GREATEST(0.5,SQRT((stddev_score*stddev_score*sample_count+(v_entry.final_score-avg_score)*(v_entry.final_score-avg_score))/GREATEST(sample_count+1,1))),updated_at=now() WHERE weight_class_id=v_entry.weight_class_id; END; $fn$`],
  ]

  const client = await pool.connect()
  try {
    for (const [name, sql] of statements) {
      try {
        await client.queryObject(sql)
        results[name] = 'ok'
      } catch (e) {
        results[name] = `error: ${(e as Error).message.slice(0, 150)}`
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
