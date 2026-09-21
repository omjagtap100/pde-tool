# PDE Gate — Handoff Context for Antigravity

**Student:** Om Santosh Jagtap (s225435163)  
**Unit:** SIT374 / SIT764 Capstone  
**Mentor:** Yotam / tutor feedback via Jotham Barazani  
**Repo:** Hardhat-Enterprises / Policy-Deployment-Engine  
**Date of handoff:** 2026-09-20  

This file is a full dump of project state so another agent (Antigravity) can continue without re-discovering chat history.

---

## 1. Product goal (MVP)

Organisations install a thin CLI (`pde-gate`), authenticate, pick a **policy package**, and run checks against a **real Terraform plan JSON**.

They must **not** receive Hardhat’s full `policies/` tree. Rego + OPA run on the **hosted API**.

Mentor constraints baked into the product:

- Packages are the org-facing unit (`--package`), not `--policies policies/`
- Auth: `PDE_API_KEY` (+ `PDE_ORG_ID`); email/password for register + key recovery
- Region whitelist via package `variables.approved_regions` / `approved_zones`
- **No web portal UI** this trimester — API + CLI only
- **GCP only** for real logic; AWS/Azure = stubs only
- Do not restore any old portal UI tree

Workspace rules live in:

- `.cursor/rules/pde-gate.mdc`
- `.cursor/rules/ponytail.mdc` (minimal diffs, YAGNI)

---

## 2. What exists (DONE)

### 2.1 CLI — `tools/pde-gate/`

Thin HTTP client only. Current source files:

- `src/cli.ts` — commands
- `src/api-client.ts` — all API calls
- `src/credentials.ts` — local file + env auth
- `src/credentials.test.ts`

**Commands:**

| Command | Purpose |
| --- | --- |
| `register --name --email --password` | Create org; save credentials |
| `login --email --password` | Recover `org_id` + `api_key` if key lost |
| `status` | Optional smoke check (not required in CI) |
| `package list/show/create/set-regions/delete` | Manage packages |
| `check --plan --package` | Upload plan; server runs OPA |

**Auth resolution** (`credentials.ts`):

1. Prefer env: `PDE_ORG_ID`, `PDE_API_KEY` (or `PDE_ORG_TOKEN`), `PDE_API_URL`
2. Else `~/.pde-gate/credentials.json` (dev convenience after register/login)
3. Prod/CI = secrets only; npm package never ships keys

**Removed from CLI (important):**

- Local `opa.ts`, `policy-select.ts`, `pipeline/check.ts`, entire `plugins/` tree
- Browser register / callback server / HTML portal UI

CLI always calls `pde-gate-api` via `PDE_API_URL` (default `http://127.0.0.1:3847`).

### 2.2 API — `tools/pde-gate-api/`

Express + Sequelize + MySQL.

**Key paths:**

- `src/server.ts` — routes
- `src/store.ts` — org/package DB ops + login
- `src/password.ts` — scrypt hash/verify (not reversible encryption)
- `src/engine/run-check.ts` — server-side check
- `src/engine/opa.ts`, `policy-select.ts`, `plugins/` (GCP real; AWS/Azure stubs)
- `migrations/` including password + cleanup migration

**Endpoints:**

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | |
| POST | `/v1/orgs/register` | requires password (min 8); returns `org_id` + `api_key` |
| POST | `/v1/orgs/login` | email + password → recover `api_key` |
| GET | `/v1/orgs/:orgId` | Bearer API key |
| CRUD | `/v1/orgs/:orgId/packages` | |
| POST | `/v1/orgs/:orgId/checks` | body: `package_id`, `plan`, optional `platform`, `strict_versions` |

**Check flow:**

1. Auth org
2. Load package from MySQL
3. GCP canonicalizer version gate (`PDE_SUPPORT_MATRIX`, Google pin ~7.37.0)
4. Merge `variables` → `input.org_config`
5. `discoverPolicies` from `policy_groups` + resource types
6. `opa eval` using `PDE_POLICIES_ROOT` (default repo `policies/`)
7. Return pass/fail JSON — **plan is not persisted in DB**

### 2.3 DB cleanup done

Removed unused org columns:

- `policy_pin`
- `policy_profile`
- `enabled_policies`

Added:

- `password_hash` (scrypt)
- unique `contact_email`

### 2.4 Demo sample

`samples/client-mimic/`:

- `main.tf` — two VPC connectors (good AU region + bad `us-central1`)
- `plan.json` — pre-baked plan for demo without GCP creds
- `package.json` — package shape for create `--file`
- `run-demo.sh` — supports `--register` / `--login` with password

Expected check result: **FAIL** on legacy connector region.

### 2.5 Docs

- `tools/pde-gate/README.md`
- `tools/pde-gate/ORG-AND-PROD.md` — E2E steps + glossary
- `tools/pde-gate-api/README.md`

### 2.6 Tests

- CLI: credentials tests
- API: health, org/package CRUD + login, password unit tests, engine unit tests
- Run under **Node 24** (`nvm use 24`); older Node breaks `fetch`

---

## 3. What is NOT done / out of scope

| Item | Status |
| --- | --- |
| Full web portal UI | Out of scope this trimester |
| AWS / Azure real adapters | Stubs only |
| Persisting plans in MySQL | Not done (by design MVP) |
| Shipping `policies/` inside npm CLI | Must never happen |
| Email/password as session login replacing API key for checks | Not needed; login only recovers API key |
| Company Progress Update discipline | Student was flagged behind at week 6 checkpoint — process issue not code |
| Opening/merging Gate PR on GitHub | Branch `feature/pde-gate` exists; treat as WIP unless PR opened |
| Assessment-ready polished demo narrative | Still “in progress” framing for 10.1P |

---

## 4. Key product concepts (glossary)

| Term | Meaning |
| --- | --- |
| `policy_groups` | Map resource type → Rego basenames to run |
| `variables` | Client knobs e.g. `approved_regions`, `approved_zones`, `google_provider_version` |
| `policy_pin` / `policy_profile` | Removed; were unused legacy fields |
| Package id | e.g. `pkg_…` — reuse same id with a **new** plan for each check |
| Local credentials file | Dev only (`~/.pde-gate/credentials.json`) |
| CI secrets | `PDE_API_URL`, `PDE_ORG_ID`, `PDE_API_KEY` |

Updating a plan = regenerate `plan.json` and run `check` again with the **same package id**. Plans are not stored server-side.

---

## 5. How to run E2E locally

**Terminal 1 — API**

```bash
cd tools/pde-gate-api
nvm use 24
# .env must match MySQL (PDE_DB_*)
npm install
npm run db:migrate
npm start
# curl http://127.0.0.1:3847/health
```

**Terminal 2 — CLI**

```bash
cd tools/pde-gate
nvm use 24
export PDE_API_URL=http://127.0.0.1:3847

npx tsx src/cli.ts register --name "Acme" --email you@acme.com --password 'your-secret'
npx tsx src/cli.ts status   # optional
npx tsx src/cli.ts package create --file ../../samples/client-mimic/package.json
npx tsx src/cli.ts check --plan ../../samples/client-mimic/plan.json --package pkg_XXX --platform gcp
# expect exit 1 / FAIL for bad region

npx tsx src/cli.ts login --email you@acme.com --password 'your-secret'  # if key lost
```

Or: `samples/client-mimic/./run-demo.sh --register`

---

## 6. Branches / evidence links

- Policy work branch example:  
  `Service/gcp/compute_engine/google_compute_region_network_firewall_policy_rule`
- Gate WIP branch:  
  `feature/pde-gate`  
  https://github.com/Hardhat-Enterprises/Policy-Deployment-Engine/tree/feature/pde-gate

Prefer **PR links** over screenshots for assessment evidence when available. Branch link OK while WIP.

---

## 7. Assessment / 10.1P context

### Task

- Tasksheet: `tasksheets/SIT374_SIT764-10.1P.pdf`
- **Template required:** MIT Word template under `tasksheets/10.1P-resources/5.1P-resources/`
- Update 5.1P → overall trimester accomplishments; save PDF → OnTrack
- Individual task (not group copy)

### 5.1P tutor feedback to honour in 10.1P

- Deeper GLO reflections (main grade risk for HD target)
- SFIA: keep **Group 1 only** (PROG + SWDN); **delete Group 2** from template
- Evidence: **links stronger than screenshots**
- Cross-reference Evidence A/B/C/D inside Self-Assessment, CLOs, SFIA
- Gate achievement framed as **in progress** (working MVP slice + remaining polish)

### Writing style student requested for paste text

- Easy English
- Mostly full stops
- Very few commas
- Almost no other punctuation

### Evidence labels agreed

- **A** — firewall / policy Service branch (completed policy work)
- **B** — `feature/pde-gate` (Gate code WIP)
- **C** — **not** titled “end to end demo”; call it **client mimic sample and check run** (`samples/client-mimic`)
- **D** — personal progress tracker link (student pastes URL)

---

## 8. Architecture (current truth)

```text
Client CI / laptop
  terraform show -json > plan.json
  pde-gate check --plan --package
       |
       | HTTPS + Bearer PDE_API_KEY
       v
pde-gate-api (hosted later; local :3847 now)
  MySQL: orgs (token, password_hash, email), packages
  Disk: policies/ via PDE_POLICIES_ROOT
  OPA binary on PATH
       |
       v
  PASS / FAIL JSON (plan not saved)
```

Prod for clients: change **`PDE_API_URL`** to hosted API + set CI secrets. No code change required for that switch.

---

## 9. Suggested next work for Antigravity

Priority order if continuing engineering:

1. Confirm E2E still green on Node 24 + current `.env`
2. Open/update PR from `feature/pde-gate` with clear summary for mentor
3. Any mentor UX polish on package/check messaging
4. Keep AWS/Azure as stubs; do not implement cloud logic
5. Do not add portal UI
6. Optional: help student finalise 10.1P PDF (content already drafted in chat; Evidence C naming as above)

Do **not**:

- Reintroduce CLI-local OPA/plugins
- Reintroduce browser register/callback HTML
- Persist plans unless mentor explicitly asks
- Restore old `pde-gate-portal` UI tree (API package name is `pde-gate-api`)

---

## 10. Quick file map

```text
tools/pde-gate/          # CLI (thin)
tools/pde-gate-api/      # API + engine + MySQL
samples/client-mimic/    # demo plan + package + script
policies/                # Rego (server-side only)
tasksheets/              # 5.1P / 10.1P PDFs + templates
.cursor/rules/pde-gate.mdc
```

---

*End of handoff. If something in repo disagrees with this file, trust the code under `tools/pde-gate` and `tools/pde-gate-api` first, then update this doc.*
