import { RECONNECT_GRACE_MS } from '../../../shared/constants.ts';

// One timer per held seat: expire runs unless the player comes back first (cancel).
export class ReconnectGrace {
  public readonly ms: number;
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  public constructor(ms = RECONNECT_GRACE_MS) {
    this.ms = ms;
  }

  public hold(roomId: string, playerId: string, expire: () => void): void {
    const key = `${roomId}/${playerId}`;
    this.cancel(roomId, playerId);
    this.timers.set(key, setTimeout(() => {
      this.timers.delete(key);
      expire();
    }, this.ms));
  }

  public cancel(roomId: string, playerId: string): void {
    const key = `${roomId}/${playerId}`;
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
  }
}
