import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { createRoomId, isValidName, roomPath, type RoomLocationState } from '../room/navigation.ts';
import styles from './HomePage.module.css';

const NAME_HINT = '4 to 16 letters, digits, - or _';

// Entry screen for /, /<room> (invite link: join form prefilled) and unknown URLs; every action ends on /<room>/<player>.
export const HomePage = () => {
  const { room: invitedRoom = '' } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState('');
  const [room, setRoom] = useState(invitedRoom);
  const [joining, setJoining] = useState(invitedRoom !== '');
  const [attempted, setAttempted] = useState(false);

  const enter = (roomId: string, state: RoomLocationState) => {
    setAttempted(true);
    if (isValidName(player) && isValidName(roomId)) navigate(roomPath(roomId, player), { state });
  };

  const showJoin = (value: boolean) => {
    setJoining(value);
    setAttempted(false);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (joining) enter(room, { solo: false });
  };

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Red Tetris</h1>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <label className={styles.field}>
          Player name
          <input value={player} onChange={(event) => setPlayer(event.target.value)} autoFocus />
        </label>
        {attempted && !isValidName(player) && (
          <p role="alert" className={styles.error}>Player name: {NAME_HINT}</p>
        )}
        {joining ? (
          <>
            <label className={styles.field}>
              Room
              <input value={room} onChange={(event) => setRoom(event.target.value)} />
            </label>
            {attempted && !isValidName(room) && (
              <p role="alert" className={styles.error}>Room: {NAME_HINT}</p>
            )}
            <button type="submit">Join</button>
            <button type="button" onClick={() => showJoin(false)}>Back</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => enter(createRoomId(), { solo: true })}>Play solo</button>
            <button type="button" onClick={() => enter(createRoomId(), { solo: false })}>Create room</button>
            <button type="button" onClick={() => showJoin(true)}>Join room</button>
          </>
        )}
      </form>
    </main>
  );
};
