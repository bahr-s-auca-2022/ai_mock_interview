import { revalidatePath } from "next/cache";
import { getStripe, getPackageByPriceId } from "@/lib/stripe";
import { dbAddCreditsAfterPurchase } from "@/lib/db/credits";

export async function POST(request: Request) {
  const stripe = getStripe();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set.");
    return new Response("Webhook secret not configured.", { status: 500 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return new Response("Failed to read request body.", { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header.", { status: 400 });
  }

  // ── Signature verification
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return new Response("Invalid signature.", { status: 400 });
  }

  // ── Event handling ─────────────────────────────────────────────────────
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      console.info(
        `[stripe/webhook] Processing session ${session.id}, payment_status=${session.payment_status}`,
      );

      if (session.payment_status !== "paid") {
        console.warn(
          `[stripe/webhook] Session ${session.id} not paid. Ignoring.`,
        );
        return new Response("OK", { status: 200 });
      }

      const { userId, credits, packageName } = session.metadata ?? {};

      if (!userId || !credits || !packageName) {
        console.error(
          "[stripe/webhook] Missing metadata:",
          session.id,
          session.metadata,
        );
        return new Response("Missing metadata.", { status: 400 });
      }

      const creditsToAdd = parseInt(credits, 10);
      if (isNaN(creditsToAdd) || creditsToAdd <= 0) {
        console.error("[stripe/webhook] Invalid credits in metadata:", credits);
        return new Response("Invalid credits value.", { status: 400 });
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        { limit: 1 },
      );
      const priceId = lineItems.data[0]?.price?.id;

      if (priceId) {
        const cataloguePack = getPackageByPriceId(priceId);
        if (!cataloguePack) {
          console.error("[stripe/webhook] Price ID not in catalogue:", priceId);
          return new Response("Unknown price.", { status: 400 });
        }
        if (cataloguePack.credits !== creditsToAdd) {
          console.error(
            `[stripe/webhook] Credits mismatch: metadata=${creditsToAdd}, catalogue=${cataloguePack.credits}`,
          );
          return new Response("Credits mismatch.", { status: 400 });
        }
      }

      const result = await dbAddCreditsAfterPurchase({
        userId,
        creditsToAdd,
        stripeSessionId: session.id,
        packageName,
      });

      if (!result.alreadyProcessed) {
        console.info(
          `[stripe/webhook] Granted ${creditsToAdd} credits to user ${userId}`,
        );

        revalidatePath("/billing");
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[stripe/webhook] Handler error:", err);
    return new Response("Internal error.", { status: 500 });
  }
}
