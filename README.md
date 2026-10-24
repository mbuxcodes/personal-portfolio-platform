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

| Folder | Purpose |
| --- | --- |
| `client/` | React, TypeScript, and Vite application |
| `server/` | Express 5 and TypeScript application |
| `docs/` | Planning and architecture documents |

Each code area has its own `package.json` and lockfile. Install from the lockfile with `npm ci`.

## Run the client

```bash
cd client
npm ci
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server (http://localhost:5173) |
| `npm run build` | Type check and produce the production build in `dist/` |
| `npm run preview` | Serve the production build locally (http://localhost:4173) |
| `npm run type-check` | Run the strict TypeScript check |

The client environment template is [`client/.env.example`](client/.env.example). It lists public build-time values only and currently defines none.

## Run the server

```bash
cd server
npm ci
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start with automatic restart on source changes |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server (`node dist/index.js`); run `npm run build` first |
| `npm run type-check` | Run the strict TypeScript check |

The server listens on the port in the `PORT` environment variable, and on 5000 when it is not set. For example:

```bash
PORT=5055 npm start
```

No routes exist yet, so every path returns Express's default 404 response.

## Commit conventions

See [`docs/COMMIT_CONVENTIONS.md`](docs/COMMIT_CONVENTIONS.md).

## License

All Rights Reserved. See [`LICENSE`](LICENSE).
