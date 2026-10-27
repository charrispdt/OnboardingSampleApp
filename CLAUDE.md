# CLAUDE.md

## What this repo is

**Agentic Elephant Carpaccio**: a training exercise. Participants build an internal customer-onboarding tool for a CS team in thin vertical slices with AI help. The app is a deliberately small skeleton: a React dashboard plus an Express API with an in-memory store.

## Layout

```
client/              React 18 + Vite (ESM), port 5173, proxies /api → :3001
  src/App.jsx        Single-component UI (tabs: Dashboard, Customer Info, Data Mapping, Tenant Setup, Import)
server/              Express 4 (CommonJS), port 3001
  src/index.js       REST routes (/api/health, /api/customers, /api/onboarding, ...)
  src/data/store.js  In-memory store seeded with one example customer (Acme Corporation); no DB
  src/models/        Domain factories: createCustomer, createTenant, createDefaultOnboardingSteps, calculateProgress
scripts/check-node.js  Node version guard used by `just setup`
tests/e2e/           Playwright specs (playwright.config.js starts both servers)
sample-data/         CSV exports for three fictional customers (clients, contacts, chart of accounts, transactions)
.devcontainer/       Node 20 dev container (recommended for workshops)
```

## Commands

Use `just` recipes first (`just --list`):

| Task | Command |
|------|---------|
| Install everything | `just setup` |
| Run app | `just start` (or `just server` / `just client`) |
| All tests | `just test` |
| Unit tests | `just test-unit` (`node:test` for scripts/ and server/) |
| E2E tests | `just test-e2e` (Playwright, Chromium) |

Requires Node 20.19+ or 22.12+.

## Conventions

- Server is CommonJS (`require`); client is ESM/JSX. Don't mix them.
- Unit tests use the built-in `node:test` + `node:assert`. Don't add Jest or Vitest. Put each test file next to its code as `*.test.js`.
- Domain types are documented with JSDoc `@typedef` in `server/src/models/index.js`. Keep them in sync when you change shapes.
- Data is in-memory and resets on restart, which is fine for this exercise.
- Status enums: tenant `pending|provisioning|active|failed`; step `pending|in_progress|completed|failed`.

## Testing (temporarily paused)

**Skip tests for now.** Don't write, update, or run tests (`just test`, `just test-unit`, `just test-e2e`) as part of changes until this section is removed. This overrides the regression test practices below.

## Regression test best practices (inactive while testing is paused)

1. **Reproduce before fixing.** For every bug, first write a test that fails because of that bug. Then fix the code and watch the test pass.
2. **One test per bug, named after the behavior.** Example: `it('returns 404 for unknown customer id')`. Add a comment that links the issue or PR.
3. **Test at the lowest level that catches the bug.** Pure logic (models, progress calculation) goes in a `node:test` unit test. API contract bugs go in a route-level test. Use Playwright only for bugs that live in UI or integration flows.
4. **Keep it deterministic.** Don't depend on `Date.now()`, ordering, or seed data that other tests change. Pass explicit IDs and timestamps to factories, and reset or isolate store state.
5. **Assert outcomes, not implementation.** Check returned values, HTTP status and body, and visible UI text and roles. Don't check internal calls or CSS details.
6. **Cover the edges around the fix.** Test the boundaries too: empty input, 0%/100% progress, missing fields, unknown IDs.
7. **Never delete or weaken a regression test to get green.** If a test is wrong, fix it in its own reviewed change and explain why.
8. **Run the full suite before you push** (`just test`). A regression test that only runs locally isn't protecting anything, so make sure CI runs it.
9. **E2E selectors:** prefer `getByRole` / `getByText` over class selectors, and use Playwright's auto-waiting `expect` instead of sleeps.

## Linting

See `just lint` (ESLint flat config covering server, client, scripts and tests). Run it before committing.
