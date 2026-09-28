import { useParams } from 'react-router';
import { Board } from '../components/Board.tsx';
import { createBoard } from '../game/board.ts';

// Game screen for /<room>/<player_name>; shows an empty board until the game slice exists.
export const GamePage = () => {
  const { room, player } = useParams();

  return (
    <main>
      <h1>{room}</h1>
      <p>{player}</p>
      <Board board={createBoard()} />
    </main>
  );
};
