*This project has been created as part of the 42 curriculum by ravazque and [partner].*

---

## Description

Red Tetris is a **full-stack JavaScript** project: an online multiplayer Tetris played in real time through the browser, built as a Single Page Application with a Node.js server and socket-based networking.

Players join a game through its URL (`http://<host>:<port>/<room>/<player_name>`). Everyone in a room receives the **same sequence of pieces**; clearing multiple lines at once sends penalty lines to every opponent, and each player sees the **spectrum** (column heights) of the other fields update live. The first player to join is the host and decides when the game starts; the last player standing wins.

The subject imposes two deliberately opposed programming styles:

- The **client** is written in functional style — the board and piece logic are pure functions, the `this` keyword is forbidden, and state is managed through a Redux store. No DOM-manipulation library, no Canvas, no SVG: the field is rendered with components and laid out with grid/flexbox.
- The **server** is object-oriented, built at minimum around `Player`, `Piece` and `Game` classes, and communicates with the clients through socket events.

The test suite must cover at least 70% of statements, functions and lines, and 50% of branches.
