-- Sync profiles.coins from arena_wallets to fix mismatch
-- The credit_wallet function in prod updates arena_wallets but not profiles.coins
-- This migration syncs them and adds a trigger to keep them in sync

-- One-time sync
UPDATE public.profiles p
SET coins = w.balance, updated_at = now()
FROM public.arena_wallets w
WHERE w.user_id = p.id;

-- Trigger to keep profiles.coins in sync whenever arena_wallets.balance changes
CREATE OR REPLACE FUNCTION public.sync_profile_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET coins = NEW.balance, updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_coins_on_wallet_update ON public.arena_wallets;
CREATE TRIGGER sync_coins_on_wallet_update
  AFTER INSERT OR UPDATE OF balance ON public.arena_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_coins();
