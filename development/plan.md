# Red Tetris: project plan

Real-time multiplayer Tetris in the browser: functional React client, object-oriented Node.js server, Socket.IO in between. Team: Max and Raúl. Work is tracked in GitHub issues.

## Subject requirements
- TypeScript on both sides; React + Redux client; Node.js server with Socket.IO.
- Client: no `this` (only in `Error` subclasses); board and piece logic as pure functions.
- Server: object-oriented, at least `Player`, `Piece` and `Game` classes.
- Forbidden: DOM-manipulation libraries, Canvas, SVG in any form, `<table>`. Layout with grid/flexbox.
- SPA: the server only serves `index.html`, `bundle.js` and static assets. Game URL: `/<room>/<player_name>`.
- 10 x 20 fields, same piece sequence for the whole room, clearing n lines sends n - 1 indestructible penalty lines to each opponent.
- Opponents' names and spectrums (height of each column) visible and live.
- First player is host (controls start/restart), host handover, no joins while running, last player standing wins, one-player games, concurrent rooms.
- Unit tests: 70% statements/functions/lines, 50% branches. Secrets only in the git-ignored root `.env`.
- Bonus suggestions: scoring, persistence, new game modes. Ours: Pon-Trix.

## Game modes
| Mode | Players | Start | Screen |
| --- | --- | --- | --- |
| Solo | 1, private | automatic; Restart with one press | one board; controls left, score right (points, lines, best) |
| Versus | exactly 2 | guest presses Ready, then the host presses Start (Restart for a rematch) | two boards of the same size, each with its spectrum strip; controls left, score right; rule picked in a panel on Create |
| Pon-Trix (bonus) | exactly 2 | as versus | face-off arena, a spectrum under each board; paddle keys in the controls, goals in the score |

- The creator sets the mode (`room:join.mode`) and, in versus, the rule (`room:join.rule`): Last standing (default) or Best score; Pon-Trix always plays Best score. Joining an existing room keeps both.
- Home Join: existing rooms only (no `mode`, `ROOM_NOT_FOUND` otherwise). A direct URL joins or creates a versus room.
- Home actions join first and open `/<room>/<player>` only once seated; a refusal stays on `/` (no game screen in between).
- Refused join (`ROOM_FULL`, `ROOM_RUNNING`, `ROOM_NOT_FOUND`, `ROOM_CLOSED`, `INVALID_ROOM`, `INVALID_PLAYER` = name taken): reason under the field to change; from a direct URL, back to `/` with the fields filled in.
- Keys: up rotates, left/right move, down soft drop, Space hard drop; W/S paddle (Pon-Trix).
- Points (`shared/game/scoring.ts`): 100 / 300 / 500 / 800 for 1-4 lines at once, +10 per placed piece; moves and drops pay nothing; constant speed.
- Crown (♛): versus and Pon-Trix, the player ahead on points; nobody on a tie.
- Solo record: best score in `localStorage` (`red-tetris:best`).

## Pon-Trix rules
- Arena in cells (`shared/game/pontrix.ts`): goal, lane (1), board (10), gap (4), board (10), lane (1), goal: 26 x 20.
- Paddle (4 rows) in the outer lane of each board; no pieces enter the lane.
- The ball crosses both boards and the gap, bounces on walls, paddles, blocks and pieces, breaks nothing.
- Ball on a player's outer wall: +1 penalty line for that player, +1 goal for the rival, serve from the centre.
- Tetris as in versus; players in join order, first on the left, no mirroring.
- Server: `Pong` (`domain/Pong.ts`) simulates and broadcasts `pong:state`; the client renders it.
- Paddle input: `pong:input` `{ roomId, direction }`, W -1, S 1, release 0 (also on window blur).
- Fixed 50 ms step; ball 0.225 cells per step, paddle 0.32 (tuning constants in `Pong.ts`).
- Both Tetris snapshots are read-only obstacles: nothing is moved or broken.
- 300 steps with no paddle contact or goal: centre serve again (a full wall cannot freeze the room).
- Board offsets in `Pong.ts` (`LEFT_BOARD_X` 1, `RIGHT_BOARD_X` 15) must follow `PONTRIX_GAP_WIDTH` if the gap changes.

## Stack
| Layer | Choice |
| --- | --- |
| Language | TypeScript 7 |
| Client | React 19, Redux Toolkit 2, React Router 8, socket.io-client 4, Vite 8 |
| Server | Node.js 24, Express 5, Socket.IO 4 |
| Tests | Vitest 5 + V8 coverage; jsdom + Testing Library on the client |
| Runtime | Docker Compose: dev (hot reload, 2 containers), prod (1 container) |

- Node runs the server `.ts` sources directly; `tsc` only type-checks.
- Client build: `srcs/client/dist/{index.html,bundle.js}` plus assets, served by Express.
- HTTPS only (self-signed `localhost` certificate in `certs/`); prod redirects plain HTTP with `308`.
- Other computers on the network: `https://<LAN_HOST>:$PORT/<room>`; the browser warns once (certificate for `localhost`).
- `LAN_HOST`: detected by the Makefile on `dev` / `prod` (Linux, default route source), or `make dev LAN_HOST=<ip>`; Vite (dev) and Express (prod) add it to the page as `<meta name="lan-host">`; invite links copied from a `localhost` page use it, same port.

## Structure
```
.
├── Makefile · .env.example · certs/ (generated)
├── docs/README.md
├── development/                 plan.md, subject PDF, other/ (local notes)
└── srcs/
    ├── compose.yaml · compose.prod.yaml
    ├── shared/                  protocol.ts, types.ts, constants.ts
    │   └── game/                types, pieces, board, sequence, rules, scoring, pontrix (pure)
    ├── server/src/
    │   ├── index.ts             HTTPS + Socket.IO + HTTP redirect
    │   ├── http/app.ts          static files + SPA fallback
    │   ├── sockets/             registerHandlers, lobbyHandlers, gameHandlers, GameRunner, ReconnectGrace, roomState, log
    │   ├── rooms/               RoomManager, RoomLifecycle
    │   └── domain/              Game, Player, Piece, Pong
    └── client/src/
        ├── main.tsx · App.tsx · index.css (theme) · layout.css (layout knobs) · texts.ts (labels)
        ├── app/                 store, reducers, actions, hooks, socketMiddleware, device
        ├── connection/ · game/ · pong/ · profile/ · room/   slices and helpers
        ├── components/          boards, fields, HUD, arena, side panels, invite, overlays, pixel font
        ├── pages/               HomePage, GamePage
        └── assets/              favicon PNGs (red Z piece)
```
- Tests live in `srcs/{server,client}/tests/`; `shared/game` is tested and covered from the client.

## Conventions
- Relative imports with `.ts`/`.tsx`; `import type` for types; erasable syntax only.
- `shared/`: types, constants and event contracts; `shared/game/` also pure functions. No classes, no package imports.
- Socket events reach Redux only through `socketMiddleware.ts`.
- CSS Modules per component; colours from `:root` variables; animations in CSS.
- No external resources or font files: display text with `PixelText`, the rest with system monospace.

## Architecture
- Server is authoritative: rooms, phases, readiness, piece sequence (seeded 7-bag per room), gravity (800 ms), inputs, penalties, spectrums, winner, Pong.
- Client renders the received state, keeps it in Redux, sends keyboard input, draws the ghost piece with the shared rules.
- `HomePage` sends `room:join` and navigates on the seating `room:state` (offline: navigates at once). `GamePage` keeps that seat, joins by itself on direct URLs, leaves one tick after unmount (StrictMode re-runs keep the seat) and joins again when its socket reconnects.
- The server logs one line per connection and room event, with the reason of each disconnect.

## Socket protocol
| Direction | Events |
| --- | --- |
| Client to server | `room:join`, `room:leave`, `room:start`, `room:restart`, `game:input`, `pong:input` |
| Server to client | `room:state`, `room:error`, `host:changed`, `game:started`, `game:state`, `game:spectrum`, `game:penalty`, `game:player_eliminated`, `game:finished`, `game:paused`, `game:resumed`, `pong:state` |

| Event | Recipients |
| --- | --- |
| `room:state` | each member separately (own `selfPlayerId`) |
| `room:error` | sender of the failed command |
| everything else | whole room |

- `playerId`: server UUID; `socket.id` never leaves the server.
- No acknowledgements: success is a state event, failure a `room:error`. Every event carries `roomId` and `revision`; the client drops older revisions.
- `room:state`: phase, mode, rule (`survival` / `score`), host, players (`isAlive`, `isReady`, `isConnected`), `closed` (`{ playerName, reason }` or `null`).
- `game:state`: `GameSnapshot` `{ board, active, next, isAlive, lastSequence, score, lines }`; `pong:state`: `PongState` `{ ball, paddles, goals }`.
- Still local in the client: `GameFinishedPayload.reason` (the server sends it).

## Room rules
| Topic | Rule |
| --- | --- |
| Capacity | solo 1, versus 2, Pon-Trix 2; extra join `ROOM_FULL`; join while running `ROOM_RUNNING` |
| Names | `^[A-Za-z0-9_-]{3,12}$` for room and player, case-sensitive; duplicate player `INVALID_PLAYER` |
| Start | duel: the guest's `room:start` / `room:restart` marks it ready, the host's starts the round (`NOT_READY` before); solo starts at once; the button shows only with every seat taken |
| End | Last standing: top-out loses, the last player standing wins (out in the same tick: draw). Score: a topped-out player waits, once both are out the higher score wins (equal: draw). Solo ends on top-out |
| Disconnect | seat held 15 s (`RECONNECT_GRACE_MS`), round paused; the same name coming back takes the seat |
| Rival leaves | Leave, or no reconnection in time, in a duel: a running round is won by the player left; the room closes in every phase |
| Closed room | no joins (`ROOM_CLOSED`), no Start or Restart; a held seat can still come back; the last player leaving deletes it |
| Host | `hostPlayerId`, handed over when the host leaves |

## Client screens
| URL | Screen |
| --- | --- |
| `/` | home: name, mode cards (Create Versus opens the rule panel), Join by room code |
| `/<room>` | home with the room filled in (invite link) |
| `/<room>/<player>` | game: HUD bar, boards, side panels, invite panel, end-of-round and pause overlays |

- Typed URLs: clean form kept, invalid names back to `/` with the error, impossible paths to `/` (`resolvePath`).
- Invite panel while a duel waits for its second player.
- Boards centred: both side columns as wide as the wider panel; end-of-round card centred on the grid.
- HUD bar of constant height; the round button glows while you can press it (guest Ready, host Start / Restart once the guest is ready).
- Own board: ghost piece. Every board: flash on line clears, tint and shake on penalties (off with reduced motion).
- Keys work while your round runs, you are in and connected.

## End-of-round and pause texts
| Case | Card |
| --- | --- |
| Last standing | You win · `<rival> topped out`; You lose · `<winner> wins`; Draw · Both players topped out at once |
| Best score | You win / You lose · `<yours> to <theirs>`; Draw · Same score: `<n> to <n>` |
| Rival gone | You win · `<rival> left the game` / `did not reconnect in time` |
| Solo | Game over · Your stack reached the top |
| Closed before any round | Room closed · `<rival> left` / `did not reconnect in time` |
| Rival disconnected | pause panel · Waiting for `<rival>` to reconnect, `m:ss` |

- Hints: guest "Press Ready for a rematch" / "Waiting for `<host>` to restart"; host "Waiting for `<guest>` to be ready" / "`<guest>` wants a rematch: press Restart"; solo "Press Restart to play again"; "This room is closed" (with Back to menu).
- HUD: "Waiting for a rival", "Press Ready when you are ready", "Waiting for `<guest>` to be ready", "`<guest>` is ready: press Start", "Waiting for `<host>` to start", "Game running", "Waiting for `<rival>` to finish", "Waiting for `<rival>` to reconnect", "Round over: press Ready for a rematch", "Room closed".

## Visual design (Neon Arcade)
| Item | Value |
| --- | --- |
| Background / surface / line / text | `#0b0620` / `#140c33` / `#2d1b69` / `#f1eaff` |
| Accents | magenta `#ff2e88` (rival, buttons), cyan `#00e5ff` (you), gold `#ffe600` (ball, score), warm gold `#ffbf3a` ("You win") |
| Pieces | I `#00e5ff`, O `#ffe600`, T `#c04bff`, S `#39ff14`, Z `#ff2e63`, J `#3d5afe`, L `#ff8a00`, penalty `#3a2f5c` (striped) |
| Mode colours | Solo cyan, Versus orange, Pon-Trix gold |
| Font | own 5x7 pixel font drawn with CSS (`PixelText`); system monospace for the rest |
| Favicon | red Z piece in the cell style, PNG 32 and 64 px |
| Sizing | everything in `--cell`; the stage is a size container; whole pixels |
| Screens | computers with a keyboard, HD to 4K; touch-only devices get the "Mobile not supported" notice |
| Narrow windows | side panels become a score bar above the boards (48 / 66 / 73rem of stage for solo / versus / Pon-Trix) |

## Tuning files
| File | Holds |
| --- | --- |
| `srcs/client/src/layout.css` | sizes, margins, colours ("You win" card: `--win-tone`), inner space of each end card and panel (`--*-card-pad`, `--rule-panel-pad`, `--invite-*-pad`), invite card size (`--versus-invite-width` / `-height`, same for `--pontrix-*`), gap between versus boards (`--versus-board-gap`, in cells), side panels, HUD height, NEXT box (`--next-*`, `--next-i-fill`), board-to-spectrum gap (`--versus-spectrum-gap`, `--pontrix-spectrum-gap`), one block per mode |
| `srcs/client/src/texts.ts` | NEXT and waiting labels, controls list, panel texts, mobile notice |

## Redux and socket boundary
| Action | Event | Slice |
| --- | --- | --- |
| `joinRequested`, `leaveRequested`, `startRequested`, `restartRequested`, `inputRequested`, `paddleInputRequested` | `room:join`, `room:leave`, `room:start`, `room:restart`, `game:input`, `pong:input` | `room` (join and leave reset) |
| `roomStateReceived`, `hostChanged`, `roomErrorReceived` | `room:state`, `host:changed`, `room:error` | `room` |
| `gameStarted`, `gameFinished`, `gamePaused`, `gameResumed` | `game:started`, `game:finished`, `game:paused`, `game:resumed` | `room` |
| `gameStateReceived`, `spectrumReceived` | `game:state`, `game:spectrum` | `game` (per player, plus board effects) |
| `pongStateReceived` | `pong:state` | `pong` |
| `connectionChanged` | socket `connect` / `disconnect` | `connection` |

## Game contract (server)
- `RoomLifecycle`: guest readiness per room; the host starts one `Game` per round (`createGame({ roomId, playerIds, seed? })`).
- `Game` commands return `GameEvent[]`: `applyInput`, `tick`, `addPenalty` (Pon-Trix goal), `removePlayer(id, 'left' | 'timeout')`; `pause` / `resume`; reads `snapshot`, `spectrum`.
- `Game` takes the room `rule`; events: `penalty`, `state`, `spectrum`, `eliminated`, `finished` (`winnerPlayerId`, `reason`: `topout`, `score`, `left`, `timeout`).
- Rules (`shared/game/rules.ts`): SRS states without wall kicks; a resting piece locks on the next tick, hard drop at once; locking above the top or a blocked spawn tops out; n lines send n - 1 penalty rows; penalty rows are never cleared.
- `GameRunner`: gravity interval per running room, events to socket payloads, pause and resume around a held seat, every board sent to a returning player; Pon-Trix: one `Pong` per round on 50 ms frames, each goal an `addPenalty` for the player who conceded.

## Team and issues
| Issue | Owner | Topic | State |
| --- | --- | --- | --- |
| #15-#22 | Raúl | theme, pieces, modes and home, scenes, Pon-Trix arena, pure rules, `Game` / `Player` / `Piece`, controls | closed |
| #1, #3, #4, #23 | Max | start/restart, lobby, shared types, client middleware | closed |
| #5, #6, #26 | Max (#5, #6 written by Raúl), Max + Raúl | `game:input`, game loop, reconnection and closed rooms | closed, to review with Max |
| #8, #24 | Max | end-to-end room tests (Pon-Trix rematch, concurrent rooms), Pon-Trix server Pong | closed |

## Commands
| Command | Action |
| --- | --- |
| `make` / `make dev` | dev stack in the foreground (`https://localhost:$PORT`; Vite also prints the address for other computers) |
| `make prod` | prod container in the background (prints both addresses) |
| `make down` / `make clean` / `make re` | stop / remove images and volumes / rebuild dev from scratch |
| `make logs` | prod logs |
| `make install` | local `npm install` for both packages |
| `make typecheck` / `make test` | `tsc` / Vitest with coverage thresholds |
| `make certs` | self-signed certificate if missing |

- Root `.env` with a non-empty `PORT` is required for Docker targets.

## Branches
- `main` holds everything up to `e372b4d` (2026-10-01, #24 and #8).

| Step | Command |
| --- | --- |
| Start from the latest `main` | `git checkout main && git pull` |
| New work | `git checkout -b <branch>` |
| Take newer `main` changes | `git fetch origin && git merge origin/main` |
| Share it | `git push origin <branch>`, then a pull request to `main` |

## Status
| Area | State |
| --- | --- |
| Infrastructure | HTTPS + Socket.IO, SPA fallback, Docker dev/prod, tests with coverage |
| Rooms | lobby, readiness, rounds, rematch, reconnection grace, closed rooms |
| Game | shared pure rules, server `Game` / `Player` / `Piece`, game loop, controls, ghost, animations |
| Client | home, HUD, solo / versus / Pon-Trix scenes, side panels, invite, overlays |
| Pending | nothing open: final review |
| Tests | client 328, server 119; coverage above the 70/70/70/50 thresholds |

## Open decisions
- `shared/game/` with pure logic: to confirm with Max.
- Pon-Trix tuning: ball speed, serve direction, paddle speed.
