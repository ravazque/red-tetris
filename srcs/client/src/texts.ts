// Editable label texts; the waiting labels also take their pixel size here (whole px). Positions are in layout.css.
// The pixel font draws A-Z (lowercase shows as uppercase), 0-9 and - _ : . , ! ? ' ( ) / + ← → ↑ ↓; other characters are skipped.
export const NEXT_TEXT = 'Next';

export const WAITING_TEXT = {
  versus: { panel: '... Waiting for a rival ...', panelSize: 4, seat: 'Waiting ...', seatSize: 1.75 },
  pontrix: { panel: '... Waiting for a rival ...', panelSize: 4, seat: 'Waiting ...', seatSize: 1.75 },
};

// Side panels: controls (the paddle row only in Pon-Trix) and score.
export const CONTROLS = [
  { keys: ['↑'], action: 'Rotate' },
  { keys: ['←', '→'], action: 'Move' },
  { keys: ['↓'], action: 'Soft drop' },
  { keys: ['Space'], action: 'Hard drop' },
  { keys: ['W', 'S'], action: 'Paddle', pontrix: true },
];

export const PANEL_TEXT = {
  controls: 'Controls',
  score: 'Score',
  points: 'Points',
  lines: 'Lines',
  best: 'Best',
  goals: 'Goals',
  you: 'You',
  rival: 'Rival',
  tied: 'Tied',
};

// Touch-only devices (phones, tablets without a mouse): shown over the blurred home screen.
export const MOBILE_TEXT = {
  title: 'Touchscreen not supported',
  body: 'Red Tetris is played with a keyboard on a computer screen, from HD to 4K. Open this page on a computer to play.',
};
