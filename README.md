# Sempu

Vite + React + TypeScript project with React Router, Vitest, ESLint, and Prettier.

## Conventions

- No `any` — enforced by `@typescript-eslint/no-explicit-any` (and the related
  `no-unsafe-*` rules) as ESLint errors.
- No semicolons — enforced by ESLint's `semi: ["error", "never"]` rule and
  Prettier's `"semi": false` setting, so linting and formatting always agree.

## Scripts

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the Vite dev server                |
| `npm run build`        | Type-check and build for production      |
| `npm run preview`      | Preview the production build locally     |
| `npm run lint`         | Run ESLint                               |
| `npm run format`       | Format all files with Prettier           |
| `npm run format:check` | Check formatting without writing changes |
| `npm run test`         | Run the Vitest suite once                |
| `npm run test:watch`   | Run Vitest in watch mode                 |
| `npm run test:ui`      | Run Vitest with the interactive UI       |

## Getting started

```bash
npm install
npm run dev
```

## Project structure

Structured by feature, not by file type. Each feature owns its components,
hooks, and other logic, and exposes only what other parts of the app need
through an `index.ts` barrel file.

```
src/
  app/                  # App shell: root component, layout, router config
    App.tsx
    AppLayout.tsx
    router.tsx
  features/             # One folder per feature/domain
    team/               # Personer, team, inloggad användare
      api/              # Anrop mot backend
      components/
      index.ts          # Public API of the feature
    vacationPlanner/    # Semesterplaneraren
      api/
      components/
      hooks/
      lib/              # Kalender, svenska röda dagar, schemalogik
      types.ts
      index.ts
    overview/           # Semesteröversikt: flera team i samma vy
      api/
      components/
      types.ts
      index.ts
    pu/                 # PU-turordning och bytesförfrågningar
      api/
      components/
      lib/              # Seedad rotation, veckofönster
      types.ts
      index.ts
  mockServer/           # Attrapp-backend, se nedan
  shared/               # Reusable, feature-agnostic building blocks
    components/
    hooks/
    lib/
    styles/             # Sidramverk som alla flikar delar
    types/
  test/
    setup.ts            # Vitest + jest-dom global setup
  main.tsx              # Entry point
  index.css             # Tokens, färger och applikationsskal
```

### Stilar

Varje komponent äger sin egen CSS-fil och importerar den själv. Undantagen är
`src/index.css` (färgtokens och applikationsskalet) och
`src/shared/styles/page.css` (sidrubrik, verktygsrad och tillståndsmeddelanden
som alla flikar använder) — båda importeras från `main.tsx`.

Lägg inte delade klasser i en features stilmall. Det fungerar så länge allt
hamnar i samma bundle, men slutar göra det den dag routerna lazy-laddas.

### Datalagret

Ingen riktig backend finns än. All datahämtning går genom `src/features/*/api/`,
som är asynkrona funktioner med den signatur ett riktigt API skulle ha. De
pratar i sin tur med `src/mockServer/`, som håller datan i `localStorage` och
lägger på lite konstgjord latens så att vyerna byggs för att hantera väntan.

När ett riktigt API finns byts innehållet i `api`-modulerna ut mot `fetch`, och
hela `src/mockServer/` kan tas bort. Inga komponenter behöver ändras.

Sparad data läggs ovanpå färsk seed-data vid inläsning, så en samling som
saknas faller tillbaka i stället för att krascha appen. Ändrar du formen på
`Database` på ett sätt som inte går att laga så: höj `STORAGE_KEY` i
`src/mockServer/db.ts`.

Vill du börja om från demodata: rensa nyckeln `sempu:database:v4` i
localStorage, eller anropa `resetDatabase()` från `src/mockServer/db.ts`.

### Adding a new feature

1. Create `src/features/<name>/` with its own `components/`, `hooks/`, etc.
   as needed.
2. Export the public pieces from `src/features/<name>/index.ts`.
3. Wire any routed pages into `src/app/router.tsx`.

Import from other features via their barrel (`../features/<name>`) rather
than reaching into their internals, to keep feature boundaries clean.
