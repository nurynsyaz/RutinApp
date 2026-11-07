# Rutin: Study Notes

These notes explain how the Rutin code works, for someone who is new to Nuxt, Vue and TypeScript.

How to read them:

- Read **Part 1** (the words) and **Part 2** (how the app starts) first. The rest makes more sense after that.
- Where a part of the project is a Nuxt feature, the notes say which Nuxt docs page explains it, like this: 📘 *Nuxt docs › Routing*. These are the "Get Started" pages of the Nuxt 4 docs (v4.6), the same ones you downloaded as PDFs.
- 📄 *BRD* means the "Rutin Frontend Mini BRD". Codes like `SC-01`, `ID-04` or `S-04` in the code comments are the requirement and screen numbers from the BRD and the UI/UX Blueprint. If you see `// SC-06:` above some code, look up SC-06 in the BRD to see why it exists.

---

## Contents

1. [The words you need](#part-1-the-words-you-need)
2. [How the app starts](#part-2-how-the-app-starts)
3. [The folders](#part-3-the-folders)
4. [The config files](#part-4-the-config-files)
5. [The Nuxt parts: app.vue, layouts, pages, middleware, plugins, composables](#part-5-the-nuxt-parts)
6. [The project's own design: contexts, layers and the event bus](#part-6-the-projects-own-design)
7. [The kernel (shared tools)](#part-7-the-kernel)
8. [Each context, file by file](#part-8-each-context-file-by-file)
9. [The fake backend (mocks)](#part-9-the-fake-backend)
10. [Two full journeys: signing in and ticking a routine](#part-10-two-full-journeys)
11. [TypeScript, as used in this project](#part-11-typescript-as-used-in-this-project)
12. [Vue, as used in this project](#part-12-vue-as-used-in-this-project)
13. [Styling, languages, PWA](#part-13-styling-languages-and-pwa)
14. [Tests, lint and CI](#part-14-tests-lint-and-ci)
15. [Nuxt features this project does not use, and why](#part-15-nuxt-features-this-project-does-not-use)
16. ["I want to change X, where do I look?"](#part-16-i-want-to-change-x-where-do-i-look)

---

## Part 1: The words you need

| Word | What it means, simply |
| --- | --- |
| **Vue** | A library for building screens. You write components (`.vue` files) and Vue updates the page when your data changes. |
| **Component** | One piece of the screen, such as a button, a card or a whole page. A `.vue` file has a `<script>` part (logic), a `<template>` part (HTML), and sometimes a `<style>` part. |
| **Nuxt** | A framework built on top of Vue. It adds routing from files, auto-imports, layouts, plugins and a build tool, so you write less setup code. 📘 *Nuxt docs › Introduction* |
| **TypeScript (TS)** | JavaScript with **types**. You say "this is a string" or "this is a `Routine`", and the editor warns you before you run the code if you mix them up. `.ts` files and `<script lang="ts">` are TypeScript. |
| **Pinia** | The library that holds **shared data** (state) that many screens need, such as "who is signed in" or "today's routines". A Pinia "store" is that data plus the functions that change it. 📘 *Nuxt docs › State Management › Usage with Pinia* |
| **Reactive** | Data that Vue watches. When it changes, every part of the screen that uses it updates by itself. |
| **Route** | A URL path such as `/today` or `/routines/abc`. |
| **Middleware** | Code that runs **before** you go to a page, for example "you are not signed in, go to the sign-in page". 📘 *Nuxt docs › Routing › Route Middleware* |
| **Plugin** | Code that runs **once** when the app starts. Used to set things up. |
| **Composable** | A function whose name starts with `use` (for example `useToggleDone()`) that bundles some reusable logic. |
| **SPA** | Single Page App. The browser loads one HTML page, and JavaScript draws every screen. Rutin is an SPA. |
| **SSR** | Server-Side Rendering: a server builds the HTML first. Nuxt does this by default, but **Rutin turns it off** (`ssr: false`). |
| **PWA** | Progressive Web App. A website that can be installed like an app and still opens offline. |
| **Service worker** | A small script the browser keeps in the background. It saves the app's files so it opens offline. |
| **IndexedDB** | A database built into the browser. Rutin uses it as its fake server's storage. |
| **Mock** | Fake. The "mock repositories" pretend to be a real server. |
| **Repository** | An object with functions like `list()`, `create()`, `remove()` for one kind of data. The rest of the app only talks to data through these. |
| **Port / interface** | A TypeScript description of which functions a repository must have, without the code inside. The real code "implements" it. |
| **Event bus** | A message board. One part of the app posts "the user signed in", and any part that cares can listen. |
| **zod** | A library that checks data, for example "is this a valid email?". |
| **i18n** | Short for "internationalisation": showing the app in more than one language (here English and Bahasa Melayu). |
| **Tailwind** | A CSS tool where you style with short class names in the HTML, like `p-4` (padding) or `text-sm` (small text). |
| **Vite** | The build tool Nuxt uses. It runs the dev server and bundles the code for production. 📘 *Nuxt docs › Introduction* |

---

## Part 2: How the app starts

When someone opens Rutin in the browser, this happens, in this order:

```
1. The browser loads index.html and the JavaScript bundle (it is an SPA, ssr: false)
2. Nuxt runs every plugin in app/plugins/          → sets up the event bus, the fake database, loads data
3. Nuxt renders app/app.vue                        → picks the language, draws the layout + page
4. Before showing a page, the global middleware runs → "are you signed in? are you allowed?"
5. The layout is drawn (app.vue or auth.vue in app/layouts/)
6. The page from app/pages/ is drawn inside the layout
```

The plugins run in a planned order because each one says which others it needs (`dependsOn`):

```
event-bus  ─►  repositories  ─►  event-handlers  ─►  session-watch  ─►  schedule-load
   │                                   │                                  profile-load
   │                                   │                                  attachment-load
   │                                   ├─►  connectivity, file-counts
   └─►  inspector
```

1. **event-bus** creates the message board (`$bus`), the clock (`$clock`) and a logger.
2. **repositories** creates the fake database helpers (`$repositories`).
3. **event-handlers** connects the "listeners" (what to do when someone signs in, signs out, uploads a file...).
4. **session-watch** starts the "your session will expire" timers.
5. **schedule-load / profile-load / attachment-load** load the signed-in person's data.

You will find all of these explained one by one in [Part 5](#plugins-appplugins).

---

## Part 3: The folders

Nuxt 4 keeps your app's code inside an `app/` folder. 📘 *Nuxt docs › Upgrade Guide › New Directory Structure* ("the new Nuxt default srcDir is `app/`").

Inside the code, `~` means "the `app/` folder". So `~/kernel/result` is `app/kernel/result.ts`.

```
RutinApp/
├─ nuxt.config.ts         The main Nuxt settings (Part 4)
├─ package.json           The list of libraries and the npm scripts
├─ tsconfig.json          TypeScript settings (points to files Nuxt generates)
├─ eslint.config.mjs      Code style + architecture rules
├─ vitest.config.ts       Unit test settings
├─ playwright.config.ts   Browser (end-to-end) test settings
├─ public/                Files copied as-is to the website (icons, robots.txt, _headers)
├─ i18n/locales/          en.json and ms.json: every piece of text on screen
├─ e2e/                   Playwright tests that click through the real app
├─ scripts/               A script that checks the bundle is not too big
├─ docs/                  Extra notes (performance, and these notes)
├─ .github/workflows/     CI: runs tests, lint and the build on GitHub
└─ app/
   ├─ app.vue             The root component. Every screen is drawn inside it
   ├─ page-meta.d.ts      Adds our own fields to definePageMeta (Part 11)
   ├─ assets/css/main.css Global CSS: Tailwind, fonts, brand colours
   ├─ layouts/            The page "frames": app.vue (with the menu) and auth.vue (sign-in screens)
   ├─ pages/              One file = one URL
   ├─ middleware/         Checks that run before each page
   ├─ plugins/            Set-up code that runs once at start
   ├─ composables/        Small helpers that connect two contexts
   ├─ kernel/             Shared tools used everywhere (event bus, Result, clock...)
   ├─ mocks/              The fake server: seed data + IndexedDB helpers
   └─ contexts/           The real features, split into 5 areas (Part 6)
      ├─ identity/        Sign in, sign up, session, roles and permissions
      ├─ scheduling/      Routines, Today, Week, ticking done, offline queue
      ├─ attachments/     Files: rules, uploads, the Files page
      ├─ profile/         Name, photo, timezone, statistics
      └─ shell/           Language, toasts, offline banner, install/update prompts
```

**`public/` vs `assets/`** 📘 *Nuxt docs › Assets*: "The `public/` directory content is served at the server root as-is" and "the `app/assets/` directory contains ... every asset that you want the build tool (Vite or webpack) to process." That is why the icons and `robots.txt` are in `public/` (they must keep exact URLs like `/icons/icon-192.png`), and `main.css` is in `assets/` (Vite has to process Tailwind inside it).

---

## Part 4: The config files

### `nuxt.config.ts`

📘 *Nuxt docs › Configuration*: "The `nuxt.config.ts` file is located at the root of a Nuxt project and can override or extend the application's behavior." `defineNuxtConfig` is "globally available without import", which is why the file uses it without importing it.

Line by line:

```ts
compatibilityDate: '2026-11-03',
```
Tells Nuxt and its modules which date of behaviour to follow, so an update does not suddenly change how things work.

```ts
devtools: { enabled: false },
```
Turns off the Nuxt DevTools panel.

```ts
ssr: false,
```
**Very important.** No server builds the HTML. The app runs fully in the browser (an SPA). 📘 *Nuxt docs › Deployment › Static Hosting*: "set the `ssr` property to `false` ... The `nuxt generate` command will then output an `.output/public/index.html` entrypoint and JavaScript bundles like a classic client-side Vue.js application." 📄 *BRD s.4* asks for this because there is no backend yet. Because of this, the code can safely use browser things like `window`, `localStorage` and `navigator` anywhere.

```ts
typescript: { strict: true },
```
Strict TypeScript: it complains about more mistakes, for example a value that might be `null`.

```ts
modules: ['@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt', '@vite-pwa/nuxt', '@nuxt/icon', '@nuxtjs/i18n', '@nuxt/eslint'],
```
Modules are add-ons for Nuxt:

| Module | What it gives you |
| --- | --- |
| `@pinia/nuxt` | Pinia stores (`defineStore`) |
| `pinia-plugin-persistedstate/nuxt` | Saves chosen store data in `localStorage`, so you stay signed in after a reload |
| `@vite-pwa/nuxt` | The PWA: manifest, service worker, offline cache |
| `@nuxt/icon` | The `<Icon name="lucide:sun" />` component |
| `@nuxtjs/i18n` | Languages: `useI18n()`, `t('some.key')` |
| `@nuxt/eslint` | The lint setup used by `eslint.config.mjs` |

```ts
components: [
  { path: '~/contexts/identity/ui', pathPrefix: false },
  ...
  '~/components',
],
```
📘 *Nuxt docs › Views › Components*: components in `app/components/` "will be automatically available across your application without having to explicitly import them." This project keeps its components inside each context's `ui/` folder instead, so this setting tells Nuxt to **also auto-import from those folders**. `pathPrefix: false` means the name is just the file name: `contexts/scheduling/ui/RoutineCard.vue` is used as `<RoutineCard />`, not `<SchedulingUiRoutineCard />`. (There is no `app/components/` folder yet; the last line is there for later.)

```ts
icon: { clientBundle: { scan: true }, serverBundle: false },
```
Puts the icons used in the code inside the bundle, so they show offline.

```ts
css: ['~/assets/css/main.css'],
```
📘 *Nuxt docs › Styling › The CSS Property*: "reference its path and Nuxt will include it to all the pages of your application."

```ts
vite: { plugins: [tailwindcss()] },
```
Adds Tailwind CSS v4 to Vite.

```ts
runtimeConfig: { public: { dataSource: 'mock' } },
```
📘 *Nuxt docs › Configuration › Environment Variables*: "Keys within `runtimeConfig.public` ... are also available client-side" and they "can be overridden using environment variables." Read it with `useRuntimeConfig()`. Here it picks where data comes from. `app/plugins/repositories.ts` reads it. Setting `NUXT_PUBLIC_DATA_SOURCE=http` would switch it (once an HTTP version is written).

```ts
piniaPluginPersistedstate: { storage: 'localStorage' },
```
Saved store data goes into the browser's `localStorage`.

```ts
pwa: { ... }
```
- `registerType: 'prompt'`: a new version never reloads by itself. The person is asked (see `update-prompt.ts`).
- `manifest`: the app's name, colours and icons when installed. `start_url: '/today'` is the first screen when opened from the home screen.
- `workbox`: what the service worker saves for offline. `navigateFallback: '/'` means any URL opens the app, which then shows the right page. Images use "CacheFirst" (take from cache if there).

```ts
i18n: { strategy: 'no_prefix', defaultLocale: 'en', locales: [...] }
```
Two languages. `no_prefix` means the URL does not change (`/today`, not `/ms/today`).

### `package.json` scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server at http://localhost:3000. It reloads when you save a file. |
| `npm run generate` | Builds the static site into `.output/public`. 📘 *Nuxt docs › Deployment* |
| `npm run preview` | Serves the built site so you can try it. |
| `npm run lint` | Checks code style **and** the architecture rules (Part 14). |
| `npm test` | Runs the unit tests (Vitest). |
| `npm run test:e2e` | Runs the browser tests (Playwright). Run `generate` first. |
| `postinstall: nuxt prepare` | Runs after `npm install`. Nuxt creates the `.nuxt/` folder with generated types. |

### `tsconfig.json`

It only points to files inside `.nuxt/`. 📘 *Nuxt docs › Introduction*: "Zero-config TypeScript support ... with our auto-generated types and `tsconfig.json`." Nuxt writes those files for you when you run `npm install` or `npm run dev`. If your editor shows lots of red errors on a fresh clone, run `npm install` (or `npx nuxt prepare`).

---

## Part 5: The Nuxt parts

### `app/app.vue`: the root

📘 *Nuxt docs › Views › app.vue*: "Nuxt will treat this file as the entrypoint and render its content for every route." And: "If you are familiar with Vue, you might wonder where `main.js` is ... Nuxt does this behind the scene."

```vue
<script setup lang="ts">
import { useShellLocale } from '~/contexts/shell/ui/use-shell-locale'
await useShellLocale().init()        // 1. choose the language before drawing anything
</script>

<template>
  <VitePwaManifest />                <!-- 2. adds <link rel="manifest">, needed for "Install app" -->
  <NuxtLayout>                       <!-- 3. draws the layout the page asked for -->
    <NuxtPage />                     <!-- 4. draws the page for the current URL -->
  </NuxtLayout>
  <ToastHost />                      <!-- 5. the pop-up messages (toasts) -->
  <EventInspector />                 <!-- 6. dev-only panel showing every event -->
</template>
```

`<NuxtLayout>` + `<NuxtPage>` is exactly the pattern in 📘 *Nuxt docs › Views › Layouts*.

### Layouts: `app/layouts/`

📘 *Nuxt docs › Views › Layouts*: "Layouts are wrappers around pages that contain a common User Interface for several pages ... Layouts are Vue files using `<slot />` components to display the page content." "Custom layouts can be set as part of your page metadata."

| Layout | Used by | What it draws |
| --- | --- | --- |
| `app.vue` | Today, Week, Files, Profile, Users, routine editor, 403 | The menu (bottom bar on phone, side bar on tablet and desktop), the offline banner, the install card and the sign-out dialog. The `<slot />` is where the page goes. |
| `auth.vue` | Sign in, Sign up, Forgot password, Signed out | The green brand panel on the left (desktop only), a small header with the language switch, and the form in the middle. |

A page picks its layout with `definePageMeta({ layout: 'app' })`.

Things to notice in `layouts/app.vue`:
- `items` is a `computed` list of menu links. The **Users** link is only added when `can('admin:users:read')` is true, so only admins see it.
- `<NuxtLink ... active-class="text-brand font-semibold">` gives the link of the current page a different style.
- Classes like `sm:pl-18 lg:pl-62` are Tailwind "breakpoints": `sm:` applies from tablet width, `lg:` from desktop width. That is how one layout works on all three sizes.

Things to notice in `layouts/auth.vue`:
- `route.meta.showcase` (set by the sign-in page) decides whether the sample routine list is shown in the brand panel.

### Pages: `app/pages/`

📘 *Nuxt docs › Routing › Pages*: "Every Vue file inside the `app/pages/` directory creates a corresponding URL." And 📘 *Nuxt docs › Routing*: "By using dynamic imports for each page, Nuxt leverages code-splitting to ship the minimum amount of JavaScript for the requested route."

| File | URL | Screen |
| --- | --- | --- |
| `index.vue` | `/` | Empty. `definePageMeta({ redirect: '/today' })` sends you straight to `/today`. |
| `sign-in.vue` | `/sign-in` | Sign in form, with the lock after too many wrong tries |
| `sign-up.vue` | `/sign-up` | Create an account |
| `forgot-password.vue` | `/forgot-password` | Fake "reset password" |
| `signed-out.vue` | `/signed-out` | "You have been signed out" (also for an expired session) |
| `today.vue` | `/today` | The day timeline, progress ring and "Up next" |
| `week.vue` | `/week` | Seven columns, one per day |
| `files.vue` | `/files` | The Files library |
| `profile.vue` | `/profile` | Edit your profile, see statistics |
| `admin/users.vue` | `/admin/users` | Admin-only list of users (a folder makes a nested URL) |
| `routines/new.vue` | `/routines/new` | Create a routine |
| `routines/[id].vue` | `/routines/abc123` | Edit one routine. The `[id]` in the file name is a **dynamic part** of the URL |
| `403.vue` | `/403` | "You don't have access" |

**Dynamic routes.** 📘 *Nuxt docs › Routing › Route Parameters*: "When accessing `/posts/1`, `route.params.id` will be 1." In `routines/[id].vue`:

```ts
const route = useRoute()
const id = computed(() => String(route.params.id))   // the "abc123" part of the URL
```

**`definePageMeta`** gives each page extra information. Nuxt reads `layout` and `redirect`. The other fields are **our own**, read by our middleware:

```ts
definePageMeta({ layout: 'app', permission: 'routine:read' })     // today.vue
definePageMeta({ layout: 'auth', guestOnly: true, showcase: true }) // sign-in.vue
```

| Field | Meaning |
| --- | --- |
| `layout` | Which layout to use (Nuxt) |
| `redirect` | Go somewhere else instead (Nuxt) |
| `permission` | You need this permission to open the page (ours, `can.global.ts`) |
| `guestOnly` | Only for people who are signed out (ours, `auth.global.ts`) |
| `public` | Anyone can open it (ours, `auth.global.ts`) |
| `showcase` | Show the sample card in the auth layout (ours, `layouts/auth.vue`) |

TypeScript only knows about our own fields because of `app/page-meta.d.ts` (see [Part 11](#adding-fields-to-someone-elses-type-pagemetadts)).

**Page title.** 📘 *Nuxt docs › SEO and Meta › useHead*: "The `useHead` composable function supports reactive input." Every page sets its tab title in the current language:

```ts
useHead({ title: () => t('identity.signIn.title') })
```

**Links.** 📘 *Nuxt docs › Routing › Navigation*: `<NuxtLink>` "renders an `<a>` tag ... page transitions are performed in JavaScript ... This prevents full-page refreshes." In code, `navigateTo('/today')` does the same thing.

### Middleware: `app/middleware/`

📘 *Nuxt docs › Routing › Route Middleware*: route middleware is "ideal for extracting code that you want to run before navigating to a particular route." "Global route middleware, which are placed in the `app/middleware/` directory (with a `.global` suffix) ... will be automatically run on every route change."

Both files here end with `.global.ts`, so they run before **every** page.

**`auth.global.ts`** ("are you signed in?")

```ts
export default defineNuxtRouteMiddleware(async (to) => {
  const identity = useIdentityStore()
  const wasSignedIn = identity.isSignedIn
  const stillValid = await identity.validateSession()          // has the saved session run out?
  if (wasSignedIn && !stillValid) {
    return navigateTo({ path: '/signed-out', query: { reason: 'expired' } })
  }
  const decision = decideSessionAccess({ ... })                 // the rule lives in the domain
  if (decision.kind === 'redirect') return navigateTo(decision.to)
})
```

- `to` is the page you are going to. `to.meta` is what that page put in `definePageMeta`.
- Returning `navigateTo(...)` means "don't go there, go here instead". Returning nothing means "OK, go on". This is the same shape as the auth example in the Nuxt docs.
- The actual rule (`decideSessionAccess`) is in `contexts/identity/domain/access.ts`:
  - `public` page → always allowed
  - `guestOnly` page and you are signed in → go to `/today`
  - any other page and you are signed out → go to `/sign-in?redirect=/the/page/you/wanted`

**`can.global.ts`** ("are you allowed?")

```ts
const required = to.meta.permission
if (!required) return                                    // the page needs no permission
if (identity.can(required)) return                       // you have it
identity.denyAccess(to.fullPath, required)               // publishes identity.AccessDenied
return navigateTo({ path: '/403', query: { needs: required } })
```

Global middleware runs in **alphabetical order of file name**, so `auth` runs before `can`. That is the right order: first check you are signed in, then check your permissions.

### Plugins: `app/plugins/`

Plugins are files Nuxt runs once when the app starts. (The "Get Started" PDFs don't have a page about plugins. The full explanation is in the Nuxt docs under *Directory Structure › app › plugins*.) The key ideas used here:

- `defineNuxtPlugin({ name, dependsOn, setup(nuxtApp) { ... } })`
- `dependsOn: ['event-bus']` means "run me after the plugin called `event-bus`".
- If `setup` returns `{ provide: { bus } }`, the value becomes available everywhere as `nuxtApp.$bus` (or `useNuxtApp().$bus`). The `$` is added by Nuxt.

| Plugin | What it does |
| --- | --- |
| `event-bus.ts` | Creates the event bus, and gives the whole app `$bus`, `$clock` (the one place that reads the time, so tests can fake it), `$logger` and `$inspectorOn`. It also decides whether the event inspector is on (`?inspector=1` in the URL, or dev mode). |
| `repositories.ts` | Reads `runtimeConfig.public.dataSource`. If it is `'mock'`, it creates the four mock repositories and gives them to the app as `$repositories`. Any other value stops the app with a clear error, because the HTTP version is not built yet. |
| `event-handlers.ts` | Connects listeners to events. For example: on `identity.SignedOut` reset every store; on `profile.ProfileUpdated` update the name in the header; on `scheduling.RoutineDeleted` unlink that routine's files. It also passes the shell its toast functions. |
| `session-watch.ts` | Starts the session timers, and extends the session when you click, type or scroll. |
| `schedule-load.ts` | `watch`es "who is signed in". When it changes to a person, it loads their routines. |
| `profile-load.ts` | Same, for the profile. Then switches the language to the one saved in the profile. |
| `attachment-load.ts` | Same, for the file list. |
| `connectivity.ts` | Listens to the browser's `online`/`offline` events and publishes `shell.ConnectivityChanged`. Back online, it sends the ticks that were waiting in the offline queue and shows a toast. |
| `file-counts.ts` | When a file is uploaded to or deleted from a routine, tells the schedule store, so the routine's file count stays right. |
| `inspector.ts` | Turns the dev event inspector on or off. |
| `update-prompt.ts` | When the service worker has a new version ready, shows a toast with a "Reload" button. |

**Why so many small plugins?** The rule is that contexts (Part 6) must not import each other. The plugins are the "glue" that is allowed to know about several contexts and connect them.

### Composables: `app/composables/`

Files here are **auto-imported** by Nuxt, which is why pages call `useToggleDone()` without an `import` line. 📘 *Nuxt docs › Introduction*: "Auto-imports: write Vue composables and components in their respective directories and use them without having to import them."

| File | What it does |
| --- | --- |
| `use-toggle-done.ts` | Ticks a routine done or not done, and shows an error toast if saving fails. Used by Today and Week. |
| `toggle-done.ts` | The plain logic behind it (easy to unit test). |
| `use-day-settings.ts` | Gives Today and Week the timezone, start of day and first day of the week, from the profile (or from the device if there's no profile yet). |
| `use-apply-locale.ts` | Changes the language everywhere: the texts, `<html lang>`, and the saved choice. |
| `use-profile-stats.ts` | Works out the profile statistics from the schedule. |

These live here, not inside a context, because each one joins **two** contexts (for example scheduling + shell). Same reason as the plugins.

**Nuxt's own auto-imports.** Things like `ref`, `computed`, `watch` (from Vue), `useRoute`, `useRouter`, `navigateTo`, `useHead`, `useNuxtApp`, `useRuntimeConfig`, `definePageMeta` (from Nuxt) and `useI18n` (from the i18n module) are also auto-imported. That's why most `.vue` files never import them. Some `.ts` files still import `ref` from `'vue'` on purpose, which works the same.

---

## Part 6: The project's own design

This part is **not** a Nuxt feature. It is how this project chose to organise its code. 📄 *BRD s.5* asks for it. It's called "bounded contexts" and "layers" (from Domain-Driven Design and "hexagonal" architecture), but the idea is simple.

### Contexts: 5 separate areas

The app is cut into 5 areas. Each owns its own data and its own screens:

| Context | Owns |
| --- | --- |
| `identity` | Accounts, signing in and out, the session, roles and permissions |
| `scheduling` | Routines, repeat rules, Today, Week, done ticks, the offline queue |
| `attachments` | Files: what's allowed, uploads, the Files page |
| `profile` | Name, photo, language, timezone, statistics |
| `shell` | Things around the app: language toggle, toasts, offline banner, install and update prompts, event inspector |

**Rule: a context never imports another context.** If scheduling needs to know that a file was uploaded, it doesn't import attachments. It listens on the event bus. This keeps each area small and independent.

### Layers: 4 floors in every context

Each context has the same 4 folders. Think of them as floors in a building. Code can only reach **down**, never up:

```
 ui/              Vue components. What you see.                         (can use application, domain)
 application/     Pinia stores. "Do this action": load, save, tick.    (can use domain)
 infrastructure/  Mock repositories. Actually reads/writes the data.   (can use domain)
 domain/          Plain TypeScript rules. No Vue, no Nuxt, no Pinia.    (uses nothing else)
```

| Layer | Example | Simple description |
| --- | --- | --- |
| `domain/` | `recurrence.ts`: "does this routine happen on Tuesday?" | Pure rules and types. Just functions in, values out. Easiest to test. |
| `application/` | `schedule-store.ts`: `setDone()`, `create()`, `load()` | Uses the rules and a repository to do a job, and keeps the result in a Pinia store. |
| `infrastructure/` | `mock-routine-repository.ts` | The code that stores data. Today it's fake (IndexedDB). Later it can be a real API. |
| `ui/` | `RoutineCard.vue` | The pieces of screen. They read from the store and call its functions. |

The rules (from the README, checked by `npm run lint`):

1. `domain` imports nothing from the other layers.
2. `application` does not import `infrastructure` or `ui`.
3. `infrastructure` does not import `ui`.
4. `ui` does not import `infrastructure` or the mocks.
5. Contexts never import each other.

**How does `application` get a repository if it can't import `infrastructure`?** Through the plugin. `plugins/repositories.ts` creates the mock repositories and puts them on `$repositories`. Each context has a small `application/deps.ts` that fetches them:

```ts
// contexts/identity/application/deps.ts
export function useIdentityDeps(): IdentityDeps {
  const { $bus, $clock, $repositories } = useNuxtApp()
  return { repo: $repositories.auth, bus: $bus, clock: $clock }
}
```

The store only knows the **interface** `AuthRepository` (in `domain/auth-repository.ts`), not the mock. This is why the README says switching to a real API only needs a new `http-...-repository.ts` and a change in `repositories.ts`. Nothing else has to change.

### The event bus

The bus is the message board between contexts.

- `bus.publish('identity.SignedIn', { ...details })` posts a message.
- `bus.subscribe('identity.SignedIn', (details) => { ... })` listens for it.

The full list of messages and what each one carries is in `app/kernel/events/catalogue.ts`:

| Event | Published when |
| --- | --- |
| `identity.SignedIn` | Someone signs in or signs up |
| `identity.SignedOut` | Someone signs out, or the session expires |
| `identity.SessionExpiring` | 2 minutes before the session ends |
| `identity.AccessDenied` | Someone opens a page without the permission |
| `shell.ConnectivityChanged` | The browser goes online or offline |
| `scheduling.RoutineCreated / Updated / Deleted` | A routine is changed |
| `scheduling.OccurrenceCompleted / Reopened` | A routine is ticked done / un-ticked for a day |
| `attachments.FileUploaded / FileUploadFailed / FileDeleted` | A file is uploaded, fails, or is deleted |
| `profile.ProfileUpdated` | The profile is saved |

Every event has `v: 1` (a version number, in case the shape changes later) and `occurredAt` (the time, as text).

Because `DomainEvents` is a TypeScript type, if you write `bus.publish('identity.SignedIn', { wrong: 1 })`, the editor shows an error straight away.

**Event inspector:** in `npm run dev`, a small panel lists every event as it happens. Great for learning: click around and watch what gets published.

---

## Part 7: The kernel

`app/kernel/` holds small shared tools. Any layer of any context may use them.

| File | What it does |
| --- | --- |
| `result.ts` | The `Result` type: a function returns either `{ ok: true, value }` or `{ ok: false, error }` instead of throwing an error. See below. |
| `domain-error.ts` | The shape of an error: `{ code, reason, field? }`. `reason` is a **code** like `EMAIL_INVALID`, never a sentence. The screen turns the code into text in the right language (`errors.EMAIL_INVALID` in `en.json`). |
| `validation.ts` | `parseWith(schema, input)`: runs a zod check and returns a `Result` with one error code per field. |
| `event-bus.ts` | The **interface** of the bus: `publish` and `subscribe`. |
| `mitt-event-bus.ts` | The real bus, built on the tiny `mitt` library. |
| `event-tap.ts` | Wraps the bus so every event can also be copied to the inspector. |
| `events/catalogue.ts` | The list of all events (above). |
| `clock.ts` | `now()` and `nowIso()`. The app always asks the clock for the time, so tests can use a fake clock. |
| `ids.ts` | `newId()`: makes a random unique id. |
| `when.ts` | Formats a time as "Today, 09:12" or "2 Nov". |
| `logger.ts` | A console logger and a "silent" one that logs nothing. |
| `connectivity.ts` | Remembers whether the browser is online. |
| `focus-trap.ts` | Keeps keyboard focus inside an open dialog (accessibility). |

### The `Result` pattern (you will see it everywhere)

```ts
// kernel/result.ts
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }
```

Read it as: "a `Result` is **either** a success with a `value` **or** a failure with an `error`".

How it's used:

```ts
const result = await identity.signIn(email, password)
if (result.ok) return                    // success, nothing more to do
if (result.error.reason === 'LOCKED') {  // TypeScript knows .error exists here, because ok is false
  startLockCountdown()
}
```

Why not just `throw`? Because with `Result`, TypeScript **forces** you to handle the failure. You can't use `result.value` until you have checked `result.ok`.

---

## Part 8: Each context, file by file

Tip: every `something.ts` has a `something.test.ts` next to it. The test is often the fastest way to see what a function does, because it shows real inputs and outputs.

### identity (accounts and access)

**domain/**

| File | What it does |
| --- | --- |
| `permissions.ts` | The roles (`member`, `admin`) and permission strings (`routine:read`, `admin:users:read`...). `permissionsFor(role)`: admins get everything a member has, plus `admin:users:read`. |
| `credentials.ts` | zod rules for the forms: valid email, password of at least 8 characters with a letter and a number, name of 1 to 60 characters. The error messages are codes like `PASSWORD_WEAK`. |
| `session.ts` | The `Session` type (user, permissions, when it expires) and helpers: is it expired? how long until the warning? does it have a permission? |
| `lockout.ts` | After too many wrong passwords, sign-in is locked for a while. Works out attempts left and lock time. |
| `access.ts` | `decideSessionAccess` (used by the middleware) and `safeRedirectTarget`, which only allows `?redirect=` to go to a page inside the app, so a link can't send you to another website. |
| `auth-repository.ts` | The **interface** for auth: `signIn`, `signUp`, `requestPasswordReset`, `signOut`, `refresh`, `listUsers`. |
| `user-summary.ts` | The shape of one row in the admin Users table. |

**application/**

| File | What it does |
| --- | --- |
| `identity-store.ts` | The Pinia store `useIdentityStore`. Holds `session`, `isSignedIn`, `user`, `permissions`. Actions: `signIn`, `signUp`, `signOut`, `extend`, `touch`, `can(permission)`. Warns 2 minutes before the session ends and signs out when it ends. The last line `{ persist: { pick: ['session'] } }` saves **only** the session to `localStorage`, so you stay signed in after a reload. |
| `lockout-storage.ts` | Saves the sign-in lock separately, so reloading the page doesn't skip it. |
| `use-user-list.ts` | Loads the user list for the admin page. |
| `deps.ts` | Gets the repo, bus and clock (see Part 6). |

**infrastructure/** `mock-auth-repository.ts`: the fake auth server. Checks emails and passwords against `mocks/seed/users.json`, creates sessions, and can fail on purpose with `?mockFail=signin`.

**ui/** `useCan()` and `<Can permission="...">` (shows its content only if you have the permission), `SignOutDialog`, `TextField` (a labelled input with an error message), `AuthBanner` (the red error box), `AccountBlock`, `SessionCard`, `UsersTable`, `DemoAccounts` (the list of test accounts on the sign-in page), `use-error-text.ts` (turns an error code into translated text), `initials.ts` ("Nur Insyirah" → "NI").

### scheduling (routines)

**domain/**

| File | What it does |
| --- | --- |
| `routine.ts` | The main types. A `Routine` has a title, category (`health`/`work`/`personal`/`rest`), start time `"HH:mm"`, duration in minutes, a `repeat` rule, a reminder, notes and attached file ids. |
| `recurrence.ts` | `occursOn(routine, date)`: does this routine happen on this day? Checks start/end days, skipped days, then the repeat rule (once, daily, weekdays, custom days). |
| `day-schedule.ts` | `buildDay(routines, completions, date)`: makes one day: the routines of that day in time order, which are done, and the progress (3 of 5 done). |
| `week.ts` | The 7 dates of a week, starting Monday or Sunday. |
| `overlap.ts` | Finds routines that clash in time with another one. |
| `occurrence-edit.ts` | "This day only" vs "This and following days" when you edit a repeating routine. Plans how to split it. |
| `duplicate.ts` | Makes the input for a copy of a routine. |
| `completion-queue.ts` | The offline queue: ticks made offline wait here. |
| `timeline.ts` | `upNext`: which routine is next, and in how many minutes. |
| `dates.ts`, `local-date.ts` | Date helpers. Dates are kept as plain `"2026-11-07"` text, so comparing them as text compares them as days. |
| `routine-form.ts`, `routine-input.ts` | Form rules and the zod schema for a routine. |
| `routine-repository.ts` | The **interface**: `list`, `get`, `create`, `update`, `remove`, `setDone`, `listCompletions`... |

**application/**

| File | What it does |
| --- | --- |
| `schedule-store.ts` | `useScheduleStore`. Holds `routines`, `completions`, `status` (`idle`/`loading`/`ready`/`error`), `online` and `queue`. Read functions: `dayOf(date)`, `weekOf(date, weekStart)`, `clashesWith(...)`. Actions: `load`, `setDone`, `create`, `update`, `updateOccurrence`, `flush` (send the offline queue)... |
| `queue-storage.ts` | Saves the offline queue in `localStorage`. |

**ui/** The components for Today and Week: `DayTimeline`, `WeekGrid`, `RoutineCard`, `ProgressRing`, `DateSwitcher`, `DayStrip`, `ViewSwitch`, the editor `RoutineEditor` with `TimeField`, `NumberSelect`, `CategoryPicker`, `RepeatPicker`, and the dialogs `ScopeDialog` ("this day only or all following?") and `DuplicateDialog`. Plain helper files: `format.ts` (day titles), `card-text.ts` (the text on a card), `category-style.ts` (colour per category), `use-today.ts` (today's date and the current minute, in your timezone), `use-wide.ts` (is the screen wide?), `arrow-nav.ts` (arrow-key navigation).

### attachments (files)

| Layer | Files |
| --- | --- |
| domain | `file-rules.ts` (max 10 MB per file, 5 per batch, 20 per routine; allowed types pdf/png/jpg/webp/docx/xlsx/txt; the extension **and** the MIME type must match), `file-record.ts` (one stored file), `file-library.ts` (search, filter and sort the library), `upload-job.ts` (one upload with progress), `file-repository.ts` (interface) |
| application | `attachment-store.ts`: `load`, `upload` (checks rules, runs the jobs, shows progress), `retry`, `remove`, `blobOf` (get the bytes to download), `detachRoutine` |
| infrastructure | `mock-file-repository.ts`: stores the file bytes in IndexedDB, fakes upload speed (about 2 MB/s), can fail with `?mockFail=upload` |
| ui | `UploadPanel`, `FileRow`, `RoutineFiles` (the files part of the routine editor), `DeleteFileDialog`, `file-format.ts` (sizes like "1.2 MB", error texts), `download.ts` |

### profile

| Layer | Files |
| --- | --- |
| domain | `profile.ts` (rules for name, timezone, day start, week start, language), `avatar.ts` (photo rules), `stats.ts` (statistics like streaks), `profile-repository.ts` (interface) |
| application | `profile-store.ts`: `load`, `save`, `setAvatar`, `reset` |
| infrastructure | `mock-profile-repository.ts` |
| ui | `ProfileForm`, `ProfileHeader`, `AvatarPicker`, `AvatarCropDialog` |

### shell

| Layer | Files |
| --- | --- |
| application | `shell-store.ts` (the list of toasts, `notify()`, `dismiss()`, the current language), `locale.ts` (which language to use: saved profile → this device → browser → English), `handlers.ts` (what the shell does on events: go to `/today` after sign in, go to `/signed-out` after sign out, clear data, show the "session expiring" toast...), `install-hint.ts` (when to show the install card), `inspector.ts` and `inspector-store.ts` (the event inspector) |
| ui | `ToastHost` + `ToastItem` (pop-up messages), `OfflineBanner`, `InstallPrompt`, `LanguageToggle`, `BrandMark` (the logo), `EventInspector`, `use-shell-locale.ts` |

(The shell has no `domain/` or `infrastructure/` folder. It has no rules or data of its own.)

---

## Part 9: The fake backend

There is no real server. `app/mocks/` pretends to be one.

- `mocks/seed/users.json`, `routines.json`, `files.json`: the starting data (the demo accounts and their routines).
- `mocks/db.ts`:
  - `readTable('routines')` reads a "table" from IndexedDB. On the very first visit the table is empty, so it copies in the seed data first.
  - `writeTable(...)` saves a table.
  - `latency()` waits 150 to 600 ms, so the app feels like it's talking to a real server (and you can see loading states).
  - `shouldFail('signin')` returns `true` when the URL has `?mockFail=signin`. Use it to test error screens.
  - `clearUserData()` deletes routines, files and ticks on sign-out.
  - `mockConfig` at the top lets you change the speed.

To start fresh: clear the site data in your browser (DevTools → Application → Clear storage).

Demo accounts (password `Rutin#2026` for all): `member@rutin.test`, `admin@rutin.test`, `expired@rutin.test` (session ends after 60 seconds).

---

## Part 10: Two full journeys

Following one action through every file is the best way to understand the code.

### Journey 1: signing in

```
pages/sign-in.vue
  └ submit()
      1. parseWith(signInSchema, {...})            identity/domain/credentials.ts   "is the email valid?"
         └ if not: fieldErrors shows the error under the field
      2. identity.signIn(email, password)          identity/application/identity-store.ts
           ├ locked? → return LOCKED error
           ├ repo.signIn(...)                      identity/infrastructure/mock-auth-repository.ts
           │    └ reads users from IndexedDB       mocks/db.ts
           ├ wrong password? → registerFailure     identity/domain/lockout.ts
           └ OK → startSession(session)
                 ├ session.value = ...              (saved to localStorage by persistedstate)
                 ├ scheduleTimers()                 warning + expiry timers
                 └ bus.publish('identity.SignedIn')
                         │
   ┌─────────────────────┴───────────────────────────────┐
   ▼                                                     ▼
shell/application/handlers.ts                 plugins/schedule-load.ts, profile-load.ts, attachment-load.ts
   navigate to ?redirect= page or /today          (they watch identity.user.id) → load this person's data
```

Note that `sign-in.vue` itself never navigates after success. The comment says it: "On success the shell sends the user on (identity.SignedIn)."

### Journey 2: ticking a routine done on Today

```
pages/today.vue
  └ <DayTimeline @toggle="(item, done) => toggle(item.routine.id, item.date, done)">
        └ toggle = useToggleDone()                      composables/use-toggle-done.ts
             └ schedule.setDone(routineId, date, true)  scheduling/application/schedule-store.ts
                  1. applyDone(...)    → the tick shows on screen AT ONCE ("optimistic update")
                  2. offline?          → add to the queue, save to localStorage, stop here
                  3. online            → repo.setDone(...)   (mock waits 150–600 ms)
                  4. failed?           → applyDone(... !done) puts it back
                                         + useToggleDone shows an error toast (shell store)
                  5. OK                → bus.publish('scheduling.OccurrenceCompleted')
```

Because `today.vue` uses `const day = computed(() => schedule.dayOf(viewed.value))`, the progress ring and the cards redraw by themselves when `completions` changes. You never tell Vue "redraw now". That's reactivity.

---

## Part 11: TypeScript, as used in this project

Only the bits you'll meet in this code.

### Basic types

```ts
let title: string = 'Morning run'
let durationMin: number = 30
let done: boolean = false
let ids: string[] = ['a', 'b']          // a list of strings
let user: SessionUser | null = null     // either a SessionUser or null (nothing)
```

`|` means **or**.

### `interface`: the shape of an object

```ts
// scheduling/domain/routine.ts
export interface RoutineInput {
  title: string
  category: Category
  start: string        // HH:mm
  durationMin: number
  ...
}
export interface Routine extends RoutineInput, RoutineSpan {   // "extends" = has everything in those, plus:
  id: string
  ownerId: string
  attachmentIds: string[]
}
```

A `?` after a name means it's optional: `startsOn?: string` may be missing.

### `type` with "only these values"

```ts
export type Role = 'member' | 'admin'                  // only these two strings are allowed
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
```

If you write `status.value = 'redy'`, TypeScript shows an error. This catches typos.

### Union of shapes (a "discriminated union")

```ts
export type Repeat =
  | { kind: 'once'; date: string }
  | { kind: 'daily' }
  | { kind: 'weekdays' }
  | { kind: 'custom'; days: Weekday[] }
```

`kind` tells you which shape it is. After `switch (repeat.kind) { case 'custom': ... }`, TypeScript knows `repeat.days` exists. Only the `custom` shape has it. `Result` works the same way, with `ok`.

### `as const` and turning a list into a type

```ts
export const CATEGORIES = ['health', 'work', 'personal', 'rest'] as const
export type Category = (typeof CATEGORIES)[number]   // = 'health' | 'work' | 'personal' | 'rest'
```

One list that works both as a value (to draw the buttons) and as a type (to check the code).

### Generics: `<T>`

`<T>` is a "fill in the type later" placeholder.

```ts
export async function readTable<T>(table: Table): Promise<T[]>
readTable<Routine>('routines')     // T = Routine, so you get Promise<Routine[]>
```

`Result<Session, DomainError>` is also a generic: "success value is a `Session`, error is a `DomainError`".

### `Promise`, `async` and `await`

Anything that takes time (reading the database) returns a `Promise`, which is a value that arrives later. `await` waits for it. You can only use `await` inside an `async` function (or at the top of `<script setup>`).

```ts
const result = await repo.signIn({ email, password })
```

`void schedule.load(id)` means "start this, I don't need to wait for it".

### `Partial`, `Pick`, `Omit`, `Record`

Built-in helpers that make new types from old ones:

| Helper | Meaning | Example in the code |
| --- | --- | --- |
| `Partial<X>` | every field of X is optional | `Partial<Routine>` in tests, to change only some fields |
| `Pick<X, 'a'>` | only field `a` of X | `Pick<Routine, 'repeat'>` in `recurrence.ts` |
| `Omit<X, 'a'>` | X without field `a` | `ToastInput = Omit<Toast, 'id'>` (you give a toast without an id, the store adds one) |
| `Record<K, V>` | an object with keys K and values V | `Record<Table, unknown[]>` in `mocks/db.ts` |

### `import type`

```ts
import type { Routine } from '../domain/routine'
```

Only imports the **type**, not code. It disappears when the code is built.

### Adding fields to someone else's type (`page-meta.d.ts`)

```ts
declare module '#app' {
  interface PageMeta {
    permission?: Permission
    guestOnly?: boolean
    public?: boolean
    showcase?: boolean
  }
}
```

Nuxt has its own `PageMeta` type. This file **adds** our four fields to it, so `definePageMeta({ permission: 'routine:read' })` and `to.meta.permission` are type-checked. A `.d.ts` file only contains types, no code.

### `readonly`, `as`, `!`

- `readonly Weekday[]`: a list you can read but not change.
- `x as T`: "trust me, this is a T". Used rarely, for example after `structuredClone`.
- `ReturnType<typeof setTimeout>`: "whatever type `setTimeout` returns". Used for timer variables.

---

## Part 12: Vue, as used in this project

### `<script setup lang="ts">`

The modern way to write a Vue component. Everything you declare at the top level can be used in the `<template>`. `lang="ts"` makes it TypeScript.

### `ref`: a reactive value

```ts
const email = ref('')            // in the script, read/write with email.value
```
```vue
<input v-model="email">          <!-- in the template, no .value needed -->
```

### `computed`: a value worked out from other values

```ts
const locked = computed(() => lockLeft.value > 0)
```

It updates by itself when `lockLeft` changes. You can't assign to it.

### `watch`: run code when something changes

```ts
watch(
  () => identity.user?.id ?? null,      // what to watch
  (id) => { if (id) void schedule.load(id) },  // what to do when it changes
  { immediate: true },                  // also run once right now
)
```

`?.` means "if it exists" and `??` means "otherwise use this". So `identity.user?.id ?? null` means "the user's id, or `null` if there's no user".

### Lifecycle

`onMounted(fn)` runs when the component appears on screen. `onBeforeUnmount(fn)` runs just before it is removed (used to stop timers).

### Props and emits (talking between components)

```ts
// RoutineCard.vue
const props = defineProps<{ item: DayItem; compact?: boolean }>()   // data IN from the parent
const emit = defineEmits<{ toggle: [done: boolean]; open: [] }>()  // messages OUT to the parent
```
```vue
<!-- the parent, today.vue -->
<RoutineCard :item="next.item" @toggle="toggle(..., $event)" @open="open(next.item)" />
```

`:item="..."` passes a value (a prop). `@toggle="..."` listens for an emit.

### Template directives you'll see

| Code | Meaning |
| --- | --- |
| `{{ t('nav.today') }}` | Show this value as text |
| `v-if` / `v-else-if` / `v-else` | Show only if true |
| `v-for="item in items" :key="item.to"` | Repeat for every item. `key` helps Vue keep track. |
| `v-model="email"` | Two-way link between an input and a `ref` |
| `:class="item.tone"` | Set an attribute from a value |
| `@click="goBack"` | Run a function on click |
| `@submit.prevent="submit"` | On form submit, run `submit` and stop the page from reloading |
| `<slot />` | "Put the content the parent gave me here" (used in layouts and `<Can>`) |
| `<template #label-end>` | Fill a **named** slot of a child component |

### A Pinia "setup store"

```ts
export const useShellStore = defineStore('shell', () => {
  const toasts = ref<Toast[]>([])                 // state
  function notify(input: ToastInput): number {...} // action
  return { toasts, notify, dismiss, ... }         // what the store shares
})
```

This is the "setup" style (like `<script setup>`), which the BRD asks for. The Nuxt docs example uses the other "options" style (`state: () => ({...})`, `actions: {...}`). Both do the same job. 📘 *Nuxt docs › State Management › Usage with Pinia*

Use it anywhere with `const shell = useShellStore()`. Every component gets the **same** store, so a toast added in one place appears in `ToastHost`.

---

## Part 13: Styling, languages and PWA

### Styling (Tailwind CSS v4)

- `app/assets/css/main.css` starts with `@import "tailwindcss";` and loads the two fonts.
- The `@theme { --color-brand: #0F766E; ... }` block creates the project's own colour names. That's why classes like `bg-brand`, `text-brand`, `border-line`, `bg-surface` work. Change a colour here and it changes everywhere.
- `:focus-visible` gives every control a visible outline when using the keyboard (accessibility).
- `prefers-reduced-motion` turns animations off for people who asked their device for less motion.
- Reading class names: `p-4` padding, `mt-6` margin-top, `text-sm` small text, `font-bold`, `rounded-lg` rounded corners, `flex` / `grid` layout, `hidden sm:flex` "hidden on phone, flex from tablet up", `lg:` "from desktop width".

📘 *Nuxt docs › Styling*: "Nuxt isn't opinionated when it comes to styling." This project chose Tailwind through its Vite plugin.

### Languages (i18n)

- **No text is written directly in the screens.** Every text is a key: `t('identity.signIn.title')`, and the words are in `i18n/locales/en.json` and `ms.json`.
- `t('key', { count: 3 }, 3)`: the `{count}` placeholder is filled in, and the last number chooses singular or plural.
- `i18n/locales.test.ts` checks that both files have the same keys and placeholders. If you add a key to `en.json`, add it to `ms.json` too, or the test fails.
- Error codes from the domain (like `EMAIL_INVALID`) are shown with `errors.EMAIL_INVALID`.

### PWA and offline

- `@vite-pwa/nuxt` makes the service worker and the manifest (settings in `nuxt.config.ts`).
- `<VitePwaManifest />` in `app.vue` adds the manifest link.
- `plugins/update-prompt.ts` shows "New version, Reload" instead of reloading by itself.
- `shell/ui/InstallPrompt.vue` shows the install card (and the "Share → Add to Home Screen" hint on iPhone).
- Offline: you can read your schedule and tick routines. Ticks wait in the queue (`completion-queue.ts`, `queue-storage.ts`) and are sent by `plugins/connectivity.ts` when you are back online.
- `public/_headers` tells hosts like Netlify or Cloudflare Pages to cache the `/_nuxt/*` files for a year (their names change when their content changes) but always re-check `sw.js`.

---

## Part 14: Tests, lint and CI

### Unit tests: Vitest (`npm test`)

- Files: every `*.test.ts` next to the code in `app/` and `i18n/`.
- `vitest.config.ts` sets `~` to `app/` (the same as Nuxt), runs in a plain Node environment and requires at least 70% coverage of `domain/` and `application/` (`npm run test:coverage`).
- A test looks like this:

```ts
describe('buildDay', () => {                            // a group of tests
  it('keeps only the routines that happen that day', () => {   // one test
    const day = buildDay([...], [], SATURDAY)
    expect(day.items.map((item) => item.routine.id)).toEqual(['a'])  // "I expect this result"
  })
})
```

Because the domain is plain TypeScript (no Nuxt), it can be tested without starting Nuxt. 📘 *Nuxt docs › Testing* describes `@nuxt/test-utils` for tests that need a running Nuxt. This project doesn't use it. It keeps the testable logic outside Nuxt instead.

### End-to-end tests: Playwright (`npm run test:e2e`)

- Files: `e2e/*.spec.ts`. They open a real browser, click and type like a person, and check the screen.
- `playwright.config.ts` serves the **built** site (`.output/public`) on port 4173, so run `npm run generate` first.
- They cover every screen, the 6 BRD acceptance scenarios in English and Malay, the 3 screen sizes, accessibility (axe), offline and install.

### Lint: ESLint (`npm run lint`)

`eslint.config.mjs` does two jobs:

1. Normal Nuxt code style (from `@nuxt/eslint`, via `./.nuxt/eslint.config.mjs`).
2. **The architecture rules** from Part 6, using `eslint-plugin-boundaries`:
   - `contextPolicies`: a context importing another context is an error ("Contexts must not import each other. Use the event bus.").
   - `layerPolicies`: for example, `domain` importing `application` is an error.
   - `uiNoMocks`: `ui` may not import `mocks`.
   - Domain files may not import `vue`, `pinia`, `nuxt` or `#app` ("Domain must be plain TypeScript"), and may not use `any`.

So if you put an import in the wrong place, `npm run lint` tells you.

### CI: `.github/workflows/ci.yml`

On every push or pull request to `main`, `staging` or `uat`, GitHub runs: `npm ci` → `nuxt prepare` → `npm run test` → `npm run lint` → `npm run generate`. If any step fails, the PR shows a red ✗.

---

## Part 15: Nuxt features this project does not use

The Nuxt docs you have explain several features you **won't** find in this code. That's on purpose, not a mistake:

| Nuxt docs page | Why it isn't used here |
| --- | --- |
| *Server* (`server/api`, Nitro) | There's no backend in this phase (📄 *BRD s.2*). `ssr: false` + static files means no Node server runs. |
| *Data Fetching* (`useFetch`, `useAsyncData`, `$fetch`) | These are mostly about loading data on the server and passing it to the browser. With no server and no real API, the stores call the repositories directly. A future HTTP repository could use `$fetch` inside `infrastructure/`. |
| *State Management* (`useState`) | `useState` is "an SSR-friendly `ref` replacement". With SSR off, it isn't needed. The project uses Pinia stores, one per context (📄 *BRD s.4*). |
| *Prerendering* | With `ssr: false`, `nuxt generate` outputs one `index.html` + JavaScript (📘 *Nuxt docs › Deployment › Static Hosting*). There's nothing to prerender per page. |
| *SEO and Meta* (beyond `useHead` titles) | The app is behind a sign-in, so search engines don't need its pages. Only the tab title is set. |
| *Layers* | Layers share config and code between several Nuxt projects. There is only one app here. (The "layers" in Part 6 are a different idea with the same name.) |
| *Transitions* | No page transition animations are set up. |
| *Error Handling* (`error.vue`, `createError`) | There's no `error.vue`. Expected errors are returned as `Result`/`DomainError` and shown on the screen or as toasts instead of being thrown. |
| `app.config.ts` | Not used. The only setting that must change after the build (the data source) uses `runtimeConfig`. 📘 *Nuxt docs › Configuration › runtimeConfig vs. app.config* |
| `<NuxtWelcome>`, `app/components/` | The components live in each context's `ui/` folder instead (see the `components` setting in Part 4). |

---

## Part 16: "I want to change X, where do I look?"

| I want to... | Look at |
| --- | --- |
| Change some text on screen | `i18n/locales/en.json` **and** `ms.json` (same key in both) |
| Change a brand colour or font | `app/assets/css/main.css` (`@theme`) |
| Add a new page | Create `app/pages/my-page.vue` with `definePageMeta({ layout: 'app', permission: '...' })`. Add a link in `app/layouts/app.vue` if it goes in the menu. |
| Make a page admin-only | Give it a `permission` that only admins have (see `identity/domain/permissions.ts`) |
| Change who can open what | `identity/domain/permissions.ts` and `identity/domain/access.ts` |
| Change the password rules | `identity/domain/credentials.ts` |
| Change how repeat rules work | `scheduling/domain/recurrence.ts` |
| Change file size or type limits | `attachments/domain/file-rules.ts` |
| Change the demo data | `app/mocks/seed/*.json`, then clear the site data in the browser |
| Make the fake server faster or slower | `mockConfig` in `app/mocks/db.ts` |
| Test an error screen | Add `?mockFail=signin`, `?mockFail=upload` or `?mockFail=complete` to the URL |
| See which events happen | `npm run dev` and open the event inspector |
| Make two contexts react to each other | Publish an event (add it to `kernel/events/catalogue.ts`) and subscribe in a plugin |
| Connect a real API | Write `http-...-repository.ts` in each context's `infrastructure/`, return it from `plugins/repositories.ts`, set `NUXT_PUBLIC_DATA_SOURCE=http`. See the README. |
| Change session length or the expiry warning | `identity/domain/session.ts` and the mock in `identity/infrastructure/mock-auth-repository.ts` |

### Good files to read first, in order

1. `nuxt.config.ts`: what the app is made of
2. `app/app.vue` and `app/layouts/app.vue`: how a screen is put together
3. `app/pages/today.vue`: a full page using a store and components
4. `app/contexts/scheduling/domain/recurrence.ts` and its test: a pure domain rule
5. `app/contexts/scheduling/application/schedule-store.ts`: a Pinia store
6. `app/plugins/event-bus.ts` → `repositories.ts` → `event-handlers.ts`: how everything is wired
7. `app/middleware/auth.global.ts`: how pages are protected
8. `app/kernel/events/catalogue.ts`: every message between contexts
