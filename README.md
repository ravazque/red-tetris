# Red Tetris

## 📖 About

"Red Tetris" is a real-time multiplayer Tetris played in the browser, written
in **TypeScript** from end to end: a **React + Redux** single-page client and a
**Node.js** server that talks to it through **Socket.IO**. A game is a URL —
`/<room>/<player_name>` — and everyone in the same room plays against each
other on their own 10×20 field, live.

Three modes share one engine. **Solo** is classic Tetris in a private room.
**Versus** puts two players face to face: both draw the **same sequence of
pieces**, every multi-line clear pushes **penalty lines** into the rival's
field, and each player watches the rival's board and **spectrum** (the height
of every column) move in real time. **Pon-Trix**, the bonus mode, plays Tetris
and Pong at once: a ball crosses both boards, bounces on walls, paddles and
blocks, and every goal sends one penalty line to the player who let it in.

The interesting part is where the game actually runs. The **server is
authoritative**: it owns the rooms, the host, the phase of every round, the
seeded piece sequence, gravity, input validation, penalties, spectrums, the
Pong simulation and the winner. The client only captures the keyboard, sends
commands and draws what the server says. The game rules themselves — board,
pieces, rotation, line clears, penalties, scoring — are **pure functions** in a
shared folder that both sides import, so there is a single definition of what
a legal move is.

The two halves are written in two deliberately opposed styles. The client is
**functional**: no `this`, pure board logic, state in a Redux store. The server
is **object-oriented**: `Game`, `Player`, `Piece`, `Pong` and `RoomManager`
classes. And nothing is drawn on a canvas: no Canvas, no SVG, no `<table>`,
no font files — boards, pieces, the Pong arena, the perspective floor of the
home screen and even the 5×7 pixel font are plain HTML elements laid out with
CSS grid and flexbox.

## 🎯 Objectives

- Running every game on the server and keeping the clients as thin views that
  always reconcile with the state they receive
- Giving every player of a room the same pieces, in the same order, at their
  own pace, from a single seed
- Applying the full Tetris rule set as pure, shared functions: movement,
  rotation, gravity, locking, line clears, penalty lines and top-outs
- Broadcasting boards, spectrums, penalties and results to every player in real
  time, with typed socket contracts shared by both sides
- Handling rooms end to end: hosts, readiness, start and rematch, capacity,
  refused joins, departures, closed rooms and dropped connections
- Simulating a Pong ball that collides with live Tetris boards, server side, at
  20 steps per second
- Rendering the whole game with HTML and CSS only, from HD screens to 4K
- Covering the rules, the server domain, the socket layer and the components
  with unit and integration tests

## 📋 Function Overview

<details>
<summary><strong>Red Tetris</strong></summary>

<br>

| Module | Feature | Description |
|--------|---------|-------------|
| **shared/game** | Board | `createBoard`, `mergePiece`, `collides` (cells above the top count as free), `dropPosition`, `clearLines` (penalty rows are never cleared), `addPenaltyLines` (pushes the stack up and reports an overflow), `spectrum` |
| **shared/game** | Pieces | The seven tetrominoes with their four SRS rotation states, `spawnPiece`, `movePiece`, `rotatePiece`; a rotation that collides is refused (no wall kicks) |
| **shared/game** | Sequence | Seeded 7-bag: bag `n` is a Fisher–Yates shuffle drawn from `(seed, n)`, so `pieceAt(seed, i)` is the same for every player of a room |
| **shared/game** | Rules | `tick`, `applyAction`, `addPenalty`, `eliminate`: a resting piece locks on the next tick, a hard drop locks at once, a lock above the top or a blocked spawn is a top-out |
| **shared/game** | Scoring | 100, 300, 500 or 800 points for one to four lines cleared at once, plus 10 for every piece placed; moving or dropping pays nothing |
| **shared/game** | Pon-Trix geometry | Arena of 26×20 cells (goal, lane, board, gap, board, lane, goal), paddle of 4 cells, ball of 0.6, `movePaddle` clamped to the lane |
| **shared** | Protocol | `SOCKET_EVENTS`, typed `ClientToServerEvents` / `ServerToClientEvents`, payload types, error codes, `NAME_PATTERN`, `MAX_PLAYERS_PER_ROOM`, `RECONNECT_GRACE_MS` |
| **server/domain** | Game | One round: one `Player` per seat on the same seed; applies inputs and gravity ticks, sends penalties, decides eliminations and the winner, and returns domain events for the socket layer |
| **server/domain** | Player | A seat: the pure game state of that player plus the last input sequence, so repeated or late inputs are ignored |
| **server/domain** | Piece | The active piece as a value object: position, rotation and occupied cells |
| **server/domain** | Pong | Pon-Trix simulation: paddles, ball, collisions against both boards, goals, speed steps every 15 s, stalled-rally reset |
| **server/rooms** | RoomManager | Every room of the server: join (name, mode, rule, capacity, duplicates), leave, host handover, held seats while disconnected, closed rooms |
| **server/rooms** | RoomLifecycle | Readiness and the ready-then-start rule, phase changes (`waiting`, `running`, `finished`), one new `Game` per round |
| **server/sockets** | Handlers | `room:join`, `room:leave`, `room:start`, `room:restart`, `game:input`, `pong:input`: payload validation and answers through `room:state` or `room:error` |
| **server/sockets** | GameRunner | One interval per running room: gravity every 800 ms, Pong every 50 ms, every domain event turned into its broadcast |
| **server/sockets** | ReconnectGrace | A dropped socket keeps its seat for 15 s and pauses the round; the same name coming back takes the seat again |
| **server** | HTTP | One port: TLS connections get HTTPS, Socket.IO and the static client, plain HTTP gets a `308` to HTTPS; any page load gets `index.html` |
| **client/app** | Store | Redux Toolkit store with the `room`, `game`, `pong`, `connection` and `profile` slices |
| **client/app** | Socket middleware | The only bridge to the server: command actions become socket emits, server events become actions |
| **client/game** | Controls | Arrows and Space for Tetris, W/S for the paddle; held keys repeat moves and soft drops; enabled only while the player can play |
| **client/pages** | Home | Player name, one card per mode, Join by room code; asks the server first and shows the reason under the field when a join is refused |
| **client/pages** | Game | Layout per mode, HUD bar, side panels, invite panel, pause panel and end-of-round card |
| **client/components** | Board | 200 cells in a CSS grid, ghost piece on your own board, flash on line clears, shake on penalties |
| **client/components** | Panels | Controls (keycaps), score (points, lines, best score in solo; lead bar, crown and goals in duels), spectrum strip |
| **client/components** | Pixel font | `PixelText`: a 5×7 bitmap font, one `box-shadow` per glyph, crisp at any integer size |
| **client/components** | Decoration | `PieceRain` (falling pieces behind every screen) and `HomeFloor` (perspective floor behind the menu) |

<br>

</details>

<details>
<summary><strong>Socket Protocol</strong></summary>

<br>

Commands carry the `roomId`; the server answers with state events, and every
failure comes back as `room:error` with one shape: the event that failed, a
code and a message. Every server payload carries the room `revision`.

| Direction | Event | Payload | Effect |
|-----------|-------|---------|--------|
| client → server | `room:join` | `roomId`, `playerName`, `mode?`, `rule?` | Joins or creates a room; the creator's `mode` and `rule` stick to it |
| client → server | `room:leave` | `roomId` | Frees the seat at once |
| client → server | `room:start` | `roomId` | Guest: marks ready. Host: starts the round once every seat is ready |
| client → server | `room:restart` | `roomId` | Same as start, for a rematch after a finished round |
| client → server | `game:input` | `roomId`, `action`, `sequence` | `move_left`, `move_right`, `rotate`, `soft_drop`, `hard_drop` |
| client → server | `pong:input` | `roomId`, `direction` | `-1` up, `1` down, `0` released |
| server → client | `room:state` | phase, mode, rule, host, players, closure | Sent to every member after each change |
| server → client | `room:error` | `event`, `code`, `message` | Sent to the sender only |
| server → client | `host:changed` | `hostPlayerId` | The host left; the next player takes over |
| server → client | `game:started` | `playerIds` | A round begins |
| server → client | `game:state` | `playerId`, board, active and next piece, score, lines | After every change of a board |
| server → client | `game:spectrum` | `playerId`, ten column heights | After every settled piece or penalty |
| server → client | `game:penalty` | source, target, lines | Lines sent by a clear or a goal |
| server → client | `game:player_eliminated` | `playerId`, reason | A player topped out or left |
| server → client | `game:finished` | `winnerPlayerId`, reason | `topout`, `score`, `left` or `timeout`; no winner on a draw |
| server → client | `game:paused` / `game:resumed` | `playerId`, `graceMs` | A seat is waiting for its player to reconnect |
| server → client | `pong:state` | ball, paddles, goals, serving, vanish | Every Pon-Trix step |

| Error code | When |
|------------|------|
| `INVALID_PAYLOAD` | Missing or malformed fields |
| `INVALID_ROOM` / `INVALID_PLAYER` | A room or player name outside `^[A-Za-z0-9_-]{3,12}$`, or a player name already used in that room |
| `ROOM_NOT_FOUND` | Joining by code a room that does not exist |
| `ROOM_FULL` / `ROOM_RUNNING` / `ROOM_CLOSED` | Two seats taken, a round in progress, or a room closed by a departure |
| `NOT_ENOUGH_PLAYERS` / `NOT_READY` | A duel started alone, or before the guest is ready |
| `UNAUTHORIZED` / `INVALID_PHASE` / `INVALID_ACTION` | A command for another room, at the wrong moment, or an unknown action |
| `INTERNAL_ERROR` | An unexpected failure, reported instead of dropping the connection |

<br>

</details>

<details>
<summary><strong>Usage Example</strong></summary>

### Start the development stack

```bash
$ echo PORT=4242 > .env
$ make
…
  VITE v8.3.1  ready in 199 ms
  ➜  Local:   https://localhost:4242/
  ➜  Other computers: https://192.168.1.20:4242/
```

`https://localhost:4242/` opens the home screen: pick a name, then **Play**
(solo), **Create** (versus or Pon-Trix) or **Join** with a room code. While a
duel waits for its second player, a panel shows the room code with buttons to
copy the code or the invite link. Opening `/<room>/<player_name>` directly
joins or creates that room.

| Key | Action |
|-----|--------|
| `↑` | Rotate |
| `←` `→` | Move |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `W` `S` | Paddle (Pon-Trix) |

### A round over the socket

Three clients on the same room; ids shortened:

```text
alpha → room:join  { roomId: "demo7fab", playerName: "alpha", mode: "versus", rule: "score" }
bravo → room:join  { roomId: "demo7fab", playerName: "bravo" }
alpha ← room:state { "revision":2, "phase":"waiting", "mode":"versus", "rule":"score",
                     "hostPlayerId":"063af051…",
                     "players":[{ "name":"alpha", "isAlive":true, "isReady":false, "isConnected":true },
                                { "name":"bravo", "isAlive":true, "isReady":false, "isConnected":true }],
                     "closed":null }
carol → room:join  { roomId: "demo7fab", playerName: "carol" }
carol ← room:error { "event":"room:join", "code":"ROOM_FULL", "message":"Room is full" }
alpha → room:start
alpha ← room:error { "event":"room:start", "code":"NOT_READY", "message":"Your rival is not ready yet" }
bravo → room:start                                   # the guest is ready
alpha → room:start                                   # the host starts the round
alpha ← game:started { "revision":3, "phase":"running", "playerIds":["063af051…","2e3dd8fd…"] }
alpha ← game:state   { "playerId":"063af051…", "state":{ "active":{ "type":"I", "rotation":0, "x":3, "y":0 },
                       "next":"T", "isAlive":true, "lastSequence":0, "score":0, "lines":0, … } }
carol → room:join  { roomId: "demo7fab", playerName: "carol" }
carol ← room:error { "event":"room:join", "code":"ROOM_RUNNING", … }
bravo → room:leave
alpha ← game:finished { "revision":5, "winnerPlayerId":"063af051…", "reason":"left" }
```

The guest's Start only marks it ready; the host's Start opens the round for
both. Once a round is running nobody else can join, and a player who leaves
hands the round to the one who stays.

### Server log

```text
17:39:33.911 refused room:join 81b92f37 INVALID_PLAYER
17:40:18.879 disconnect N_4cDkPFyUXXpJhEAAAA transport close 81b92f37 ravaz: seat held 15000 ms
17:40:20.157 rejoin 81b92f37 ravaz versus survival
…
18:30:20.039 join ramp0192 alpha pontrix score
18:30:20.043 join ramp0192 bravo pontrix score
18:30:20.354 round ramp0192 alpha vs bravo
18:30:54.377 leave ramp0192 alpha
18:30:54.379 closed ramp0192 alpha left
```

One line per connection and room event, with the reason of every disconnect:
a join refused for a name already taken, a closed socket whose seat was held
and taken back by the same name 1.3 s later, and a Pon-Trix round closed by a
departure.

### Production server

```bash
$ make prod
…
Red Tetris: https://localhost:4242/
Other computers: https://192.168.1.20:4242/
$ curl -sI http://localhost:4242/abc/alpha
HTTP/1.1 308 Permanent Redirect
location: https://localhost:4242/abc/alpha
$ curl -sk https://localhost:4242/abc/alpha | head -3
<!doctype html>
<html lang="en">
  <head>
$ curl -sk -o /dev/null -w '%{http_code}\n' https://localhost:4242/missing.js
404
```

Plain HTTP and HTTPS share the port: the first byte of a connection decides
which server gets it. Page loads always get the single-page app, missing
assets get a real `404`.

### Tests

```bash
$ npm install && npm run coverage
…
 Test Files  16 passed (16)
      Tests  121 passed (121)
File               | % Stmts | % Branch | % Funcs | % Lines |
All files          |   94.52 |    88.22 |   99.37 |   95.43 |      # server
…
 Test Files  35 passed (35)
      Tests  333 passed (333)
All files          |   99.31 |    98.04 |   99.28 |   99.85 |      # client
```

The server suite starts real Socket.IO servers and clients for the lobby,
rounds, reconnection and closed rooms; the client suite covers the shared
rules, the reducers, the middleware, the components and both pages. Both fail
below 70 % of statements, functions and lines, or 50 % of branches. `npm test`
runs the same suites without the report, and `make test` is `npm run coverage`.
Both first install the dependencies of any package that is missing them
(`scripts/ensure-deps.mjs`).

### Full sweep

```bash
make typecheck                                  # tsc on both packages
npm run coverage                                # 454 tests with coverage (make test)
make prod && make logs                          # single container, follow its log
make down                                       # stop both stacks
```

<br>

</details>

## 🚀 Installation & Structure

<details>
<summary><strong>📥 Setup & Usage</strong></summary>

<br>

### Host requirements

| Tool | Needed for | Notes |
|------|------------|-------|
| Docker + Compose ≥ 2.24 | `make dev`, `make prod` | Both stacks run in containers (`node:24-alpine`) |
| `openssl` | `make certs` | Self-signed certificate for `localhost` |
| `make` | Every task | The `Makefile` is the entry point |
| Node.js ≥ 24 | Tasks outside Docker | `npm install`, `npm test`, `npm run coverage`, `make typecheck` |

### Running

```bash
cp .env.example .env          # then set PORT, e.g. PORT=4242
make                          # development stack, hot reload on both containers
```

| Command | Description |
|---------|-------------|
| `make` / `make dev` | Development stack in the foreground; Vite prints the local URL and the one for other computers |
| `make prod` | Builds and starts the production container in the background and prints its URLs |
| `make certs` | Generates the self-signed certificate in `certs/` if missing (run by `dev` and `prod`) |
| `make logs` | Follows the production logs |
| `make down` | Stops both stacks and removes their dependency volumes |
| `make clean` | Stops both stacks and removes their images and volumes |
| `make re` | Rebuilds the development stack from scratch (`down`, `clean`, `dev`) |
| `make install` | Installs the dependencies of both packages locally (`npm install`) |
| `make typecheck` | Type-checks both packages |
| `make test` | Runs both test suites with coverage (`npm run coverage`, installs missing dependencies first) |

Both stacks answer on `https://localhost:<PORT>/`. In development that port is
Vite, which proxies `/socket.io` to the server container (not published); in
production a single container serves the page, the bundle and the socket from
the same origin.

The root `package.json` holds only scripts for both packages:

| Command | Description |
|---------|-------------|
| `npm install` | Installs the dependencies of the server and the client |
| `npm test` | Runs both test suites, installing missing dependencies first |
| `npm run coverage` | Runs both test suites with the coverage report, installing missing dependencies first; fails below the thresholds |

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | none | Host port of the app. The Docker targets fail if `.env` is missing or `PORT` is empty |
| `LAN_HOST` | detected | This computer's address on the local network, used by invite links copied from `localhost`; detected on Linux from the default route, set with `make dev LAN_HOST=<ip>` |

### HTTPS

Both stacks are HTTPS only. The generated certificate is self-signed for
`localhost`, so browsers warn until it is accepted or `certs/cert.pem` is
trusted; any other certificate can replace `certs/cert.pem` and
`certs/key.pem`. Other computers on the same network use
`https://<LAN_HOST>:<PORT>/`, as long as the firewall lets `PORT` through.

### Without Docker

```bash
npm install && make certs
npm --prefix srcs/server run dev              # terminal 1: server on PORT from .env
npm --prefix srcs/client run dev              # terminal 2: Vite on https://localhost:5173
```

<br>

</details>


<details>
<summary><strong>🧱 Architecture Overview</strong></summary>

<br>

### Data flow

```
keyboard ─> useControls ─> inputRequested ─> socketMiddleware ─> game:input
                                                                     │
                     handlers ─> Game.applyInput ─> domain events <──┘
                                                         │
GameRunner (800 ms gravity, 50 ms Pong) ─────────────────┤
                                                         ▼
       game:state · game:spectrum · game:penalty · game:finished · pong:state
                                                         │
              socketMiddleware ─> reducers ─> React components
```

Components never touch the socket. Commands are Redux actions that the
middleware emits; server events are dispatched as actions and reduced into the
`room`, `game` and `pong` slices.

### Rooms and phases

```
waiting ──(every seat ready, host starts)──> running ──(round over)──> finished
   ▲                                                                      │
   └──────────────── solo starts at once ───── restart (ready + host) ────┘
```

A room holds at most two players. The first one is the host; in a duel the
guest's Start marks it ready and only then can the host start (or restart) the
round for both. Solo starts on its own. A name is 3 to 12 letters, digits,
`-` or `_`, case-sensitive, and unique inside its room.

### A round

```
same seed ──> pieceAt(seed, i) ──> player A: I T O S …    each player at their own pace
                                └> player B: I T O S …
```

Each `Player` keeps its own index into the room's sequence. Gravity moves every
active piece down once per tick (800 ms); a piece that cannot fall locks on the
next tick, a hard drop locks at once. Inputs carry a growing `sequence`
number, so a repeated or out-of-order input is ignored.

### Line clears and penalties

```
cleared n lines at once   ──>   n − 1 penalty lines to the rival     (1 → 0, 2 → 1, 3 → 2, 4 → 3)
penalty line              ──>   a full, indestructible row at the bottom; the stack moves up
blocks pushed above the top ──> top-out
```

Points: 100, 300, 500 and 800 for one to four lines, plus 10 for every piece
placed. The spectrum of a field is the height of each of its ten columns; it
is sent after every settled piece and drawn under each duel board.

### End of a round

| Mode | Rule | Ends when | Result |
|------|------|-----------|--------|
| Solo | — | The stack reaches the top | Game over |
| Versus | Last standing | One player is left | The one left wins; both out on the same tick is a draw |
| Versus | Best score | Both players topped out | The higher score wins; a tie is a draw |
| Pon-Trix | Best score | Both players topped out | The higher score wins; a tie is a draw |
| Any duel | — | A player leaves, or does not reconnect in 15 s | The room closes; a running round goes to the player left |

### Reconnection

A dropped socket does not free its seat: the room marks the player as
disconnected, a running round pauses for both (`game:paused`), and the rival
sees who is reconnecting. A `room:join` with the same name within 15 s takes
the seat back with the same player id; the server sends every board again and
resumes the round. A seat that is not reclaimed in time is dropped like a
Leave.

### Pon-Trix

```
x: 0    1            11       15            25    26
   │lane│   board A   │  gap  │   board B   │lane│
goal ◄─┘ paddle A                     paddle B └─► goal
```

The server steps the ball 20 times per second, in four sub-steps each so it
never skips a cell. Settled blocks and falling pieces of both boards are solid
obstacles; the ball bounces off them without breaking them. The farther from
the paddle's centre the ball hits, the steeper it leaves. A ball that reaches
a player's outer wall is a goal: one goal for the scorer, one penalty line for
the player who conceded it.

| Time played | 0:00 | 0:15 | 0:30 | 1:00 | 1:30 | 2:00 | 3:00 | 4:00+ |
|-------------|------|------|------|------|------|------|------|-------|
| Ball | 1x | 1.19x | 1.38x | 1.75x | 2.13x | 2.5x | 3.25x | 4x |
| Paddles | 1x | 1.06x | 1.13x | 1.25x | 1.38x | 1.5x | 1.75x | 2x |

The speed steps up every 15 s of play (pauses excluded): `+0.1875x` per step,
so `2.5x` at two minutes and the `4x` cap at four. A rally that goes 15 s
without touching a paddle or scoring makes the ball burst into particles and
reappear at the centre, where it waits 1.5 s before the next serve.

### Rendering without a canvas

```
field:   10 × 20 cells in a CSS grid, sized by --cell = min(fit height, fit width, cap)
text:    each glyph of the 5 × 7 font is one box-shadow list, scaled by an integer --px
floor:   row i at  H · i / (2.5 + i)  from the bottom      columns rotated by  atan2(j · w, H)
```

The stage is a CSS size container, so every board, panel and label is sized
from the space actually available. The perspective floor of the home screen is
drawn flat: its rows sit where evenly spaced ground lines would project, on
whole pixels, and its columns are rays from the vanishing point, so every line
keeps the same thickness.

### One port, two protocols

```
first byte 0x16 (TLS handshake) ──> HTTPS: static client, SPA fallback, Socket.IO
anything else                   ──> 308 to https://<same host and path>
```

<br>

</details>

<details>
<summary><strong>📁 Project Structure</strong></summary>

<br>

```
red-tetris/
│
├── README.md                             # Main project documentation
├── Makefile                              # Entry point: Docker stacks, certificates, install, typecheck, tests
├── package.json                          # Scripts only: npm install, npm test, npm run coverage for both packages
├── .env.example                          # PORT=, copied to the git-ignored .env
├── .gitignore
├── certs/                                # Generated TLS certificate and key (git-ignored)
│
├── scripts/
│   └── ensure-deps.mjs                   # Installs missing dependencies before npm test and npm run coverage
│
├── docs/
│   └── README.md                         # Condensed project documentation
│
└── srcs/
    ├── compose.yaml                      # Development stack: server + Vite, bind mounts, hot reload
    ├── compose.prod.yaml                 # Production stack: one container
    │
    ├── shared/                           # Imported by both packages, no dependencies
    │   ├── constants.ts                  # Socket event names, phases, modes, rules, actions, error codes, limits
    │   ├── protocol.ts                   # Typed client → server and server → client events
    │   ├── types.ts                      # Payloads
    │   └── game/                         # Pure rules
    │       ├── types.ts                  # Board, cells, pieces, snapshots
    │       ├── pieces.ts                 # Tetrominoes, SRS rotation states, moves
    │       ├── board.ts                  # Collisions, drops, line clears, penalty lines, spectrum
    │       ├── sequence.ts               # Seeded 7-bag
    │       ├── rules.ts                  # Gravity, actions, locking, top-out
    │       ├── scoring.ts                # Points per clear and per piece
    │       └── pontrix.ts                # Arena geometry, Pong state, paddle moves
    │
    ├── server/
    │   ├── Dockerfile                    # dev target, and prod target that also builds the client
    │   ├── vitest.config.ts
    │   ├── src/
    │   │   ├── index.ts                  # One port: HTTPS + Socket.IO, plain HTTP redirected
    │   │   ├── http/app.ts               # Static client, SPA fallback, LAN address injection
    │   │   ├── domain/                   # Game, Player, Piece, Pong
    │   │   ├── rooms/                    # RoomManager, RoomLifecycle
    │   │   └── sockets/                  # Handlers, GameRunner, ReconnectGrace, room state, log
    │   └── tests/                        # Domain, rooms, HTTP and socket integration tests
    │
    └── client/
        ├── Dockerfile                    # Development container (Vite)
        ├── index.html
        ├── vite.config.ts                # Build to dist/{index.html,bundle.js}, dev server, proxy, tests
        ├── src/
        │   ├── main.tsx                  # React root: store, router
        │   ├── App.tsx                   # URL resolution, routes, mobile notice
        │   ├── index.css                 # Theme tokens
        │   ├── layout.css                # Layout and colour knobs per mode
        │   ├── texts.ts                  # Editable labels
        │   ├── app/                      # Store, actions, socket middleware, device detection
        │   ├── room/  game/  pong/       # Slices and helpers
        │   ├── connection/  profile/     # Socket status, last player name
        │   ├── pages/                    # HomePage, GamePage
        │   ├── components/               # Board, fields, HUD, arena, panels, overlays, pixel font, decoration
        │   └── assets/                   # Favicon (PNG)
        └── tests/                        # Shared rules, reducers, middleware, components, pages
```

`srcs/shared` is the contract between the two packages: the server and the
client import the same event names, payload types and game rules, and the
TypeScript compiler checks both sides against them.

<br>

</details>

## 💡 Key Learning Outcomes

- **Server authority**: a client that only sends intentions cannot cheat, and
  every screen converges on the same state
- **Shared deterministic randomness**: one seed and a 7-bag give every player
  the same pieces without sending the sequence
- **Two paradigms, one rule set**: pure functions for the rules, classes for
  the things that live on the server — and both use the same code
- **Typed real-time contracts**: socket events and payloads defined once and
  checked by the compiler on both ends
- **Resilience**: reloads, frozen tabs and network cuts are part of the
  protocol, not crashes — seats are held, rounds pause and resume
- **Layout as a system**: container queries, integer-pixel rounding and CSS
  math are enough to draw a full game at any screen size
- **Testing in layers**: pure rules, domain classes, real socket round trips
  and rendered components, each with its own suite

## ⚙️ Technical Specifications

- **Language**: TypeScript 7 on both sides; the server runs its `.ts` sources
  directly on Node.js, `tsc` only type-checks
- **Client**: React 19, Redux Toolkit 2, React Router 8, socket.io-client 4,
  built with Vite 8 into `index.html` + `bundle.js` (364 kB, 117 kB gzipped)
- **Server**: Node.js 24, Express 5, Socket.IO 4, HTTPS only
- **Runtime**: Docker Compose; one development stack with hot reload, one
  production container
- **Fields**: 10×20, seven tetrominoes with SRS rotation states, seeded 7-bag
  shared by the room
- **Timing**: gravity every 800 ms (constant), Pong at 20 steps per second
- **Rooms**: at most 2 players, room and player names `^[A-Za-z0-9_-]{3,12}$`
  (rooms created from the menu get an 8-character hexadecimal code), many
  rooms at once on one server
- **Reconnection**: a dropped seat is held for 15 s
- **Screens**: computers with a keyboard, from HD (1280×720) to 4K; touch-only
  devices get a notice instead of the game
- **Tests**: Vitest 5 with V8 coverage, 454 tests (121 server, 333 client),
  run with `npm run coverage`; thresholds 70 % statements, functions and lines,
  50 % branches
- **Interface**: `https://<host>:<PORT>/` for the menu,
  `https://<host>:<PORT>/<room>/<player_name>` to open a game directly

---

> [!NOTE]
> Red Tetris is a small online game with a whole real-time system inside: one
> authoritative server, a typed protocol, rules shared by both ends and a
> client that only draws what it is told. Every block on the screen, the pixel
> font included, is an HTML element placed with CSS.
