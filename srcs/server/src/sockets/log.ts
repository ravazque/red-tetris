// One line per connection and room event (docker logs, the dev terminal); silent under Vitest.
export const log = (...parts: unknown[]) => {
  if (process.env.VITEST) return;
  console.log(new Date().toISOString().slice(11, 23), ...parts);
};
