# cxl-sanctum

Monorepo for **Sanctum**: open-source SSH access management—a Django REST API (**`server/`**) and a Next.js dashboard (**`ui/`**) you self-host to manage teams, SSH keys, projects, and provisioning scripts on your machines.

Optional: try **[sanctum.craftxlogic.com](https://sanctum.craftxlogic.com)** without deploying your own stack.

## Layout

| Path | Contents |
|------|----------|
| **`server/`** | Django + DRF API (`manage.py`, `sanctum/`, `core/`). |
| **`ui/`** | Next.js 14 app (App Router, Tailwind). |

Internal hosted billing (Stripe) lives in a separate repository, **cxl-sanctum-saas**, which imports the API from `server/` via `SANCTUM_CORE_ROOT`.

## Quick start (development)

From this directory:

**API**

```bash
cd server
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

**Dashboard** (second terminal)

```bash
cd ui
npm install
npm run dev
```

Open `http://localhost:3000` and point the UI at `http://localhost:8000/api` (default `NEXT_PUBLIC_API_URL`).

## Documentation

| Doc | Description |
|-----|-------------|
| [server/README.md](server/README.md) | API, provisioning, env vars, workflow, self-hosted checklist. |
| [ui/README.md](ui/README.md) | Frontend env vars, build, billing UI behavior. |
| [server/docs/OSS_AND_HOSTED.md](server/docs/OSS_AND_HOSTED.md) | Self-hosted core vs hosted SaaS (limits, billing). |
| [LICENSE](LICENSE) | MIT License (applies to `server/` and `ui/` in this repo). |
| [SECURITY.md](SECURITY.md) | Reporting vulnerabilities; umbrella policy. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How we work in this monorepo. |

## Publishing to GitHub

Initialize git at the **monorepo root** (`cxl-sanctum/`), not inside `server/` or `ui/`. One repository contains both packages.

## Legacy workspace paths

If you still see old top-level folders **`cxl-sanctum-server`** or **`cxl-sanctum-ui`** next to this repo, they are obsolete copies—close any processes using them (Python, Node, editors), then delete those folders manually. Active code lives under **`cxl-sanctum/server`** and **`cxl-sanctum/ui`**.
