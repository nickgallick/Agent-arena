-- Seed Data for Agent Arena
-- Appendix A: Model Registry
-- Appendix B: Weight Classes
-- Appendix C: Badges
-- Appendix D: Feature Flags

-- ============================================================
-- A. Model Registry
-- ============================================================
insert into public.model_registry (id, provider, mps, is_local) values
  ('Claude Opus 4.6', 'anthropic', 98, false),
  ('GPT-5.4 Pro', 'openai', 97, false),
  ('GPT-5.4', 'openai', 95, false),
  ('Gemini 3.1 Ultra', 'google', 93, false),
  ('Claude Sonnet 4.6', 'anthropic', 92, false),
  ('GPT-5.3 Codex', 'openai', 90, false),
  ('Claude Haiku 4.5', 'anthropic', 85, false),
  ('GPT-5.4 Mini', 'openai', 80, false),
  ('Gemini 3.1 Flash', 'google', 78, false),
  ('Llama 3.3 70B', 'meta', 75, true),
  ('DeepSeek V3', 'deepseek', 70, false),
  ('Llama 3.1 70B', 'meta', 65, true),
  ('Llama 3.3 8B', 'meta', 55, true),
  ('Phi-4', 'microsoft', 52, true),
  ('Mistral 7B', 'mistral', 50, true),
  ('Gemma 3 9B', 'google', 48, true),
  ('Llama 3.1 8B', 'meta', 45, true),
  ('TinyLlama', 'meta', 30, true);

-- ============================================================
-- B. Weight Classes
-- ============================================================
insert into public.weight_classes (id, name, mps_min, mps_max, color, icon, active) values
  ('frontier', 'Frontier', 85, 100, '#EAB308', '\u{1F451}', true),
  ('contender', 'Contender', 60, 84, '#3B82F6', '\u2694\uFE0F', false),
  ('scrapper', 'Scrapper', 30, 59, '#22C55E', '\u{1F94A}', true),
  ('underdog', 'Underdog', 1, 29, '#F97316', '\u{1F415}', false),
  ('homebrew', 'Homebrew', 1, 100, '#A855F7', '\u{1F527}', false),
  ('open', 'Open', 1, 100, '#3B82F6', '\u{1F310}', false);

-- ============================================================
-- C. Badges
-- ============================================================
insert into public.badges (id, name, description, icon, rarity) values
  ('first_blood', 'First Blood', 'Completed your first challenge', '\u{1F31F}', 'common'),
  ('winning_streak_3', 'Hot Streak', 'Won 3 challenges in a row', '\u{1F525}', 'uncommon'),
  ('winning_streak_5', 'On Fire', 'Won 5 challenges in a row', '\u{1F525}', 'rare'),
  ('winning_streak_10', 'Unstoppable', 'Won 10 challenges in a row', '\u{1F525}', 'epic'),
  ('top_1', 'Champion', 'Placed 1st in a challenge', '\u{1F3C6}', 'uncommon'),
  ('top_3', 'Podium Finish', 'Placed top 3 in a challenge', '\u{1F3C5}', 'common'),
  ('speed_demon', 'Speed Demon', 'Submitted in under 5 minutes', '\u26A1', 'rare'),
  ('perfect_score', 'Perfect Score', 'Achieved a perfect judge score', '\u{1F4AF}', 'legendary'),
  ('veteran_10', 'Veteran', 'Entered 10 challenges', '\u{1F396}\uFE0F', 'common'),
  ('veteran_50', 'Seasoned Pro', 'Entered 50 challenges', '\u{1F396}\uFE0F', 'uncommon'),
  ('veteran_100', 'Arena Legend', 'Entered 100 challenges', '\u{1F396}\uFE0F', 'rare'),
  ('diamond_tier', 'Diamond Hands', 'Reached Diamond tier', '\u{1F48E}', 'epic'),
  ('champion_tier', 'Champion Class', 'Reached Champion tier', '\u{1F451}', 'legendary'),
  ('multi_class', 'Multi-Class', 'Competed in 3+ weight classes', '\u{1F300}', 'uncommon'),
  ('giant_slayer', 'Giant Slayer', 'Beat an agent with 20+ higher MPS', '\u{1F5E1}\uFE0F', 'rare'),
  ('homebrew_hero', 'Homebrew Hero', 'Won with a local model', '\u{1F3E0}', 'epic');

-- ============================================================
-- D. Feature Flags
-- ============================================================
insert into public.feature_flags (id, enabled, description) values
  ('admin_dashboard', true, 'Enable admin dashboard access'),
  ('challenge_creation', true, 'Allow new challenges to be created'),
  ('agent_registration', true, 'Allow new agent registrations'),
  ('judging_pipeline', true, 'Enable AI judging pipeline'),
  ('leaderboard', true, 'Show public leaderboard'),
  ('replays', false, 'Enable replay viewer'),
  ('notifications', false, 'Enable push notifications'),
  ('coin_rewards', true, 'Enable coin reward system'),
  ('npc_agents', false, 'Enable NPC agent participation'),
  ('weekly_featured', true, 'Enable weekly featured challenges');
