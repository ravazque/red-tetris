# Red Tetris

## Description

Red Tetris is a **full-stack JavaScript** project: an online multiplayer Tetris played in real time through the browser, built as a Single Page Application with a Node.js server and socket-based networking.

Players join a game through its URL (`https://<host>:<port>/<room>/<player_name>`), or from the home screen at `/`: after choosing a player name, they pick a mode or join an existing room by its code. The home screen asks the server first and opens the game only once the seat is granted: a refused join (room full, game in progress, unknown or closed room, name already taken in that room) stays on the home screen with the reason under the field to change, and a refused game URL brings the player back there the same way. The creator of a room sets its mode:

- **Solo**: a private room for one player that starts right away.
- **Versus**: one on one, two boards of the same size, each with its spectrum strip. Pressing Create opens a panel to pick the rule: **Last standing** (topping out loses, the last player standing wins) or **Best score** (a player who tops out waits; once both are out, the higher score wins).
- **Pon-Trix** (bonus): Tetris and Pong at once for exactly two players. Each board has a paddle lane on its outer edge (W/S); the server simulates the ball, which crosses both boards and the gap between them, bounces on walls, paddles and blocks without breaking them, and a ball that reaches a player's outer wall sends that player one penalty line. The ball speeds up the longer the round lasts (a step every 15 seconds: 2.5 times its starting speed at 2 minutes, up to 4 times at 4 minutes), and the paddles with it (up to twice theirs); a rally that goes on without touching a paddle or scoring makes the ball burst into particles and reappear at the centre, where it waits a moment before the next serve.

While a versus or Pon-Trix room waits for its second player, a panel over the game area shows the room code with buttons to copy the code or the invite link (`/<room>`). A link copied from a page opened on `localhost` uses this computer's address on the local network instead, so it works from another computer. Room codes and player names are 3 to 12 letters, digits, `-` or `_`, case-sensitive. Any other URL is replaced by `/`, showing the invalid room code or name when the link had the shape of a room or game URL; trailing slashes, queries and hashes are dropped from valid ones. At most two players share a room. Everyone in a room receives the **same sequence of pieces**; clearing multiple lines at once sends penalty lines to every opponent, and each player sees the **spectrum** (column heights) of both fields update live. Versus and Pon-Trix need two players: the guest presses Ready, which unlocks the host's Start, and the host starts the round for both; a rematch works the same way with Restart. Pon-Trix always plays the Best score rule. A dropped connection (a reload, a background tab the browser froze, a network cut) keeps the seat for 15 seconds: the round pauses, the rival reads that the player is reconnecting, and the same name coming back takes the seat again. If a player presses Leave or does not come back in time, the room closes: a running round is won by the player left, and nobody can join or come back, nor start or restart; the remaining player goes back to the menu. Solo starts by itself, ends when the stack reaches the top and restarts with a single press.

Beside the boards, a controls panel lists the keys (up rotates, left/right arrows move, down soft-drops, Space hard-drops; W/S move the paddle in Pon-Trix) and a score panel counts points and lines: 100, 300, 500 or 800 for one to four lines cleared at once, plus 10 for every piece placed; moving or dropping pieces pays nothing. Solo also shows the best score kept in the browser; versus and Pon-Trix put both players face to face with a lead bar and a crown next to the player ahead (none on a tie), and Pon-Trix adds the goals each player scored. Both boards are shown in full and update live with every move. Your own board shows a ghost where the falling piece would land; boards flash on line clears and shake when penalty lines arrive. On narrow windows only a compact score bar remains, above the boards.

Red Tetris is made for computers with a keyboard, on screens from HD (1280x720) to 4K. Phones and tablets without a mouse are not supported: they get a "Mobile not supported" notice over a blurred home screen, and an invite link opened there never joins its room.

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
- One `RoomManager` per server holds every room. The lobby handlers validate `room:join` (name format, mode, capacity, duplicate names, missing rooms) and answer with `room:state` to each member or `room:error` to the sender; `room:leave` frees the seat at once and hands the host role over (`host:changed`); a closed connection holds the seat for `RECONNECT_GRACE_MS` (15 s, `isConnected: false`, a running round paused with `game:paused`), and a `room:join` with the same name takes it back (`game:resumed`, every board sent to the new socket). The server logs each connection and room event, with the reason of every disconnect. In a duel the guest's `room:start` (in `waiting`) or `room:restart` (in `finished`) marks it ready, and the host's starts the round (`NOT_READY` before that); solo starts at once. `RoomLifecycle` moves the room to `running` with a new `Game`. When a duel loses a player (Leave, or no reconnection in time), a running round goes to the player left and the room closes (`closed` in `room:state`, joins refused with `ROOM_CLOSED`).
- `Game` holds a round: one `Player` per seat, all drawing from the same seeded 7-bag, and the active `Piece` of each. It applies inputs and gravity ticks through the shared rules and returns domain events (new snapshots, spectrums, penalty lines, eliminations and the end of the round with its winner) for the socket layer to broadcast. `GameRunner` ticks every running room every 800 ms and turns those events into `game:state`, `game:spectrum`, `game:penalty`, `game:player_eliminated` and `game:finished`; the server, not the host, moves the room to `finished`. In Pon-Trix it also runs a `Pong` simulation every 50 ms: `pong:input` moves the sender's paddle, the ball reads both boards as obstacles, every goal counts for the scorer and adds a penalty line to the player who conceded it through `Game` and the room receives `pong:state`.
- The **client** renders with React, keeps its state in Redux, captures keyboard input and applies pure board logic; it always reconciles with the state sent by the server.
- **`srcs/shared`** contains the types, constants and socket event contracts used by both sides; `shared/game/` also holds the pure game rules (board, pieces, seeded piece sequence, gravity, actions, line clears and penalties), the scoring table and the Pon-Trix arena geometry, so client and server apply the same logic.
- In production a single container serves `index.html`, `bundle.js` and the Socket.IO endpoint from the same origin.

## Project structure

```text
.
├── Makefile                   # entry point for Docker and npm tasks
├── .env.example
├── certs/                     # generated TLS certificate (git-ignored)
└── srcs/
    ├── compose.yaml           # development stack (hot reload)
    ├── compose.prod.yaml      # production stack (single container)
    ├── shared/                # protocol.ts, types.ts, constants.ts
    │   └── game/              # types, pieces, board, piece sequence, rules, scoring, Pon-Trix geometry (pure, no imports)
    ├── server/                # server container
    │   ├── Dockerfile
    │   ├── vitest.config.ts
    │   ├── tests/             # unit and socket integration tests
    │   └── src/
    │       ├── index.ts       # HTTPS + Socket.IO bootstrap, HTTP redirect
    │       ├── http/          # static files and SPA fallback
    │       ├── sockets/       # event handlers (lobby, game:input), game loop (GameRunner), reconnection grace, log
    │       ├── domain/        # Game (round and events), Player (seat), Piece (active piece), Pong (Pon-Trix ball and paddles)
    │       └── rooms/         # RoomManager, RoomLifecycle (one Game per running room)
    └── client/                # client container (development)
        ├── Dockerfile
        ├── index.html
        ├── vite.config.ts     # build, dev server and test config
        ├── tests/             # unit and component tests
        └── src/
            ├── main.tsx       # React root
            ├── App.tsx        # routes; touch-only devices get the mobile notice instead
            ├── index.css      # theme: color variables and background
            ├── layout.css     # layout knobs: sizes, margins, colours, side panels and invite placement
            ├── texts.ts       # editable texts: NEXT and waiting labels, controls and score panels, mobile notice
            ├── app/           # store, reducers, actions, socket middleware, touch-only device detection
            ├── connection/    # connection slice (socket up or down)
            ├── game/          # game slice (boards, spectrums and scores per player), lead and best-score helpers
            ├── pong/          # Pon-Trix slice (ball and paddles)
            ├── profile/       # profile slice (last player name)
            ├── room/          # room slice, modes and URL helpers
            ├── components/    # board, fields, HUD, arena, controls and score panels, overlays, CSS pixel font (CSS Modules)
            ├── pages/         # home and game screens
            └── assets/        # favicon (PNG)
```

## Getting started

Requirements: Docker with Compose 2.24 or later and `openssl`. Node.js 24 or later is only needed to run tasks outside Docker.

```sh
cp .env.example .env   # then set PORT, e.g. PORT=4242
make
```

| Command | Description |
| --- | --- |
| `make` / `make dev` | Development stack in the foreground, with hot reload on both containers; Vite prints the URL when ready, and the one for other computers (the container's own network address is left out) |
| `make prod` | Builds and starts the production container in the background and prints its URLs |
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

`/` is the home screen; `/<room>/<player_name>` opens a game directly. Other computers on the same network use `https://<LAN_HOST>:<PORT>/` (printed by `make dev` and `make prod`); the host firewall must allow `PORT`, and networks that isolate their clients block it.

Both stacks are HTTPS only. In production, plain HTTP requests are redirected (`308`) to the same URL over HTTPS; the development port (Vite) rejects them. The certificate is self-signed for `localhost`, so browsers show a warning until it is accepted or `certs/cert.pem` is trusted; any other certificate can replace `certs/cert.pem` and `certs/key.pem`.

Without Docker: `make install` and `make certs`, then `npm --prefix srcs/server run dev` and `npm --prefix srcs/client run dev` in two terminals and open `https://localhost:5173`; the server listens on `PORT` from the root `.env` and the Vite proxy follows it.

After changing dependencies in a `package.json`, run `make dev` again: it rebuilds the images and refreshes the `node_modules` volumes.

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | none | Host port of the app: Vite in development, the server in production. Without Docker: server listening port and Vite proxy target (falls back to `4242` there) |
| `LAN_HOST` | detected | This computer's address on the local network, used by invite links copied from `localhost`. `make dev` and `make prod` detect it on Linux (source address of the default route); set it with `make dev LAN_HOST=<ip>`, or leave it empty to keep the browser's address |

`.env` and `certs/` are git-ignored and `.env.example` lists every variable set in `.env`. The Docker targets of the `Makefile` fail if `.env` is missing or `PORT` is empty.

## Conventions

- Node.js runs the server TypeScript sources directly, so there is no server build step and `tsc` only type-checks:
  - relative imports include the `.ts` / `.tsx` extension;
  - only erasable syntax: no `enum`, `namespace` or constructor parameter properties;
  - type-only imports use `import type`.
- Client code never uses `this` (except in `Error` subclasses); board and piece logic are pure functions.
- The server domain is object-oriented: `Game`, `Player`, `Piece`, `Pong` and `RoomManager`.
- No DOM-manipulation libraries, Canvas, SVG or `<table>`; layout uses grid and flexbox, and components are styled with CSS Modules.
- No font files or external resources: display text uses a 5x7 bitmap font drawn with CSS `box-shadow` (`PixelText`), the rest the system monospace font.
- `srcs/shared` does not import packages, since it has no dependencies of its own; only `shared/game/` contains logic, as pure functions.
- Socket events reach Redux through `socketMiddleware.ts`, never directly from components: commands and server events are the actions in `app/actions.ts`.
