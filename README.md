# cxl-sanctum

Monorepo for **Sanctum**: open-source SSH access management—a Django REST API (**`server/`**) and a Next.js dashboard (**`ui/`**) you self-host to manage teams, SSH keys, projects, and provisioning scripts on your machines.

Optional: try **[sanctum.craftxlogic.com](https://sanctum.craftxlogic.com)** without deploying your own stack.

## Layout

| Path | Contents |
|------|----------|
| **`server/`** | Django + DRF API (`manage.py`, `sanctum/`, `core/`). |
| **`ui/`** | Next.js 14 app (App Router, Tailwind). |

Hosted billing (Stripe) for the managed product is implemented in a separate codebase, **cxl-sanctum-saas**, which loads this API from `server/` via `SANCTUM_CORE_ROOT`. Self-hosted installs use this repo only.

## Development

From the repository root:

**API** — create a virtualenv, install dependencies, migrate, run the dev server:

```bash
cd server
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

**Dashboard** — install dependencies and run the Next dev server (defaults to talking to `http://localhost:8000/api`):

```bash
cd ui
npm install
npm run dev
```

Open `http://localhost:3000`. See [server/README.md](server/README.md) and [ui/README.md](ui/README.md) for environment variables and behavior.

## Deployment (production)

Run the API and the UI as **long-lived services** behind a reverse proxy with HTTPS—not as foreground `runserver` / `npm run dev` sessions. Outline:

### 1. Server (Django)

- Use **PostgreSQL** in production (`SANCTUM_DB_*` — see [server/README.md](server/README.md)).
- Install dependencies in a venv on the host (or a deploy user), run `migrate`, collect static if you serve static files through Django or your proxy.
- Serve the app with an **ASGI/WSGI server** (for example **Gunicorn** or **uvicorn** with the appropriate Django ASGI/WSGI entrypoint), bound to localhost or a private port.
- Manage the process with **systemd**, **supervisor**, or your platform’s equivalent so it restarts on boot and on failure.

### 2. Dashboard (Next.js)

- In `ui/`, set production env (at least `NEXT_PUBLIC_API_URL` to your **public** API base URL, e.g. `https://api.example.com/api`).
- Run **`npm ci`** (or `npm install`), then **`npm run build`**, then **`npm start`** (or use `node` against the Next standalone output if you configure it). Bind to localhost or a private port.
- Same as the API: run under **systemd** (or similar), not an interactive terminal.

### 3. Reverse proxy and TLS

- Put **Nginx**, **Caddy**, **Traefik**, or another reverse proxy in front of both services.
- Terminate **HTTPS** at the proxy. Route traffic by path or hostname:
  - **Typical:** `https://app.example.com` → Next.js, `https://app.example.com/api` → Django (if the API is mounted on the same host), **or** separate hostnames for UI and API (`app.example.com` / `api.example.com`).
- Set **`SANCTUM_ALLOWED_HOSTS`** and **`SANCTUM_CORS_ORIGINS`** on the API to match the real browser origin(s) of your dashboard.

### 4. Checklist

| Item | Notes |
|------|--------|
| HTTPS everywhere | Required for production; provision tokens appear in URLs. |
| Secrets | Set `SANCTUM_SECRET_KEY`, DB password, and any proxy auth outside the repo. |
| Firewall | Only the proxy needs public ports 80/443; backend services listen on loopback or a private network. |
| Target servers | Cron jobs on managed machines must use **your** public API URL in `curl …/api/provision/...` (see [server/README.md](server/README.md)). |

Exact commands for your OS and process manager vary; the important part is **managed processes + reverse proxy + TLS**, consistent with how you run other web apps on the same host.

## Documentation

| Doc | Description |
|-----|-------------|
| [server/README.md](server/README.md) | API, provisioning, env vars, workflow, security notes. |
| [ui/README.md](ui/README.md) | Frontend env vars, production build, billing UI behavior. |
| [server/docs/OSS_AND_HOSTED.md](server/docs/OSS_AND_HOSTED.md) | Self-hosted core vs hosted SaaS (limits, billing). |
| [LICENSE](LICENSE) | MIT License. |
| [SECURITY.md](SECURITY.md) | Reporting vulnerabilities; umbrella policy. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How we work in this monorepo. |

Treat this repository as a single project: version control and releases apply to **`server/`** and **`ui/`** together.
