# Campaign Ledger — Claude Code Instructions

## Project Overview

Campaign Ledger is a local-first D&D 5e campaign ledger: character sheets, campaign records, NPC
dossiers, wiki pages, image assets, and SRD rules. It is a server-rendered Hono + HTMX + SQLite
application following the Hyper-Dank template lineage.

Stack: Bun · Hono · HTMX · TypeScript · JSX (`hono/jsx`) · SQLite (Bun native) · Pa11y ·
Playwright · `@macavitymadcap/hyper-dank-*` packages

## Architecture in One Paragraph

`src/index.ts` owns process setup: environment variables, SQLite provider, repository construction,
auth/session services, schema bootstrap. `src/app.tsx` owns `createApp()`, which receives all
dependencies and registers routes. Tests use the same `createApp()` with in-memory SQLite and a
deterministic `TestAuthProvider`. The Hyper-Dank packages supply shared UI atoms/molecules,
transport helpers (`FormValues`, `fragmentOrPage`, `routeParam`), data lifecycle primitives, and
automation scripts. Domain routes, repositories, seed data, JSX components, and product copy are
app-owned.

## Directory Shape

```
src/
├── index.ts              # Bun runtime entrypoint — resolveRuntimeConfig()
├── app.tsx               # Hono app factory — createApp(dependencies)
├── app.test.tsx          # Route integration tests
├── auth/                 # Password, sessions, role guards, requireSheetAccess
├── assets.ts             # Asset storage root helpers
├── campaigns/            # Imports, wiki normalisation helpers
├── characters/           # Rests, resource update planning
├── components/
│   ├── atoms/            # Button, Badge, Switch, etc.
│   ├── molecules/        # FormField, LabelledOutput, etc.
│   ├── organisms/        # SheetHeader, SheetTabs, CoreTab, NpcListPage, etc.
│   ├── pages/            # Full route compositions
│   └── templates/        # HTML shell, Vite asset tags
├── db/                   # Schema, repository contracts, SQLite implementation
├── notes/                # Notes repository
├── rules/                # RulesImportService, RulesSeedRepository
└── runtime.ts            # AccountDeliveryConfig, resolveRuntimeConfig
scripts/                  # verify, smoke-mvp, db-bootstrap, screenshots, etc.
docs/
├── epics/                # Epic planning Markdown
├── tickets/              # Ticket planning Markdown
└── rules/                # SRD corpus, private-rules schema, fixtures
```

## Core Interfaces

`AppDependencies` is the contract `createApp()` receives:

```ts
interface AppDependencies {
  accountDelivery?: AccountDeliveryConfig;
  appName: string;
  authRepository: AuthRepository;
  authService: AuthService;
  campaignContentRepository: CampaignContentRepository;
  campaignRepository: CampaignRepository;
  characterRepository: CharacterRepository;
  notesRepository: NotesRepository;
  rulesRepository: RulesRepository;
  sessionService: SessionService;
}
```

Never add process setup or environment reads inside `createApp()`.

## Request Conventions

- Full page requests return complete HTML documents.
- HTMX fragment requests return the smallest meaningful fragment — never a full page unless
  navigation-level.
- `fragmentOrPage(context, { fragment, page })` handles the HTMX vs plain request distinction.
- All mutations go through route handlers; repositories are read again after mutation; the returned
  fragment represents canonical current state.
- `HX-Redirect` with status 204 is used for HTMX-triggered redirects (not `Location` + 302/303).
- Route guards use `requireRole`, `requireSheetAccess`, and `requireCampaignAccess`; guards live in
  `src/auth/`, not scattered through components.
- Components may hide unavailable controls; routes must enforce access.

## Auth and Roles

Four roles: `player`, `game_master`, `admin`, and combined admin+player or admin+game_master.
Admin alone does not grant sheet write or campaign access. Session cookies are HTTP-only signed
cookies. PBKDF2 password hashes. No external identity providers in scope.

## HTMX Patterns

- Mutations return `HX-Trigger: refresh` where relevant; stats/dependent fragments listen for
  `refresh from:body`.
- HTMX attributes are declared on the component that owns the interaction.
- Every mutating control starts as a native HTML form, then adds HTMX as progressive enhancement.
- `HtmxProps` prop names match rendered `hx-*` attribute names directly.
- Actual HTMX runtime behaviour belongs in Playwright E2E tests; unit tests assert server-side HTML
  contracts and `HX-*` headers.

## Testing Strategy

Tests are split by boundary — never overlap:

- `*.test.tsx` component tests: render JSX to strings, assert semantic HTML and HTMX attributes.
- `src/app.test.tsx`: full-page and error route behaviour via `app.request()`. Status codes,
  redirects, role enforcement, validation failures, fragment shape.
- Repository tests: in-memory SQLite, schema constraints, seed behaviour, read models.
- Service tests: password hashing, session handling, rule normalisation, permission decisions.
- `bun run test:a11y`: Pa11y against a live in-memory app server.
- `bun run smoke:mvp`: seeded group-use workflow end-to-end.
- Playwright E2E: browser workflows, HTMX fragment contracts.

Test structure uses Arrange / Act / Assert comments:

```typescript
test("does the thing", () => {
  // Arrange
  const input = buildSomething();

  // Act
  const result = doTheThing(input);

  // Assert
  expect(result).toBe(expected);
});
```

Minimum gate before any source-code ticket is complete: `bun run verify`.

## Verification

```bash
bun run verify        # Full ordered gate — stop here before marking a ticket done
bun run typecheck
bun run test
bun run test:a11y
bun run smoke:mvp
bun run screenshots:sheet
bun run test:hyper-dank  # After any Hyper-Dank package update
```

## Component Conventions

Atomic Design vocabulary: atoms → molecules → organisms → pages → templates. Each component has its
own directory with colocated `Component.tsx`, `Component.styles.ts`, `Component.test.tsx`,
`index.ts`. UI is dense for repeated table use — no marketing hero layouts, no oversized decorative
cards, no explanatory in-app copy.

## Rules Data

Rules are imported locally from `docs/rules/` and `docs/rules/srd-5.1/`, not live-fetched. Sources
are categorised as `srd`, `local`, `third_party`, or campaign-scoped. Runtime reads go through
`RulesRepository`. Private YAML stays outside git at `/data/private-rules`.

## Language and Copy

British English throughout: `armour`, `defence`, `normalise`, `colour`. CSS custom properties:
`--background-colour`. Code naming where natural: `armour_class`, `normaliseRuleText`. External
source names and quoted rules text may preserve official American spelling where changing it would
make a rule ambiguous.

## Ticket and Branch Flow

Epic planning branches open against `main`. Implementation ticket branches start from the active
epic branch and PR back into it. Epic branch merges to `main` after all tickets are accepted.
Squash merge only. PR titles follow Conventional Commits: `type(scope): description`.
Branch naming: `sheet-XXXX` for legacy Markdown-tracked work; `hd-XXXX` for GitHub Issue-tracked
work.

## What Not to Do

- Do not add environment reads or process setup inside `createApp()`.
- Do not scatter permission checks through components — use the guard functions in `src/auth/`.
- Do not return a full page from an HTMX-triggered mutation route unless navigation is required.
- Do not write American English in user-facing copy, CSS properties, or code names.
- Do not introduce new Hyper-Dank package versions without running `bun run test:hyper-dank`.
- Do not commit directly to `main`.
