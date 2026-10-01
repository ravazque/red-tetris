export interface Lead {
  readonly leader: 'self' | 'rival' | null;
  readonly margin: number;
  readonly share: number;
}

// Who is ahead, by how much, and your share of both scores in % (the lead bar); a tie, 0 to 0 included, splits it in half.
export const leadOf = (self: number, rival: number): Lead => ({
  leader: self > rival ? 'self' : rival > self ? 'rival' : null,
  margin: Math.abs(self - rival),
  share: self === rival ? 50 : (self / (self + rival)) * 100,
});

// Crown: the one of two players strictly ahead on points; nobody on a tie or without a rival (solo included).
export const crownHolder = (first: string | null | undefined, second: string | null | undefined, scoreOf: (playerId: string) => number) => {
  if (!first || !second) return null;
  const { leader } = leadOf(scoreOf(first), scoreOf(second));
  return leader === 'self' ? first : leader === 'rival' ? second : null;
};
