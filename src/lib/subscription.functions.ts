import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getLimits,
  type PlanId,
  type Subscription,
  type SubscriptionStatus,
  type UsageSnapshot,
} from "./plan-config";

export interface AccountState {
  subscription: Subscription;
  usage: UsageSnapshot;
}

const PLAN_IDS: PlanId[] = ["free", "plus", "pro"];

function shape(
  plan: PlanId,
  status: SubscriptionStatus,
  row: {
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    provider: string | null;
  } | null,
  usage: { messages_used: number; searches_used: number } | null,
): AccountState {
  const effective: PlanId = status === "active" || status === "trialing" ? plan : "free";
  const limits = getLimits(effective);
  return {
    subscription: {
      plan: effective,
      status,
      currentPeriodStart: row?.current_period_start ?? null,
      currentPeriodEnd: row?.current_period_end ?? null,
      cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
      provider: row?.provider ?? null,
    },
    usage: {
      messagesUsed: usage?.messages_used ?? 0,
      searchesUsed: usage?.searches_used ?? 0,
      messagesLimit: limits.messagesPerDay,
      searchesLimit: limits.searchesPerDay,
      date: new Date().toISOString().slice(0, 10),
    },
  };
}

/** The signed-in user's subscription and today's usage. */
export const getAccountState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountState> => {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: sub }, { data: usage }] = await Promise.all([
      context.supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("usage_counters")
        .select("messages_used, searches_used")
        .eq("user_id", context.userId)
        .eq("usage_date", today)
        .maybeSingle(),
    ]);

    return shape(
      (sub?.plan as PlanId) ?? "free",
      (sub?.status as SubscriptionStatus) ?? "active",
      sub ?? null,
      usage ?? null,
    );
  });

/**
 * Switches the signed-in user's plan.
 *
 * No payment provider is connected yet, so this is the seam a checkout flow
 * will replace: it only ever writes the subscription row belonging to the
 * caller's own verified user id, never one supplied by the browser.
 */
export const changePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { plan: string }) => {
    if (!PLAN_IDS.includes(input?.plan as PlanId)) throw new Error("Unknown plan");
    return { plan: input.plan as PlanId };
  })
  .handler(async ({ data, context }): Promise<AccountState> => {
    // Until a payment provider is connected, users may only move to Free.
    // Paid upgrades require a verified payment (or the explicit test flag).
    if (data.plan !== "free" && process.env["LYRIC_ALLOW_PLAN_TESTING"] !== "true") {
      throw new Error("Paid plans will be available once checkout is live. You're on Free for now.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const periodEnd =
      data.plan === "free" ? null : new Date(now.getTime() + 30 * 86_400_000).toISOString();

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: context.userId,
          plan: data.plan,
          status: "active",
          current_period_start: data.plan === "free" ? null : now.toISOString(),
          current_period_end: periodEnd,
          cancel_at_period_end: false,
          provider: null,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);

    // Keep the profile's plan column in step for existing screens.
    await supabaseAdmin.from("profiles").update({ plan: data.plan }).eq("id", context.userId);

    const today = now.toISOString().slice(0, 10);
    const { data: usage } = await supabaseAdmin
      .from("usage_counters")
      .select("messages_used, searches_used")
      .eq("user_id", context.userId)
      .eq("usage_date", today)
      .maybeSingle();

    return shape(
      data.plan,
      "active",
      {
        current_period_start: data.plan === "free" ? null : now.toISOString(),
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        provider: null,
      },
      usage ?? null,
    );
  });
