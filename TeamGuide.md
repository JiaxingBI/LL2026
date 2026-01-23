# LaborLink Code App — Team Guide

This repo is a **Power Apps Code App** built with **React + TypeScript** and bundled with **Vite**. Data access is primarily through **Power SDK generated services/models** for Dataverse (and other connectors).

## Quick start

### Prereqs
- Node.js (LTS recommended)
- PAC CLI (`pac`) authenticated to your tenant/environment

### Install
```bash
npm install
```

### Run locally
The Power SDK typically starts the local app via:
```bash
pac code run
```
This prints a Power Apps Play URL that points to your local dev server.

### Build
```bash
npm run build
```

### Publish
```bash
npm run build
pac code push
```

---

## Project structure (working model)

Think of the project in layers:

1. **UI (screens/components)** → `src/components/*`
2. **State & providers** → `src/PowerProvider.tsx`, `src/contexts/*`
3. **Data access (hooks + loaders)** → `src/hooks/*`, `src/data/*`
4. **Domain types (app-facing interfaces)** → `src/types/*`
5. **Generated connector SDK** → `src/generated/*`
6. **Power SDK schemas/config** → `.power/*`, `power.config.json`

Typical data flow:

**Component → Hook → Loader → Generated Service → Dataverse → Transform → Domain Types → Component**

---

## Key folders and what they’re for

### `src/components/`
React UI modules (screens). Keep these focused on:
- rendering
- user interactions
- calling hooks

Avoid putting Dataverse query strings or transformation logic directly in components.

### `src/hooks/`
Reusable React hooks that encapsulate:
- fetching
- loading/error state
- refresh logic

Example: `useDataverseEmployees.ts` provides employees to multiple screens.

### `src/data/`
“Loaders” that compose multiple data calls and apply business rules.

Example: `dataverseLoader.ts` fetches from multiple Dataverse tables and transforms raw rows into app-friendly shapes.

### `src/types/`
App domain types (the types the UI should primarily depend on). Prefer using these in `src/components/*` rather than the generated Dataverse model types.

### `src/generated/` (auto-generated)
Do **not** hand-edit these files.

- `src/generated/models/*`: types mirroring connector/table schemas
- `src/generated/services/*`: CRUD client wrappers (e.g., `getAll`, `create`, `update`, `delete`)

These are generated from `.power/schemas/*`.

### `.power/` (Power SDK metadata)
- `.power/schemas/dataverse/*.Schema.json`: table schemas used for codegen
- `.power/schemas/appschemas/dataSourcesInfo.ts`: data source registrations

---

## Dataverse integration (how it works)

### Add a Dataverse table as a data source
From the app root:
```bash
pac code add-data-source -a dataverse -t "<logical_table_name>"
```
Examples used in this project:
- `jia_ll_demployee`
- `jia_ll_dshiftgroup`
- `jia_ll_dshiftplan`
- `jia_ll_fattendancereocrd`

After adding a data source, Power SDK updates schemas under `.power/` and generates/updates the service and model code under `src/generated/`.

### Where to put Dataverse queries
- Put server-side filtering / OData options in `src/data/dataverseLoader.ts`
- Expose clean “domain” results through hooks in `src/hooks/*`
- Keep components consuming the hook output

### Current business rules (employees)
This app filters employees to:
- Active only (`statecode eq 0`)
- Work type contains one of: `12H SHF 1`, `12H SHF 2`, `12H SHF 3`, `12H SHF 4`

Shift mapping:
- SHF1 → Green
- SHF2 → Orange
- SHF3 → Yellow
- SHF4 → Blue

If these rules change, update them in `src/data/dataverseLoader.ts`.

---

## How to add new data usage (team workflow)

When adding a new screen or wiring a component to Dataverse:

1. **Add/confirm data source** with `pac code add-data-source` (Dataverse table logical name).
2. **Use the generated service** in a loader under `src/data/`.
3. **Transform to domain types** in the loader (don’t leak Dataverse-specific shapes to UI).
4. **Create/extend a hook** in `src/hooks/` for loading state, errors, and refresh.
5. **Update the component** to consume the hook.

---

## Coding conventions (recommended)

- Components should depend on `src/types/*` domain types.
- Keep mapping logic centralized (prefer `src/data/*`).
- Prefer server-side filtering when possible (Dataverse OData filters), to reduce payload size.
- Avoid adding new mock data: use hooks/loaders instead.

---

## Troubleshooting

### Generated code is missing / out of date
- Re-run `pac code add-data-source ...` for the table.
- Check `.power/schemas/dataverse/` for the schema JSON file.
- Check `src/generated/services/` for the matching service.

### App runs but no data shows
- Confirm the Power SDK provider is initialized (`src/PowerProvider.tsx`).
- Confirm you are signed into the correct environment in the PAC CLI.
- Check browser console for connector/auth errors.

### Build failures
- Run `npm run build` and fix TypeScript errors.
- Common issue: unused imports or type mismatches after schema changes.
