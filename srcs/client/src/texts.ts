// Editable label texts; the waiting labels also take their pixel size here (whole px). Positions are in layout.css.
// The pixel font draws A-Z (lowercase shows as uppercase), 0-9 and - _ : . , ! ? ' ( ) /; other characters are skipped.
export const NEXT_TEXT = 'Next';

export const WAITING_TEXT = {
  versus: { panel: 'Waiting for a rival ...', panelSize: 3, seat: 'Waiting ...', seatSize: 2 },
  pontrix: { panel: 'Waiting for a rival ...', panelSize: 3, seat: 'Waiting ...', seatSize: 1.75 },
};
