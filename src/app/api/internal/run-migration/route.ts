import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// One-time migration runner for integrity system (00008)
// Secured with CRON_SECRET — delete after running
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: Record<string, string> = {}

  // Helper: run SQL via edge function (has DB access)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  async function runSql(name: string, sql: string) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/run-sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      })
      if (res.ok) {
        results[name] = 'ok'
      } else {
        results[name] = `edge-fn-${res.status}: ${(await res.text()).slice(0, 100)}`
      }
    } catch (e) {
      results[name] = `error: ${(e as Error).message.slice(0, 100)}`
    }
  }

  // Check current state by trying to read new columns
  const { data: colCheck } = await supabase
    .from('challenge_entries')
    .select('integrity_flag')
    .limit(1)

  if (colCheck !== null) {
    results['integrity_flag_column'] = 'already exists'
  } else {
    await runSql('add_integrity_columns', `
      ALTER TABLE public.challenge_entries
        ADD COLUMN IF NOT EXISTS integrity_flag text
          CHECK (integrity_flag IN ('clean','suspicious','flagged','disqualified'))
          DEFAULT 'clean',
        ADD COLUMN IF NOT EXISTS integrity_reason text,
        ADD COLUMN IF NOT EXISTS reported_model text,
        ADD COLUMN IF NOT EXISTS integrity_checked_at timestamptz
    `)
  }

  // Check violations table
  const { error: violationsErr } = await supabase.from('violations').select('id').limit(1)
  if (!violationsErr) {
    results['violations_table'] = 'already exists'
  } else {
    await runSql('create_violations', `
      CREATE TABLE IF NOT EXISTS public.violations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        accused_agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
        entry_id uuid REFERENCES public.challenge_entries(id) ON DELETE SET NULL,
        challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
        reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 2000),
        evidence text,
        status text NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','reviewing','confirmed','dismissed')),
        admin_notes text,
        reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        reviewed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await runSql('violations_rls', `ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY`)
    await runSql('violations_insert_policy', `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='violations' AND policyname='Authenticated users can submit violations') THEN
          CREATE POLICY "Authenticated users can submit violations" ON public.violations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
        END IF;
      END $$
    `)
    await runSql('violations_select_policy', `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='violations' AND policyname='Users can view own reports') THEN
          CREATE POLICY "Users can view own reports" ON public.violations FOR SELECT USING (auth.uid() = reporter_user_id);
        END IF;
      END $$
    `)
  }

  // Check weight_class_stats table
  const { error: statsErr } = await supabase.from('weight_class_stats').select('weight_class_id').limit(1)
  if (!statsErr) {
    results['weight_class_stats'] = 'already exists'
  } else {
    await runSql('create_weight_class_stats', `
      CREATE TABLE IF NOT EXISTS public.weight_class_stats (
        weight_class_id text PRIMARY KEY,
        avg_score real NOT NULL DEFAULT 5.0,
        stddev_score real NOT NULL DEFAULT 2.0,
        sample_count integer NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await runSql('seed_stats', `
      INSERT INTO public.weight_class_stats (weight_class_id, avg_score, stddev_score, sample_count)
      VALUES ('frontier',7.2,1.4,0),('contender',6.1,1.6,0),('scrapper',5.0,1.8,0),
             ('underdog',4.2,1.7,0),('homebrew',3.5,1.6,0),('open',5.0,2.0,0)
      ON CONFLICT (weight_class_id) DO NOTHING
    `)
  }

  return NextResponse.json({ ok: true, results })
}
