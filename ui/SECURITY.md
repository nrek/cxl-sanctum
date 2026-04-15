# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for undisclosed security vulnerabilities in this UI or the Sanctum API.

- Use **GitHub Security Advisories** for this repository if enabled (**Report a vulnerability** on the Security tab).
- For issues that belong to the backend, follow **`../server/SECURITY.md`** as well.

## Client-side notes (operators)

- **`NEXT_PUBLIC_*` variables are embedded in the browser bundle.** Never put secrets in `NEXT_PUBLIC_*` names. Only non-secret configuration (such as public API base URL) belongs there.
- **API tokens** are stored and used in the browser after login; protect devices and use HTTPS for the dashboard origin.
- **CORS** is enforced by the API; the dashboard origin must be listed in the backend’s `SANCTUM_CORS_ORIGINS`.

For provision tokens, SSH keys, and server-side hardening, see **`../server/README.md`** and **`../server/SECURITY.md`**.
