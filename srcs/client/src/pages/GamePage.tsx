import { useParams } from 'react-router';

// Game screen for /<room>/<player_name>.
export const GamePage = () => {
  const { room, player } = useParams();

  return (
    <main>
      <h1>{room}</h1>
      <p>{player}</p>
    </main>
  );
};
