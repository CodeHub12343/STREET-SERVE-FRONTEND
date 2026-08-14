/**
 * Removes stale service-worker build artifacts before `next dev`.
 *
 * ## The failure this prevents
 *
 * `next.config.mjs` sets `swDest: 'public/sw.js'` and `disable: pwaDisabled`. Disabling stops
 * Serwist *generating* a worker in development — it does nothing about one a previous
 * `npm run build` already wrote. Next serves everything in `public/` statically, so the stale file
 * keeps being served at `/sw.js`, and any browser that registered it during that earlier build goes
 * on being controlled by it.
 *
 * A service worker precaches hashed JS chunks. Once it is controlling the page it will happily
 * serve chunks from the build it was generated against, days after the source moved on. The symptom
 * is a runtime error that makes no sense against the code in front of you — a module export that
 * demonstrably exists reading as `undefined`, because the browser is executing an older bundle:
 *
 *     TypeError: keys.mapHubs is not a function
 *
 * That is exactly what happened on 2026-08-10: a worker built on 08-08 was serving chunks that
 * predated `keys.mapHubs` being added on 08-09. The dev server was compiling the right code the
 * whole time.
 *
 * Deleting the artifact makes `/sw.js` 404, which is also how an already-registered worker gets
 * cleaned up: a browser whose update check 404s drops the registration.
 *
 * Kept as a `predev` step rather than a note in a README because the next person to run
 * `npm run build && npm run dev` will hit this, and a README does not run.
 */
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const publicDir = new URL('../public/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** `swe-worker-*.js` is Serwist's companion chunk; its name carries a hash, so it is matched. */
const isArtifact = (name) =>
  name === 'sw.js' || name === 'sw.js.map' || /^swe-worker.*\.js(\.map)?$/.test(name);

if (existsSync(publicDir)) {
  const removed = [];
  for (const name of readdirSync(publicDir)) {
    if (!isArtifact(name)) continue;
    rmSync(join(publicDir, name), { force: true });
    removed.push(name);
  }
  if (removed.length) {
    // eslint-disable-next-line no-console
    console.log(
      `[clean-sw] removed stale service worker: ${removed.join(', ')}\n` +
        '[clean-sw] if a browser tab still misbehaves, unregister the worker once ' +
        '(DevTools → Application → Service Workers → Unregister) and hard-reload.',
    );
  }
}
