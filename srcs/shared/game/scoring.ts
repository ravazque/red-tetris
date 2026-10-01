// Points: line clears by count, plus a little for every piece placed; moving or dropping pieces pays nothing. No levels: constant speed.
// A line takes 2.5 pieces (25 points), so clearing lines stays the main source and a 4-line clear (800) the best move.
export const LINE_CLEAR_POINTS: readonly number[] = [0, 100, 300, 500, 800];
export const PLACE_POINTS = 10;

export const clearPoints = (lines: number) => LINE_CLEAR_POINTS[lines] ?? 0;
