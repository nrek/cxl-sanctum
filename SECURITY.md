# Security

This monorepo contains two deployable surfaces: the **API** (`server/`) and the **dashboard** (`ui/`). Report vulnerabilities through the process below; do not disclose undisclosed issues in public issues.

## Reporting

- Prefer **GitHub Security Advisories** for this repository (**Report a vulnerability** on the Security tab), if enabled.
- Include affected area (`server/` vs `ui/`), reproduction steps, and impact.

## Where details live

- **[server/SECURITY.md](server/SECURITY.md)** — Provision tokens, HTTPS, operator notes for the Django API.
- **[ui/SECURITY.md](ui/SECURITY.md)** — `NEXT_PUBLIC_*` exposure, browser tokens, CORS expectations.

Hosted deployments that add Stripe and billing also use the internal **cxl-sanctum-saas** repository; see its `SECURITY.md` for Stripe and webhook handling.
