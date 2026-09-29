# Red Tetris

## Description

Red Tetris is a **full-stack JavaScript** project: an online multiplayer Tetris played in real time through the browser, built as a Single Page Application with a Node.js server and socket-based networking.

Players join a game through its URL (`https://<host>:<port>/<room>/<player_name>`), or from the home screen at `/`: after choosing a player name, they pick a mode or join an existing room by its code (a missing room is created). The creator of a room sets its mode:

- **Solo**: a private room for one player that starts right away.
- **Versus**: one on one; each player sees their own board and the rival's, with the rival's spectrum.
- **Pon-Trix** (bonus): Tetris and Pong at once for exactly two players. Each board has a paddle lane on its outer edge; the ball crosses both boards and the gap between them, bounces on walls, paddles and blocks without breaking them, and a ball that reaches a player's outer wall sends that player one penalty line.

Before the first round of a versus or Pon-Trix room, a panel over the boards shows the room code with buttons to copy the code or the invite link (`/<room>`). Room codes and player names are 4 to 16 letters, digits, `-` or `_`, case-sensitive. At most two players share a room. Everyone in a room receives the **same sequence of pieces**; clearing multiple lines at once sends penalty lines to every opponent, and each player sees the **spectrum** (column heights) of the other fields update live. The first player to join is the host and decides when the game starts and restarts; the last player standing wins.

The codebase follows two deliberately opposed programming styles:

- The **client** is written in functional style — the board and piece logic are pure functions, the `this` keyword is forbidden, and state is managed through a Redux store. No DOM-manipulation library, no Canvas, no SVG: the field is rendered with components and laid out with grid/flexbox.
- The **server** is object-oriented, built at minimum around `Player`, `Piece` and `Game` classes, and communicates with the clients through socket events.

Unit tests run with coverage, and `make test` fails below 70% of statements, functions and lines, or 50% of branches.

## Stack

| Layer | Tools |
| --- | --- |
| Language | TypeScript 7 |
| Client | React 19, Redux Toolkit 2, React Router 8, socket.io-client 4, Vite 8 |
| Server | Node.js 24, Express 5, Socket.IO 4 |
| Tests | Vitest 5 with V8 coverage; jsdom and Testing Library on the client |
| Runtime | Docker Compose |

## Architecture

- The **server is authoritative** and runs the game loop (gravity and player inputs). It owns rooms, players, host, game phase (`waiting`, `running`, `finished`), the shared piece sequence, action validation, penalties, spectrums, eliminations and the winner.
- The **client** renders with React, keeps its state in Redux, captures keyboard input and applies pure board logic; it always reconciles with the state sent by the server.
- **`srcs/shared`** contains the types, constants and socket event contracts used by both sides; `shared/game/` also holds the pure board and piece rules and the Pon-Trix arena geometry, so client and server apply the same logic.
- In production a single container serves `index.html`, `bundle.js` and the Socket.IO endpoint from the same origin.

## Project structure

```text
.
├── Makefile                   # entry point for Docker and npm tasks
├── .env.example
├── certs/                     # generated TLS certificate (git-ignored)
├── docs/
└── srcs/
    ├── compose.yaml           # development stack (hot reload)
    ├── compose.prod.yaml      # production stack (single container)
    ├── shared/                # protocol.ts, types.ts, constants.ts
    │   └── game/              # types, pieces, board, Pon-Trix geometry (pure, no imports)
    ├── server/                # server container
    │   ├── Dockerfile
    │   ├── vitest.config.ts
    │   ├── tests/             # unit and socket integration tests
    │   └── src/
    │       ├── index.ts       # HTTPS + Socket.IO bootstrap, HTTP redirect
    │       ├── http/          # static files and SPA fallback
    │       ├── sockets/       # event handlers
    │       ├── domain/        # Game, Player, Piece
    │       └── rooms/         # RoomManager
    └── client/                # client container (development)
        ├── Dockerfile
        ├── index.html
        ├── vite.config.ts     # build, dev server and test config
        ├── tests/             # unit and component tests
        └── src/
            ├── main.tsx       # React root
            ├── App.tsx        # routes
            ├── index.css      # theme: color variables and background
            ├── layout.css     # layout knobs: sizes, margins, colours and invite placement
            ├── texts.ts       # editable texts of the waiting labels
            ├── app/           # store, reducers, actions, socket middleware
            ├── connection/    # connection slice (socket up or down)
            ├── game/          # game slice (boards and spectrums per player)
            ├── pong/          # Pon-Trix slice (ball and paddles)
            ├── profile/       # profile slice (last player name)
            ├── room/          # room slice, modes and URL helpers
            ├── components/    # board, fields, HUD, arena, overlays, CSS pixel font (CSS Modules)
            └── pages/         # home and game screens
```

## Getting started

Requirements: Docker with Compose 2.24 or later and `openssl`. Node.js 24 or later is only needed to run tasks outside Docker.

```sh
cp .env.example .env   # then set PORT, e.g. PORT=3000
make
```

| Command | Description |
| --- | --- |
| `make` / `make dev` | Development stack in the foreground, with hot reload on both containers; Vite prints the URL when ready |
| `make prod` | Builds and starts the production container in the background and prints its URL |
| `make certs` | Generates the self-signed certificate in `certs/` if missing (run by `dev` and `prod`) |
| `make logs` | Follows the production logs |
| `make down` | Stops both stacks and removes their dependency volumes |
| `make clean` | Stops both stacks and removes their images and volumes |
| `make re` | Rebuilds the development stack from scratch (`down`, `clean`, `dev`) |
| `make install` | Installs the dependencies of both packages locally |
| `make typecheck` | Type-checks both packages |
| `make test` | Runs the tests of both packages with coverage (needs `make install`) |

| Stack | URL |
| --- | --- |
| Development | `https://localhost:<PORT>/` (Vite; proxies `/socket.io` to the server, which is not published) |
| Production | `https://localhost:<PORT>/` |

`/` is the home screen; `/<room>/<player_name>` opens a game directly.

Both stacks are HTTPS only. In production, plain HTTP requests are redirected (`308`) to the same URL over HTTPS; the development port (Vite) rejects them. The certificate is self-signed for `localhost`, so browsers show a warning until it is accepted or `certs/cert.pem` is trusted; any other certificate can replace `certs/cert.pem` and `certs/key.pem`.

Without Docker: `make install` and `make certs`, then `npm --prefix srcs/server run dev` and `npm --prefix srcs/client run dev` in two terminals and open `https://localhost:5173`; the server listens on `PORT` from the root `.env` and the Vite proxy follows it.

After changing dependencies in a `package.json`, run `make dev` again: it rebuilds the images and refreshes the `node_modules` volumes.

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | none | Host port of the app: Vite in development, the server in production. Without Docker: server listening port and Vite proxy target (falls back to `3000` there) |

`.env` and `certs/` are git-ignored and `.env.example` lists every variable. The Docker targets of the `Makefile` fail if `.env` is missing or `PORT` is empty.

## Conventions

- Node.js runs the server TypeScript sources directly, so there is no server build step and `tsc` only type-checks:
  - relative imports include the `.ts` / `.tsx` extension;
  - only erasable syntax: no `enum`, `namespace` or constructor parameter properties;
  - type-only imports use `import type`.
- Client code never uses `this` (except in `Error` subclasses); board and piece logic are pure functions.
- The server domain is object-oriented: `Game`, `Player`, `Piece` and `RoomManager`.
- No DOM-manipulation libraries, Canvas, SVG or `<table>`; layout uses grid and flexbox, and components are styled with CSS Modules.
- No font files or external resources: display text uses a 5x7 bitmap font drawn with CSS `box-shadow` (`PixelText`), the rest the system monospace font.
- `srcs/shared` does not import packages, since it has no dependencies of its own; only `shared/game/` contains logic, as pure functions.
- Socket events reach Redux through `socketMiddleware.ts`, never directly from components: commands and server events are the actions in `app/actions.ts`.
