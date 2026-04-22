import { redirect } from "next/navigation";
import Link from "next/link";
import { Zap, ArrowLeft, XCircle, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { dbGetCreditHistory } from "@/lib/db/credits";
import { BillingPlans } from "@/components/BillingPlans";
import { BillingSuccessRefresh } from "@/components/BillingSuccessRefresh";

interface BillingPageProps {
  searchParams: Promise<{ payment?: string }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { payment } = await searchParams;

  const history = await dbGetCreditHistory(user.id, 20);

  const credits = (user.credits as number) ?? 0;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-12">
      {/* ── Back nav ──────────────────────────────────────────────────────── */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-light-400 hover:text-white transition-colors text-sm"
        aria-label="Back to dashboard"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Dashboard
      </Link>

      {/* ── Payment status banners ────────────────────────────────────────── */}

      {/*
        BillingSuccessRefresh is a Client Component.
        It shows the success banner AND auto-calls router.refresh() after 3s
        to re-fetch updated credits from Firestore once the webhook has fired.
        This solves the race condition where the page renders before the
        webhook writes credits to Firestore.
      */}
      <BillingSuccessRefresh isSuccess={payment === "success"} />

      {payment === "cancelled" && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400"
        >
          <XCircle size={20} aria-hidden="true" />
          <div>
            <p className="font-semibold">Payment cancelled.</p>
            <p className="text-sm opacity-80">
              No charges were made. You can try again below.
            </p>
          </div>
        </div>
      )}

      {/* ── Balance card ──────────────────────────────────────────────────── */}
      <section aria-labelledby="balance-heading">
        <div className="rounded-2xl border border-white/10 bg-dark-200 p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h1
              id="balance-heading"
              className="text-light-400 text-sm font-medium uppercase tracking-widest mb-2"
            >
              Current Balance
            </h1>
            <div className="flex items-center gap-3">
              <Zap
                size={32}
                className="text-accent-mustard"
                aria-hidden="true"
              />
              {/* FIX: was {user.credits} — renders blank if field is undefined */}
              <span className="text-5xl font-bold text-white">{credits}</span>
              <span className="text-light-400 text-xl mt-2">
                {credits === 1 ? "credit" : "credits"}
              </span>
            </div>
            <p className="text-light-400 text-sm mt-3">
              Each credit covers one complete voice interview session.
              <br />
              New accounts receive{" "}
              <strong className="text-white">3 free credits</strong> to get
              started.
            </p>
          </div>

          {credits <= 1 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <span
                className="size-2 rounded-full bg-red-400 animate-pulse"
                aria-hidden="true"
              />
              Low balance — top up to continue interviewing
            </div>
          )}
        </div>
      </section>

      {/* ── Credit packages ───────────────────────────────────────────────── */}
      <section aria-labelledby="plans-heading">
        <h2 id="plans-heading" className="text-2xl font-bold text-white mb-2">
          Top Up Credits
        </h2>
        <p className="text-light-400 text-sm mb-8">
          Payments are processed securely by Stripe.{" "}
          <strong className="text-white">Test mode is active</strong> — use card
          number{" "}
          <code className="bg-white/10 px-1 rounded text-xs">
            4242 4242 4242 4242
          </code>
          , any future expiry, and any 3-digit CVC.
        </p>
        <BillingPlans />
      </section>

      {/* ── Transaction history ───────────────────────────────────────────── */}
      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="text-2xl font-bold text-white mb-6">
          Transaction History
        </h2>

        {history.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-white/5 bg-dark-300/20">
            <Clock
              size={32}
              className="text-light-400 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-light-400">No transactions yet.</p>
          </div>
        ) : (
          <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            role="table"
            aria-label="Credit transaction history"
          >
            <div
              role="row"
              className="grid grid-cols-3 gap-4 px-6 py-3 bg-dark-200 border-b border-white/10 text-xs text-light-400 font-medium uppercase tracking-widest"
            >
              <span role="columnheader">Date</span>
              <span role="columnheader">Description</span>
              <span role="columnheader" className="text-right">
                Amount
              </span>
            </div>

            {history.map((tx) => (
              <div
                key={tx.id}
                role="row"
                className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <span role="cell" className="text-light-400 text-sm">
                  {formatDate(tx.createdAt)}
                </span>
                <span role="cell" className="text-light-100 text-sm truncate">
                  {tx.description}
                </span>
                <span
                  role="cell"
                  className={`text-sm font-semibold text-right ${
                    tx.amount > 0 ? "text-green-400" : "text-red-400"
                  }`}
                  aria-label={`${tx.amount > 0 ? "Added" : "Deducted"} ${Math.abs(tx.amount)} ${Math.abs(tx.amount) === 1 ? "credit" : "credits"}`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
