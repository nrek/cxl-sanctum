# Open source (core) vs hosted SaaS

## cxl-sanctum-core (`server/` + `ui/` in the monorepo)

- **Self-hosted:** no limit on the number of **environments** (server groups). You own the data and infrastructure.
- **Pluggable policy:** `SANCTUM_ENVIRONMENT_POLICY` defaults to `core.default_environment_policy` (unlimited). Replace with your own module path if you need internal caps.
- **API:** `GET /api/workspace/` returns `environment_count`, `environment_limit` (usually `null` on OSS), and `deployment_mode` (`self_hosted` unless you override `SANCTUM_DEPLOYMENT_MODE`).
- **No Stripe** in this repository.

## cxl-sanctum-saas (internal hosted layer)

- **Hosted product:** Stripe Checkout + Customer Portal + webhooks; **Free** tier = up to **6 environments** per workspace; **Pro** = **$20/month**, unlimited environments.
- **Depends on a pinned release** of this core server (same database schema; adds a `billing` app).
- Set `SANCTUM_ENVIRONMENT_POLICY=billing.sanctum_policy` in SaaS settings (already wired in `sanctum_saas.settings`).

See the **cxl-sanctum-saas** repository README for setup, Stripe variables, webhooks, and operations.

## Upgrading / pinning core

1. Tag releases on GitHub, e.g. `git tag -a v1.0.0 -m "SANCTUM core 1.0"` then `git push origin v1.0.0`.
2. In the SaaS repo, point `SANCTUM_CORE_ROOT` or `pip install` at that tag.
3. Run migrations for **core** first, then **billing**.

## Environment variables (core)

| Variable | Purpose |
|----------|---------|
| `SANCTUM_ENVIRONMENT_POLICY` | Dotted path to policy module (default: unlimited). |
| `SANCTUM_DEPLOYMENT_MODE` | `self_hosted` (default) or `hosted` — exposed in `/api/workspace/`. |

See also: **cxl-sanctum-saas** `README.md` for Stripe-specific variables and billing API routes.
