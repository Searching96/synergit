// =============================================================================
//  captures.config.mjs — Danh sách màn hình cần screenshot cho báo cáo Synergit
//
//  Mỗi entry tạo một file PNG ở `latex/image/<name>.png`. Tên file PHẢI khớp
//  chính xác với đường dẫn trong các \figauto{...} của file .tex.
//
//  Tuỳ biến qua biến môi trường (ví dụ trong PowerShell):
//      $env:SYNERGIT_BASE_URL = "http://localhost:5173"
//      $env:SYNERGIT_API_URL  = "http://localhost:8080"
//      $env:SYNERGIT_LOGIN_USER = "CaliMinux"
//      $env:SYNERGIT_LOGIN_PASS = "yourpassword"
//      $env:SYNERGIT_REPO       = "synergit-demo"
//      $env:SYNERGIT_PR         = "1"
//      $env:SYNERGIT_ISSUE      = "1"
//      $env:SYNERGIT_COMMIT     = "<commit-hash>"
//      $env:SYNERGIT_BRANCH     = "main"
//      $env:SYNERGIT_FILE       = "README.md"
//      $env:SYNERGIT_COMPARE    = "main...feature"  # base...head
//
//  Mỗi shot có các trường:
//      name        — tên file (không có ".png"); phải khớp tên trong .tex
//      route       — đường dẫn (sau base URL, bắt đầu bằng "/")
//      auth        — (mặc định true) phải đăng nhập trước khi vào trang này
//      waitFor     — (tuỳ chọn) selector chờ xuất hiện sau khi load
//      fullPage    — (mặc định false) chụp full page hay chỉ viewport
//      width/height — (tuỳ chọn) override viewport cho shot này
//      delay       — (tuỳ chọn) ms chờ thêm trước khi chụp (cho animation)
// =============================================================================

const username = process.env.SYNERGIT_LOGIN_USER || 'CaliMinux';
const repo     = process.env.SYNERGIT_REPO       || 'synergit-demo';
const pr       = process.env.SYNERGIT_PR         || '1';
// PR with merge conflicts (separate from the "happy path" PR above) — used
// only for the synergit-resolve shot so you can showcase the resolve UI on a
// real conflicting PR. Falls back to SYNERGIT_PR if not set.
const prConflict = process.env.SYNERGIT_PR_CONFLICT || pr;
const issue    = process.env.SYNERGIT_ISSUE      || '1';
const commit   = process.env.SYNERGIT_COMMIT     || 'HEAD';
const branch   = process.env.SYNERGIT_BRANCH     || 'main';
const file     = process.env.SYNERGIT_FILE       || 'README.md';
const compare  = process.env.SYNERGIT_COMPARE    || `${branch}...feature`;

export default [
  // ─── Public (chưa đăng nhập) ─────────────────────────────────────────────
  { name: 'synergit-dang-nhap', route: '/login',    auth: false, delay: 300 },
  { name: 'synergit-dang-ky',   route: '/register', auth: false, delay: 300 },

  // ─── Dashboard / Home ────────────────────────────────────────────────────
  { name: 'synergit-dashboard', route: '/', delay: 600 },

  // ─── Tạo repository ──────────────────────────────────────────────────────
  { name: 'synergit-tao-repo',  route: '/new', delay: 400 },

  // ─── Settings ────────────────────────────────────────────────────────────
  { name: 'synergit-settings',  route: '/settings/admin', delay: 400 },

  // ─── Profile ─────────────────────────────────────────────────────────────
  { name: 'synergit-profile-overview', route: `/${username}`,                fullPage: true, delay: 800 },
  { name: 'synergit-profile-repos',    route: `/${username}?tab=repositories`, delay: 600 },

  // ─── Repository — Code ──────────────────────────────────────────────────
  { name: 'synergit-code-browser',
    route: `/${username}/${repo}`,
    delay: 800 },
  { name: 'synergit-file-content',
    route: `/${username}/${repo}/blob/${branch}/${encodeURIComponent(file)}`,
    delay: 800 },

  // ─── Repository — Branches & Commits ────────────────────────────────────
  { name: 'synergit-branches',
    route: `/${username}/${repo}/branches`,
    delay: 600 },
  { name: 'synergit-commits',
    route: `/${username}/${repo}/commits/${branch}`,
    fullPage: true,
    delay: 800 },
  { name: 'synergit-commit-diff',
    route: `/${username}/${repo}/commit/${commit}`,
    fullPage: true,
    delay: 800 },

  // ─── Pull Requests ──────────────────────────────────────────────────────
  { name: 'synergit-pr-board',
    route: `/${username}/${repo}/pulls`,
    delay: 600 },
  { name: 'synergit-compare',
    route: `/${username}/${repo}/compare/${compare}`,
    fullPage: true,
    delay: 800 },
  { name: 'synergit-pr-detail',
    route: `/${username}/${repo}/pull/${pr}`,
    fullPage: true,
    delay: 800 },
  { name: 'synergit-pr-merge',
    route: `/${username}/${repo}/pull/${pr}#merge`,
    delay: 600 },
  { name: 'synergit-resolve',
    route: `/${username}/${repo}/pull/${prConflict}/conflicts`,
    delay: 800 },

  // ─── Issues ─────────────────────────────────────────────────────────────
  { name: 'synergit-issue-board',
    route: `/${username}/${repo}/issues`,
    delay: 600 },
  { name: 'synergit-issue-detail',
    route: `/${username}/${repo}/issues/${issue}`,
    fullPage: true,
    delay: 800 },

  // ─── Insights ───────────────────────────────────────────────────────────
  { name: 'synergit-repo-insights',
    route: `/${username}/${repo}/insights`,
    fullPage: true,
    delay: 1000 },
];
