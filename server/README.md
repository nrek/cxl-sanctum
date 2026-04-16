# Sanctum (API)

This directory is **`server/`** in the **[cxl-sanctum](../README.md)** monorepo (Django REST API).

Open-source SSH access management: one place to manage users, teams, and SSH public keys across **projects** and **server groups**, with servers pulling an idempotent provisioning script on a schedule (or ad hoc).

You host this API yourself alongside the companion dashboard (**`../ui/`** in the monorepo), and point your machines at your own provision URLs. If you want to try Sanctum before deploying, **[sanctum.craftxlogic.com](https://sanctum.craftxlogic.com)** is available as a convenience—not required for self-hosting.

**What it does:** user accounts, `authorized_keys`, and sudo membership—aligned from the dashboard and applied on target hosts via `curl | bash` (typically cron).

**What it deliberately doesn't do:** no agent on target servers, no group management beyond sudo, no push mechanism, no session auditing.

## Architecture

```
┌──────────────────────────────┐       ┌─────────────────────┐
│   Sanctum Dashboard (UI)     │       │   Remote Servers     │
│   Next.js  :3000             │       │                      │
│          ▼                   │       │   cron every 5min:   │
│   Sanctum API (Backend)      │◄──────│   curl .../provision │
│   Django + DRF  :8000        │       │     | sudo bash      │
│          ▼                   │       │                      │
│   SQLite / PostgreSQL        │       └─────────────────────┘
└──────────────────────────────┘
```

## Quick start

### Backend (this directory)

From the monorepo root, `cd server`. On its own:

```bash
cd server
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API is at `http://localhost:8000/api/`. Obtain an auth token:

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

### Frontend (`../ui`)

```bash
cd ../ui
npm install
npm run dev
```

The dashboard is at `http://localhost:3000`. Log in with your superuser credentials.

Set `NEXT_PUBLIC_API_URL` so the browser calls your API (default is `http://localhost:8000/api`). It must match the scheme, host, and port where clients can reach the backend (see below).

### Self-hosted checklist

For a real deployment, align these so provisioning and the UI both work:

| Concern | What to set |
|--------|-------------|
| **API public URL** | Serve the Django app behind HTTPS; set `SANCTUM_ALLOWED_HOSTS` and `SANCTUM_CORS_ORIGINS` to your dashboard origin (and any other allowed browser origins). |
| **Dashboard → API** | `NEXT_PUBLIC_API_URL` must be the full public API base (e.g. `https://sanctum-api.example.com/api`). |
| **Servers → API** | Cron jobs use `curl` to your provision URL; use HTTPS in production (tokens appear in the path). |
| **Database** | Use PostgreSQL in production (`SANCTUM_DB_*`); run migrations after deploy. |

## Workflow

1. **Create teams** (e.g. "Backend", "DevOps", "Client A Frontend")
2. **Add members** with their SSH public keys; assign them to teams
3. **Create a project** (e.g. a product or a client). Add **environments** (server groups) such as Development, Staging, Production—use presets or add names one by one.
4. **Assign team access** on the project page: grant the same role on all environments at once, or grant one team/environment at a time, or edit cells in the matrix. Roles:
   - **User** — standard login, no sudo
   - **Sudo** — login + sudo access
   - **Removed** — account locked, keys revoked, sudo removed
5. **Copy the provisioning command** for each environment and run it on matching servers (or cron).
6. **Ungrouped** server groups (no project) still work and appear on the Projects list for ad-hoc use.

Server groups belong to a project when created from that project; the provisioning API and scripts are unchanged.

## Provisioning

Each server group has a unique provision token. The API serves a self-contained bash script at:

```
GET /api/provision/<TOKEN>/
```

Use **your** API base URL (where this server is reachable)—not localhost from the server’s point of view unless you are testing on the same machine.

### One-time run

```bash
curl -sS https://YOUR_API_HOST/api/provision/<TOKEN> | sudo bash
```

Replace `YOUR_API_HOST` with the hostname (and path prefix, if any) where this Django app is exposed—for example `sanctum-api.example.com`.

### Cron (recommended)

Add to `/etc/cron.d/sanctum`:

```
*/5 * * * * root curl -sS https://YOUR_API_HOST/api/provision/<TOKEN> | bash
```

### What the script does

The script is fully idempotent. Running it twice with no dashboard changes produces no side effects.

- **Creates** missing user accounts (`useradd -m -s /bin/bash`)
- **Writes** `~/.ssh/authorized_keys` for each user (overwritten to match desired state)
- **Adds/removes** sudo group membership based on role
- **Locks** removed users (`usermod -L`), clears their keys, strips sudo
- **Logs** all actions to `/var/log/sanctum.log`
- **Heartbeats** back to the API so you can track server check-ins

### Role precedence

If a member is in multiple teams assigned to the same server group:

- **sudo** wins over **user** (most permissive active role applies)
- **removed** only takes effect if the member has no active (user/sudo) assignments

## Configuration

### Backend environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SANCTUM_SECRET_KEY` | insecure default | Django secret key |
| `SANCTUM_DEBUG` | `true` | Django debug mode |
| `SANCTUM_ALLOWED_HOSTS` | `*` | Comma-separated allowed hosts |
| `SANCTUM_DB_ENGINE` | `sqlite` | Set to `postgresql` for Postgres |
| `SANCTUM_DB_NAME` | `sanctum` | Database name |
| `SANCTUM_DB_USER` | `sanctum` | Database user |
| `SANCTUM_DB_PASSWORD` | (empty) | Database password |
| `SANCTUM_DB_HOST` | `localhost` | Database host |
| `SANCTUM_DB_PORT` | `5432` | Database port |
| `SANCTUM_CORS_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |

### Frontend environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Backend API base URL |

## API reference

All endpoints except provision and heartbeat require token authentication (`Authorization: Token <key>`).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login/` | public | Get auth token |
| CRUD | `/api/projects/` | admin | Projects (group environments) |
| GET | `/api/projects/:id/access/` | admin | Team x environment matrix for a project |
| POST | `/api/projects/:id/assign-team/` | admin | Bulk-assign a team to all envs `{ team, role }` |
| POST | `/api/projects/:id/setup-environments/` | admin | Create preset envs `{ development, staging, production }` booleans |
| CRUD | `/api/teams/` | admin | Manage teams |
| CRUD | `/api/members/` | admin | Manage members |
| POST | `/api/members/:id/keys/` | admin | Add SSH key to member |
| DELETE | `/api/members/:id/keys/:keyId/` | admin | Remove SSH key |
| CRUD | `/api/server-groups/` | admin | Server groups (`?project=` or `?ungrouped=1`) |
| POST | `/api/server-groups/:id/regenerate-token/` | admin | Rotate provision token |
| CRUD | `/api/servers/` | admin | View/manage servers |
| CRUD | `/api/assignments/` | admin | Assign teams to server groups |
| GET | `/api/provision/<token>/` | token | Get provisioning script |
| POST | `/api/heartbeat/<token>/` | token | Server check-in |
| GET | `/api/stats/` | admin | `projects`, `members`, `servers_online`, `recent_activity` |

## Troubleshooting server connections

### Checking services on the Sanctum host

```bash
sudo systemctl status sanctum-api    # Gunicorn / Django
sudo systemctl status sanctum-ui     # Next.js standalone
sudo systemctl status apache2        # or nginx — reverse proxy
sudo systemctl status postgresql     # database (if using Postgres)
```

Restart after a deploy:

```bash
sudo systemctl restart sanctum-api sanctum-ui
```

### Log files

| Log | Location |
|-----|----------|
| **Provision activity (on nodes)** | `/var/log/sanctum.log` |
| **Gunicorn / Django** | `journalctl -u sanctum-api -f` |
| **Next.js UI** | `journalctl -u sanctum-ui -f` |
| **Reverse proxy (Apache)** | `/var/log/apache2/error.log` |
| **Reverse proxy (nginx)** | `/var/log/nginx/error.log` |

### Common curl issues on nodes

- **HTTPS redirect swallowed** — use `curl -sSL` (the `-L` follows redirects). Without it, an HTTP→HTTPS redirect silently fails.
- **DNS can't resolve the host** — verify with `dig sanctum.example.com` or `nslookup`.
- **Self-signed / expired cert** — curl will refuse the connection. Fix the cert or (testing only) use `curl -k`.
- **Script runs but heartbeat missing** — the heartbeat URL may be `http://` instead of `https://` if the reverse proxy isn't forwarding `X-Forwarded-Proto`. See network requirements below.
- **`/var/log/sanctum.log` not found** — this file only exists on managed nodes, not on the Sanctum API host. It is created on first provision run. If missing on a node, the provision script has never executed there.

### Network requirements

**Inbound (Sanctum host):**

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 443 | HTTPS | Managed nodes, browsers | Provision scripts, heartbeats, dashboard |
| 80 | HTTP | Public | Redirect to 443 (certbot validation) |

**Outbound (managed nodes):**

| Port | Protocol | Destination | Purpose |
|------|----------|-------------|---------|
| 443 | HTTPS | Sanctum host | `curl` to fetch provision script and send heartbeat |

No other ports are required. Nodes only need outbound HTTPS to the Sanctum host. The Sanctum host does not initiate connections to nodes.

**Reverse proxy must forward** `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For` headers to Gunicorn so Django generates correct `https://` URLs in the provision script. Without `X-Forwarded-Proto: https` on the :443 vhost, heartbeat URLs will be `http://` and silently fail on nodes that redirect HTTP→HTTPS.

## Security notes

- Provision tokens authenticate servers. Treat them like API keys.
- Rotate tokens from the dashboard if compromised. Existing cron jobs will need the new token.
- HTTPS is required in production—tokens travel in URL paths.
- The provisioning script runs as root. The API only returns structured bash commands.
- Dashboard authentication is separate from provision tokens.

## Running tests

```bash
cd server
source .venv/bin/activate
python manage.py test core
```

## Project documentation

| Resource | Description |
|----------|-------------|
| [Monorepo README](../README.md) | Combined `server/` + `ui/` layout and quick start. |
| [LICENSE](LICENSE) | MIT License (full text). |
| [SECURITY.md](SECURITY.md) | How to report vulnerabilities; operator security notes. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributing workflow and expectations. |
| [docs/OSS_AND_HOSTED.md](docs/OSS_AND_HOSTED.md) | Self-hosted core vs hosted SaaS (billing, environment limits). |

The dashboard lives in **`../ui/`** (see `../ui/README.md`).

## License

Distributed under the MIT License. See [LICENSE](LICENSE).
