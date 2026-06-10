# Synergit Report Bundle

Tooling that:

1. **Captures screenshots** of every UI page referenced by the Synergit LaTeX
   report (`synergit-report/`) — 20 pages in total — using Playwright.
2. **Generates a `.docx` version** of the report (`Synergit.docx`) by parsing
   the LaTeX source and embedding the captured images.

> The bundle lives at `synergit-report/report-builder/` and reads the
> parent folder (`synergit-report/`) as the LaTeX source. The folder name is
> kept for compatibility; everything *inside* targets Synergit.

---

## Requirements

- Node.js ≥ 18
- A running Synergit stack (frontend + backend) for the screenshot step

```bash
cd synergit-report/report-builder
npm install
npx playwright install chromium    # only needed for screenshots
```

---

## Pipeline overview

```
┌───────────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  Running Synergit stack   │    │  synergit-report/    │    │  bundle/            │
│  - frontend  :5173        │ →  │  - main.tex + ch*    │ →  │  - Synergit.docx    │
│  - gateway   :8080        │    │  - figures/*.tex     │    │  - latex/image/*.png│
└───────────────────────────┘    └──────────────────────┘    └─────────────────────┘
       capture.mjs                  build-content.js               make.js
```

---

## Step 1 — Capture screenshots

The easiest way is to use a `.env` file (same folder as `package.json`):

```bash
cp .env.example .env
# edit .env to set SYNERGIT_LOGIN_USER, SYNERGIT_LOGIN_PASS, fixture IDs…
npm run capture
```

`capture.mjs` auto-loads `.env` from its own folder before reading any config.
Values you set in the shell (`$env:NAME = "..."`) take precedence over `.env`.

Or set the env vars inline (without a `.env` file):

```powershell
$env:SYNERGIT_BASE_URL   = "http://localhost:5173"
$env:SYNERGIT_API_URL    = "http://localhost:8080"
$env:SYNERGIT_LOGIN_USER = "CaliMinux"
$env:SYNERGIT_LOGIN_PASS = "yourpassword"
# Optional fixture overrides for shots that need a specific entity:
$env:SYNERGIT_REPO    = "synergit-demo"
$env:SYNERGIT_PR      = "1"
$env:SYNERGIT_ISSUE   = "1"
$env:SYNERGIT_COMMIT  = "<commit-hash>"
$env:SYNERGIT_BRANCH  = "main"
$env:SYNERGIT_FILE    = "README.md"
$env:SYNERGIT_COMPARE = "main...feature"

npm run capture            # all 20 shots
npm run capture:headed     # same, but show the browser (debugging)
node capture.mjs --only=synergit-pr-detail,synergit-pr-merge   # only some
node capture.mjs --skip=synergit-resolve                       # skip flaky ones
```

Output is written to `latex/image/synergit-*.png` at 2x retina resolution. The
SPA boots authenticated because `capture.mjs` POSTs to
`/api/v1/auth/login`, takes the returned `{token}`, and injects it into
`localStorage.token` via `addInitScript` before the page loads.

> Pages that need fixture data (a specific PR, a specific issue, a commit hash)
> rely on the env vars above. The script will not fail if a route 404s — it
> just records that shot as failed and continues.

### Edit the shot list

`captures.config.mjs` lists every shot — name, route, optional `waitFor`
selector, optional `delay`, `fullPage`. Add/remove shots there if your routing
differs.

---

## Step 2 — Build content.json

`build-content.js` parses the LaTeX report into a normalised JSON tree:

```bash
npm run content    # reads ../main.tex and writes content.json
```

By default it reads from the parent folder (`synergit-report/`). Override via:

```powershell
$env:SYNERGIT_LATEX_DIR = "D:\path\to\some\other\latex\report"
npm run content
```

What the parser handles:

- `\chapter{...}`, `\section{...}`, `\subsection{...}`, `\subsubsection{...}`
- `itemize` lists (`\item`)
- `tabular` / `longtable` tables (with `\caption{}`)
- `figure` environments and the custom `\figauto{}{}{}` macro
- inline markup: `\textbf` → bold, `\textit`/`\emph` → italic, `\texttt` → code
- `\input{...}` is followed recursively (chapters, frontmatter, figures)

Project-specific bits (already wired for Synergit):

- **Cover page macros** (`coverBlocks` in `build-content.js`) — reads
  `\BoGiaoDuc`, `\TruongDH`, `\Khoa`, `\TenMonHoc`, `\TenDeTaiNgan`,
  `\TenDeTai`, `\GVHD`, `\Lop`, `\SVMot`, `\MSSVMot`, optionally
  `\SVHai`/`\MSSVHai` (for 2-person teams), `\DiaDiemThoiGian`.
- **Front/back matter heading promotion** — Vietnamese strings
  (`Lời cảm ơn`, `TÓM TẮT ĐỀ TÀI`, `TÀI LIỆU THAM KHẢO`, etc.) are turned into
  unnumbered chapters.
- **Figure → image map** (`FIG` in `gen.js`) — captions matched exactly to PNG
  paths under `latex/image/` (UI screenshots) and `latex/image/diagrams/` (TikZ
  diagrams that you might pre-render to PNG separately).

---

## Step 3 — Build the DOCX

```bash
npm run docx       # content.json + latex/image/* → Synergit.docx
# or end-to-end:
npm run build      # content.json + docx
npm run all        # capture + content.json + docx
```

The output `Synergit.docx` is written next to the scripts. Expect ~10–20 MB
once all PNGs are embedded.

---

## Layout

```
synergit-report/
├── main.tex / chapters/ / figures/   ← LaTeX source (parent of this folder)
└── report-builder/            ← this folder
    ├── package.json
    ├── README.md  (this file)
    ├── captures.config.mjs           ← list of screenshot routes
    ├── capture.mjs                   ← Playwright multi-shot tool
    ├── build-content.js              ← LaTeX → content.json
    ├── gen.js                        ← shared docx helpers + FIG map
    ├── build-docx.js                 ← block renderers
    ├── make.js                       ← assembles Synergit.docx
    └── latex/
        └── image/                    ← screenshots land here (synergit-*.png)
            └── diagrams/             ← optional pre-rendered TikZ PNGs
```

---

## Troubleshooting

- **`Cannot find module 'docx'`** — run `npm install` first.
- **`Login failed (HTTP 401)`** — wrong `SYNERGIT_LOGIN_USER`/`SYNERGIT_LOGIN_PASS`,
  or backend not running on `SYNERGIT_API_URL`.
- **Screenshot says route 404'd** — the SPA route is different from the default
  in `captures.config.mjs`; edit the route there.
- **`Synergit.docx` is tiny / figures show `[Hình]`** — captions in `gen.js`
  don't match the LaTeX `\figauto{...}` captions exactly. Captions are matched
  literally after `cleanInline` normalisation; check for typos.
- **Some pages need fixture data** — make sure the demo user has a repository
  with the configured `SYNERGIT_REPO` name and at least one PR/issue/commit
  matching the env vars before running `capture`.
