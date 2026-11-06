# Performance, size and coverage

Measured on 6 November 2026 on the code of `milestone-5` with all Milestone 5 branches merged, from a static build (`npm run generate`), with the cache headers in `public/_headers` applied.

## Targets (BRD section 1) and results

| Target | Result |
| --- | --- |
| Lighthouse mobile, Performance 90 or more | Sign in 97, Files 94, Profile 92, Week 88, Today 85 to 95 (see below) |
| Lighthouse mobile, Accessibility 95 or more | 100 on every page |
| Installable PWA | Yes. Chrome finds a valid manifest and an active service worker. The only message is "in incognito", which comes from the test browser. |
| App-shell JS 200 KB gzipped or less | 154.6 KB (entry plus preloaded scripts). The whole first screen of Sign in loads 177.5 KB of scripts. |
| Unit coverage 70% or more on `domain/` and `application/` | 92% of statements, 86% of branches, 94% of functions |

## Lighthouse (mobile, simulated slow 4G and a 4x slower CPU)

| Page | Performance | Accessibility | Best practices | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sign in | 97 | 100 | 100 | 0.8 s | 0.8 s | 190 ms | 0 |
| Today | 85 | 100 | 100 | 0.0 s | 1.0 s | 590 ms | 0 |
| Week | 88 | 100 | 100 | 0.1 s | 0.9 s | 480 ms | 0.001 |
| Files | 94 | 100 | 100 | 0.1 s | 0.7 s | 270 ms | 0.003 |
| Profile | 92 | 100 | 100 | 0.1 s | 0.7 s | 350 ms | 0.001 |

**Today and Week are close to the line.** Three runs of Today gave 85, 88 and 95. The slow part is "total blocking time" (the browser being busy for a moment while the screen draws). It changes a lot from run to run on the machine used for these tests. Please run it again on your own computer (steps below) and tell us the numbers before release.

## What made the biggest difference

The first measurement of Sign in was 60, with the first paint at 6.7 s. The cause was the test server, not the app: it did not say that the files in `/_nuxt` never change, so the browser asked the server about each file again, one after another, and each check waited for the slow network. With a normal cache rule the same page scores 97.

`public/_headers` sets that rule (and no cache for `sw.js`). Cloudflare Pages and Netlify read this file by themselves. On another host, set the same two rules in its own settings:

- `/_nuxt/*`: `Cache-Control: public, max-age=31536000, immutable`
- `/sw.js`: `Cache-Control: no-cache`

## How to run the checks again

```bash
npm run generate
npm run check:size        # app-shell size against the 200 KB budget
npm run test:coverage     # unit coverage, fails under 70%
```

For Lighthouse, serve the build with the same cache rule and run it on the page. This example uses `serve`, which reads `serve.json`:

```bash
echo '{"headers":[{"source":"_nuxt/**","headers":[{"key":"Cache-Control","value":"public, max-age=31536000, immutable"}]}]}' > .output/public/serve.json
npx serve .output/public -s -l 4173
npx lighthouse http://localhost:4173/sign-in --form-factor=mobile --view
```

Today, Week, Files and Profile need a signed-in session. Sign in first in Chrome, then run Lighthouse from the Chrome DevTools Lighthouse panel on that page, with "Mobile" selected.

## Not covered

- Lighthouse SEO is 91 because the page has no meta description. The app is behind a sign in and has no search needs, so this was left alone.
- Real device checks (a phone and a tablet) belong to UAT.