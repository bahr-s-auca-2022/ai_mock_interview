import { getStripe, getPackageByPriceId } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    const ip = getClientIp(request);
    const limit = rateLimit(`checkout:${user.id}:${ip}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (!limit.allowed) {
      return Response.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }

    // ── 3. Parse & validate body ───────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const { priceId } = body as Record<string, unknown>;

    if (typeof priceId !== "string" || !priceId.trim()) {
      return Response.json(
        { success: false, error: "priceId is required." },
        { status: 400 },
      );
    }

    const pack = getPackageByPriceId(priceId);
    if (!pack) {
      return Response.json(
        { success: false, error: "Invalid price selection." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: pack.id, quantity: 1 }],

      metadata: {
        userId: user.id,
        credits: String(pack.credits),
        packageName: pack.name,
      },

      success_url: `${baseUrl}/billing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing?payment=cancelled`,

      customer_email: user.email,
    });

    return Response.json({ success: true, url: session.url }, { status: 200 });
  } catch (err) {
    console.error("[stripe/checkout] Error creating session:", err);
    return Response.json(
      { success: false, error: "Failed to create payment session." },
      { status: 500 },
    );
  }
}
