/**
 * Hourly trigger for the web app's nightly job (GET /api/cron/nightly at minute 30).
 * The bot is the one always-on process, so it owns the clock; the web route decides per user
 * whether it is report or ناخنک time in their timezone. Needs CRON_SECRET (same as the web's).
 */
export const CRON_MINUTE = 30;

/** Milliseconds from `now` until the next hh:30 UTC. The route only looks at each user's local hour, so half-hour zones (Tehran) work too. */
export function msUntilNextRun(now: Date, minute = CRON_MINUTE): number {
  const next = new Date(now);
  next.setUTCSeconds(0, 0);
  next.setUTCMinutes(minute);
  if (next.getTime() <= now.getTime()) next.setUTCHours(next.getUTCHours() + 1);
  return next.getTime() - now.getTime();
}

export function startNightlyCron(opts: { baseUrl: string; secret: string; fetch?: typeof fetch; log?: (msg: string) => void }): () => void {
  const f = opts.fetch ?? fetch;
  const log = opts.log ?? ((m: string) => console.info(m));
  const url = `${opts.baseUrl.replace(/\/$/, "")}/api/cron/nightly`;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function run() {
    try {
      const res = await f(url, { headers: { authorization: `Bearer ${opts.secret}` }, signal: AbortSignal.timeout(310_000) });
      log(`[cron] nightly ${res.status} ${(await res.text()).slice(0, 300)}`);
    } catch (err) {
      log(`[cron] nightly failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function schedule() {
    timer = setTimeout(async () => {
      await run();
      schedule();
    }, msUntilNextRun(new Date()));
  }

  schedule();
  log(`[cron] nightly every hour at :${CRON_MINUTE} → ${url}`);
  return () => clearTimeout(timer);
}
