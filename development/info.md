# Red Tetris — *Bring the best of the JavaScript ecosystem together*

> **Tetris multijugador online** en tiempo real, **full-stack JavaScript**: cliente SPA con **programación funcional** + servidor **Node.js** con **sockets**.

**Ficha:** **TypeScript** (cliente **React** + servidor **Node.js**) · Nota objetivo **125** · **Grupo**

## Reglas DURAS del subject (te tumban si fallan)
- **TypeScript** en cliente y servidor (elegido; TS es superset de JS y aporta tipado). Cliente con **React**.
- **Cliente funcional:** prohibido el keyword **`this`** en el navegador (única excepción: subclases de `Error`). La **lógica de tablero y piezas debe ser funciones puras**. Puedes usar `lodash`/`ramda` o ninguna.
- **Servidor OOP con prototipos:** al menos clases **`Player`, `Piece`, `Game`**. (Ojo: cliente funcional, servidor orientado a objetos — son requisitos opuestos a propósito.)
- **Prohibido:** librerías de manipulación del DOM (jQuery), **Canvas** y **SVG**. No hay que tocar el DOM directamente → framework moderno (React/Vue).
- HTML **sin `<TABLE>`**; layout con **grid/flexbox**.
- **Single Page Application** (carga `index.html` + `bundle.js`, nada más por HTTP).
- Servidor en **Node.js**, comunicación con **socket.io** (HTTP + eventos bidireccionales).
- Gestión de estado con **Redux** (async vía `redux-thunk`/`redux-promise`).
- **Tests:** ≥ **70%** de statements/functions/lines y ≥ **50%** de branches.
- Hay un **boilerplate oficial** (`red_tetris_boilerplate`) que monta server + bundle + tests.
- Secretos en `.env` **gitignored** (exponerlos = fallo).

## El juego
- 7 tetriminós, reglas clásicas de Tetris.
- Al completar varias líneas a la vez, añades **líneas de penalización** a los rivales.
- Cada campo es **10 columnas × 20 filas**. Ves el **nombre y el "spectrum"** (altura de cada columna) de los rivales en tiempo real.
- Partida en una **URL** con formato `http://<host>:<port>/<room>/<player_name>` (usa `BrowserRouter`/`MemoryRouter`).
- El **primer jugador** de una sala es el **host** y decide cuándo empezar/reiniciar (si se va, otro hereda el rol). Una vez iniciada, no entran nuevos hasta la siguiente ronda.
- Todos los de la sala reciben **la misma secuencia de piezas**.
- Cuando uno pierde, los demás siguen; **gana el último en pie**.

## Stack recomendado
- **Cliente:** React + Redux (funcional), bundler Vite/Webpack. Render del tablero con componentes (sin tocar el DOM a mano).
- **Servidor:** Node.js + Express + socket.io. Lógica de salas, piezas y broadcast.
- **Tests:** Jest (+ React Testing Library). El subject puntúa la cobertura.

## Lo que TIENES que aprender
- **Programación funcional en JS:** funciones puras, inmutabilidad, `map/filter/reduce`, evitar efectos secundarios en la lógica de juego.
- **Redux:** store, actions, reducers, estado único e inmutable (encaja perfecto con FP).
- **WebSockets/socket.io:** eventos cliente↔servidor, salas (rooms), broadcast.
- **Arquitectura cliente/servidor:** qué lógica vive en cada lado (el servidor es la autoridad de la partida y la secuencia de piezas; cliente funcional vs servidor OOP).
- **SPA y routing** por `/<room>/<player>` (React Router).
- **Testing** de reducers/lógica pura y de componentes.

## Estructura sugerida
```
.
├── src/
│   ├── client/   { components/, reducers/, actions/, store }
│   └── server/   { index.js, Game.js, Player.js, Piece.js }
├── test/
└── package.json
```

## Por dónde empezar
1. Esqueleto: servidor Node + socket.io, cliente SPA que conecta.
2. Modelo de **Piece/Game/Player** en el servidor (secuencia de piezas compartida).
3. Tablero y caída de piezas en el cliente (estado en Redux, render funcional).
4. Multijugador: salas, host, broadcast de espectros y líneas de penalización.
5. Win condition (último en pie) + tests (subir cobertura).

## Claves de defensa / errores típicos
- Usar `class`/OOP en la lógica del cliente (rompe el requisito funcional).
- Tocar el DOM directamente (suspenso).
- Lógica de juego en el cliente en vez del servidor (hace trampas posible).
- Cobertura de tests insuficiente.

## Enlaces
- Redux: https://redux.js.org/
- socket.io: https://socket.io/docs/
- Boilerplate oficial del subject (referencia): busca "red-tetris boilerplate"
- Repo: https://github.com/ravazque/red-tetris
