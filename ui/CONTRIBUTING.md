# Contributing

Thanks for helping improve the Sanctum dashboard.

## Setup

1. Clone **[cxl-sanctum](../README.md)** (this repo contains **`server/`** and **`ui/`**). Run the API locally or point `NEXT_PUBLIC_API_URL` at a dev/staging API.
2. `npm install` and `npm run dev`.
3. `npm run lint` before submitting changes.

## Pull requests

- Keep UI changes aligned with the API in **`../server/`**; coordinate breaking API changes there first.
- Describe behavior and include screenshots for visible changes when helpful.
- Match existing TypeScript, Tailwind, and component patterns.

## Security

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.
