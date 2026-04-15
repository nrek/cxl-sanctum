import Link from "next/link";

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
    <div className="mt-14 w-full max-w-3xl">
      <h2 className="mb-2 text-center font-logo text-2xl font-normal tracking-[0.2em] text-slate-400">
        PRICING
      </h2>
      <p className="mb-6 text-center text-sm text-slate-500">
        Transparent pricing for hosted SANCTUM accounts.
      </p>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-sm">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 font-medium text-slate-400" scope="col">
                {" "}
              </th>
              <th
                className="px-4 py-3 font-semibold text-teal-200/95"
                scope="col"
              >
                Free
              </th>
              <th
                className="px-4 py-3 font-semibold text-indigo-200/95"
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
                className="border-b border-white/5 last:border-0"
              >
                <th
                  scope="row"
                  className="whitespace-nowrap px-4 py-3 font-medium text-slate-300"
                >
                  {row.label}
                </th>
                <td className="px-4 py-3 text-slate-400">{row.free}</td>
                <td className="px-4 py-3 text-slate-300">{row.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        Cancel anytime on Pro: billing and receipts are handled in <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="link-accent">Stripe</a>.
        Need more than 6 environments on Free?{" "}
        <Link href="/register" className="link-accent">
          Create an account
        </Link>{" "}
        and upgrade when you&apos;re ready.
      </p>
    </div>
  );
}
