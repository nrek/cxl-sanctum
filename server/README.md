# Sanctum (API)

This directory is **`server/`** in the **[cxl-sanctum](../README.md)** monorepo (Django REST API).

Open-source SSH access management: one place to manage users, teams, and SSH public keys across **projects** and **server groups**, with servers pulling an idempotent provisioning script on a schedule (or ad hoc).

You host this API yourself alongside the companion dashboard (**`../ui/`** in the monorepo), and point your machines at your own provision URLs. Prefer not to run servers? **[sanctum.craftxlogic.com](https://sanctum.craftxlogic.com)** offers a hosted Sanctum you can try first.

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

### Multi-operator repo permissions

If more than one shell user will run `scripts/sanctum-update.sh` (for example, the cloud-provider default user **and** your own admin account), set up a shared group once so `git pull`, `pip install`, and `npm ci` don't hit ownership walls:

```bash
sudo groupadd -f sanctum
sudo usermod -aG sanctum "$(id -un)"           # and repeat for each operator
sudo chown -R "$(stat -c '%U' /opt/sanctum/cxl-sanctum)":sanctum /opt/sanctum
sudo find /opt/sanctum -type d -exec chmod 2775 {} \;
sudo find /opt/sanctum -type f -exec chmod g+rw {} \;
# log out and back in (or: newgrp sanctum) to pick up group membership
```

The `2775` mode on directories sets the **setgid** bit so new files (e.g. after `git pull`, `npm install`) inherit the `sanctum` group automatically.

Group membership alone does **not** clear git's `dubious ownership` check — that check compares the repo owner's **uid** to yours. Add the path to git's system-wide trust list once:

```bash
sudo git config --system --add safe.directory /opt/sanctum/cxl-sanctum
```

After both steps, the `dubious ownership` warning and `Permission denied` on `.git/FETCH_HEAD` are gone, and the in-repo script is the canonical entry point:

```bash
/opt/sanctum/cxl-sanctum/scripts/sanctum-update.sh
```

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
curl -sSL https://YOUR_API_HOST/api/provision/<TOKEN>/ | sudo bash
```

Replace `YOUR_API_HOST` with the hostname (and path prefix, if any) where this Django app is exposed—for example `sanctum-api.example.com`. Include the trailing `/` on the provision URL.

### Cron (recommended)

Create `/etc/cron.d/sanctum` with mode `0644`. The file **must end with a newline**; a missing newline or a bad user field can cause `cron` to ignore the file silently.

```
*/5 * * * * root curl -sSL https://YOUR_API_HOST/api/provision/<TOKEN>/ | bash
```

Use `-sSL` so `curl` follows HTTP→HTTPS redirects if anything in front of Django redirects.

### Verify heartbeat

After networking works, confirm the API accepts check-ins from the node:

```bash
curl -sSL -X POST "https://YOUR_API_HOST/api/heartbeat/<TOKEN>/" -d "hostname=$(hostname)"
```

Expect HTTP **200** and JSON containing `"status":"ok"`. The dashboard treats a server as **online** when its last heartbeat was within about **10 minutes**.

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
| GET | `/api/health/` | admin | DB ping, worker `uptime_seconds`, heartbeat counts for dashboard |

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
- **Same-VPC “hairpin” to the public IP** — from an instance in the same VPC, `curl https://your-api-public-ip-or-dns` may **time out** while 443 works from elsewhere. On the managed node, map the API hostname to the Sanctum host’s **private** IP in `/etc/hosts`, or use private DNS that resolves to the private IP.
- **Self-signed / expired cert** — curl will refuse the connection. Fix the cert or (testing only) use `curl -k`.
- **Script runs but heartbeat missing** — the heartbeat URL may be `http://` instead of `https://` if the reverse proxy isn't forwarding `X-Forwarded-Proto`. See network requirements below.

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

### Managed node checklist

1. From the node: DNS resolves the API hostname; outbound TCP **443** to that host succeeds.
2. If the node is in the same VPC as Sanctum and the public IP **times out**, apply the hairpin fix (`/etc/hosts` or private DNS) before relying on cron.
3. Fetch the script and spot-check the embedded heartbeat line: `curl -sSL "https://YOUR_API_HOST/api/provision/<TOKEN>/" | grep -A3 Heartbeat` — expect `https://` and `curl -sSL`.
4. Install `/etc/cron.d/sanctum` using the **environment’s** token from the dashboard (wrong token = wrong access group).
5. After a few minutes, confirm the server appears in the dashboard with a recent **last seen** time.

### Automation snippets (optional)

Prefer generating `/etc/cron.d/sanctum` from config (Ansible, Terraform, cloud-init) instead of hand-editing—fewer wrong-token and missing-file mistakes.

**cloud-init** (`write_files` + optional first run):

```yaml
#cloud-config
write_files:
  - path: /etc/cron.d/sanctum
    permissions: "0644"
    content: |
      */5 * * * * root curl -sSL https://YOUR_API_HOST/api/provision/YOUR_TOKEN_HERE/ | bash

runcmd:
  - curl -sSL https://YOUR_API_HOST/api/provision/YOUR_TOKEN_HERE/ | bash
```

**Ansible:**

```yaml
- name: Install Sanctum provision cron
  ansible.builtin.copy:
    dest: /etc/cron.d/sanctum
    mode: "0644"
    content: |
      */5 * * * * root curl -sSL {{ sanctum_api_base }}/provision/{{ sanctum_provision_token }}/ | bash
```

Set `sanctum_api_base` to the full API root (e.g. `https://sanctum.example.com/api`, no trailing slash) and `sanctum_provision_token` to the server group’s token. Re-copy after `regenerate-token`.

### Inspecting heartbeats out of band

The dashboard shows a per-environment list of server heartbeats bucketed as
**online** / **stale** / **dead** (see [Heartbeat freshness](#heartbeat-freshness)
below). When you need a quick answer without the UI — e.g. from an SSH
session — drop into the Django shell or hit the SQLite database directly.

Every server that has ever sent a heartbeat is stored in `core_server`. The
`last_seen` column is UTC.

**Django shell (recommended — respects Django timezone handling):**

```bash
cd server
source .venv/bin/activate
python manage.py shell -c "
from django.utils import timezone
from core.models import Server
from core.serializers import server_status_for

for s in Server.objects.select_related('server_group').order_by('-last_seen'):
    age = server_status_for(s.last_seen)
    print(f'{age:7} {s.ip_address or \"-\":15} {s.server_group.name:20} {s.hostname or s.name} last_seen={s.last_seen}')
"
```

**Raw SQL (SQLite default):**

```bash
sqlite3 server/db.sqlite3 <<'SQL'
.headers on
.mode column
SELECT
  s.id,
  s.hostname,
  s.ip_address,
  sg.name        AS environment,
  s.last_seen,
  CAST((julianday('now') - julianday(s.last_seen)) * 24 AS INT) AS hours_ago
FROM core_server s
JOIN core_servergroup sg ON sg.id = s.server_group_id
ORDER BY s.last_seen DESC NULLS LAST;
SQL
```

**List every IP that has ever heartbeated (deduped):**

```sql
SELECT DISTINCT ip_address
FROM core_server
WHERE ip_address IS NOT NULL
ORDER BY ip_address;
```

**Postgres equivalent** (if you migrate off SQLite):

```sql
SELECT
  s.id,
  s.hostname,
  host(s.ip_address) AS ip,
  sg.name AS environment,
  s.last_seen,
  EXTRACT(EPOCH FROM (now() - s.last_seen)) / 3600 AS hours_ago
FROM core_server s
JOIN core_servergroup sg ON sg.id = s.server_group_id
ORDER BY s.last_seen DESC NULLS LAST;
```

Prefer the UI for destructive changes — the per-environment Servers panel
deletes with hostname-typed confirmation and bulk-prunes only rows older
than 24 hours. Use SQL for read-only investigation.

### Heartbeat freshness

| Bucket  | Definition                                    | UI action                             |
| ------- | --------------------------------------------- | ------------------------------------- |
| online  | `last_seen` within the last 10 minutes        | Healthy                               |
| stale   | `last_seen` 10 minutes .. 24 hours ago        | Investigate; delete individually      |
| dead    | `last_seen` > 24 hours ago, or never recorded | Eligible for bulk **Prune dead**      |

Bulk prune (`POST /api/servers/prune/`) is always scoped to the calling
workspace and rejects any `older_than_hours` below 24. Delete stale rows one
at a time so you don't accidentally sweep a box that's just rebooting.

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

The dashboard lives in **`../ui/`** (see `../ui/README.md`).

## License

Distributed under the MIT License. See [LICENSE](LICENSE).
