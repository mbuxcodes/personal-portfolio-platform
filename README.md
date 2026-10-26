# Personal Portfolio Platform

Production-level full stack personal portfolio platform.

## Status

Currently under development. Phase 1 (Project Foundation) is in progress; see [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md).

## Documentation

All planning and architecture documents are inside the [`docs`](docs/README.md) folder. Start with the [documentation index](docs/README.md).

## Prerequisites

- Node.js 24 (Active LTS). The version is pinned in [`.nvmrc`](.nvmrc); with nvm, run `nvm use`.
- npm (installed with Node.js).
- Git.

## Repository layout

| Folder    | Purpose                                                  |
| --------- | -------------------------------------------------------- |
| `client/` | React, TypeScript, and Vite application                  |
| `server/` | Express 5 and TypeScript application                     |
| `docs/`   | Planning and architecture documents                      |
| `.husky/` | Git hooks: format and lint on commit, type check on push |

The repository root, `client/`, and `server/` each have their own `package.json` and lockfile. The root holds only repository tooling (Prettier, Husky, lint-staged). The concrete folder layout of each area is TD-049 in [`docs/TECHNICAL_DECISIONS.md`](docs/TECHNICAL_DECISIONS.md).

## Set up

Install all three from their lockfiles. Install the root first, because it installs the Git hooks.

```bash
npm ci
npm --prefix client ci
npm --prefix server ci
```

## Common commands

From the repository root:

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `npm run format`       | Format every file with Prettier                 |
| `npm run format:check` | Check formatting without changing files         |
| `npm run lint`         | Lint both areas, including layer-boundary rules |
| `npm run type-check`   | Run the strict TypeScript check in both areas   |
| `npm test`             | Run the tests in both areas                     |

Each area also has its own `lint`, `format:check`, `type-check`, and `test` scripts, plus `test:coverage` and `lint:fix`.

## Run the client

```bash
cd client
npm run dev
```

| Command           | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `npm run dev`     | Start the development server (http://localhost:5173)       |
| `npm run build`   | Type check and produce the production build in `dist/`     |
| `npm run preview` | Serve the production build locally (http://localhost:4173) |

Imports from `client/src` use the `@/` alias, for example `@/shared-ui/button`. The client environment template is [`client/.env.example`](client/.env.example). It lists public build-time values only and currently defines none.

## Run the server

```bash
cd server
npm run dev
```

| Command         | Purpose                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| `npm run dev`   | Start with automatic restart on source changes                            |
| `npm run build` | Compile TypeScript to `dist/`                                             |
| `npm start`     | Run the compiled server (`node dist/index.js`); run `npm run build` first |

The server listens on the port in the `PORT` environment variable, and on 5000 when it is not set. For example:

```bash
PORT=5055 npm start
```

Imports across server folders use Node subpath imports, for example `#utils/greet`. The server environment template is [`server/.env.example`](server/.env.example). It lists names only, and real `.env` files are git-ignored.

No routes exist yet, so every path returns Express's default 404 response.

## Git hooks

`npm ci` at the root installs two hooks. On commit, staged files are formatted and linted, and a lint error or a layer-boundary violation blocks the commit. On push, the type check runs in both areas. See [`docs/COMMIT_CONVENTIONS.md`](docs/COMMIT_CONVENTIONS.md).

## Commit conventions

See [`docs/COMMIT_CONVENTIONS.md`](docs/COMMIT_CONVENTIONS.md). Naming rules are in [`docs/NAMING_CONVENTIONS.md`](docs/NAMING_CONVENTIONS.md).

## License

All Rights Reserved. See [`LICENSE`](LICENSE).
