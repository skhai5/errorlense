# CLAUDE.md — ErrorLens

This file is the single source of truth for the ErrorLens project.
Read it fully before making any changes to any file.

---

## What this project is

ErrorLens is a single-page website that lets users paste any error code, log snippet, CVE ID, or threat indicator and receive an AI-generated analysis — plain-English explanation, severity rating, root cause, and step-by-step remediation steps.

It is **not** a SaaS product, dashboard, or multi-page app. It is a clean, focused tool with a landing page and an embedded analyzer, all in one HTML file.

---

## Project structure

```
errorlens/
├── errorlens.html   ← The entire website (UI + API logic)
├── server.js        ← Express server (proxies Anthropic API, serves errorlens.html)
├── .env             ← API key (never commit this)
├── .gitignore       ← Must include .env and node_modules
├── package.json     ← Node dependencies
├── README.md        ← Public-facing project description
└── CLAUDE.md        ← This file
```

**One rule: keep it simple.** Do not introduce unnecessary files, folders, frameworks, or abstractions. If a change can be made in `errorlens.html`, make it there.

---

## WAT structure

This project uses the Workflows → Actions → Tools (WAT) pattern. Before making any change, identify which workflow it belongs to, which action it affects, and which tool to use.

### Workflows

The three end-to-end jobs this project needs to accomplish:

**1. Analyze workflow** — the core user journey
User pastes input → category selected → request sent to `/api/analyze` → Claude processes it → JSON returned → result rendered on page

**2. Dev workflow** — how you build and iterate locally
Open VS Code → run `node server.js` → edit `errorlens.html` or `server.js` → refresh browser → verify result → commit

**3. Deploy workflow** — how the site goes live
Push to GitHub → hosting provider (Vercel / Netlify / Railway) detects push → reads `server.js` as entry point → environment variables set on host → site live at public URL

---

### Actions

The discrete steps inside each workflow. Each action has a single responsibility.

**Analyze workflow actions**
- `validateInput()` — check the textarea is not empty before firing the request
- `buildPrompt()` — combine user input + category hint into the message sent to Claude
- `callAPI()` — POST to `/api/analyze` on the Express server
- `parseJSON()` — strip any markdown fences and parse the response string as JSON
- `renderResult()` — populate the result card with title, severity badge, explanation, cause, steps, and references
- `handleError()` — if any step above fails, render a safe fallback result without crashing

**Dev workflow actions**
- `installDeps()` — run `npm install` to pull in Express and dotenv
- `startServer()` — run `node server.js` to start the local server on port 3000
- `editFrontend()` — make changes to HTML, CSS, or JS inside `errorlens.html`
- `editBackend()` — make changes to routes or the system prompt inside `server.js`
- `verifyLocally()` — open `http://localhost:3000`, paste a test error, confirm result renders

**Deploy workflow actions**
- `checkGitignore()` — confirm `.env` and `node_modules` are excluded before any commit
- `commitChanges()` — `git add` and `git commit` with a descriptive message
- `pushToRemote()` — `git push` to trigger the hosting provider's build
- `setEnvVars()` — add `ANTHROPIC_API_KEY` and `PORT` to the hosting provider's dashboard

---

### Tools

The actual capabilities Claude Code uses to carry out actions. Every action maps to one or more of these.

**Read tools** — used at the start of every session and before any edit
| Tool | Purpose |
|---|---|
| `Read(CLAUDE.md)` | Load project rules and context |
| `Read(errorlens.html)` | Understand current UI, CSS, and frontend JS |
| `Read(server.js)` | Understand the API proxy and system prompt |
| `Read(package.json)` | Check installed dependencies |
| `Read(.env.example)` | Verify environment variable shape |

**Write tools** — used to make changes
| Tool | Purpose |
|---|---|
| `Edit(errorlens.html)` | All frontend changes — HTML structure, CSS styles, JS logic |
| `Edit(server.js)` | Backend changes — routes, system prompt, error handling |
| `Edit(CLAUDE.md)` | Update project rules when something fundamental changes |
| `Write(new file)` | Only when explicitly instructed — do not create new files unprompted |

**Execute tools** — used to run commands
| Tool | Purpose |
|---|---|
| `Bash(npm install)` | Install dependencies after changes to `package.json` |
| `Bash(node server.js)` | Start the local dev server |
| `Bash(curl /api/analyze)` | Test the API endpoint directly without opening a browser |
| `Bash(git add / commit)` | Save progress at a stable checkpoint |
| `Bash(git push)` | Trigger a deploy |

**Tool boundary rule:** `Edit(errorlens.html)` and `Edit(server.js)` must never be confused.
- Frontend (`errorlens.html`) — HTML structure, CSS, `renderResult()`, `analyze()`, category pills, example chips
- Backend (`server.js`) — API key, system prompt, `/api/analyze` route, JSON parsing, error responses

The API key lives in `server.js` via `.env`. It never appears in `errorlens.html`.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS in `errorlens.html` | No build step, no bundler, no framework |
| Backend | Node.js + Express in `server.js` | Lightweight proxy, keeps API key off frontend |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) | Powers the error analysis |
| Fonts | DM Serif Display + DM Sans (Google Fonts) | Core to the design — do not change |
| Hosting | Vercel, Netlify, or Railway | `server.js` is the entry point |

---

## Design rules

The UI is locked. Do not redesign it. When adding features, follow these constraints exactly.

**Typography**
- Headings: `DM Serif Display` — all `h1`, `h2`, `h3`, `.nav-logo`, result titles
- Body + UI: `DM Sans` — everything else including monospace inputs
- Do not introduce any other fonts

**Color palette**
- Background: `#ffffff` / `#f7f6f3` (off-white surfaces)
- Text: `#1a1916` (primary), `#5a5752` (mid), `#9a9690` (muted)
- Borders: `#e2e0db` (default), `#ccc9c3` (hover/active)
- Severity colors — do not change these:
  - Critical: `#c0392b` on `#fdf2f1`
  - High: `#c75b1a` on `#fdf4ee`
  - Medium: `#9a7a0a` on `#fdfaee`
  - Low: `#1a7a4a` on `#f0faf4`
  - Info: `#1a5fa0` on `#f0f6fd`

**Layout**
- Max content width: `1100px` (sections), `860px` (tool section)
- Page sections in order: Nav → Hero → Stats bar → How it works → Features → Tool → Footer
- Do not reorder, remove, or add sections without being explicitly asked

**Interactions**
- Buttons use `opacity: 0.8` on hover — not color changes
- Cards use `translateY(-2px)` on hover — not shadows or color shifts
- Scroll animations use the `.fade-up` / `.visible` pattern with `IntersectionObserver`

---

## The API integration

### How it works

`errorlens.html` sends a `fetch` POST to `/api/analyze` on the local Express server. `server.js` appends the API key from `.env` and forwards the request to `https://api.anthropic.com/v1/messages`. The response JSON is returned to the frontend.

**Never call the Anthropic API directly from `errorlens.html`.** The API key must stay in `server.js`.

### System prompt

Lives in `server.js`. Instructs Claude to return only valid JSON with this schema:

```json
{
  "error_title": "Short descriptive title",
  "error_type": "Category (Database, HTTP, Security, OS, Runtime, Network, Cloud, MITRE, etc.)",
  "severity": "Critical | High | Medium | Low | Info",
  "explanation": "2-3 sentence plain-English explanation",
  "likely_cause": "Most common reason this occurs, 1-2 sentences",
  "remediation_steps": ["Step 1", "Step 2", "Step 3"],
  "references": ["CVE-XXXX", "RFC XXXX", "OWASP: ...", "etc."]
}
```

Do not change this schema without also updating `renderResult()` in `errorlens.html`.

### Model

Always use `claude-sonnet-4-20250514`. Do not switch models.

---

## Environment variables

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

These live in `.env`. The `.gitignore` must always contain:
```
.env
node_modules/
```

---

## Running locally

```bash
npm install
node server.js
```

Open `http://localhost:3000` in a browser.

---

## Error categories supported

The system prompt in `server.js` covers all of these — do not restrict them:

- HTTP status codes (4xx, 5xx)
- CVE and security vulnerabilities
- MITRE ATT&CK techniques (e.g. T1566.001)
- OS and kernel errors (Linux errno, Windows BSOD, macOS)
- Runtime exceptions (JavaScript, Python, Java, Go, Rust, C#)
- Database errors (PostgreSQL, MySQL, Oracle, MongoDB, Redis)
- Network errors (TCP, DNS, TLS, firewall)
- Cloud provider errors (AWS, GCP, Azure)
- Raw log snippets and stack traces

---

## What not to do

- Do not add login, user accounts, or authentication
- Do not add a database or persistent storage
- Do not install React, Vue, or any frontend framework
- Do not add a CSS framework (Tailwind, Bootstrap, etc.)
- Do not change the fonts
- Do not hardcode the API key in `errorlens.html` or `server.js`
- Do not add analytics or tracking scripts
- Do not break the `.fade-up` scroll animation pattern
- Do not create new files unless explicitly asked

---

## Checklist before any commit

- [ ] `.env` is in `.gitignore` and not staged
- [ ] `errorlens.html` loads correctly at `http://localhost:3000`
- [ ] At least one example chip (e.g. CVE-2021-44228) returns a valid result
- [ ] Severity badge renders with the correct color
- [ ] Raw response toggle opens and closes
- [ ] No console errors on page load
- [ ] `CLAUDE.md` reflects any structural changes made this session