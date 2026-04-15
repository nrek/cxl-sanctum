# Security policy

## Supported versions

Security fixes are applied to the latest release line of the **server/** package in the **cxl-sanctum** monorepo. Deploy from tagged releases or a current default branch when running in production.

## Reporting a vulnerability

Please **do not** open a public issue for security reports.

- If this repository has [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories) enabled, use **Report a vulnerability** on the Security tab.
- Otherwise, contact the maintainers through a private channel they publish for this project.

Include: affected component, steps to reproduce, and impact (confidentiality / integrity / availability). We aim to acknowledge reports promptly.

## Product notes (operators)

- **Provision tokens** authenticate servers to download the provisioning script. Treat them like API keys; use HTTPS in production (tokens appear in URLs).
- **Dashboard tokens** (DRF) are separate from provision tokens; protect admin accounts and rotate credentials if compromised.
- **HTTPS** is required for production deployments serving provision or heartbeat endpoints.
- The provisioning script is intended to run as **root** on managed hosts; only fetch it from a URL you control and over TLS.

For hosted/SaaS deployments that add Stripe and billing, see the internal **cxl-sanctum-saas** repository’s `SECURITY.md` as well.
