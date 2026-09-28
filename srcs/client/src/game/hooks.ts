import { useAppSelector } from '../app/hooks.ts';

// Latest game:state snapshot and spectrum of one player; undefined until the server sends them.
export const usePlayerGame = (playerId: string | null | undefined) => ({
  snapshot: useAppSelector(({ game }) => (playerId ? game.players[playerId] : undefined)),
  spectrum: useAppSelector(({ game }) => (playerId ? game.spectrums[playerId] : undefined)),
});
