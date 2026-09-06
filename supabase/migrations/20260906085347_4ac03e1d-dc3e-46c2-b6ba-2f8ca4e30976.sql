
CREATE TABLE public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','plus','pro')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','canceled','incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.usage_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  messages_used integer NOT NULL DEFAULT 0,
  searches_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage"
  ON public.usage_counters FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER usage_counters_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic increment used by the server after an allowed request.
CREATE OR REPLACE FUNCTION public.increment_usage(_user_id uuid, _messages integer, _searches integer)
RETURNS public.usage_counters
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.usage_counters;
BEGIN
  INSERT INTO public.usage_counters (user_id, usage_date, messages_used, searches_used)
  VALUES (_user_id, (now() AT TIME ZONE 'utc')::date, GREATEST(_messages, 0), GREATEST(_searches, 0))
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET messages_used = public.usage_counters.messages_used + GREATEST(_messages, 0),
        searches_used = public.usage_counters.searches_used + GREATEST(_searches, 0),
        updated_at = now()
  RETURNING * INTO result;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_usage(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(uuid, integer, integer) TO service_role;

-- Give every new account a free subscription.
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_subscription() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_subscription();

INSERT INTO public.subscriptions (user_id, plan, status)
SELECT u.id, COALESCE(p.plan, 'free'), 'active'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ON CONFLICT (user_id) DO NOTHING;
