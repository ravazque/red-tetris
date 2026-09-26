# Red Tetris
## Arquitectura propuesta

```text
.
├── src/
│   ├── client/
│   │   ├── app/
│   │   │   ├── store.ts
│   │   │   ├── reducers.ts
│   │   │   └── socketMiddleware.ts
│   │   ├── components/
│   │   ├── pages/
│   │   ├── game/
│   │   │   ├── board.ts
│   │   │   ├── pieces.ts
│   │   │   ├── collision.ts
│   │   │   └── reducer.ts
│   │   └── main.tsx
│   │
│   ├── server/
│   │   ├── index.ts
│   │   ├── http/
│   │   ├── sockets/
│   │   │   ├── registerHandlers.ts
│   │   │   ├── lobbyHandlers.ts
│   │   │   └── gameHandlers.ts
│   │   ├── domain/
│   │   │   ├── Game.ts
│   │   │   ├── Player.ts
│   │   │   └── Piece.ts
│   │   └── rooms/
│   │       └── RoomManager.ts
│   │
│   └── shared/
│       ├── protocol.ts
│       ├── types.ts
│       └── constants.ts
│
├── tests/
├── package.json
└── tsconfig.json
```

> `shared/` debe contener únicamente tipos, constantes y contratos de eventos. No debe contener clases ni lógica de dominio orientada a objetos.

---

# Decisión principal: servidor autoritativo

El servidor debería ser la autoridad sobre:

- Salas y jugadores.
- Host actual.
- Estado de la partida: `waiting`, `running`, `finished`.
- Secuencia común de piezas.
- Distribución de piezas.
- Validación de acciones.
- Penalizaciones.
- Eliminaciones y ganador.
- Espectro de cada jugador.
- Entrada y salida de jugadores.

El cliente debería encargarse de:

- Renderizar con React, sin Canvas ni SVG.
- Mantener el estado Redux.
- Capturar teclado.
- Aplicar lógica pura de tablero y piezas.
- Mostrar una actualización optimista si se desea reducir latencia.
- Reconciliarse siempre con el estado enviado por el servidor.

Así se respeta la programación funcional del cliente y se evita que un cliente pueda modificar arbitrariamente la partida.

---

# Protocolo inicial de sockets

## Cliente → servidor

```text
room:join
room:start
room:restart
game:input
room:leave
```

### Ejemplo conceptual de `game:input`

```typescript
{
  action: "move_left" | "move_right" | "rotate" | "soft_drop" | "hard_drop",
  sequence: number
}
```

## Servidor → cliente

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

Cada mensaje debería incluir, cuando sea relevante:

```typescript
{
  roomId: string,
  revision: number,
  playerId: string
}
```

La `revision` permite descartar mensajes antiguos o detectar desincronizaciones.

---

# Flujo de conexión

1. El navegador carga la SPA desde `/`.
2. React obtiene `room` y `player_name` de la URL.
3. El cliente abre la conexión socket.
4. Envía `room:join`.
5. El servidor valida nombre, sala y fase de la partida.
6. El servidor responde con el estado actual de la sala.
7. El primer jugador recibe `isHost: true`.
8. El host puede enviar `room:start`.
9. El servidor crea o reinicia la partida y emite `game:started`.
10. Durante la partida, los clientes envían acciones y reciben estados/spectrums.

---

# Puntos delicados de sockets

- Un jugador no puede entrar cuando la partida está en `running`.
- El host debe heredarse automáticamente si abandona.
- El jugador desconectado debe marcarse como eliminado o retirarse según la fase.
- Una sala debe eliminarse cuando quede vacía.
- Un jugador no debe poder actuar en otra sala cambiando solo el payload.
- Las acciones deben validarse contra el `socket.id` asociado al jugador.
- Las penalizaciones deben aplicarse solamente a rivales activos.
- El último jugador activo gana, incluso si la partida era individual.
- Todos los jugadores de una sala deben consumir la misma secuencia de piezas.
- Los eventos deben diferenciar estado inicial, actualización normal y final de partida.

---

# Responsabilidad de las clases del servidor

## `Player`

- `id`
- `name`
- `socketId`
- `isHost`
- `isAlive`
- Estado necesario para la partida.
- Última revisión procesada.

## `Piece`

- Tipo de tetrimino.
- Rotación.
- Coordenadas.
- Métodos de movimiento o transformación.

## `Game`

- Jugadores de la ronda.
- Secuencia común de piezas.
- Estado de partida.
- Aplicación de acciones.
- Detección de líneas.
- Penalizaciones.
- Espectros.
- Ganador.

## `RoomManager`

- Mapa de salas.
- Alta y baja de jugadores.
- Cambio de host.
- Rechazo de nuevas entradas.
- Acceso a la instancia `Game`.

Aunque el servidor use clases, conviene extraer operaciones puras cuando sea posible. Por ejemplo, calcular un espectro o limpiar líneas puede ser una función independiente testeable.

---

# Reparto de tareas

## Responsabilidad de Max

- Capa Socket.IO del servidor.
- `RoomManager`.
- Registro y validación de handlers.
- Protocolo compartido.
- Broadcast de estados, espectros y penalizaciones.
- Gestión de conexión, desconexión y host.
- Tests de integración de sockets.

  ### Orden de implementación

  1. Definir `shared/protocol.ts` con nombres y payloads de eventos.
  2. Crear una conexión socket aislada del componente React.
  3. Implementar `RoomManager`.
  4. Implementar `room:join`, `room:leave` y `host:changed`.
  5. Implementar `room:start` y las fases de partida.
  6. Implementar `game:input` con validación básica.
  7. Implementar broadcasts dirigidos:
  
    - `socket.emit(...)` para responder a un jugador.
    - `io.to(roomId).emit(...)` para toda la sala.
    - `socket.to(roomId).emit(...)` para todos excepto el emisor.
  
  8. Añadir reconexión y errores protocolizados.
  9. Añadir tests de cada handler y de los cambios de host.
  10. Integrar los eventos con Redux mediante middleware, no directamente desde cada componente.

## Responsabilidad de Raúl

- Clases `Game`, `Player` y `Piece`.
- Reglas puras del tablero.
- Reducers y componentes React.
- Render del tablero y controles.

La frontera debe ser explícita:

- Los sockets no deberían conocer detalles de React.
- Los componentes React no deberían conocer directamente la implementación interna de `Game`.

---

# Primer objetivo funcional

Antes de implementar todo Tetris, lo siguiente tiene que estár perfecto:

- Dos navegadores se conectan a la misma sala.
- Cada jugador recibe su identidad.
- El primero es host.
- El host puede iniciar.
- El segundo recibe el cambio de estado.
- Se rechaza un tercer jugador después de iniciar.
- Si el host se desconecta, el otro hereda el rol.
- Se puede reiniciar una ronda.

Cuando esto funcione, la capa de sockets estará bien asentada para añadir piezas, espectros, penalizaciones y posteriormente la modalidad bonus sin rehacer la arquitectura.
