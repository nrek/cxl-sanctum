# Sanctum UI

This directory is **`ui/`** in the **[cxl-sanctum](../README.md)** monorepo.

Next.js dashboard for the Sanctum API (**`../server/`**) — manage teams, members, SSH keys, projects, and server-group access; copy provisioning commands for your hosts.

This package is the **browser client only**. It talks to the REST API over HTTPS; it does not run provisioning scripts itself. To try Sanctum without deploying the stack, use **[sanctum.craftxlogic.com](https://sanctum.craftxlogic.com)**; for your own API, point `NEXT_PUBLIC_API_URL` at your deployment.

## Requirements

- Node.js 18+ (LTS recommended)
- A running Sanctum API (**`../server/`** or any deployed API URL)

## Quick start

```bash
cd ui
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with credentials from your API (superuser or registered user, depending on deployment).

Point the app at your backend (defaults to local dev API if unset):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

For production builds:

```bash
npm run build
npm start
```

Set `NEXT_PUBLIC_API_URL` at **build time** to your public API base (e.g. `https://sanctum-api.example.com/api`). Next.js inlines `NEXT_PUBLIC_*` into the client bundle.

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Base URL of the Sanctum API (must include `/api` path as used by the client). Default: `http://localhost:8000/api`. |
| `NEXT_PUBLIC_DONATION_URL` | Optional link shown in the UI (e.g. sponsorship page). |

**Billing UI:** If the API exposes `/api/billing/status/` and related routes, pricing and checkout controls appear. Otherwise those sections stay hidden.

## Features (high level)

- Authentication against the core API (token session in the browser)
- Projects, environments (server groups), team × environment access matrix
- Member and SSH key management
- Copy-paste snippets: one-shot `curl`, full `/etc/cron.d/sanctum` line, and heartbeat verification (see `../server/README.md`)

Detailed workflows and API semantics live in **`../server/README.md`**.

## Repository layout

- `src/app/` — App Router pages (dashboard, projects, login, register, etc.)
- `src/components/` — Shared UI
- `src/lib/api.ts` — API base URL and fetch helpers

## Documentation

| File | Purpose |
|------|---------|
| [Monorepo README](../README.md) | Combined layout and quick start |
| [LICENSE](LICENSE) | MIT License |
| [SECURITY.md](SECURITY.md) | How to report issues; client-side security notes |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development and PR expectations |

## License

MIT — see [LICENSE](LICENSE).
