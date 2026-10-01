/**
 * Server-side plan enforcement.
 *
 * Nothing here trusts the browser: the caller is identified from the bearer
 * token on the request, the plan is read from the database, and the limits
 * come from the central plan config.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getLimits, type PlanId } from "./plan-config";

export interface Entitlements {
  userId: string;
  plan: PlanId;
  status: string;
  messagesUsed: number;
  searchesUsed: number;
  messagesLimit: number;
  searchesLimit: number;
  contextMessages: number;
}

/** Resolves the signed-in user from the request's Authorization header. */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: sub }, { data: usage }] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("usage_counters")
      .select("messages_used, searches_used")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle(),
  ]);

  // A canceled or unpaid subscription falls back to Free rather than locking
  // the account out.
  const rawPlan = (sub?.plan as PlanId | undefined) ?? "free";
  const status = sub?.status ?? "active";
  const plan: PlanId = status === "active" || status === "trialing" ? rawPlan : "free";
  const limits = getLimits(plan);

  return {
    userId,
    plan,
    status,
    messagesUsed: usage?.messages_used ?? 0,
    searchesUsed: usage?.searches_used ?? 0,
    messagesLimit: limits.messagesPerDay,
    searchesLimit: limits.searchesPerDay,
    contextMessages: limits.contextMessages,
  };
}

export async function consumeUsage(userId: string, messages: number, searches: number) {
  const { error } = await supabaseAdmin.rpc("increment_usage", {
    _user_id: userId,
    _messages: messages,
    _searches: searches,
  });
  if (error) console.error("[lyric] usage increment failed", error.message);
}

export interface QuotaDecision {
  allowed: boolean;
  /** True when the question needed search but the search allowance is spent. */
  searchBlocked: boolean;
  message?: string;
  entitlements: Entitlements;
}

export async function checkQuota(userId: string, wantsSearch: boolean): Promise<QuotaDecision> {
  const entitlements = await getEntitlements(userId);
  if (entitlements.messagesUsed >= entitlements.messagesLimit) {
    return {
      allowed: false,
      searchBlocked: false,
      entitlements,
      message: `You've used all ${entitlements.messagesLimit} AI messages on your ${entitlements.plan === "free" ? "Free" : entitlements.plan === "plus" ? "Plus" : "Pro"} plan for today. Your allowance resets at midnight UTC — upgrade for a higher daily limit.`,
    };
  }
  const searchBlocked = wantsSearch && entitlements.searchesUsed >= entitlements.searchesLimit;
  return { allowed: true, searchBlocked, entitlements };
}
