import Link from "next/link";

/** Hosted billing comparison — use only on dashboard or other hosted-billing surfaces. */
const ROWS: { label: string; free: string; pro: string }[] = [
  {
    label: "Environments",
    free: "Up to 6 (total across all projects)",
    pro: "Unlimited",
  },
  { label: "Teams", free: "Unlimited", pro: "Unlimited" },
  { label: "Members (SSH users)", free: "Unlimited", pro: "Unlimited" },
  {
    label: "Price",
    free: "$0",
    pro: "$20 / month",
  },
];

export default function PricingMatrix() {
  return (
    <div className="mt-8 w-full max-w-3xl">
      <h2 className="mb-2 text-center font-display text-xl font-bold text-sanctum-mist">
        Hosted pricing
      </h2>
      <p className="mb-6 text-center text-sm text-sanctum-muted">
        Transparent pricing for hosted Sanctum accounts.
      </p>
      <div className="overflow-x-auto rounded-xl border border-sanctum-line bg-sanctum-raised">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead>
            <tr className="border-b border-sanctum-line">
              <th className="px-4 py-3 font-medium text-sanctum-muted" scope="col">
                {" "}
              </th>
              <th
                className="px-4 py-3 font-semibold text-sanctum-teal"
                scope="col"
              >
                Free
              </th>
              <th
                className="px-4 py-3 font-semibold text-sanctum-accent"
                scope="col"
              >
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr
                key={row.label}
                className="border-b border-sanctum-line/50 last:border-0"
              >
                <th
                  scope="row"
                  className="whitespace-nowrap px-4 py-3 font-medium text-sanctum-mist"
                >
                  {row.label}
                </th>
                <td className="px-4 py-3 text-sanctum-muted">{row.free}</td>
                <td className="px-4 py-3 text-sanctum-mist">{row.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-center text-xs text-sanctum-muted">
        Cancel anytime on Pro: billing and receipts are handled in{" "}
        <a
          href="https://stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="link-accent"
        >
          Stripe
        </a>
        . Need more than 6 environments on Free?{" "}
        <Link href="/register" className="link-accent">
          Create an account
        </Link>{" "}
        and upgrade when you&apos;re ready.
      </p>
    </div>
  );
}
