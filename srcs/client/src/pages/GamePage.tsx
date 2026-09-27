import { useParams } from 'react-router';

// Game screen for /<room>/<player_name>: own board, opponents' names and spectrums, host controls.
export const GamePage = () => {
  const { room, player } = useParams();

  return (
    <main>
      <h1>{room}</h1>
      <p>{player}</p>
    </main>
  );
};
