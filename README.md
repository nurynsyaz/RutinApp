# Rutin

Rutin is a daily routine scheduler. You plan your day on a timeline, repeat routines on the days you choose, tick them off, and attach files to them. It is a frontend only app. All data is fake for now and lives in your browser.

It is a Nuxt 4 single page app that is built to static files and installs as a PWA. It works in English and Bahasa Melayu.

## What you can do

- Sign in, create an account, reset a password (fake emails), and sign out
- See Today as a timeline and the Week as seven columns
- Create, edit, delete and duplicate routines, with repeat rules ("this day only" or "this and following days")
- Tick routines done. The tick shows at once and is undone with a message if the save fails
- Attach files to routines (up to 10 MB each, 5 per batch, 20 per routine) and browse all files
- Edit your profile: name, photo, language, timezone, when your day starts, and the first day of the week
- As an admin, see the list of users
- Keep working offline: ticks are queued and sent when the connection returns
- Install it on a phone, tablet or computer

## Set up

You need Node.js 22.22.3 or newer (or 24.15 or newer). Nuxt 4 asks for this.

```bash
git clone https://github.com/nurynsyaz/RutinApp.git
cd RutinApp
npm install
npm run dev
```

Open http://localhost:3000. These accounts are built in. The password for all of them is `Rutin#2026`.

| Email | Role | Notes |
| --- | --- | --- |
| `member@rutin.test` | Member | Has routines and files |
| `admin@rutin.test` | Admin | Can open the Users page |
| `expired@rutin.test` | Member | Session ends after 60 seconds, to try the expiry flow |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server |
| `npm run generate` | Builds the static site into `.output/public` |
| `npm run preview` | Serves the build |
| `npm run lint` | Checks the code and the architecture rules |
| `npm test` | Runs the unit tests |
| `npm run test:e2e` | Runs the Playwright tests against the built site |

To run the end to end tests, build first, then run them. They use the Google Chrome on your computer. To use Playwright's own Chromium instead, set `PW_CHANNEL=bundled`.

```bash
npm run generate
npm run test:e2e
```

PowerShell: `$env:PW_CHANNEL='bundled'; npm run test:e2e`

## How the code is organised

The code is split into five contexts. Each one has the same four layers.

```
app/
  contexts/
    identity/    sign in, sign up, session, roles and permissions
    scheduling/  routines, repeat rules, Today, Week, completions, offline queue
    attachments/ file rules, uploads, the Files library
    profile/     profile details, avatar, statistics
    shell/       language, toasts, install and update prompts, offline banner
      domain/          plain TypeScript rules, no framework
      application/     Pinia stores that use the domain and the ports
      infrastructure/  mock repositories (and later HTTP ones)
      ui/              Vue components
  kernel/    event bus, clock, Result, validation, logger
  mocks/     seed data and the fake database
  pages/  layouts/  plugins/  middleware/  composables/   glue between the contexts
i18n/locales/        en.json and ms.json
e2e/                 Playwright tests
```

These rules are checked by `npm run lint`, so a break fails the build:

1. `domain` imports nothing from the other layers.
2. `application` does not import `infrastructure` or `ui`.
3. `infrastructure` does not import `ui`.
4. `ui` does not import `infrastructure` or the mocks.
5. Contexts never import each other. They talk through the event bus.

Events are published on the bus (for example `identity.SignedIn` or `scheduling.OccurrenceCompleted`). The list is in `app/kernel/events/catalogue.ts`.

### Event inspector

A small panel that lists every published event with its payload. It is on in `npm run dev`. On a built site, open the app once with `?inspector=1` to turn it on for that browser, and `?inspector=0` to turn it off.

## Fake data

The mock repositories load the seed files in `app/mocks/seed/` on the first visit, then keep everything in your browser (IndexedDB). So the app behaves like a real one across reloads.

- To start again, clear the site data for the page in your browser.
- Add `?mockFail=signin`, `?mockFail=upload` or `?mockFail=complete` (or a mix, with commas) to the address to make those calls fail on purpose.
- Delay and upload speed are set in `app/mocks/db.ts`.

## Language

English and Bahasa Melayu. There is no text written directly in the screens. Every message is in `i18n/locales/en.json` and `ms.json`, and a test checks that both files have the same keys and placeholders. Dates, times and numbers follow the language and the profile's timezone. Routine titles stay as the person typed them.

The language is chosen in this order: the saved profile, the choice on this device, the browser, then English.

## Offline and install

The app shell is cached by a service worker, so the app opens offline. Offline, you can read your schedule and tick routines. The ticks are queued, and sent when you are back online. File uploads and downloads wait until you reconnect. A banner says when you are offline, and the sign out dialog warns if changes have not synced.

When a new version is ready, a toast offers a Reload button. Browsers that support it show an install card. On iPhone and iPad, a hint explains Share, then Add to Home Screen.

## Switching from the fake data to a real API

Every read and write goes through four ports (interfaces):

| Port | File |
| --- | --- |
| Sign in and accounts | `app/contexts/identity/domain/auth-repository.ts` |
| Routines and completions | `app/contexts/scheduling/domain/routine-repository.ts` |
| Files | `app/contexts/attachments/domain/file-repository.ts` |
| Profile | `app/contexts/profile/domain/profile-repository.ts` |

The data source is chosen in `app/plugins/02.repositories.ts` from `runtimeConfig.public.dataSource`. Today only `mock` exists, and any other value stops the app with a clear message.

The HTTP version is not built yet. To build it:

1. In each context, add `infrastructure/http-<name>-repository.ts` that implements the port with `fetch`. It attaches the access token. The UI and the stores never read the token.
2. In `02.repositories.ts`, return the HTTP repositories when the data source is `http`.
3. Set the data source and rebuild:

```bash
NUXT_PUBLIC_DATA_SOURCE=http npm run generate
```

Nothing in the screens or the stores needs to change. Keep each port's errors as `DomainError` codes, so the messages stay translated.

Keep the mock repositories. The unit tests and the end to end tests use them.

## Tests

- Unit tests (Vitest) cover `domain` and `application`, plus the message files.
- End to end tests (Playwright) cover each screen, the six acceptance scenarios in English and Malay, layouts at 375, 834 and 1440 px, accessibility checks with axe, offline behaviour and install prompts.

## Accessibility

Visible focus on every control, text contrast of at least 4.5 to 1, the whole app works from the keyboard, and animations respect "reduce motion". Touch targets are at least 44 px on a phone.
