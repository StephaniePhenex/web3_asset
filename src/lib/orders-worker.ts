import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type OrderRowPatch = {
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  tx_hash?: string | null;
  token_id?: string | null;
  failure_reason?: string | null;
};

export async function findOrderIdByPaymentId(
  paymentId: string
): Promise<string | null> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("orders")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (error) {
    console.error("[orders-worker] findOrderIdByPaymentId", error);
    return null;
  }
  return data?.id ?? null;
}

export async function updateOrder(
  orderId: string,
  patch: OrderRowPatch
): Promise<void> {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from("orders").update(patch).eq("id", orderId);
  if (error) {
    throw new Error(`updateOrder: ${error.message}`);
  }
}
