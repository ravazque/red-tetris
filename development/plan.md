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
- First player is host (start/restart), host handover, no joins while running, last player standing wins, solo games, concurrent rooms.
- Unit tests: 70% statements/functions/lines, 50% branches. Secrets only in the git-ignored root `.env`.
- Bonus suggestions: scoring, persistence, new game modes. Ours: Pon-Trix.

## Game modes
| Mode | Players | Start | Screen |
| --- | --- | --- | --- |
| Solo | 1, private room | automatic | one board |
| Versus | 1 or 2 | host (can start alone) | own board on the left, rival at 85 % on the right (full board + spectrum), vertically centred |
| Pon-Trix (bonus) | exactly 2 | host, once there are 2 players | face-off arena |

- The creator sets the mode (`room:join.mode`); joining an existing room keeps its mode.
- Home Join: only existing rooms (`room:join` without `mode`, `ROOM_NOT_FOUND` otherwise; #3, #4). Today the client still sends `versus`, so a missing room is created. A direct URL always creates the room.
- Keys: left/right move, up rotates, down soft drop, Space hard drop; Pon-Trix paddle with W/S.

## Pon-Trix rules
- Arena in cells (`shared/game/pontrix.ts`): goal, lane (1), board (10), gap (4), board (10), lane (1), goal: 26 x 20.
- Lane: paddle column on the outer edge of each board; no pieces enter it. Paddle: 4 rows.
- The ball crosses both boards and the gap; the inner side of each board does not stop it.
- It bounces on the top and bottom walls, paddles, settled blocks and active pieces; it breaks nothing.
- Ball reaching a player's outer wall (goal): +1 penalty line for that player, serve from the centre.
- Tetris rules as in Versus; the game ends with the last player standing.
- Players in join order, first on the left; no mirroring (the ball uses absolute coordinates).
- Server simulates and broadcasts `pong:state` (#24); the client renders it (#19).
- Paddle input: W -1, S 1, release 0 (`PaddleDirection`); moves with `movePaddle`, clamped by `clampPaddleY` (centre 2 to 18).

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

## Structure
```
.
├── Makefile · .env.example · certs/ (generated)
├── docs/README.md
├── development/                 plan.md, subject PDF, other/ (local notes)
└── srcs/
    ├── compose.yaml · compose.prod.yaml
    ├── shared/                  protocol.ts, types.ts, constants.ts (Max)
    │   └── game/                types, pieces, board, pontrix (pure, no imports)
    ├── server/src/
    │   ├── index.ts             HTTPS + Socket.IO + HTTP redirect
    │   ├── http/app.ts          static files + SPA fallback
    │   ├── sockets/             registerHandlers, lobbyHandlers, gameHandlers
    │   ├── rooms/RoomManager.ts
    │   └── domain/              Game, Player, Piece
    └── client/src/
        ├── main.tsx · App.tsx · index.css (theme) · layout.css (layout knobs) · texts.ts (waiting labels)
        ├── app/                 store, reducers, actions, hooks, socketMiddleware
        ├── connection/          connection slice (socket up or down)
        ├── game/                game slice, usePlayerGame
        ├── pong/                pong slice
        ├── profile/             profile slice (last player name)
        ├── room/                room slice, modes, navigation
        ├── components/          Board, Cell, PiecePreview, Spectrum, FieldHeader, PlayerField, PongArena,
        │                        RoomPanel (HUD bar), InviteLink, InviteLobby, GameOver, PausePanel, PieceRain,
        │                        PixelText + pixelFont (CSS font)
        └── pages/               HomePage, GamePage
```
- Tests live in `srcs/{server,client}/tests/`, mirroring `src/`; `shared/game` is tested and covered from the client.

## Conventions
- Relative imports with `.ts`/`.tsx`; `import type` for types; erasable syntax only (no `enum`, `namespace`, constructor parameter properties).
- `shared/`: types, constants and event contracts; `shared/game/` may also hold pure functions. No classes, no package imports.
- Socket events reach Redux only through `socketMiddleware.ts`; components dispatch actions from `app/actions.ts`.
- CSS Modules per component; colors from the variables in `index.css`; animations in CSS, toggled by state.
- No external resources or font files: display text with `PixelText`, the rest with system monospace. Images, if ever needed, only PNG/WebP in `client/src/assets/`; icons with CSS or Unicode.

## Architecture
- Server is authoritative: rooms, host, phase, piece sequence (seeded 7-bag per room), gravity tick (~800 ms), input validation, penalties, spectrums, eliminations, winner, Pong simulation.
- Client renders the received state with React, keeps it in Redux, sends keyboard input and uses the shared pure rules (active piece, ghost, previews).
- Connection: the home screen navigates to `/<room>/<player>`; `GamePage` dispatches `joinRequested` on mount and `leaveRequested` on unmount; everything else arrives as events.

## Socket protocol
| Direction | Events |
| --- | --- |
| Client to server | `room:join`, `room:leave`, `room:start`, `room:restart`, `game:input` |
| Server to client | `room:state`, `room:error`, `host:changed`, `game:started`, `game:state`, `game:spectrum`, `game:penalty`, `game:player_eliminated`, `game:finished`, `pong:state` |

| Event | Recipients |
| --- | --- |
| `room:state` | each socket separately (carries its own `selfPlayerId`) |
| `room:error` | sender of the failed command |
| `game:state` | whole room (full boards are shown to the rival) |
| `game:spectrum` | whole room except the board owner |
| `host:changed`, `game:started`, `game:penalty`, `game:player_eliminated`, `game:finished`, `pong:state` | whole room |

- `playerId`: server-generated UUID; `socket.id` never leaves the server. `roomId` in commands is only checked against the socket's room (`UNAUTHORIZED` on mismatch).
- No acknowledgements: success arrives as a state event, failure as `room:error`. Every event carries `roomId` and `revision`; the client drops older revisions.
- `game:state` snapshot: `GameSnapshot` = `{ board, active, next, isAlive, lastSequence }` (`shared/game/types.ts`).
- #4 merged in `main` (PR #25): modes, typed snapshot, `pong:state`, `ROOM_NOT_FOUND`, `NOT_ENOUGH_PLAYERS`, no `isHost` in summaries. Integrated in `ravazque`; no local extensions left for it.
- Pending in `shared/` (#26): `RECONNECT_GRACE_MS`, `game:paused`, `game:resumed`, `GameFinishedPayload.reason`, paddle input (#24). Local extensions in `app/actions.ts` meanwhile.

## Room rules
| Topic | Rule |
| --- | --- |
| Capacity | solo 1, versus 2, pontrix 2; extra join: `ROOM_FULL`; join while running: `ROOM_RUNNING` first |
| Missing room | join with `mode` (cards, direct URL) creates it; join without `mode` (home Join): `ROOM_NOT_FOUND` |
| Start | host only; Pon-Trix needs 2 players (`NOT_ENOUGH_PLAYERS`) |
| Names | `NAME_PATTERN` = `^[A-Za-z0-9_-]{4,16}$` for room and player, case-sensitive; bad room: `INVALID_ROOM`; bad or duplicate player: `INVALID_PLAYER` |
| End | multiplayer ends with one player left (winner); same-tick eliminations: `winnerPlayerId: null`; solo ends on top-out with no winner; Leave = immediate elimination; the server moves the room to `finished` |
| Disconnect (proposal, #26) | seat kept 15 s with the room frozen; same room and name takes it back; timeout = elimination |
| Host | only `hostPlayerId`; the client derives it |
| Alive | only in `Game` (domain `Player`) |
| Reload | router state is lost: the page joins again as `versus` (creates the room if it is gone) |

## Client screens
| URL | Screen |
| --- | --- |
| `/`, unknown URLs | Home: name, mode cards, Join by room code |
| `/<room>` | Home with the room filled in (invite link) |
| `/<room>/<player>` | Game: HUD bar, boards by mode, invite panel, Game over and pause overlays |
| Invalid `/<room>/<player>` | Home with both values filled in and the error shown |

- Home keeps the name after leaving a room; Enter in the name field does nothing.
- Invite: only while a seat is free and before the first round; never again after a start.
- Invite panel over both boards (`boards`) or the free rival board (`rival`); phones: always both.
- A versus started alone is laid out as solo.

## Visual design (Neon Arcade)
| Item | Value |
| --- | --- |
| Background / surface / line / text | `#0b0620` / `#140c33` / `#2d1b69` / `#f1eaff` |
| Accents | magenta `#ff2e88` (rival, buttons), cyan `#00e5ff` (you), gold `#ffe600` (host, win, ball) |
| Pieces | I `#00e5ff`, O `#ffe600`, T `#c04bff`, S `#39ff14`, Z `#ff2e63`, J `#3d5afe`, L `#ff8a00`, penalty `#3a2f5c` (striped) |
| Mode colours | Solo cyan, Versus orange, Pon-Trix gold (home cards, HUD tag) |
| Invite | violet frame, white code, light violet copy buttons, darker violet when copied |
| Pause | light grey veil and card, countdown `m:ss` |
| Background | radial glow; random falling pieces on every screen; perspective floor only on home |
| Font | own 5x7 pixel font drawn with CSS (`PixelText`); system monospace for the rest |
| Colour rule | only `:root` variables; translucency with `color-mix` |
| Sizing | everything in `--cell`; the stage is a size container; whole pixels |
| NEXT box | square in the field's colour; any piece scales to fit; both Pon-Trix boxes at the same height |
| Pon-Trix | wide screens: names, NEXT and spectrum beside the arena; gap tinted per side, gold centre line |
| Responsive | no horizontal scroll from 360 px; HUD in two rows under 40rem; home cards centred |

## Tuning files
| File | Holds |
| --- | --- |
| `srcs/client/src/layout.css` | sizes, margins, colours, panel and label placement, one block per mode |
| `srcs/client/src/texts.ts` | texts of the NEXT and waiting labels; pixel size of the waiting labels |

| Knobs | Control |
| --- | --- |
| `--next-*` | NEXT box side, piece fill, label gap / size / offset |
| `--mode-*` | mode colours |
| `--solo-*` | cell max, bottom margin |
| `--versus-*` | cell max, bottom margin, rival size and height, invite panel (place, size, offset, opacity), card width, waiting label positions |
| `--pontrix-*` | as versus, plus the side column width |
| `--invite-*` | card colours, copied fill, code size |
| `--rain-opacity` | falling pieces |

## Redux and socket boundary
| Action (`app/actions.ts`) | Event | Slice |
| --- | --- | --- |
| `joinRequested` `RoomJoinPayload` `{ roomId, playerName, mode? }` (the client always sends a mode until #3) | `room:join` | resets `room`, `game`, `pong`; `profile` keeps `playerName` |
| `leaveRequested`, `startRequested`, `restartRequested` | `room:leave`, `room:start`, `room:restart` | `room` (leave resets) |
| `roomStateReceived`, `hostChanged`, `roomErrorReceived` | `room:state`, `host:changed`, `room:error` | `room` |
| `gameStarted`, `gameFinished` | `game:started`, `game:finished` | `room` (phase, winner, `finishReason`); start resets `game`, `pong` and the pause |
| `gamePaused`, `gameResumed` (#26) | `game:paused`, `game:resumed` | `room.pause` `{ playerId, graceMs, revision }` |
| `connectionChanged` (#26) | socket `disconnect` / `connect` | `connection.online` |
| `gameStateReceived`, `spectrumReceived` | `game:state`, `game:spectrum` | `game` (per `playerId`) |
| `pongStateReceived` | `pong:state` | `pong` |
| `inputRequested` (#22) | `game:input` | none |

- The middleware (#23) maps both directions; nothing else touches the socket.

## Game contract (server)
- `Game` API for the socket layer: `applyInput(playerId, action, sequence)`, `tick()`, `snapshot(playerId)`, `spectrum(playerId)`, `removePlayer(playerId)`; state changes return domain events.
- The room layer owns one gravity interval per running room and calls `tick()`.
- Rules: SRS rotation states without wall kicks, constant gravity, a piece locks on the tick after touching the pile, penalty rows pushing blocks above the top eliminate the player.
- Pon-Trix entry point: add one penalty line to a player (goal).
- Reconnection (#26): pause and resume (no ticks or inputs while paused); domain events carry the end reason (`topout`, `left`, `timeout`).

## End-of-round and pause texts
| Case | Title | Detail |
| --- | --- | --- |
| Win, rival topped out | You win | `<rival> topped out` |
| Win, rival pressed Leave | You win | `<rival> left the game` |
| Win, grace expired | You win | `<rival> did not reconnect in time` |
| Lose | You lose | `<winner> wins` |
| Same-tick eliminations | Draw | Both players topped out at once |
| Solo or alone | Game over | Your stack reached the top |
| Rival disconnected | Paused | `Waiting for <rival> to reconnect`, countdown `m:ss`, "The game resumes as soon as they are back" |
| Own socket down | Connection lost | Reconnecting…, "Your seat is kept for a few seconds" |
- Missing names fall back to "Your rival". Host hint: "Press Restart to play again"; others: "Waiting for the host to restart".

## Team and issues
| Issue | Owner | Topic | Depends on |
| --- | --- | --- | --- |
| #3 | Max | lobby and disconnect handlers | |
| #1 | Max | start/restart lifecycle | #3 |
| #4 | Max | shared transport types (modes, snapshot, errors), merged in `main` (PR #25) | |
| #5 | Max | validated `game:input` | #3, #1, #21 |
| #6 | Max | networking with `Game`, broadcasts | #3, #5, #21 (fake `Game` meanwhile) |
| #8 | Max | end-to-end room tests | #3, #1, #5, #6 |
| #23 | Max | client socket middleware | #3 |
| #24 | Max | Pon-Trix server Pong (bonus) | #19, #21, #1, #6; after #8 |
| #26 | Max + Raúl | reconnection grace and paused games | #3, #6, #21, #23; #24 for Pon-Trix |
| #15 | Raúl | Neon Arcade theme | |
| #16 | Raúl | pieces and board helpers in `shared/game` | |
| #17 | Raúl | room modes and home screen | |
| #18 | Raúl | game scenes with both boards | |
| #19 | Raúl | Pon-Trix arena scene | |
| #20 | Raúl | pure Tetris rules in `shared/game` | #16 |
| #21 | Raúl | server `Game`, `Player`, `Piece` | #20 |
| #22 | Raúl | controls and gameplay rendering | #18, #20, #23 |

- Order: mandatory first (#3, #1, #4, #23, #20, #21, #5, #6, #22, #8), then the bonus (#24).

## Commands
| Command | Action |
| --- | --- |
| `make` / `make dev` | dev stack in the foreground (`https://localhost:$PORT`) |
| `make prod` | prod container in the background |
| `make down` / `make clean` / `make re` | stop / remove images and volumes / rebuild dev from scratch |
| `make logs` | prod logs |
| `make install` | local `npm install` for both packages |
| `make typecheck` / `make test` | `tsc` / Vitest with coverage thresholds |
| `make certs` | self-signed certificate if missing |

- Root `.env` with a non-empty `PORT` is required for Docker targets.

## Syncing `ravazque` with `main`
| Step | Command |
| --- | --- |
| 1. Commit and push the branch | `git add -A && git commit && git push origin ravazque` |
| 2. Check what `main` has that the branch lacks | `git fetch origin && git log --oneline HEAD..origin/main` |
| 3. Record `main` as merged, keeping the branch files | `git merge -s ours origin/main -m "Merge main into ravazque"` |
| 4. Push; the pull request to `main` is then conflict-free | `git push origin ravazque` |
- Step 3 is safe only if step 2 lists just PR #25 (`ac2c572`, `2c6a04b`): the branch already holds all of it. Anything newer: plain `git merge origin/main` instead.

## Status
| Area | State |
| --- | --- |
| Infrastructure | HTTPS + Socket.IO server, SPA fallback, Docker dev/prod, tests with coverage |
| Shared protocol | events, phases, actions, errors, payloads, modes (#4, PR #25 in `main`); reconnection items pending (#26) |
| `RoomManager` | join/leave, host handover, phases, 2-player cap, unit-tested; not wired to handlers (#3) |
| Socket handlers, middleware | stubs (#3, #1, #5, #6, #23) |
| `shared/game` | types, 7 pieces with SRS states, `createBoard`, `mergePiece`, Pon-Trix geometry, `clampPaddleY`, `movePaddle` |
| Client | home, HUD, solo / versus / Pon-Trix scenes, invite panel, Game over, pause panel, tuning files; waits for the server |
| Tests | client 152, server 25; coverage above the 70/70/70/50 thresholds (enforced in both Vitest configs) |
| Server domain | `Game`, `Player`, `Piece` stubs (#21) |

## Open decisions
- Restart policy: `room:restart` goes from `finished` to `waiting` or straight to `running` (#1).
- `shared/game/` with pure logic: to confirm with Max (#4 merged a minimal `pontrix.ts`; `ravazque` keeps the geometry and paddle helpers).
- Reconnection grace length and Leave without grace (#26).
- Pon-Trix tuning: ball speed, serve direction, paddle speed (#24).
- Home Join limited to existing rooms: server side in #3/#4, then the client stops sending `mode` from Join (#17).
