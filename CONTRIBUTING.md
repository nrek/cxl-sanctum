# Contributing

Thanks for improving Sanctum.

## Repository shape

- **`server/`** — Django backend; run tests with `python manage.py test` from `server/`.
- **`ui/`** — Next.js frontend; run `npm run lint` from `ui/`.

Keep changes scoped: API contract changes belong in `server/` first; the UI should follow.

## Pull requests

- One logical change per PR when possible; reference related issues.
- For visible UI changes, describe behavior or attach screenshots.
- Match existing style in each package (Python/Django vs TypeScript/React).

## Security

See [SECURITY.md](SECURITY.md) and the package-level `SECURITY.md` files before filing public issues about vulnerabilities.
