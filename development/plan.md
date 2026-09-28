# Red Tetris — Project plan

> Real-time online multiplayer Tetris, **full-stack JavaScript**: functional SPA client + object-oriented **Node.js** server communicating over **sockets**.

**Summary:** TypeScript · React client · Node.js server · team of two (Max, Raúl).

## Subject requirements
- **TypeScript** on client and server (allowed by the subject as a superset of JavaScript). Client built with **React**.
- **Functional client:** the `this` keyword is forbidden in browser code (only exception: `Error` subclasses). **Board and piece logic must be pure functions.** `lodash`/`ramda` optional.
- **Object-oriented server using prototypes:** at least **`Player`, `Piece` and `Game`** classes.
- **Forbidden:** DOM-manipulation libraries (jQuery), **Canvas**, **SVG**. No direct DOM manipulation.
- No `<table>` elements; layout with **grid/flexbox**.
- **Single Page Application:** the server serves `index.html` + `bundle.js` + static assets over HTTP; no other HTML is exchanged.
- **Node.js** server, communication through **socket.io** (HTTP + bidirectional events).
- State managed with **Redux** (async through `redux-thunk` / `redux-promise`).
- **Unit tests:** ≥ **70%** statements/functions/lines and ≥ **50%** branches.
- Official boilerplate (`red_tetris_boilerplate`): **not used**, own scaffolding instead.
- Secrets only in a git-ignored `.env`; never committed.

## Game rules
- 7 tetriminos with the original shapes and rotation rules.
- Clearing `n` lines at once sends `n - 1` indestructible penalty lines to every opponent.
- Each field is **10 columns × 20 rows**. Opponents' **names and spectrums** (height of each column) update in real time.
- Game URL: `http://<host>:<port>/<room>/<player_name>` (`BrowserRouter` / `MemoryRouter`); served as `https://`, `http://` redirects.
- `/` and unknown URLs: home screen that navigates to `/<room>/<player_name>` (see *Client screens*).
- The **first player** in a room is the **host** and starts/restarts the game; if the host leaves, another player takes the role. No new players can join a running game until the next round.
- Every player in a room receives the **same piece sequence** (same pieces, positions and coordinates).
- Pieces fall at constant speed; a piece touching the pile locks on the next frame.
- A player's game ends when a new piece can no longer enter the field.
- Inputs: ←/→ move, ↑ rotate, ↓ soft drop, Space hard drop.
- No scoring; the **last player standing wins**. Solo games and concurrent rooms are supported.

## Stack
| Layer | Choice |
| --- | --- |
| Language | TypeScript 7 |
| Client | React 19 · Redux Toolkit 2 (includes thunk) · React Router 8 (`BrowserRouter`) · socket.io-client 4 · Vite 8 |
| Server | Node.js 24 · Express 5 · Socket.IO 4 |
| Tests | Vitest 5 + V8 coverage (≥70/70/70/50 enforced) · jsdom + Testing Library (client) · socket.io-client (server socket tests) |
| Environment | Docker Compose (dev with hot reload / prod in a single container) |

- Node runs the server TypeScript directly (no build); `tsc` only type-checks.
- Client build → `srcs/client/dist/{index.html, bundle.js}`, served by Express.
- Dev (Docker): Vite listens on `:$PORT` (`DEV_PORT`) and proxies `/socket.io` to the server (`:3000`, not published).
- HTTPS only: self-signed `localhost` certificate in root `certs/` (git-ignored, `make certs`, bind-mounted at `/certs`); server port (prod) redirects plain HTTP (`308`) on the same port; Vite port (dev) rejects it.
- One `package.json` per container (`srcs/server`, `srcs/client`); `srcs/shared` has no dependencies.

## Structure
```
.
├── Makefile
├── .env / .env.example
├── certs/                      # cert.pem · key.pem (generated, git-ignored)
├── docs/README.md
├── development/
└── srcs/
    ├── compose.yaml            # dev: server + client with hot reload
    ├── compose.prod.yaml       # prod: single container
    ├── shared/                 # protocol.ts · types.ts · constants.ts · game/types.ts
    ├── server/
    │   ├── Dockerfile          # targets dev / prod (prod includes the client build)
    │   ├── package.json · tsconfig.json · vitest.config.ts
    │   ├── tests/              # http · sockets · rooms · shared · helpers (socket test server/client)
    │   └── src/
    │       ├── index.ts        # HTTPS + Socket.IO + HTTP redirect on the same port
    │       ├── http/app.ts     # static files + SPA fallback
    │       ├── sockets/        # registerHandlers · lobbyHandlers · gameHandlers
    │       ├── domain/         # Game · Player · Piece
    │       └── rooms/          # RoomManager
    └── client/
        ├── Dockerfile          # dev only (Vite)
        ├── package.json · tsconfig.json · vite.config.ts
        ├── index.html
        ├── tests/              # setup · app · game · room · components · pages · helpers (fromRows, render)
        └── src/
            ├── main.tsx        # Provider + BrowserRouter + App, index.css
            ├── App.tsx         # routes
            ├── index.css       # global styles, color variables
            ├── app/            # store · reducers · actions · hooks · socketMiddleware
            ├── game/           # board · pieces · collision · reducer
            ├── room/           # navigation (names, room ids, paths) · reducer (room slice)
            ├── components/     # Board · Cell · RoomPanel (+ CSS Modules)
            └── pages/          # HomePage · GamePage (+ CSS Modules)
```

- Differences from the original proposal: one package per container under `srcs/` instead of a single root `package.json`/`tsconfig.json`; one `tests/` per package instead of a root `tests/`.

## Conventions
- Relative imports include the `.ts` / `.tsx` extension.
- Erasable syntax only: no `enum`, `namespace` or constructor parameter properties.
- `import type` for type-only imports.
- `shared/`: types, constants and event contracts only; no classes, no domain logic, no package imports.
- Sockets ↔ Redux through `socketMiddleware.ts`, never from components.
- Sockets know nothing about React; React components know nothing about `Game` internals.

## Architecture: authoritative server
Server owns:
- Game loop: gravity tick per room and application of `game:input`; each player receives its state through `game:state`.
- Rooms and players, joins and leaves.
- Current host.
- Game phase: `waiting`, `running`, `finished`.
- Shared piece sequence and piece distribution.
- Action validation.
- Penalties, eliminations and winner.
- Each player's spectrum.

Client owns:
- Rendering with React (no Canvas, no SVG).
- Redux state.
- Keyboard input.
- Pure board and piece logic.
- Rendering of the state received from the server; optional optimistic updates to hide latency.
- Reconciliation with the state sent by the server.

## Socket protocol
Client → server:
```text
room:join
room:start
room:restart
game:input
room:leave
```

`game:input` payload (draft):
```typescript
{
  action: "move_left" | "move_right" | "rotate" | "soft_drop" | "hard_drop",
  sequence: number
}
```

Server → client:
```text
room:state
room:error
game:started
game:state
game:spectrum
game:penalty
game:player_eliminated
game:finished
host:changed
```

Common fields when relevant:
```typescript
{
  roomId: string,
  revision: number,   // discards stale messages, detects desyncs
  playerId: string
}
```

Recipients:
| Event | Recipients |
| --- | --- |
| `room:state` | Each socket of the room separately (carries its own `selfPlayerId`) |
| `room:error` | Sender of the failed command |
| `game:state` | Board owner |
| `game:spectrum` | Room except the board owner |
| `host:changed`, `game:started`, `game:penalty`, `game:player_eliminated`, `game:finished` | Whole room |

Protocol decisions:
- `playerId`: server-generated UUID on join; `socket.id` never leaves the server.
- `roomId` in commands is only checked against the socket's room; mismatch → `UNAUTHORIZED`.
- No acknowledgements: success arrives as the matching state event, failure as `room:error`.
- Pending in `shared/` (Max): remove `STALE_REVISION` and `RoomPlayerSummary.isHost`, type `RoomErrorPayload.event`, add `RoomJoinPayload.solo: boolean`. Added: `MAX_PLAYERS_PER_ROOM = 2` (PR #12), `NAME_PATTERN` (`Raul`).

Room rules (decided 2026-09-28):
| Topic | Rule | Where |
| --- | --- | --- |
| Capacity | `MAX_PLAYERS_PER_ROOM = 2`; third join → `ROOM_FULL` in any phase; running room → `ROOM_RUNNING` first; a lone host can start | `RoomManager.join` (PR #12) |
| Solo | `room:join` with `solo: true` creates a private room: capacity 1, any other join → `ROOM_FULL` (running → `ROOM_RUNNING` first); joining an existing room with `solo: true` is a normal join | client sends `solo` and auto-starts (done); `RoomJoinPayload.solo` + `RoomManager.join` (pending, Max) |
| Names | `NAME_PATTERN = /^[A-Za-z0-9_-]{4,16}$/` (4 to 16 characters) for room and player; failure → `INVALID_ROOM` / `INVALID_PLAYER`; exact duplicate name in the room → `INVALID_PLAYER`; case-sensitive (`Alice` ≠ `alice`, `Room1` ≠ `room1`) | `shared/constants.ts` and client home screen + game URL (done); `RoomManager.join` (pending) |
| End of game | Multiplayer ends when one player remains → winner; last players out on the same tick → `winnerPlayerId: null`; solo ends when its player tops out → `null`; leaving mid-game = elimination; last player leaving deletes the room | `Game` decides, room layer moves the phase to `finished` without a host socket (pending) |
| Host | Only `hostPlayerId`: `RoomMember.isHost` and `RoomPlayerSummary.isHost` removed; client derives `playerId === hostPlayerId` | `RoomManager` + `shared/types.ts` (pending, Max) |
| Alive | Only `Game` (domain `Player`): `RoomMember.isAlive` removed; `RoomPlayerSummary.isAlive` read from `Game`, `true` while `waiting` | handlers + `Game` (pending) |

## Client screens
| URL | Screen |
| --- | --- |
| `/`, unknown URLs | Home: player name + **Play solo** / **Create room** (random 8-character room) / **Join room** (room name field) |
| `/<room>` | Home with the join form and the room filled in (invite link) |
| `/<room>/<player_name>` | Game: board, room panel (phase, players, host badge, winner, Start/Restart for the host, `room:error`), invite link (except solo), Leave |

- Every home action navigates to `/<room>/<player_name>`: reload and shared links work from the URL alone.
- Names checked with `NAME_PATTERN` on the home screen and on the game URL (invalid → back to `/<room>` or `/`).
- Solo flag: router state `{ solo: true }`, sent as `solo` in `room:join`; hides the invite link; `GamePage` sends `startRequested` once the player is host and the room is `waiting` (again after each restart). Lost on reload: the room becomes a normal one.
- Solo, create and join all send `room:join`: the server creates missing rooms, no `room:create`.

## Redux ↔ socket boundary
| Action (`client/src/app/actions.ts`) | Socket event | Client side | Middleware (Max) |
| --- | --- | --- | --- |
| `joinRequested` | → `room:join` | `{ roomId, playerName, solo }`, dispatched by `GamePage` on mount; resets the `room` slice | pending |
| `leaveRequested` | → `room:leave` | dispatched by `GamePage` on unmount (Leave, URL change) | pending |
| `startRequested` | → `room:start` | `RoomPanel` Start (host, `waiting`); `GamePage` in solo rooms | pending |
| `restartRequested` | → `room:restart` | `RoomPanel` Restart (host, `finished`) | pending |
| `roomStateReceived` | ← `room:state` | `room` slice (drops other rooms and older revisions, clears the error) → `RoomPanel` | pending |
| `hostChanged` | ← `host:changed` | `room` slice | pending |
| `roomErrorReceived` | ← `room:error` | `room` slice → `RoomPanel` (`ROOM_FULL`, `ROOM_RUNNING`, `INVALID_*` texts) | pending |
| `gameStarted` | ← `game:started` | `room` slice: phase `running`, winner cleared | pending |
| `gameFinished` | ← `game:finished` | `room` slice: phase `finished` + `winnerPlayerId` → `RoomPanel` | pending |

- `joinRequested` payload: `JoinRequestPayload` (`RoomJoinPayload` + `solo`) until `RoomJoinPayload.solo` exists; the middleware can emit it as is.
- Game actions (`inputRequested`, `gameStateReceived`, spectrum, penalty, elimination): added with their slices.

## Connection flow
1. Browser loads the SPA; `/` shows the home screen, which navigates to `/<room>/<player_name>`.
2. React reads `room` and `player_name` from the URL.
3. Client opens the socket connection.
4. `GamePage` dispatches `joinRequested`; the middleware sends `room:join`.
5. Server validates name, room and game phase.
6. Server replies with the current room state.
7. First player is host (`hostPlayerId` equals its `playerId`).
8. Host sends `room:start`.
9. Server creates or restarts the game and emits `game:started`.
10. During the game, clients send inputs and receive states and spectrums.

## Socket edge cases
- No joins while the game is `running`.
- Host handover is automatic when the host leaves.
- A disconnected player is eliminated or removed depending on the phase.
- Empty rooms are deleted.
- A player cannot act on another room by changing the payload.
- Actions are validated against the `socket.id` bound to the player.
- Penalties only reach active opponents.
- A multiplayer game ends when one player remains, who wins; a solo game ends when its player tops out, with no winner.
- At most 2 players per room: a third join gets `ROOM_FULL` in any phase; a join to a running room gets `ROOM_RUNNING` first.
- A solo room accepts no other player (`ROOM_FULL`).
- All players in a room consume the same piece sequence.
- Events distinguish initial state, regular update and end of game.

## Server classes
| Class | Responsibilities |
| --- | --- |
| `Player` | `id` (= `RoomMember.playerId`), `name`, `isAlive` (only copy), board, active piece, last processed sequence; no socket, no host flag |
| `Piece` | Tetrimino type, rotation, coordinates, movement/transformation methods |
| `Game` | Round players, shared piece sequence (7-bag seeded per room), phase, action application, line detection, penalties, spectrums, winner |
| `RoomManager` | Room map, members (`RoomMember`: `playerId`, `name`, `socketId`; `isHost`/`isAlive` to be removed), host handover, host-only phase transitions, capacity and join rejection, read-only `RoomSnapshot`s, `RoomManagerError` with an `ErrorCode`; server-side `finished` transition and access to each room's `Game` pending |

- `RoomMember` is room/connection metadata (Max); the domain `Player` holds the game state.

- Pure operations (spectrum, line clearing…) should be extracted into standalone functions where possible, even on the server.

## Game contract
- `Game` API for the socket layer: `applyInput(playerId, action, sequence)`, `tick()`, `snapshot(playerId)`, `spectrum(playerId)`, `removePlayer(playerId)`; state changes return domain events.
- The room layer owns one gravity interval per running room and calls `tick()`.
- `game:state` snapshot (owner only, on every change): `{ board, active, next, isAlive, lastSequence }`; opponents only receive `game:spectrum`.
- Rules: SRS rotation states without wall kicks, constant gravity (~800 ms), penalty rows pushing blocks above the top eliminate the player.
- Client Redux: `room` (done), `game` and `opponents` slices plus `client/src/app/actions.ts` (one action per server event and command), imported by `socketMiddleware.ts`.

## Team split
**Max**
- Server Socket.IO layer, `RoomManager`, handler registration and validation.
- Shared protocol.
- Broadcast of states, spectrums and penalties.
- Connection, disconnection and host management.
- Socket integration tests.
- Implementation order:
  1. `shared/protocol.ts` with event names and payloads.
  2. Socket connection isolated from React components.
  3. `RoomManager`.
  4. `room:join`, `room:leave`, `host:changed`.
  5. `room:start` and game phases.
  6. `game:input` with basic validation.
  7. Targeted broadcasts: `socket.emit(...)` (one player), `io.to(roomId).emit(...)` (whole room), `socket.to(roomId).emit(...)` (everyone but the sender).
  8. Reconnection and protocol-level errors.
  9. Tests for every handler and host change.
  10. Redux integration through middleware.

**Raúl**
- `Game`, `Player` and `Piece` classes.
- Pure board rules.
- Reducers and React components.
- Board rendering and controls.

## First functional milestone
- Two browsers connect to the same room.
- Each player receives its identity.
- The first one is host.
- The host can start the game.
- The second player receives the state change.
- A third player, or a second one in a solo room, is rejected (`ROOM_FULL`); a join to a running room is rejected (`ROOM_RUNNING`).
- A solo room starts on its own.
- If the host disconnects, the other player inherits the role.
- A round can be restarted.

## Roadmap
1. ~~Skeleton: Node + socket.io server, SPA client that connects.~~ Done.
2. Server `Piece` / `Game` / `Player` model (shared piece sequence).
3. Client board and falling pieces (Redux state, functional rendering). Empty board rendered.
4. Multiplayer: rooms, host, spectrum and penalty broadcasts. Shared protocol, `RoomManager`, home screen and client `room` slice (start/restart, solo, winner) done; lobby handlers, `solo` on the server and middleware pending.
5. Win condition (last player standing) + tests (coverage).

## Commands
| Command | Action |
| --- | --- |
| `make` / `make dev` | Dev stack in the foreground (`:$PORT`, Vite + proxied server; Vite prints the URL); recreates the `node_modules` volumes |
| `make prod` | Build + prod container in the background (`:$PORT`); prints the URL |
| `make certs` | Self-signed certificate in `certs/` if missing (run by `dev` / `prod`) |
| `make logs` | Prod logs |
| `make down` | Stops both stacks and removes their dependency volumes |
| `make clean` | Stops both stacks and removes their images and volumes |
| `make re` | `down` + `clean` + `dev`: dev stack rebuilt from scratch |
| `make install` | Local `npm install` for server and client |
| `make typecheck` | `tsc` on both packages |
| `make test` | Vitest with coverage on both packages; fails below the thresholds (local, needs `make install`) |

- Dev and prod URL: `https://localhost:$PORT/` (home screen) or `https://localhost:$PORT/<room>/<player>` directly (browser warning until the certificate is accepted).
- Root `.env` (git-ignored) with a non-empty `PORT` (host port) is required: Docker targets fail otherwise (no default port).
- Without Docker: `make certs` first; server listens on `PORT` (fallback `3000`); Vite on `https://localhost:5173`, its proxy reads the same root `.env`.

## Status
| Area | State |
| --- | --- |
| Infrastructure | HTTPS + Socket.IO server (HTTP redirected), SPA fallback (404 for missing assets), Docker dev/prod |
| Shared protocol | Events, phases, actions, error codes, board size, typed payloads (PR #10); `GameStatePayload.state` is `unknown` |
| Shared game types | `shared/game/types.ts`: `PieceType`, `Cell`, `Board`, `Rotation`, `ActivePiece`, `GameState` |
| `RoomManager` | Join/leave, host handover, phase transitions, empty rooms deleted (PR #11), 2-player cap (PR #12, in `Raul`, pending review in `Max`), unit-tested; not wired to handlers |
| Socket handlers | Registration only; lobby/game handlers are stubs |
| Server domain | `Game`, `Player`, `Piece`: comment-only stubs |
| Client | React + Redux + Router, socket through the middleware; home screen (solo / create / join, invite link, `NAME_PATTERN` checks); `GamePage` joins/leaves through actions (with `solo`), auto-starts solo rooms and renders an empty board + `RoomPanel` (Start/Restart for the host, winner); `room` slice follows `room:state`, `host:changed`, `room:error`, `game:started`, `game:finished`; no server answer until the middleware and lobby handlers exist |
| Client game logic | `createBoard`, `Board`/`Cell` components; `pieces`, `collision`, rest of `board`, `game` slice: stubs |
| Tests | Vitest + coverage thresholds in both packages: HTTP app, socket connection, protocol constants, `RoomManager` (+ capacity), store/middleware, `createBoard`, `Board`, navigation helpers, `room` slice, `RoomPanel`, `HomePage`, `GamePage` |

## Open points
- Board logic location: proposal `srcs/shared/game/` (pure functions, no imports) used by both sides; needs the `shared/` types-only rule relaxed. Otherwise duplicated in `client/src/game` and `server/src/domain`.
- `Game` contract above: to confirm by both sides (blocks `game:input` and the `Game` adapter).
- Room rules above: names, server-side `finished` transition and single owners of host/alive state still to implement (Max's files); agree with Max first.
- Restart policy: `room:restart` from `finished` to `waiting` or straight to `running`; restart while `running`.
- Redux ↔ socket boundary above: action names to confirm with Max before the middleware.

## Common pitfalls
- `class`/OOP in client logic breaks the functional requirement.
- Direct DOM manipulation.
- Game logic trusted on the client instead of the server (allows cheating).
- Insufficient test coverage.

## Key concepts
- **Functional programming in JS:** pure functions, immutability, `map/filter/reduce`, no side effects in game logic.
- **Redux:** store, actions, reducers, single immutable state.
- **WebSockets / socket.io:** client↔server events, rooms, broadcast.
- **Client/server architecture:** which logic lives on each side; functional client vs OOP server.
- **SPA and routing** on `/<room>/<player>` (React Router).
- **Testing** of reducers, pure logic and components.

## Links
- Redux: https://redux.js.org/
- Redux Toolkit: https://redux-toolkit.js.org/
- socket.io: https://socket.io/docs/
- React Router: https://reactrouter.com/
- Vite: https://vite.dev/
- Express: https://expressjs.com/
- Subject boilerplate (reference): search "red-tetris boilerplate"
- Repo: https://github.com/ravazque/red-tetris
