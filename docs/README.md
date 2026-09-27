# Red Tetris

## Description

Red Tetris is a **full-stack JavaScript** project: an online multiplayer Tetris played in real time through the browser, built as a Single Page Application with a Node.js server and socket-based networking.

Players join a game through its URL (`http://<host>:<port>/<room>/<player_name>`). Everyone in a room receives the **same sequence of pieces**; clearing multiple lines at once sends penalty lines to every opponent, and each player sees the **spectrum** (column heights) of the other fields update live. The first player to join is the host and decides when the game starts; the last player standing wins.

The codebase follows two deliberately opposed programming styles:

- The **client** is written in functional style — the board and piece logic are pure functions, the `this` keyword is forbidden, and state is managed through a Redux store. No DOM-manipulation library, no Canvas, no SVG: the field is rendered with components and laid out with grid/flexbox.
- The **server** is object-oriented, built at minimum around `Player`, `Piece` and `Game` classes, and communicates with the clients through socket events.

The test suite must cover at least 70% of statements, functions and lines, and 50% of branches.

## Stack

| Layer | Tools |
| --- | --- |
| Language | TypeScript 7 |
| Client | React 19, Redux Toolkit 2, React Router 8, socket.io-client 4, Vite 8 |
| Server | Node.js 24, Express 5, Socket.IO 4 |
| Runtime | Docker Compose |

## Architecture

- The **server is authoritative** over rooms, players, host, game phase (`waiting`, `running`, `finished`), the shared piece sequence, action validation, penalties, spectrums, eliminations and the winner.
- The **client** renders with React, keeps its state in Redux, captures keyboard input and applies pure board logic; it always reconciles with the state sent by the server.
- **`srcs/shared`** contains only types, constants and socket event contracts used by both sides.
- In production a single container serves `index.html`, `bundle.js` and the Socket.IO endpoint from the same origin.

## Project structure

```text
.
├── Makefile                   # entry point for Docker and npm tasks
├── .env.example
├── docs/
└── srcs/
    ├── compose.yaml           # development stack (hot reload)
    ├── compose.prod.yaml      # production stack (single container)
    ├── shared/                # protocol.ts, types.ts, constants.ts
    ├── server/                # server container
    │   ├── Dockerfile
    │   └── src/
    │       ├── index.ts       # HTTP + Socket.IO bootstrap
    │       ├── http/          # static files and SPA fallback
    │       ├── sockets/       # event handlers
    │       ├── domain/        # Game, Player, Piece
    │       └── rooms/         # RoomManager
    └── client/                # client container (development)
        ├── Dockerfile
        ├── index.html
        └── src/
            ├── main.tsx       # React root and routes
            ├── app/           # store, reducers, socket middleware
            ├── game/          # pure board and piece logic
            ├── components/
            └── pages/
```

## Getting started

Requirements: Docker with Compose v2. Node.js 24 or later is only needed to run tasks outside Docker.

```sh
cp .env.example .env
make
```

| Command | Description |
| --- | --- |
| `make` / `make dev` | Development stack in the foreground, with hot reload on both containers |
| `make prod` | Builds and starts the production container in the background |
| `make logs` | Follows the production logs |
| `make down` | Stops both stacks and removes their dependency volumes |
| `make clean` | Stops both stacks and removes their images and volumes |
| `make install` | Installs the dependencies of both packages locally |
| `make typecheck` | Type-checks both packages |

| Stack | URL |
| --- | --- |
| Development | `http://localhost:5173/<room>/<player_name>` (Vite proxies `/socket.io` to the server) |
| Production | `http://localhost:3000/<room>/<player_name>` |

Without Docker: `make install`, then `npm --prefix srcs/server run dev` and `npm --prefix srcs/client run dev` in two terminals.

After changing dependencies in a `package.json`, run `make dev` again: it rebuilds the images and refreshes the `node_modules` volumes.

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Host port of the server; local listening port when running without Docker |

`.env` is git-ignored and `.env.example` lists every variable.

## Conventions

- Node.js runs the server TypeScript sources directly, so there is no server build step and `tsc` only type-checks:
  - relative imports include the `.ts` / `.tsx` extension;
  - only erasable syntax: no `enum`, `namespace` or constructor parameter properties;
  - type-only imports use `import type`.
- Client code never uses `this` (except in `Error` subclasses); board and piece logic are pure functions.
- The server domain is object-oriented: `Game`, `Player`, `Piece` and `RoomManager`.
- No DOM-manipulation libraries, Canvas, SVG or `<table>`; layout uses grid and flexbox.
- `srcs/shared` does not import packages, since it has no dependencies of its own.
- Socket events reach Redux through `socketMiddleware.ts`, never directly from components.
