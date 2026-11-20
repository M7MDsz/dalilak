# Dalilak stack notes

Checked on 18 Nov 2026 against what is installed in `node_modules`, not against memory. Written for builders: copy the patterns, mind the traps. If you only have two minutes, read section 11.

## 0. How this was checked

Every claim carries a tag saying how far it was verified:

| Tag | Meaning |
|---|---|
| `[docs]` | Read in the documentation bundled with the installed package |
| `[src]` | Read in the installed source or type definitions |
| `[run]` | Executed in Node with the installed package, offline (fake `fetch`, fake `localStorage`, hand-built files) |
| `[tsc]` | Type-checked with TypeScript 5.9.3 under this project's flags (`strict`, `noUncheckedIndexedAccess`) |
| `[web]` | Official page fetched on 18 Nov 2026 through a summarising fetch tool |
| **UNVERIFIED** | Could not be checked here. Section 10 lists all of them |

Not possible under the team rules: `next dev` / `next build`, a browser, and any call to Gemini or Anthropic. So anything that only shows up in a running app is UNVERIFIED.

Installed versions `[src]`:

| Package | Version | Note |
|---|---|---|
| next | 16.4.6 | docs bundled at `node_modules/next/dist/docs/` |
| react / react-dom | 19.3.1 | `@types/react` 19.3.0 |
| tailwindcss / @tailwindcss/postcss | 4.3.5 | |
| zustand | 5.1.0 | |
| @base-ui/react | 1.9.0 | docs bundled at `node_modules/@base-ui/react/docs/` |
| @google/genai | 3.4.0 | needs Node >= 22 |
| @anthropic-ai/sdk | 1.10.0 | sends `anthropic-version: 2026-10-21` |
| unpdf | 2.2.1 | ESM only, needs Node >= 24 (this machine: 24.15) |
| mammoth | 1.13.0 | CommonJS |
| vitest / vite | 5.1.0 / 8.3.8 | no `jsdom`, no `happy-dom` installed |
| typescript | 5.9.3 | |
| motion | 14.14.0 | `motion/react` |
| zod | 4.6.7 | |
| @fontsource* | **not installed** | see 1.8 |

The scripts behind the `[run]` and `[tsc]` tags are in `artifacts/stack-notes-scratch/` (git-ignored). Re-run one with `node artifacts/stack-notes-scratch/<name>.mjs`: `tw.mjs` (Tailwind compile), `scan.mjs`, `zustand.mjs`, `genai.mjs`, `anthropic.mjs`, `docs.mjs` (unpdf + mammoth), `ts/ts-check.mjs <file>` (single-file type check under the shared `tsc` lock). Every code block tagged `[tsc]` below lives in `ts/ex-*.ts(x)` there and compiles with 0 errors.

---

## 1. Next.js 16.4.6 (App Router)

Source for this section unless tagged otherwise: `node_modules/next/dist/docs/01-app/` `[docs]`.

### 1.1 File conventions

The app lives in `src/app/`. `.env*`, `public/`, `next.config.ts` stay at the project root.

| File | Role | Trap |
|---|---|---|
| `layout.tsx` | Persists across navigation. Root layout must render `<html>` and `<body>` | Enter/exit animations never fire in a layout |
| `page.tsx` | The route's UI. Server Component unless the file starts with `"use client"` | |
| `template.tsx` | Like a layout but **remounts on every navigation of its segment** (state reset, effects re-run, DOM recreated). Search-param changes do not remount | The natural place for a per-page enter animation |
| `loading.tsx` | Suspense fallback for the segment | |
| `error.tsx` | Error boundary. Must be a Client Component. Props are `{ error: unknown; retry: () => void }` (`retry` stable since 16.3) | `error` is `unknown`: narrow with `instanceof Error` |
| `not-found.tsx` | 404 UI | |
| `route.ts` | Route Handler (HTTP endpoint) | Cannot sit in the same folder as a `page.tsx` |
| `proxy.ts` | Was `middleware.ts`. Export `function proxy(request)`. Node runtime only | Not needed in Dalilak |
| `(group)/` | Route group: organises files, adds nothing to the URL | Two root layouts in different groups = full page load when moving between them |
| `[id]/` | Dynamic segment | `params` is a Promise (1.3) |
| `@slot/` | Parallel route | Every slot needs a `default.tsx` or the build fails |
| `icon.svg`, `favicon.ico`, `apple-icon.png` | App icons by file name (1.9) | `favicon.ico` only in `app/` root |

### 1.2 Server vs client components

- A file is a Server Component until it has `"use client"` as its first line. The directive marks a **boundary**: everything it imports becomes client code. You do not repeat it in every file, only in files that Server Components import directly.
- Props crossing the boundary must be serialisable: no functions, no class instances.
- Dalilak keeps all state in the browser, so nearly every screen is a client tree. Keep `layout.tsx` and `page.tsx` as thin Server Components (metadata, fonts) that render one client component.
- Client Components are **still rendered on the server** for the first HTML (and prerendered at `next build`). Reading `window`, `document` or `localStorage` during render throws there. Read them in effects, event handlers, or a lazy `useState(() => typeof window === "undefined" ? fallback : ...)`.
- Base UI parts carry their own `'use client'` `[src]`. `motion/react` does **not** (checked the installed entry files `[src]`): import it only from files that start with `"use client"`.
- `import "server-only"` at the top of a module makes the build fail if client code imports it. Installing the package is optional in Next `[docs]`; it is not installed here, so Vitest cannot resolve it (see 8).
- React 19.3 extras that exist in the installed build `[src]`: `ViewTransition`, `Activity`, `useEffectEvent`, `addTransitionType` from `react`; `browser` from `react-dom`.

### 1.3 `params` and `searchParams` are Promises

Synchronous access was removed in 16. This is the most common break in code written from memory.

```tsx
// Server Component page [tsc]
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { tab } = await searchParams; // plain object, not URLSearchParams
  return <JobScreen id={id} tab={typeof tab === "string" ? tab : undefined} />;
}
```

```tsx
// Client Component page: unwrap with React's use() [tsc]
"use client";
import { use } from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <JobScreen id={id} />;
}
```

- **Do not use the global helpers `PageProps<'/route'>`, `LayoutProps`, `RouteContext` for new routes.** They are generated into `.next/types/routes.d.ts` by `next dev`, `next build` or `next typegen`, which only the lead runs. Right now that file knows one route, `"/"` `[src]`, so `PageProps<'/jobs/[id]'>` fails `npm run typecheck` until types are regenerated. Type the props inline as above.
- The same generation step writes `.next/types/validator.ts`, which imports every page and layout that existed at that moment and checks their exports `[src]`. Renaming or deleting one of those files makes `npm run typecheck` report an error inside `.next/types/` (counted as "elsewhere", not in your paths) until the lead regenerates. From `page.tsx` / `layout.tsx` export only the default component and Next's own names (`metadata`, `viewport`, `generateMetadata`, …); put helpers in other files.
- `cookies()`, `headers()`, `draftMode()` are async too (`await cookies()`).
- In client components prefer `useParams()`, `usePathname()`, `useSearchParams()`, `useRouter()` from **`next/navigation`** (not `next/router`).
- `useSearchParams()` in a page that gets prerendered must sit under a `<Suspense>` boundary. Without it `next build` stops with "... should be wrapped in a suspense boundary at page ..." `[src]`. Since the lead builds for the demo, wrap every component that calls it.

### 1.4 Route handlers

```ts
// src/app/api/jobs/[id]/route.ts [tsc]
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = request.nextUrl.searchParams.get("q") ?? "";
  return Response.json({ id, q });
}
```

- Handlers are **not cached by default** (GET included, since 15). Nothing to configure for a stateless API.
- `export const runtime = "nodejs"` is the default; `"edge"` is deprecated in this version. Exporting `runtime = "nodejs"` is harmless today (it must be removed only if someone turns on `cacheComponents`, which is off).
- `export const maxDuration = 60` is only a hint for hosting platforms. It does nothing on localhost.
- Body: `await request.json()`, `await request.formData()`, `await request.text()`. No body-parser config.
- An unsupported method answers 405 automatically.
- **Use a route handler for the CV upload, not a Server Action**: Server Actions cap the request body at 1 MB by default (`serverActions.bodySizeLimit`).
- `request.signal` aborts when the browser disconnects or the user presses Stop `[src: server/web/spec-extension/adapters/next-request.js]`. It is not mentioned in the bundled docs; pass it to the model call so a cancelled chat stops spending tokens.

### 1.5 Streaming from a route handler (NDJSON)

Pattern from the bundled streaming guide (`02-guides/streaming.md`, "Streaming in Route Handlers"), adapted to typed events.

```ts
// src/app/api/chat/route.ts [tsc]
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export type ChatEvent =
  | { type: "status"; text: string }
  | { type: "delta"; text: string }
  | { type: "navigate"; screen: string; params?: Record<string, string> }
  | { type: "done" }
  | { type: "error"; message: string };

export async function POST(request: NextRequest) {
  const input: unknown = await request.json().catch(() => null);
  if (input === null) return Response.json({ error: "bad_json" }, { status: 400 });

  const encoder = new TextEncoder();
  let open = true;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => {
        if (open) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        for await (const event of runBrain(input, request.signal)) send(event);
        send({ type: "done" });
      } catch {
        send({ type: "error", message: "brain_failed" });
      } finally {
        if (open) controller.close();
        open = false;
      }
    },
    cancel() {
      open = false; // browser went away; enqueue() or close() after this would throw
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
```

Reading it in the browser:

```ts
// [tsc]
export async function* readNdjson<T>(response: Response): AsyncGenerator<T> {
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line) as T;
      newline = buffer.indexOf("\n");
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer) as T;
}

// usage: const controller = new AbortController();
// const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify(payload), signal: controller.signal });
// for await (const event of readNdjson<ChatEvent>(res)) apply(event);   // Stop button: controller.abort()
```

Facts that matter:

- A chunk boundary is not an event boundary. Always buffer and split on `\n`, as above. Never `JSON.parse` a raw chunk.
- `next start` gzips responses. Two things keep the stream flowing: Next flushes the compressor after every chunk `[src: server/pipe-readable.js]`, and `Cache-Control: no-transform` makes the compression middleware skip the response entirely `[src: compiled/compression]`. Keep that header.
- Safari buffers a streamed response until 1024 bytes have arrived `[docs]`. A very short first status line may appear late there; not an issue in Chrome or Edge.
- SSE is the same stream with different framing: `Content-Type: text/event-stream; charset=utf-8` and frames of `event: <type>\ndata: <json>\n\n`. `EventSource` only does GET, so with a POST body you read it with `fetch` anyway. NDJSON is simpler; use SSE only if you need `EventSource` reconnects.
- An error thrown **after** the first byte cannot change the HTTP status (it is already 200). Send an `{ type: "error" }` event, as above. The client must treat "stream ended without `done`" as a failure too.
- Module-level variables in a route file are shared by every request for the life of the server process. The team rule is stateless routes: do not keep user state there.

### 1.6 Uploading the CV

`[tsc]` for the whole block; the two library calls are also `[run]` (section 7).

```ts
// src/app/api/cv/route.ts
import type { NextRequest } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("cv");
  if (!(file instanceof File)) return Response.json({ error: "no_file" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "too_large" }, { status: 413 });

  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
      if (pdf.numPages > 15) return Response.json({ error: "too_many_pages" }, { status: 413 });
      const { text, totalPages } = await extractText(pdf, { mergePages: true });
      return Response.json({ kind: "pdf", pages: totalPages, text });
    }
    if (name.endsWith(".docx")) {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(await file.arrayBuffer()) });
      return Response.json({ kind: "docx", text: value.replace(/\n{3,}/g, "\n\n").trim() });
    }
    return Response.json({ error: "unsupported_type" }, { status: 415 });
  } catch {
    return Response.json({ error: "unreadable_file" }, { status: 422 });
  }
}
```

Client side: `const body = new FormData(); body.append("cv", file); await fetch("/api/cv", { method: "POST", body });`. Do not set `Content-Type` yourself; the browser adds the multipart boundary.

### 1.7 Environment variables

- `.env.local` at the project root is loaded into `process.env` on the server. Only names starting with `NEXT_PUBLIC_` reach the browser, and those are inlined at build time. Keys must never get that prefix.
- In client code a non-public variable is replaced with an empty string, so a client-side `if (process.env.GEMINI_API_KEY)` is always false. Ask the server whether a key exists (a tiny `/api/brain` status route), never the client.
- Lookup order is: the real process environment first, then `.env.$(NODE_ENV).local`, `.env.local`, `.env.$(NODE_ENV)`, `.env`. **A variable already set in the shell that starts the server beats `.env.local`.** No `GEMINI_*`, `GOOGLE_*` or `ANTHROPIC_*` variable was set in the shell used for these notes (names only were listed); the lead should confirm the same for the server's shell.
- `KEY=` (empty, as in `.env.example`) gives `""`, not `undefined`. Test with `?.trim()` and truthiness, never `!== undefined`.
- `process.env.X` is typed `string | undefined` `[tsc]`.
- Dynamic lookups such as `process.env[name]` are not inlined for the browser.
- After editing `.env.local`, restart the server. Whether `next dev` reloads it by itself in 16.4: **UNVERIFIED**.

### 1.8 Fonts, offline

`next/font/google` downloads the font files at build time `[docs]`, so it needs the network whenever its cache is cold. **Do not use it** for a demo that must survive without internet (what exactly happens offline was not tested). Two offline-safe routes; both need the font files on disk first, and no font package is installed yet (the lead must add one, or drop `.woff2` files into the repo).

**A. `next/font/local`** (preloads the file, generates a size-adjusted fallback, exposes a CSS variable):

```tsx
// src/app/layout.tsx [tsc]
import localFont from "next/font/local";

const arabic = localFont({
  src: [{ path: "./fonts/arabic-variable.woff2", weight: "200 700", style: "normal" }], // relative to THIS file
  variable: "--font-arabic",
  display: "swap",
  fallback: ["Segoe UI", "Tahoma", "sans-serif"], // both ship with Windows and cover Arabic
});
// <html lang="ar" dir="rtl" className={arabic.variable}>
```

```css
/* globals.css: hand the variable to Tailwind [docs: api-reference/components/font, "With Tailwind CSS"] */
@theme inline {
  --font-sans: var(--font-arabic);
}
```

- `weight` is a range string (`"200 700"`) for a variable font, a single value otherwise. `src` may list several files with their own `weight` / `style`.
- Call `localFont(...)` at module top level and assign it to a `const`. (Long-standing next/font rule; not re-read in the 16.4 docs.)
- Put `arabic.variable` on `<html>`, not on an inner wrapper: Base UI popups are portaled to `<body>` and would lose the variable otherwise.

**B. `@fontsource` CSS import.** Package layout checked on the registry and CDN for v5.3.0 `[web]`:

| Package kind | Import | `font-family` in its CSS | Files |
|---|---|---|---|
| Variable: `@fontsource-variable/<font>` | `import "@fontsource-variable/<font>";` (all weights, one file per script) | `'<Font Name> Variable'` | `files/<font>-<subset>-wght-normal.woff2` |
| Static: `@fontsource/<font>` | one import per weight: `import "@fontsource/<font>/400.css";` `…/600.css` (`index.css` is 400 only; `arabic-500.css` style files load a single script) | `'<Font Name>'` | `files/<font>-<subset>-<weight>-normal.woff2` |

Importing a stylesheet from `node_modules` anywhere in `app/` is supported `[docs: getting-started/css, "External stylesheets"]`. The CSS uses `unicode-range`, so the browser fetches only the Arabic and Latin files it needs, and `font-display: swap`.

```tsx
// src/app/layout.tsx
import "@fontsource-variable/<font>"; // then in CSS: --font-sans: "<Font Name> Variable", "Segoe UI", Tahoma, sans-serif;
```

Not every family has a variable package (one Arabic family checked had only the static one), so the weight imports depend on the font chosen.

- You can also combine them: `localFont({ src: "../../node_modules/@fontsource-variable/<font>/files/<font>-arabic-wght-normal.woff2" })`. That `next/font/local` accepts a path into `node_modules`: **UNVERIFIED**.
- Existence of Arabic-capable packages was only checked by name on the registry `[web]`; which font Dalilak uses is the designers' call, not decided here.

### 1.9 Metadata and icons

```tsx
// layout.tsx or page.tsx, Server Components only [tsc]
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "دليلك", template: "دليلك · %s" }, // tab title per PRODUCT-SPEC 2.2: «دليلك · {page heading}»
  description: "...",
};
export const viewport: Viewport = { themeColor: "#0b0f14", width: "device-width", initialScale: 1 };
```

- `themeColor`, `colorScheme` and `viewport` inside `metadata` are deprecated; they belong in the separate `viewport` export.
- `metadata` cannot be exported from a `"use client"` file. Keep `page.tsx` a Server Component that renders the client screen.
- Icons by file name in `src/app/`: `favicon.ico` (root only), `icon.svg` / `icon.png` (any segment; an SVG gets `sizes="any"`), `apple-icon.png`. Next writes the `<link>` tags. Several icons: `icon1.png`, `icon2.png`.
- Do not hand-write `<title>` or `<meta>` tags in the root layout.

### 1.10 What changed in 16 that breaks remembered code

From `02-guides/upgrading/version-16.md` `[docs]` unless tagged.

| Change | What to do |
|---|---|
| Sync `params`, `searchParams`, `cookies()`, `headers()` removed | `await` them (1.3) |
| `middleware.ts` renamed to `proxy.ts`, export `proxy`; Node runtime only | Dalilak needs none |
| Turbopack is the default for `dev` and `build`; a custom `webpack` config makes the build fail | No `webpack` key in `next.config.ts`. Options live at top-level `turbopack` |
| `next lint` removed; `next build` no longer lints | Nothing to run |
| `serverRuntimeConfig` / `publicRuntimeConfig` removed | Environment variables |
| `experimental.ppr`, `experimental_ppr`, `experimental.dynamicIO`, `experimental.useCache`, `experimental.viewTransition` removed | Do not paste old config |
| Route segment config: `dynamic`, `revalidate`, `fetchCache` belong to the "previous model"; they still work only while `cacheComponents` is off (it is off) | Leave caching alone |
| `fetch` is not cached by default; GET handlers are dynamic by default | No stale data surprises |
| `revalidateTag(tag)` now needs a second argument | Not used here |
| Parallel route slots need `default.tsx` | Or the build fails |
| `next dev` writes to `.next/dev`, `next build` to `.next`; a lockfile blocks a second `next dev` in the same folder | One server, as the team rule says |
| `next/image`: local `src` with a query string needs `images.localPatterns`; default `qualities` is `[75]`; `images.domains` deprecated | Dalilak's icons and avatars are inline SVG components, so mostly irrelevant |
| `scroll-behavior: smooth` on `<html>` is no longer overridden during navigation | Add `data-scroll-behavior="smooth"` to `<html>` if you set smooth scrolling and still want instant jumps on route change |
| `error.tsx` receives `retry` (16.3) and `error` is typed `unknown` | See 1.1 |
| Edge runtime deprecated | Do not export `runtime = "edge"` |
| `next dev` creates or updates an `AGENTS.md` block in the project root when it detects a coding agent (`agentRules`, on by default) | Expected, harmless. `agentRules: false` turns it off |

Dev-server notes for the lead: the dev server allows requests from `localhost` and from the hostname it was started with; any other origin (a phone on the LAN, a tunnel) needs `allowedDevOrigins: ["<hostname>"]` in `next.config.ts`, and a server bound with `-H 127.0.0.1` is not reachable from a phone at all.

### 1.11 Page transitions and hydration helpers

- **`template.tsx`** remounts on each navigation, so a short Motion enter animation there gives "new page fades and rises". It cannot animate the old page out (it is gone by then).
- **React `<ViewTransition>`** works in the App Router with no config in 16.4 (`02-guides/view-transitions.md`). Wrap page content (in `page.tsx`, not the layout) in `<ViewTransition enter=... exit=... default="none">`, tag links with `<Link transitionTypes={["nav-forward"]}>` `[src: link.d.ts]`, and style `::view-transition-old(.name)` / `::view-transition-new(.name)`. The guide's CSS runs the old page's fade first and delays the new page's fade, which is exactly "old page out first, never two pages half visible". Regular `setState` does not trigger it; navigations do. Chromium 125+ animates; other browsers just skip the animation. How it looks in this app: **UNVERIFIED**.
- **Avoiding a flash for client-only state.** The bundled guide `02-guides/preventing-flash-before-hydration.md` recommends an inline `<script>` in `<head>` that reads `localStorage` and sets an attribute on `<html>` before first paint, with `suppressHydrationWarning` on `<html>`. In dev, Strict Mode's remount resets attributes React does not manage, so re-apply the attribute in a `useLayoutEffect` in the component that owns it.
- **`use(browser())`** from `react-dom` (React 19.3 `[src]`) marks a subtree as browser-only: on the server it suspends to the nearest `<Suspense>` fallback, in the browser it renders at once and may read `localStorage` during render. `next/dynamic(() => import("./x"), { ssr: false })` does the same per component; the `ssr: false` option only works inside a Client Component `[docs: guides/lazy-loading]`.

---

## 2. Tailwind CSS 4.3.5

No docs are bundled with the package. Everything here was compiled with the installed compiler `[run: tw.mjs, scan.mjs]` unless tagged otherwise.

### 2.1 Setup, and the scan-scope trap

`postcss.config.mjs` already has `"@tailwindcss/postcss": {}`. There is **no `tailwind.config.js`** in v4; configuration is CSS.

```css
/* src/app/globals.css */
@import "tailwindcss" source("..");   /* scan src/ only: the path is relative to this CSS file */
```

**Why `source("..")` matters here.** A bare `@import "tailwindcss";` (what `globals.css` has today) scans the whole project minus `.gitignore`. Measured on this repo: 409 files, 393 of them under `docs/` (research caches full of other libraries' class names), 17,584 candidate tokens, **333 KB of generated CSS, against 5 KB when only `src/` is scanned** `[run]`. It also means a class name merely mentioned in a markdown file gets generated. Fix it in `globals.css` once.

Other source controls (all compile `[run]`):

```css
@import "tailwindcss" source(none);        /* turn auto-detection off, then list sources */
@source "../components";                    /* add a folder (relative to the CSS file) */
@source not "../legacy";                    /* exclude one */
@source inline("{hover:,}bg-xp text-xp");   /* force-generate classes that exist only in data, with brace expansion */
```

**Class names must appear as complete strings in a scanned file.** The scanner is a tokenizer, not an evaluator. `` `text-${tone}` `` generates nothing; `on ? "bg-accent" : "bg-ink"` generates both `[run: scan.mjs]`. For data-driven colour (a skill field's colour, a level's colour) either map to full class strings in a `Record`, or set a CSS variable inline and use one fixed class: `style={{ "--tone": color } as React.CSSProperties}` with `bg-(--tone)`.

### 2.2 Design tokens: `@theme`

A variable declared in `@theme` creates utilities. The namespace decides which ones.

```css
@theme {
  --color-*: initial;                 /* drop the whole default palette: bg-red-500 then generates nothing */
  --color-ink: oklch(0.21 0.02 260);
  --color-xp: #f5a524;
  --font-display: "…", sans-serif;
  --text-hero: 3.25rem;
  --text-hero--line-height: 1.1;      /* text-hero sets font-size AND line-height */
  --radius-card: 1.25rem;
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.06);
  --ease-pop: cubic-bezier(0.34, 1.32, 0.64, 1);
  --container-chat: 26.25rem;         /* w-chat, max-w-chat AND the @chat: container breakpoint */
  --breakpoint-phone: 24.375rem;      /* phone: variant */
  --spacing-gutter: 1.25rem;          /* p-gutter, gap-gutter, … */
  --animate-rise: rise 420ms var(--ease-out) both;
  @keyframes rise {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }
}
```

| Namespace | Utilities it feeds (verified ones) |
|---|---|
| `--color-*` | `bg-`, `text-`, `border-`, `fill-`, `stroke-`, `ring-`, `outline-`, `decoration-`, `caret-`, `accent-`, `shadow-<color>`, gradient stops; `/NN` opacity on all of them |
| `--font-*` | `font-display` |
| `--text-*` (+ `--text-*--line-height`) | `text-hero` |
| `--font-weight-*`, `--leading-*`, `--tracking-*` | `font-heavy`, `leading-arabic`, `tracking-…` |
| `--radius-*` | `rounded-card`, `rounded-s-card`, … |
| `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`, `--text-shadow-*` | `shadow-card`, `inset-shadow-hair`, … |
| `--ease-*` | `ease-pop` |
| `--animate-*` | `animate-rise` |
| `--container-*` | `w-chat`, `max-w-chat`, `@chat:` |
| `--breakpoint-*` | `phone:`, `max-phone:` |
| `--spacing` / `--spacing-*` | every spacing utility; `p-4` is `calc(var(--spacing) * 4)` |
| `--blur-*`, `--perspective-*`, `--aspect-*` | `blur-xs`, … |

There is **no** `--duration-*` and no `--z-*` namespace: `duration-fast` and `z-panel` generate nothing `[run]`. Write `duration-(--duration-fast)` / `z-(--z-panel)`, or define an `@utility`.

Three behaviours to know:

1. **Theme variables are emitted only when something uses them.** A token used by no utility and no `var()` in scanned source is absent from the CSS. The scanner does pick up `var(--color-x)` written in a TSX string, so a Motion prop like `"var(--color-xp)"` keeps the variable alive `[run]`. A name assembled at runtime does not. For tokens that JS builds dynamically, declare them in `@theme static { … }` (always emitted).
2. **`@theme inline`** makes utilities use the variable's *value* instead of a reference. Needed when a token points at another variable that changes per theme or per element:

```css
:root                 { --surface: #ffffff; --fg: #111111; }
[data-theme="stage"]  { --surface: #0b0f14; --fg: #f4f4f5; color-scheme: dark; }

@theme inline {
  --color-surface: var(--surface);   /* bg-surface → background-color: var(--surface) */
  --color-fg: var(--fg);
}
```

   `bg-surface/50` still works (it becomes `color-mix(in oklab, var(--surface) 50%, transparent)`) `[run]`. This is the whole theming mechanism: components use `bg-surface text-fg` and never mention the theme.
3. `@theme` must be top level in the CSS file, not nested in a selector or media query. (Standard v4 rule; not re-tested.)

Using a token outside a utility: `var(--color-xp)` in CSS, `bg-(--my-var)` / `w-(--panel-w)` / `origin-(--transform-origin)` in class names (the v4 shorthand for `[var(--x)]`), and `--alpha(var(--color-xp) / 20%)` / `--spacing(4)` inside your own CSS `[run]`.

### 2.3 Custom variants and utilities

```css
/* stage: variant bound to a data attribute (also matches descendants) */
@custom-variant stage (&:where([data-theme="stage"], [data-theme="stage"] *));

/* dark: defaults to the OS setting (prefers-color-scheme). Rebind it, or classes pasted from
   component libraries will switch with the laptop's dark mode during the demo. */
@custom-variant dark (&:where([data-theme="stage"], [data-theme="stage"] *));

/* block form, several selectors */
@custom-variant hocus {
  &:hover, &:focus-visible { @slot; }
}

/* a utility that works with every variant (hover:focus-ring, stage:focus-ring …) */
@utility focus-ring {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* functional utilities */
@utility tab-* { tab-size: --value(integer); }        /* tab-4 */
@utility glow-* { --glow: --value(--color-*); }       /* glow-xp reads the colour token */
```

All of the above compile and produce the expected selectors `[run]`. Inside your own CSS you can reuse variants with `@variant stage { … }` and utilities with `@apply rounded-xl p-4;`. Put hand-written component CSS in `@layer components { … }` so utilities still win.

### 2.4 RTL

`<html dir="rtl" lang="ar">` is already set. Verified output `[run]`:

| Write | Generates | Note |
|---|---|---|
| `ps-4` `pe-4` `ms-auto` `me-3` | `padding-inline-start` … | Use instead of `pl/pr/ml/mr` |
| `start-0` `end-2` | `inset-inline-start/end` | Use instead of `left/right` |
| `inset-x-0` `inset-y-2` | `inset-inline` / `inset-block` | Symmetric, safe |
| `text-start` `text-end` `float-start` | logical | |
| `border-s` `border-e-2` | `border-inline-start/end` | |
| `rounded-s-lg` `rounded-e-xl` `rounded-ss-md` | logical corner radii | `ss`, `se`, `es`, `ee` exist |
| `scroll-ps-4`, `pbs-2`, `mbs-4` | logical scroll padding, block start | |
| `space-x-2`, `divide-x` | `margin-inline-*`, `border-inline-*` | Already direction-aware. **Do not add `rtl:space-x-reverse`**: it flips them back |
| `rtl:` / `ltr:` | `:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *)` | Matches by *ancestor attribute* too; see the nested-`dir` trap below |

Still **physical**, so they need a hand in RTL:

- `translate-x-*`: a slide "from the inline end" is `ltr:translate-x-4 rtl:-translate-x-4`. Same for Motion's `x`.
- `origin-bottom-right` and friends: "bottom inline-end corner" is `ltr:origin-bottom-right rtl:origin-bottom-left`.
- `bg-linear-to-r`, `rotate-*`, `skew-*`, `left-*` / `right-*`, `mask-r-*`.
- Directional icons (arrows, chevrons, "next"): `rtl:-scale-x-100`. Do not mirror clocks, checkmarks, logos, charts or media controls.
- The sign-in split is a *physical* requirement (form on the left). `flex-row` follows the direction, so in RTL the first child sits on the right. Simplest fix: keep the DOM order form-then-showcase and use `flex flex-col md:flex-row-reverse`. In an RTL container `row-reverse` lays items out left to right, so the form lands on the left and still comes first for keyboard and screen readers. (CSS flexbox rule; not seen in a browser here.)
- **Nested-`dir` trap.** Because of the `[dir="rtl"] *` part of the selector, `rtl:` utilities keep matching inside a nested `dir="ltr"` element as long as `<html>` is `dir="rtl"`, and `ltr:` utilities match there as well. Both apply, and `rtl:` wins because it is emitted later `[run: selectors and order]`. So a `dir="ltr"` island does not switch `ltr:`/`rtl:` pairs. Avoid `dir="ltr"` on layout containers; reserve it for short inline Latin runs, and do not put `ltr:`/`rtl:` classes inside them.

Arabic text specifics:

- No `tracking-*` on Arabic. Letter-spacing breaks the joined script. Keep `tracking-normal` and add space with size and weight instead. `uppercase` and `italic` are meaningless too. (General typographic fact, not a Tailwind test.)
- Arabic needs more line height than Latin at the same size; set it per text token with `--text-*--line-height`.
- Latin runs inside Arabic (SQL, Power BI, `70%`, file names): wrap them in `<bdi>` or `<span dir="ltr">`, or the punctuation jumps to the wrong side. `[unicode-bidi:isolate]` compiles as an arbitrary property; there is no built-in bidi utility `[run]`.
- **Latin digits.** `(1234.5).toLocaleString("ar-SA")` gives `١٬٢٣٤٫٥`. `"ar-SA-u-nu-latn"` gives Latin digits but an Arabic percent sign (`70٪`). `"en-US"` gives `1,234.5` and `70%`. For dates use `"ar-SA-u-nu-latn-ca-gregory"` (gives `19 نوفمبر 2026`) and pass `timeZone` explicitly `[run, Node 24]`. Put this in one `formatNumber` / `formatDate` helper and ban bare `toLocaleString()`: its default locale is the machine's, so server and browser can disagree and cause a hydration mismatch.
- `tabular-nums` for counters, XP and percentages so digits do not jitter while they count up.

### 2.5 Container queries, motion preferences, entry styles

```html
<div class="@container/card">                    <!-- container-type: inline-size; container-name: card -->
  <div class="grid @md/card:grid-cols-2 @max-md/card:gap-2 @min-[420px]:p-6">…</div>
</div>
```

`@md` is 28rem, from `--container-md`; the full scale is `@3xs` (16rem) to `@7xl` (80rem). Unnamed form: `@container` + `@lg:flex`. Built in, no plugin `[run]`. Use them for cards that appear both in a page and inside the 420 px chat panel.

- `motion-safe:` is `@media (prefers-reduced-motion: no-preference)`, `motion-reduce:` is `(prefers-reduced-motion: reduce)` `[run]`. Pattern: `motion-safe:animate-rise`, or `transition … motion-reduce:transition-none`.
- `starting:opacity-0` is `@starting-style` (CSS-only entry transition); pair with `transition-discrete` when toggling `display` `[run]`.
- `hover:` is wrapped in `@media (hover: hover)`, so hover styles do not exist on touch screens `[run]`. Anything revealed only on hover is invisible on a phone.
- Transforms are separate properties in v4: `scale-95` sets `scale`, `translate-y-2` sets `translate`. `transition-transform` covers `transform, translate, scale, rotate`; plain `transition` covers colours, opacity, shadow, transforms and filters. Explicit lists: `transition-[opacity,scale]`.
- `delay-150` sets **transition**-delay only. For a keyframe animation write `[animation-delay:140ms]`.

### 2.6 v3 habits that are wrong in v4

Checked by compiling `[run]` (preflight items read in `preflight.css` `[src]`):

| v3 habit | v4 reality |
|---|---|
| `tailwind.config.js`, `@tailwind base;` | `@import "tailwindcss";` + `@theme` |
| `ring` = 3 px | `ring` = 1 px. Old look: `ring-3` |
| `shadow-sm`, `shadow` | Shifted one step: v3 `shadow-sm` is now `shadow-xs`, v3 `shadow` is now `shadow-sm` |
| `rounded-sm`, `rounded` | v3 `rounded-sm` is now `rounded-xs`; `rounded-sm` = 0.25rem |
| `outline-none` to hide focus rings | Now a real `outline-style: none`. The accessible one is `outline-hidden` |
| `bg-opacity-50` | `bg-black/50` (colour-mix) |
| `bg-gradient-to-r` | The v4 name is `bg-linear-to-r`; the old one still compiles in 4.3.5 as an alias |
| `border` is gray | Default border colour is `currentColor`. Always give a colour |
| buttons have `cursor: pointer` | Preflight sets none. Add `cursor-pointer` |
| `[--x:…]` then `w-[var(--x)]` | Still fine; shorthand is `w-(--x)` |
| `space-x-reverse` for RTL | Not needed (2.4) |

Preflight also makes `svg`, `img`, `video` `display: block`. An inline SVG icon next to text needs a flex parent (`inline-flex items-center gap-2`) or `inline` on the icon.

---

## 3. Zustand 5.1.0 with `persist`

### 3.1 What actually happens `[src: esm/react.mjs, esm/middleware.mjs]` `[run: zustand.mjs]`

- `useStore` calls `useSyncExternalStore(subscribe, () => selector(getState()), () => selector(getInitialState()))`. During SSR **and during hydration** a component sees the *initial* state, then re-renders with the real one. So Zustand 5 does not produce a hydration-mismatch error by itself, but the first pass renders initial state ("signed out, 0 XP"), and anything decided in that pass is decided on initial state.
- On the server `localStorage` does not exist (checked on Node 24.15). `createJSONStorage` then returns `undefined`, the middleware turns itself off, and **`store.persist` is `undefined` on the server** even though the types say it exists. Touch `useGame.persist` only in effects, event handlers, or the subscribe/client-snapshot arguments of `useSyncExternalStore`.
- With `localStorage` and no `skipHydration`, the store hydrates synchronously while the module loads in the browser (`getState()` already has the saved state, `getInitialState()` does not).
- `partialize` picks what is written. Default `merge` is a shallow `{ ...current, ...persisted }`.
- A stored `version` different from the configured one calls `migrate`; with no `migrate` the saved state is **dropped** and an error is logged.
- A selector that returns a fresh object or array on every call (`(s) => ({ xp: s.xp })`, `(s) => s.items.filter(…)`) makes `useSyncExternalStore` see a new snapshot each render, which React reports as an infinite loop. Select primitives, or wrap the selector with `useShallow`. (Follows from the hook's source; not executed here.)

### 3.2 A typed, persisted store

```ts
// src/stores/game.ts [tsc]
"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type GameData = { name: string | null; xp: number; completed: string[]; streak: number };
type GameActions = {
  signIn: (name: string) => void;
  addXp: (amount: number) => void;
  complete: (courseId: string) => void;
};
export type GameState = GameData & GameActions;

const initialData: GameData = { name: null, xp: 0, completed: [], streak: 0 };

export const useGame = create<GameState>()(          // note the extra (): required with middleware in TypeScript
  persist(
    (set) => ({
      ...initialData,
      signIn: (name) => set({ name }),
      addXp: (amount) => set((s) => ({ xp: s.xp + amount })),
      complete: (courseId) =>
        set((s) => (s.completed.includes(courseId) ? s : { completed: [...s.completed, courseId] })),
    }),
    {
      name: "masari:game:guest",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,                           // hydrate from an effect, see 3.3
      partialize: ({ name, xp, completed, streak }): GameData => ({ name, xp, completed, streak }),
      merge: (persisted, current) => ({ ...current, ...initialData, ...(persisted as Partial<GameData> | undefined) }),
      migrate: (old, version) => (version < 1 ? { ...initialData, ...(old as Partial<GameData>) } : (old as GameData)),
    },
  ),
);
```

Reading: `const xp = useGame((s) => s.xp)`. Several fields: `useGame(useShallow((s) => ({ xp: s.xp, streak: s.streak })))` with `useShallow` from `zustand/react/shallow`. Outside React (the advisor's dispatcher): `useGame.getState().addXp(50)`.

Keep game rules (XP amounts, level thresholds, match %) in pure functions in `src/lib/`, and call them from the actions. That is what makes them testable with Vitest and enforceable in code.

### 3.3 Hydration in Next

```tsx
// [tsc]
"use client";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const subscribeHydration = (onChange: () => void) => useGame.persist.onFinishHydration(onChange);

export function useGameHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, () => useGame.persist.hasHydrated(), () => false);
}

/** Render once, near the root. */
export function StoreHydrator() {
  useEffect(() => {
    void useGame.persist.rehydrate();
  }, []);
  return null;
}

/** Wrap signed-in screens. */
export function Gate({ children }: { children: ReactNode }) {
  const hydrated = useGameHydrated();
  const name = useGame((s) => s.name);
  const router = useRouter();
  useEffect(() => {
    if (hydrated && name === null) router.replace("/");   // decide only AFTER hydration
  }, [hydrated, name, router]);
  if (!hydrated || name === null) return null;            // or a skeleton
  return <>{children}</>;
}
```

- The rule: **no decision that depends on saved state before `hydrated` is true.** Without the flag a signed-in user is bounced to sign-in on every reload, because the first render sees `name === null`.
- With synchronous `localStorage`, `rehydrate()` has finished by the time the call returns `[run]`; `await` it anyway.
- If the skeleton flash on reload matters for a screen, use the inline-script technique (1.11) to set a `data-` attribute on `<html>` before paint and style from it.

### 3.4 Per-user keys

Two ways; both avoid the trap below.

**A. One key per user, switched at sign-in** `[run]`:

```ts
export async function switchUser(userId: string) {
  useGame.persist.setOptions({ name: `masari:game:${userId}` });
  await useGame.persist.rehydrate();
}
```

**The trap:** with the *default* `merge`, rehydrating from a key that has no saved value keeps the previous user's state in memory (`{ ...current, ...undefined }`), and the next `set` writes it under the new user's key. Verified: user B started with user A's 99 XP `[run]`. The `merge` in 3.2 (`{ ...current, ...initialData, ...persisted }`) resets data fields first; with it a fresh user starts at 0 and the other user's saved state is untouched `[run]`. Do not "reset" with `setState(initial)` before switching: every `setState` writes to whichever key is current.

With A the browser must also remember **who** is signed in, in a small separate key (say `masari:session`): after a reload the store only knows its default key. The hydrator then does, in one effect: read the session key, `setOptions({ name })` for that user, `rehydrate()`. Derive `userId` from the name with a stable slug function (trim, lower-case, collapse spaces). Arabic names are fine as `localStorage` keys. `clearStorage()` removes only the current key.

**B. One key holding all users:** state shaped `{ currentUserId: string | null; users: Record<string, UserData> }`. No `setOptions`, no rehydrate dance, the leaderboard can read other local users, and sign-out is `currentUserId = null`. With `noUncheckedIndexedAccess`, `users[id]` is `UserData | undefined`, which forces the right checks. Simpler and harder to get wrong; the cost is rewriting the whole blob on every change (irrelevant at this size).

---

## 4. Base UI 1.9.0 (`@base-ui/react`)

Source: `node_modules/@base-ui/react/docs/react/` `[docs]`. The package was renamed from `@base-ui-components/react`; only `@base-ui/react` is right. One import path per component, parts under a namespace:

```ts
import { Dialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import { Tabs } from "@base-ui/react/tabs";
import { Menu } from "@base-ui/react/menu";
import { Select } from "@base-ui/react/select";
import { Progress } from "@base-ui/react/progress";
import { Toast } from "@base-ui/react/toast";
import { DirectionProvider } from "@base-ui/react/direction-provider";
```

Also present in 1.9 and likely useful: `drawer` (swipe-to-dismiss sheet, good for the chat on phones), `scroll-area`, `collapsible`, `accordion`, `avatar`, `meter`, `switch`, `field`, `form`, `merge-props`, `use-render`.

Wrong names fail the type check, which is your safety net: `<Dialog.Content>` (it is `Popup`), `<Tabs.Tab selected>` both error `[tsc]`. There is no `asChild`; composition is the `render` prop.

### 4.1 One-time setup

- Stacking: wrap the app content in an element with `isolation: isolate` (Tailwind `isolate`) so portaled popups always sit above it without `z-index` wars.
- iOS 26 Safari: add `body { position: relative; }` and position dialog backdrops `absolute` there; the docs' own class is `fixed inset-0 min-h-dvh … supports-[-webkit-touch-callout:none]:absolute`.
- Portals append to `<body>`. They inherit `dir`, fonts and theme only from `<html>` / `<body>`. A `data-theme="stage"` set on a section does not reach a popup opened from inside it: pass `container` to the `Portal`, or repeat the attribute on the `Popup`.

```tsx
// src/app/providers.tsx [tsc]
"use client";
export const toastManager = Toast.createToastManager();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DirectionProvider direction="rtl">
      <Tooltip.Provider delay={300}>
        <Toast.Provider toastManager={toastManager} timeout={4000}>
          {children}
          <Toast.Portal>
            <Toast.Viewport className="fixed bottom-4 start-4 z-50 w-80">
              <ToastList />
            </Toast.Viewport>
          </Toast.Portal>
        </Toast.Provider>
      </Tooltip.Provider>
    </DirectionProvider>
  );
}
```

`DirectionProvider` only changes Base UI **behaviour** (arrow keys in tabs and menus, slider direction, logical sides). It does not set `dir`; the HTML attribute is still required.

### 4.2 Animating open and close

Popups stay mounted until their closing animation ends. Two attribute pairs:

- CSS **transitions** (preferred, they reverse cleanly if the user closes mid-way): `[data-starting-style]` is the state to animate *from* on open, `[data-ending-style]` the state to animate *to* on close.
- CSS **keyframes**: `[data-open]` and `[data-closed]`.

Tailwind 4 has a bare `data-…:` variant, so the docs' own pattern is one line `[docs: quick-start, dialog]` `[run: compiles]`:

```tsx
<Popover.Popup className="origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-out
  data-starting-style:scale-95 data-starting-style:opacity-0
  data-ending-style:scale-95 data-ending-style:opacity-0" />
```

- `origin-(--transform-origin)` makes the popup grow from its anchor. The variable is set on the `Positioner`.
- Different in/out timing: `data-ending-style:duration-150` (the 200 ms in / 150 ms out the brief asks for).
- `data-instant` is present when Base UI wants no animation (e.g. moving between adjacent tooltips): add `data-instant:transition-none`.
- `onOpenChangeComplete(open)` fires after the animation, the right moment to focus something or start the next step of a sequence.

With **Motion** `[docs: handbook/animation]`:

- Unmount on close (default): control `open` yourself, put `<AnimatePresence>` around `{open && <X.Portal keepMounted>…}`, and compose the popup with `render={<motion.div initial=… animate=… exit=… />}`.
- Kept mounted: `<X.Portal keepMounted>` and `render={(props, state) => <motion.div {...(props as HTMLMotionProps<"div">)} initial={false} animate={{ opacity: state.open ? 1 : 0 }} />}`.
- Base UI detects the end of a Motion exit only if it animates `opacity`. Otherwise call `eventDetails.preventUnmountOnClose()` in `onOpenChange` and `actionsRef.current.unmount()` when your animation completes.

### 4.3 Parts, props and state attributes

`render` replaces the element or composes with another component: `render={<h2 />}`, `render={<Link href="/jobs" />}`, or `render={(props, state) => …}`. `className` and `style` also accept `(state) => …`. Change handlers receive `(value, eventDetails)`; `eventDetails.reason` says why (`'escape-key'`, `'outside-press'`, `'trigger-press'`, …) and `eventDetails.cancel()` vetoes the change.

**Dialog**: `Root > Trigger`, `Portal > Backdrop`, `Viewport > Popup > Title, Description, Close`.

- `Root`: `open`, `onOpenChange`, `defaultOpen`, `modal` (`true` default: focus trap, scroll lock, outside pointer events off; `false`; `'trap-focus'`), `disablePointerDismissal`, `onOpenChangeComplete`, `actionsRef`, `handle`.
- `Popup`: `initialFocus`, `finalFocus`. Attributes on `Backdrop` and `Popup`: `data-open`, `data-closed`, `data-starting-style`, `data-ending-style`; on `Popup` also `data-nested`, `data-nested-dialog-open`, `--nested-dialogs`.
- Always include a `Dialog.Title` (use `sr-only` if it must be invisible).
- Open it from anywhere (keyboard shortcut, the advisor's tool call): control `open` from the store, or `const handle = Dialog.createHandle()` and call `handle.open(null)` / `handle.close()` from an event handler or effect.
- **A side panel that stays open while the page is used** (the chat): `modal={false}` **and** `disablePointerDismissal`. A non-modal dialog otherwise closes on any outside press or when focus leaves it, which would close the chat the moment the advisor "opens a page for you". A plain animated `<aside>` is also a fair choice there; Dialog earns its keep for true modals. With `disablePointerDismissal` a tap on the backdrop no longer closes the panel, so on phones either give it a visible close button or render it modal and dismissible at that width.

```tsx
// [tsc] chat-style panel: inline-end side, 16 px slide, 200 ms in / 150 ms out
<Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)} modal={false} disablePointerDismissal>
  <Dialog.Portal>
    <Dialog.Backdrop className="fixed inset-0 bg-black/30 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 md:hidden" />
    <Dialog.Popup className="fixed inset-y-2 end-2 w-[420px] max-w-[calc(100vw-1rem)] rounded-xl transition-[opacity,translate] duration-200 ease-out data-ending-style:duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 ltr:data-ending-style:translate-x-4 ltr:data-starting-style:translate-x-4 rtl:data-ending-style:-translate-x-4 rtl:data-starting-style:-translate-x-4">
      <Dialog.Title className="sr-only">…</Dialog.Title>
      {children}
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>
```

**Popover / Tooltip / Menu / Select** share the anchored structure `Root > Trigger`, `Portal > Positioner > Popup (> Arrow)`.

- `Positioner` props: `side` (`'top' | 'bottom' | 'left' | 'right' | 'inline-start' | 'inline-end'`; **use the `inline-*` values in RTL**), `align` (`'start' | 'center' | 'end'`), `sideOffset`, `alignOffset`, `collisionPadding` (default 5), `collisionAvoidance`, `anchor`, `sticky`, `positionMethod`.
- CSS variables on the `Positioner`: `--anchor-width`, `--anchor-height`, `--available-width`, `--available-height`, `--transform-origin`, `--positioner-width`, `--positioner-height`. E.g. `min-w-(--anchor-width) max-h-(--available-height)`.
- Attributes on `Popup`: `data-open`, `data-closed`, `data-side`, `data-align`, `data-starting-style`, `data-ending-style`, `data-instant`. On every `Trigger`: `data-popup-open` (style the pressed state with `data-popup-open:…`).
- **Tooltip**: needs `Tooltip.Provider` (shared `delay`, `closeDelay`, `timeout`); default trigger delay is 600 ms. **Tooltips are disabled on touch devices** by design. Anything a phone user must be able to read goes in a `Popover` (`<Popover.Trigger openOnHover delay={150}>`), not a tooltip. `<Tooltip.Trigger render={<button …/>} />` attaches it to your own button.
- **Menu**: `Menu.Item` takes `onClick`, `closeOnClick` (default true), `disabled`; a link item is `Menu.LinkItem`. Items are highlighted with `data-highlighted` (keyboard and pointer), not `:hover`. Also `Menu.Group`, `GroupLabel`, `Separator`, `RadioGroup` / `RadioItem`, `CheckboxItem`, `SubmenuRoot` / `SubmenuTrigger`. `modal` defaults to true.
- **Select**: `<Select.Root items={[{ label, value }]} value onValueChange>`; with `items`, `<Select.Value placeholder="…" />` renders the selected label by itself. Structure `Trigger > Value, Icon`, `Portal > Positioner > Popup > List > Item > ItemText, ItemIndicator`. Items carry `data-selected`, `data-highlighted`; the trigger `data-popup-open`, `data-placeholder`. By default the popup **overlaps the trigger** to align the selected item (`alignItemWithTrigger`, `data-side="none"`); set `alignItemWithTrigger={false}` on the `Positioner` for a normal dropdown. `onValueChange` receives `Value | null`.

**Tabs**: `Root > List > Tab…, Indicator`, then `Panel…`.

- `Root`: `value` / `defaultValue` (default `0`) / `onValueChange(value, details)`; the value type is `Tabs.Tab.Value`, so `String(value)` if you keep strings in state. `List`: `activateOnFocus`, `loopFocus`.
- The active tab has **`data-active`** (not `data-selected`, not `aria-selected` styling). Panels: `data-hidden`, `keepMounted`, `data-starting-style` / `data-ending-style`. Everything carries `data-activation-direction` (`left | right | up | down | none`) for direction-aware panel slides.
- `Indicator` exposes `--active-tab-left`, `--active-tab-right`, `--active-tab-top`, `--active-tab-bottom`, `--active-tab-width`, `--active-tab-height`, all in px `[src]`. The docs' sliding indicator: `absolute left-0 w-(--active-tab-width) translate-x-(--active-tab-left) transition-[translate,width]`. The offsets are physical, so **`left-0` is correct here even in RTL**; do not convert it to `start-0`. `renderBeforeHydration` avoids the indicator popping in after load.

**Progress**: `Root > Label, Track > Indicator, Value`.

- `value` is `number | null` (`null` = indeterminate), `min`, `max`. The `Indicator` gets its width as an inline style, anchored at `inset-inline-start: 0`, so it fills from the right in RTL without extra work `[src]`. Animate with `transition-[width]` on the indicator.
- Attributes: `data-progressing`, `data-complete`, `data-indeterminate`.
- `Progress.Value` formats with `Intl.NumberFormat` in the **runtime's** locale. Pass a fixed one to guarantee Latin digits and identical server and browser output: `<Progress.Root value={percent} locale="en" aria-label="…">` `[tsc]`.

**Toast**: see the provider above. `Toast.createToastManager()` at module level lets non-React code (the action dispatcher) raise toasts: `toastManager.add({ title, description, type, timeout, priority, data })`; also `close(id)`, `update(id, …)`, `promise(…)`. Inside React, `Toast.useToastManager()` returns the same methods plus the reactive `toasts` array that you map to `<Toast.Root key={toast.id} toast={toast}>` with `Toast.Content > Title, Description, Action, Close`.

- Stack styling hooks: `--toast-index`, `--toast-offset-y`, `--toast-height`, `--toast-swipe-movement-x/y`; attributes `data-expanded`, `data-limited`, `data-type`, `data-swiping`, `data-starting-style`, `data-ending-style`.
- `Provider`: `limit` (3), `timeout` (5000 ms; 0 = never). `Root`: `swipeDirection` default `['down', 'right']`; with the viewport at the inline-start bottom corner in RTL (physically left), `'left'` is the natural swipe. `Toast.Positioner` anchors a toast to an element ("+50 XP" next to the button that earned it).

---

## 5. `@google/genai` 3.4.0 (Gemini)

Sources: installed `README.md`, `dist/node/node.d.ts`, `dist/node/index.mjs`; request and error behaviour executed offline with a fake `fetch` `[run: genai.mjs]`. **No request was sent to Google.**

### 5.1 Client and key

```ts
// [tsc]
import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;            // caller falls back to the local brain
  client ??= new GoogleGenAI({ apiKey });
  return client;
}
```

- **Never construct the client without a key, and always pass `apiKey` explicitly.** With no key the constructor only logs a warning; the first call then goes looking for ambient Google Cloud credentials (metadata server, application-default credentials) and fails slowly with "Could not load the default credentials" `[run]`. On a machine that has other Google credentials installed it could find them, which this project must never use. The SDK also reads `GOOGLE_API_KEY` and `GEMINI_API_KEY` from the environment when `apiKey` is omitted, with `GOOGLE_API_KEY` winning `[src]`.
- Server only. The key header is `x-goog-api-key` `[run]`.
- **Default API version is `v1`** in this SDK: requests go to `generativelanguage.googleapis.com/v1/models/<model>:generateContent` `[run]`. Per the official API-versions page `v1` supports system instructions, function calling, structured output and thinking; only live/audio, agents, webhooks and explicit caching need `v1beta` `[web]`. If the real API rejects a field with a 400, the first thing to try is `new GoogleGenAI({ apiKey, apiVersion: "v1beta" })`. **UNVERIFIED** against the live API.

### 5.2 Model ids

- `gemini-3.5-flash-lite`: the fast chat model. In the SDK's own model list `[src]`; listed as **Stable**, "fastest, most cost-effective 3.5 model" on the official models page `[web]`; reported in BRIEF.md as working on this key earlier. Use it as the default and keep the `GEMINI_MODEL` override from `.env.example`.
- Next choices if it 404s: `gemini-3.8-flash` (Stable `[web]`, the model the installed README uses in every example), `gemini-4-hydrogen` (recommended for new projects next to 3.5 Flash-Lite `[web]`; no status given), the alias `gemini-flash-lite-latest` (in the SDK's list `[src]`, not on the fetched page).
- Do not use: `gemini-2.5-flash-lite` (served only to keys that used 2.5 before `[web]`; BRIEF.md says it is retired for new keys), `gemini-2.5-flash` and `gemini-2.5-pro` (deprecated, rerouted on 1 Dec 2026 `[web]`), `gemini-2.0-*`, `gemini-3-pro-preview` (shut down `[web]`), anything `1.5`.
- A wrong or retired model id is an HTTP 404 from the API (the README's own error example uses a non-existent model), which the SDK surfaces as `ApiError` with `status === 404` `[run: error mapping only]`. Treat 404 as "model id problem", log it loudly on the server, and fall back.

### 5.3 System instruction + manual tool loop

```ts
// [tsc]
import { ApiError, FunctionCallingConfigMode, GoogleGenAI, type Content, type FunctionDeclaration, type Part } from "@google/genai";

const declarations: FunctionDeclaration[] = [
  {
    name: "navigate",
    description: "Open a screen of the app for the user.",
    parametersJsonSchema: {
      type: "object",
      properties: { screen: { type: "string", enum: ["roadmap", "jobs", "courses"] } },
      required: ["screen"],
    },
  },
];

export async function geminiTurn(history: Content[], signal: AbortSignal): Promise<string | null> {
  const ai = gemini();
  if (!ai) return null;
  const contents: Content[] = [...history];

  for (let step = 0; step < 4; step++) {                       // hard cap on tool rounds
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      contents,
      config: {
        systemInstruction: SYSTEM,
        tools: [{ functionDeclarations: declarations }],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
        abortSignal: signal,
        httpOptions: { timeout: 12_000 },
      },
    });

    const calls = response.functionCalls ?? [];
    if (calls.length === 0) return response.text ?? "";

    const modelTurn = response.candidates?.[0]?.content;
    if (modelTurn) contents.push(modelTurn);                    // unchanged: its parts carry thoughtSignature
    const parts: Part[] = [];
    for (const call of calls) {
      const name = call.name ?? "";
      const output = await runTool(name, call.args ?? {});      // validate args; never trust them
      parts.push({ functionResponse: { id: call.id, name, response: { output } } });
    }
    contents.push({ role: "user", parts });                      // all responses of the round in one turn
  }
  return null;                                                   // too many rounds: fall back
}
```

- `contents` is `Content[]` with roles `"user"` and `"model"` (not `"assistant"`). A bare string is shorthand for one user turn. Everything else goes in `config`: there is no top-level `system`, `tools` or `temperature`, and `config: { system: … }` is a type error `[tsc]`.
- Declare parameters with `parametersJsonSchema` (plain JSON Schema), as the installed README does.
- `response.functionCalls` is `FunctionCall[] | undefined`; `name`, `args` and `id` are all optional in the types.
- Function results go back as `role: "user"` with `functionResponse` parts; the SDK's own automatic loop does the same `[src]`. Put the payload under `response: { output: … }`, or `{ error: "…" }` for a failure. Helper: `createPartFromFunctionResponse(id, name, response)`.
- **Append the model's `content` object as received.** Its parts can carry `thoughtSignature`, which must return to the model untouched `[src]`.
- `response.text` joins the text parts. When the response also holds a function call it logs a `console.warn` and can be `undefined` `[run]`. In a loop that expects calls, read `response.candidates?.[0]?.content?.parts` yourself.
- An empty or blocked answer shows as `response.text === undefined`; look at `response.candidates?.[0]?.finishReason` and `response.promptFeedback?.blockReason`. Treat it as "fall back".
- `FunctionCallingConfigMode.ANY` forces a call (optionally `allowedFunctionNames`), `NONE` forbids them.
- Automatic function calling only applies to callable tools (`mcpToTool`); with plain declarations nothing runs behind your back.
- The enforcement belongs in `runTool`: check the screen name against an allow-list, check the job id exists, and so on. The prompt is not a guard.

### 5.4 Streaming

```ts
// [tsc]
export async function* geminiStream(history: Content[], signal: AbortSignal): AsyncGenerator<string> {
  const ai = gemini();
  if (!ai) return;
  const stream = await ai.models.generateContentStream({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    contents: history,
    config: { systemInstruction: SYSTEM, abortSignal: signal, httpOptions: { timeout: 20_000 } },
  });
  for await (const chunk of stream) {
    const text = chunk.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (text) yield text;
  }
}
```

`generateContentStream` returns a Promise of an async iterable (await it, then `for await`). Chunks expose `.text`, `.functionCalls` and `candidates[0].finishReason` `[run]`. Function-call arguments are not streamed in pieces on the Gemini API (the `partialArgs` field is marked "not supported in Gemini API" in the types `[src]`), so a call can be acted on as soon as its chunk arrives. The request goes to `…:streamGenerateContent?alt=sse` `[run]`. For the advisor a practical shape is: run the tool rounds without streaming (they are short), then stream the final answer.

### 5.5 JSON output

```ts
// [tsc] request shape also checked [run]
const response = await ai.models.generateContent({
  model, contents: `Extract the skills from this CV.\n\n${cvText}`,
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: {
      type: "object",
      properties: { skills: { type: "array", items: { type: "object",
        properties: { name: { type: "string" }, stars: { type: "integer", minimum: 1, maximum: 3 }, evidence: { type: "string" } },
        required: ["name", "stars", "evidence"] } } },
      required: ["skills"],
    },
    abortSignal: signal, httpOptions: { timeout: 20_000 },
  },
});
const data: unknown = JSON.parse(response.text ?? "null");   // then validate with zod
```

Still validate: check with code that every `evidence` string really occurs in the CV text, since the product promise is evidence-based skills. Whether JSON mode can be combined with tools in one request on this model: **UNVERIFIED**; keep them in separate calls.

### 5.6 Timeouts, abort, errors `[run]` `[src]`

| Situation | What is thrown | How to recognise it |
|---|---|---|
| HTTP 4xx / 5xx | `ApiError` (exported) | `error.status` is the number; `error.message` is the JSON body as a string, e.g. `{"error":{"code":404,"message":"…","status":"NOT_FOUND"}}` |
| `httpOptions.timeout` elapsed | `DOMException`, `name === "AbortError"` | the caller's signal is **not** aborted |
| Caller aborted (`abortSignal`) | the same `DOMException` | `signal.aborted === true` |
| No network / DNS | `TypeError: fetch failed` (Node's own fetch error, `cause.code` such as `ENOTFOUND`; the SDK passes it through unchanged) | not an `ApiError` |
| No key | plain `Error` ("Could not load the default credentials…"), slow | prevent it (5.1) |

```ts
// [tsc]
export function classifyGeminiError(error: unknown, signal: AbortSignal): BrainFailure {
  if (signal.aborted) return "aborted";
  if (error instanceof DOMException && error.name === "AbortError") return "timeout";
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return "auth";
    if (error.status === 429) return "rate_limited";
    if (error.status >= 500) return "server";
    return "bad_request";                       // 400, and 404 for an unknown model id
  }
  if (error instanceof TypeError) return "offline";
  return "unknown";
}
```

- `httpOptions.timeout` is in **milliseconds**, applies per attempt, and stays armed while the body is read, so it also caps the total length of a stream `[src]`. Set it per call in `config.httpOptions` or once in the constructor.
- **There are no retries unless you pass `httpOptions.retryOptions`** `[src]`. With `retryOptions: { attempts: 2 }` it retries 408, 429, 500, 502, 503 and 504 (omit `attempts` and it makes up to 5). For a live demo with a local fallback, one attempt and a short timeout beat a long wait.
- `thinkingConfig` exists (`thinkingBudget`, `thinkingLevel: MINIMAL | LOW | MEDIUM | HIGH | XHIGH`, `includeThoughts`) `[src]`. Which of these `gemini-3.5-flash-lite` accepts: **UNVERIFIED**. Start without it.
- `temperature`, `topP`, `maxOutputTokens`, `stopSequences`, `seed` are in `config`. Google's own code-generation notes for this SDK say to leave `maxOutputTokens`, `topP` and `topK` unset unless there is a specific need `[web: codegen_instructions.md in the SDK repository]`; a low `maxOutputTokens` can cut an answer short, so ask for brevity in the system instruction instead.

---

## 6. `@anthropic-ai/sdk` 1.10.0 (Claude)

Sources: the `claude-api` skill bundled with this toolchain (model table cached 3 Nov 2026), the installed types, and an offline run with a fake `fetch` `[run: anthropic.mjs]`. **No request was sent to Anthropic.** There is no Anthropic key on this machine, so this path only becomes live when one is added.

### 6.1 What is different in SDK 1.x

- It sends `anthropic-version: 2026-10-21` `[run]`. On that API version **`temperature`, `top_p` and `top_k` are rejected for every model**, and they are not in the SDK's types any more (`temperature: 0` is a compile error `[tsc]`). Steer with the prompt, `output_config.effort`, and structured outputs.
- `MessageParam` is a union with one type per role (`user`, `assistant`, `system`). Type conversations as `Anthropic.MessageParam[]`; do not redefine message or tool types.
- No assistant prefill on current models (a last `assistant` message returns 400). Use structured outputs for format.

### 6.2 Model ids (exact strings, never add a date suffix)

| Model | ID | Context | $/MTok in / out | Use |
|---|---|---|---|---|
| Claude Haiku 5.5 | `claude-haiku-5-5` | 1M | 0.10 / 0.50 (prompts up to 100K tokens) | **The fast chat model**: high-volume, latency-sensitive work |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | 1M | 2 / 10 | Middle tier |
| Claude Opus 5.5 | `claude-opus-5-5` | 1M | 4 / 20 | The skill's default for new code when no model is named; the careful CV reader |

All three are in the installed SDK's `Model` type `[src]`. Per-model rules that change code:

- **Thinking.** Adaptive thinking is on by default on all three: omit `thinking`. `{ type: "enabled", budget_tokens }` is a 400 everywhere. `{ type: "disabled" }` is a 400 on Opus 5.5 and Sonnet 5.5; on Haiku 5.5 it is accepted only at effort `high` or lower. Control depth and speed with `output_config: { effort: "low" | "medium" | "high" | "xhigh" | "max" }` (default `medium` on Haiku 5.5 and Opus 5.5, `high` on Sonnet 5.5). For chat, `effort: "low"`.
- **Read content by `type`, never by position.** A response can start with `thinking` blocks, so `response.content[0].text` is wrong. Thinking also counts toward `max_tokens`, so a tiny cap can end the reply before any text.
- **Forced tool choice.** `tool_choice: { type: "any" }` or `{ type: "tool", name }` is a 400 on Opus 5.5 and Sonnet 5.5 (Haiku 5.5 accepts it). Use the default `auto`, say in the prompt when to call the tool, and put `strict: true` on the tool for schema-valid arguments.
- **Refusals.** Any of them can end with `stop_reason: "refusal"` (HTTP 200). Check `stop_reason` before reading content; in Dalilak, treat it as "use the local brain". For Opus 5.5 and Sonnet 5.5 the skill's default is to also opt in to server-side fallbacks, which re-runs a declined request on another model within the same call: `client.beta.messages.create({ betas: ["server-side-fallback-2026-07-01"], fallbacks: "default", … })` (this form, also with `.parse`, type-checks in 1.10 `[tsc]`; shown in 6.5). Haiku 5.5 rejects `fallbacks` with a 400, so the chat loop in 6.4 does not send it. Keeping or dropping it on the CV call is the lead's decision; the local fallback covers the demo either way.
- `max_tokens`: about 16000 without streaming, about 64000 with streaming (skill guidance). It is a ceiling, not a target; ask for short answers in the prompt.

### 6.3 Client

```ts
// [tsc]
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function anthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  client ??= new Anthropic({ apiKey, maxRetries: 0, timeout: 20_000 });
  return client;
}
```

- A bare `new Anthropic()` resolves credentials from the environment and from login profiles on disk. Pass `apiKey` explicitly so only this project's `.env.local` is ever used. With nothing resolvable the constructor succeeds and the first call throws a plain `Error` ("Could not resolve authentication method…") `[run]`.
- `timeout` is in **milliseconds** (default 10 minutes). `maxRetries` defaults to 2, so a failing call is attempted 3 times `[run]` and a timeout can cost `timeout × 3`. With a local fallback, use `maxRetries: 0` (or 1) and a short timeout. Per-request override: second argument `{ timeout, maxRetries, signal }`.
- Server only (`dangerouslyAllowBrowser` exists; do not use it).

### 6.4 System prompt + streaming manual tool loop

The skill recommends the SDK's tool runner (`client.beta.messages.toolRunner` with `betaZodTool`) over a hand-written loop. The manual loop is shown because Dalilak needs the same loop shape for three providers and wants to emit its own events between rounds.

```ts
// [tsc] stream + finalMessage also exercised [run]
import { z } from "zod";

const NavigateInput = z.object({ screen: z.enum(["roadmap", "jobs", "courses"]) });

const tools: Anthropic.Tool[] = [
  {
    name: "navigate",
    description: "Open a screen of the app for the user.",
    strict: true,                    // schema-valid arguments; needs additionalProperties: false + required
    eager_input_streaming: true,     // stream tool input as it is generated; then YOU validate it
    input_schema: {
      type: "object",
      properties: { screen: { type: "string", enum: ["roadmap", "jobs", "courses"] } },
      required: ["screen"],
      additionalProperties: false,
    },
  },
];

export async function claudeTurn(
  history: Anthropic.MessageParam[],
  signal: AbortSignal,
  onText: (delta: string) => void,
): Promise<"done" | "fallback"> {
  const api = anthropic();
  if (!api) return "fallback";
  const messages: Anthropic.MessageParam[] = [...history];

  for (let step = 0; step < 4; step++) {
    const stream = api.messages.stream(
      { model: CHAT_MODEL, max_tokens: 64000, system: SYSTEM, tools, output_config: { effort: "low" }, messages },
      { signal },
    );
    stream.on("text", onText);                              // text deltas only
    const message = await stream.finalMessage();            // resolves with the whole Message; rejects on error or abort

    if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") return "fallback";
    const toolUses = message.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (toolUses.length === 0) return "done";

    messages.push({ role: "assistant", content: message.content });   // the WHOLE content, thinking blocks included
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const parsed = use.name === "navigate" ? NavigateInput.safeParse(use.input) : null;
      if (!parsed?.success) {
        results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: "invalid tool input" });
        continue;
      }
      results.push({ type: "tool_result", tool_use_id: use.id, content: await runTool(use.name, parsed.data) });
    }
    messages.push({ role: "user", content: results });      // every result of the round in ONE user message
  }
  return "fallback";
}
```

- `system` is a top-level string. Messages are `{ role: "user" | "assistant", content }`; the first one must be `user`.
- `block.input` is `unknown`: parse it with zod, never `as`. Compare `use.name` with code, do not string-match serialized input.
- Push `message.content` back unmodified. `thinking` blocks must return exactly as received (their text is empty by default; keep them anyway). On these models an altered block, or an edit to an earlier turn of the same conversation, is answered with a 400 ("Invalid `signature` in `thinking` block"). Keep the transcript append-only within a turn's tool loop.
- Several tool calls can come in one assistant message. Answer every one, in a single user message, with `is_error: true` for failures. Do not drop a call.
- `stop_reason` values in 1.10 `[src]`: `end_turn`, `max_tokens`, `stop_sequence`, `tool_use`, `pause_turn`, `refusal`, `model_context_window_exceeded`. Never run tools from a turn that ended in `max_tokens` or `refusal`: the input may be cut off.
- Non-streaming variant: `const message = await api.messages.create({ … }, { signal })`, then the same handling.
- Lower-level events if needed: `for await (const event of stream)` with `event.type === "content_block_delta" && event.delta.type === "text_delta"`. Do not wrap `.on()` handlers in your own Promise; `finalMessage()` already covers completion, error and abort.

### 6.5 Structured output

```ts
// [tsc]; parse + zodOutputFormat also exercised on the non-beta client [run]
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const CvSkills = z.object({ skills: z.array(z.object({ name: z.string(), stars: z.number(), evidence: z.string() })) });

const response = await api.beta.messages.parse(
  {
    model: process.env.ANTHROPIC_CV_MODEL || "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",   // a declined request is re-run on another model in the same call; remove for claude-haiku-5-5 (400)
    system: "Extract skills from the CV. evidence must be a sentence copied from the CV. stars is 1, 2 or 3.",
    messages: [{ role: "user", content: cvText }],
    output_config: { effort: "low", format: zodOutputFormat(CvSkills) },
  },
  { signal, timeout: 45_000 },
);
if (response.stop_reason === "refusal") return null;   // the whole chain declined: use the local analyzer
return response.parsed_output;                         // typed; null if the text did not parse
```

- This example **turns the refusal fallback on** (the `betas` + `fallbacks` lines), following the skill's default for Opus 5.5 code. A rescued request is billed at the fallback model's rates. To run without it, delete those two lines and call `api.messages.parse(…)`; the `stop_reason` check stays.
- It is `output_config: { format }`. The old top-level `output_format` is deprecated. The helper works with the installed zod 4 (`import { z } from "zod"`) `[run]`.
- Keep schemas plain: `z.number().int()` leaks an odd min/max description into the schema `[run]`; state ranges in the prompt and check them in code.
- A PDF can be sent directly as a `document` content block (base64, `application/pdf`, placed before the text). Dalilak extracts text first (section 7) so that all three brains get the same input.
- Structured output cannot be combined with citations.

### 6.6 Errors `[run]` `[src]`

All API errors extend `Anthropic.APIError`: `status`, `type` (`"rate_limit_error"`, `"overloaded_error"`, …), `requestID`, `message` (`"<status> <json body>"`). Catch the most specific first; `APIConnectionError` and `APIUserAbortError` are subclasses of `APIError` in this SDK.

| Situation | Class | Retried by the SDK |
|---|---|---|
| Caller aborted (`signal`) | `Anthropic.APIUserAbortError` | no |
| Timeout | `Anthropic.APIConnectionTimeoutError` (extends `APIConnectionError`) | yes |
| No network | `Anthropic.APIConnectionError` (`cause` has the Node error) | yes |
| 400 | `BadRequestError` | no |
| 401 / 403 | `AuthenticationError` / `PermissionDeniedError` | no |
| 404 (wrong or unavailable model id) | `NotFoundError` | no |
| 429 | `RateLimitError` | yes |
| 500 / 529 | `InternalServerError` / `OverloadedError` | yes |
| No credential at all | plain `Error` | no |

```ts
// [tsc]
export function classifyClaudeError(error: unknown): BrainFailure {
  if (error instanceof Anthropic.APIUserAbortError) return "aborted";
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (error instanceof Anthropic.APIConnectionError) return "offline";
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return "auth";
  if (error instanceof Anthropic.RateLimitError) return "rate_limited";
  if (error instanceof Anthropic.NotFoundError || error instanceof Anthropic.BadRequestError) return "bad_request";
  if (error instanceof Anthropic.APIError) return typeof error.status === "number" && error.status >= 500 ? "server" : "unknown";
  return "unknown";
}
```

### 6.7 The provider switch, in one paragraph

Give all three brains one signature, for example `(input, signal) => AsyncIterable<ChatEvent>`, and one failure type (`BrainFailure` above). The route picks the provider from `AI_PROVIDER` and key presence, runs it with `request.signal` and a short timeout, and on **any** failure except `"aborted"` runs the local brain for the same input. If text was already streamed when the failure happened, either let the local brain's answer replace it (send a "reset" event) or buffer the model's first round before showing anything; decide once and do the same for both providers. Message history is provider-specific (`Content[]` vs `MessageParam[]`): keep one neutral history in the client and convert per provider on the server.

---

## 7. Reading the CV: unpdf 2.2.1 and mammoth 1.13.0

Both ran in plain Node here against a hand-built PDF and a hand-built `.docx` `[run: docs.mjs]`. `next.config.ts` already lists both in `serverExternalPackages`, which keeps them out of the server bundle and loads them with Node's own module loader `[docs]`. Nothing else is needed in the config. Running them **inside a Next route handler**: **UNVERIFIED** (no server allowed here).

### 7.1 unpdf

```ts
const { extractText, getDocumentProxy } = await import("unpdf");   // or a static import; ESM only
const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
const { text, totalPages } = await extractText(pdf, { mergePages: true });   // text: string
```

- Without `mergePages`, `text` is `string[]`, one entry per page (assigning it to `string` is a type error `[tsc]`). With it, lines are kept and blank runs are collapsed.
- **The bytes you pass are consumed.** After `getDocumentProxy(bytes)` the array's length is 0 `[run]`. Parse once, reuse the proxy for further calls (`getMeta`, `inspectPages`), and copy first (`bytes.slice()`) if you need the original later.
- A Node `Buffer` is accepted as input `[run]`.
- Not a PDF: throws `InvalidPDFException: Invalid PDF structure.` `[run]`. Catch it and answer 422.
- **A scanned CV has no text layer**: `text` comes back empty or nearly empty, with no error (how text extraction works; the README has a "Spot Scanned Pages" section for this, not run here). Treat fewer than about 50 non-space characters as "could not read this file" and offer paste-as-text. `inspectPages(pdf)` reports `textLength` and `imageCoverage` per page if you want to say why.
- The whole parse runs on the server's event loop (no worker in this build). Cap file size and `pdf.numPages` before extracting, as in 1.6.
- The dynamic `import("unpdf")` keeps the 1.7 MB PDF.js bundle out of memory until the first PDF arrives, which suits this laptop.
- **Arabic PDFs: UNVERIFIED.** No Arabic PDF could be produced here. PDF text extraction of Arabic can come out in visual order or as presentation-form letters depending on how the file was made. Before relying on it: run the demo's real sample CV through this exact code, and normalise the result with `text.normalize("NFKC")` before keyword matching (it folds presentation forms back to ordinary letters).

### 7.2 mammoth

```ts
import mammoth from "mammoth";       // CommonJS with `export =`; works because esModuleInterop is on
const { value, messages } = await mammoth.extractRawText({ buffer: Buffer.from(await file.arrayBuffer()) });
```

- In Node the input must be `{ buffer: Buffer }` or `{ path }`. `{ arrayBuffer }` is the browser build's input and throws "Could not find file in options" in Node `[run]`.
- `value` is the text with each paragraph followed by two newlines. `messages` lists warnings. Arabic text comes through intact `[run]`.
- `.docx` only. An old binary `.doc`, or any non-zip file, throws (`Can't find end of central directory…`) `[run]`. Catch and answer 422.
- Types ship inside the package (`lib/index.d.ts`); no `@types/mammoth`.

---

## 8. Vitest 5.1.0 for pure TypeScript

Checked by running a two-test scratch project with the installed Vitest 5.1.0 and Vite 8.3.8 `[run]` (since removed, so `npm test` stays clean). There is **no `vitest.config.ts` in the project yet**; this is the one to add at the project root:

```ts
// vitest.config.ts
import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",              // the default; jsdom and happy-dom are not installed
    include: ["src/**/*.test.ts"],
    maxWorkers: 1,                    // memory is the scarce thing on this laptop
    isolate: false,                   // faster; fine for pure functions with no module-level state
  },
});
```

```ts
// src/lib/xp.test.ts
import { describe, expect, it, vi } from "vitest";      // globals are off by default: import them

import { levelFor } from "@/lib/xp";

describe("levelFor", () => {
  it("maps xp to a level", () => {
    expect(levelFor(260)).toBe(3);
  });
  it("can pin the clock for streak rules", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-19T09:00:00+03:00"));
    expect(new Date().toISOString()).toBe("2026-11-19T06:00:00.000Z");
    vi.useRealTimers();
  });
});
```

- **Alias: use the explicit `resolve.alias`.** Vite 8's built-in `resolve: { tsconfigPaths: true }` also works, but only for files matched by `tsconfig.json`'s `include`; a test outside `src/` failed to resolve `@/…` with it `[run]`.
- `include` matters: without it Vitest collects every `*.test.*` / `*.spec.*` file in the project, including anything under `design/`, `docs/` or `artifacts/`.
- Keep tested modules free of `"use client"`-only imports, `next/*`, `server-only` (not installed, so it will not resolve), and `window` / `localStorage`. Pure functions: XP and level maths, match percentage, streak rules, the local keyword analyzer, the action dispatcher's validation.
- Vitest does not type-check. `npm run typecheck` is still needed, and test files under `src/` are covered by it.
- `npm test` runs `vitest run` (one pass, no watch). It was not on the list of commands builders must not run, but it does start worker processes; keep runs short and do not leave `vitest` (watch mode) running.

---

## 9. TypeScript 5.9.3: `strict` + `noUncheckedIndexedAccess`

Every line below was compiled `[tsc: patterns.ts, patterns2.tsx]`. `E` = error, `ok` = accepted.

### 9.1 Indexed access is `T | undefined`

| Code | Result |
|---|---|
| `const j: Job = jobs[0]` | E (`Job \| undefined`) |
| `byId["x"].title` on a `Record<string, Job>` | E (possibly undefined) |
| `for (let i…) jobs[i].title` | E |
| `"a b".split(" ")[0]`, `"abc"[0]`, regex `m[1]` | E (`string \| undefined`) |
| `const [head] = jobs; head.title` | E |
| `next[0].title = "x"` on a copied array | E |
| `theme.colors.accent` where `colors: { [k: string]: string }` | E |
| `const xp: Record<string, number> = {…}; xp.profile` | E |
| `pair[0]` on a tuple, `levels[0]` on an `as const` array | ok |
| `levels[n]` with `n: number`, even on `as const` | E |
| `perField.data` / `perField[f]` on `Record<"data" \| "design", T>` | ok: a union-keyed Record has no undefined |
| `for (const job of jobs)`, `for (const [i, job] of jobs.entries())` | ok |

Patterns that keep the code honest:

```ts
const first = jobs[0];
if (!first) return null;                                   // narrow once, then use `first`

const job = byId[id] ?? fallbackJob;                       // default
const firstWord = input.split(" ")[0] ?? "";               // default
for (const [index, job] of jobs.entries()) { /* index and job, no lookup */ }
const next = jobs.map((job, i) => (i === target ? { ...job, title } : job));   // update without indexing
const label = LEVEL_TITLES[level - 1] ?? LEVEL_TITLES[0];  // LEVEL_TITLES declared `as const`
if (jobs.length > 0) { const sure = jobs[0]!; }            // `!` only directly after the check that proves it
```

- **Prefer union keys.** `type Field = "data" | "design" | …; const FIELD_LABEL: Record<Field, string>` makes every lookup non-optional and makes a missing entry a compile error. Use this for skill fields, levels, badges, screens.
- **`satisfies` keeps literal keys:** `const XP = { profile: 50, cv: 100 } satisfies Record<string, number>` then `XP.cv` is `number` (ok). Annotating `: Record<string, number>` instead makes `XP.cv` possibly undefined.
- Narrowing carries across a repeated lookup only when object and key are both `const` names: `if (byId[key]) byId[key].title` is ok, but `if (byId[job.id]) byId[job.id].title` and anything using a reassigned `let i` are E. Assign to a `const` first.
- `Map.get`, `Array.find`, `Array.at` are `T | undefined` with or without the flag.

### 9.2 Other strict-mode traps

| Code | Result |
|---|---|
| `LABELS[s]` with `s: string` on an `as const` object | E (TS7053, implicit any) |
| `for (const k of Object.keys(LABELS)) LABELS[k]` | E; write `Object.keys(LABELS) as Array<keyof typeof LABELS>` |
| `FIELDS.includes(s)` with `s: string` on an `as const` tuple | E; write a type guard: `const isField = (v: string): v is Field => (FIELDS as readonly string[]).includes(v)` |
| `items.filter(Boolean)` typed as `T[]` | E: it does not narrow. `items.filter((x) => x !== undefined)` does |
| `catch (err) { err.message }` | E: `err` is `unknown`. `err instanceof Error ? err.message : String(err)` |
| `const key: string = process.env.X` | E |
| `const data: Job = JSON.parse(text)` | **ok, and that is the trap**: `any` flows in unchecked. Parse `unknown` and validate with zod at every boundary (request bodies, model output, `localStorage`) |
| `[1, 2, 3].reduce((a, b) => a + b)` | ok for the compiler, throws on an empty array at runtime. Always pass an initial value |

### 9.3 React 19 typings (`@types/react` 19.3)

| Code | Result |
|---|---|
| `useRef<HTMLDivElement>()` | E: an argument is required. `useRef<HTMLDivElement>(null)` |
| `ref.current.offsetWidth` | E: `current` is nullable |
| `function X(): JSX.Element` | E: the global `JSX` namespace is gone. Use `React.JSX.Element`, or just `ReactNode` |
| `<div ref={(n) => (node = n)} />` | E: a ref callback must not return a value (a returned function would be a cleanup). Use a block body: `(n) => { node = n; }` |
| `function Panel({ ref }: { ref?: React.Ref<HTMLDivElement> })` | ok: `ref` is an ordinary prop, `forwardRef` is not needed |
| `style={{ "--x": "10px" }}` | E; cast: `style={{ "--x": "10px" } as React.CSSProperties}` |

`isolatedModules` is on: a type must be re-exported with `export type { … }`. Importing types with `import type { … }` or an inline `type` (`import { use, type ReactNode } from "react"`) is the matching habit.

---

## 10. Everything UNVERIFIED, in one place

1. Anything that needs the running app: the examples compile and their library calls ran in Node, but no page or route was served (`next dev` / `next build` are the lead's).
2. Gemini against the real API: that `v1` accepts this request shape for `gemini-3.5-flash-lite`, which `thinkingConfig` values that model accepts, and JSON mode together with tools. Model status comes from the official page via a summarising fetch tool, not from a call on this key.
3. Anthropic against the real API: nothing was called; there is no key. Model facts come from the bundled `claude-api` skill (cached 3 Nov 2026) and the SDK's types.
4. unpdf and mammoth inside a Next route handler with `serverExternalPackages` (they work in plain Node).
5. Arabic text extraction from PDFs (order and letter forms). Test with the real sample CV.
6. Fonts: no font package or file is in the repo, so neither font route was exercised; `next/font/local` pointing into `node_modules` is untested; whether `next dev` works offline with `next/font/google` was not tested (avoid it).
7. Whether `next dev` picks up `.env.local` edits without a restart.
8. `<ViewTransition>` behaviour in this app, and Base UI in the browser (animations, RTL keyboard behaviour, focus handling): read in the docs and type-checked only.
9. Importing Base UI parts or `motion/react-client` directly from a Server Component. Use them from `"use client"` files.
10. `@theme` nested inside a selector being rejected (standard v4 rule, not re-tested).

---

## 11. The 10 mistakes to avoid

1. **Leaving `@import "tailwindcss";` bare.** It scans the whole project, research caches included: 333 KB of CSS instead of 5 KB, measured. Write `@import "tailwindcss" source("..");` in `src/app/globals.css`. And never build class names from pieces (`` `text-${x}` `` generates nothing).
2. **Treating `params` / `searchParams` as objects**, or typing new routes with `PageProps<'/route'>`. They are Promises (`await` or `use()`), and the generated helper types only know routes that existed at the lead's last `next dev` / `build`.
3. **Deciding on saved state before the store has hydrated.** The first render always sees initial state. Gate redirects and "welcome back" UI on a hydrated flag, and never touch `useGame.persist` during render (it is `undefined` on the server).
4. **Switching users with the default `merge`.** A new user inherits the previous user's XP and then saves it under their own key. Use the resetting `merge` from 3.2, or a single `users` map.
5. **Constructing an AI client without an explicit key.** Both SDKs then search the machine for other credentials; the Gemini one also stalls. `if (!key?.trim()) return null` first, pass `apiKey` explicitly, and remember `KEY=` in `.env.local` is an empty string.
6. **Code from memory for the model APIs.** Anthropic: no `temperature` / `top_p` / `top_k`, no `budget_tokens`, no prefill, no forced `tool_choice` on Opus 5.5 / Sonnet 5.5, read blocks by `type`, send `message.content` back whole, all tool results in one user message. Gemini: everything goes in `config`, roles are `user` / `model`, function results go back as a `user` turn, append the model turn unchanged.
7. **Waiting on the network during a live demo.** Gemini does not retry by default and Anthropic retries twice; set a short timeout (ms in both SDKs), pass `request.signal`, classify the error, and fall back to the local brain on anything but a user abort. A streamed response that ends without a `done` event is a failure too.
8. **Physical direction in an RTL app.** Use `ps/pe/ms/me/start/end/text-start`, Base UI `side="inline-end"`, and mirror `translate-x`, `origin-*` and directional icons with `rtl:`. Do not add `rtl:space-x-reverse`, and do not flip layout with a `dir="ltr"` wrapper (`rtl:` classes keep matching inside it). Two things stay physical on purpose: the Tabs indicator's `left-0`, and the sign-in split (form on the left via `md:flex-row-reverse`).
9. **Arabic-Indic digits and locale-dependent formatting.** `toLocaleString("ar-SA")` gives `١٢٣` and a bare `toLocaleString()` can differ between server and browser. One helper with a fixed locale (`"en-US"` for numbers and percentages, `"ar-SA-u-nu-latn-ca-gregory"` for dates), and `locale="en"` on `Progress.Root`.
10. **Relying on what a phone cannot do, or on what vanishes silently.** Tooltips are off on touch devices and `hover:` styles do not exist there; a non-modal Dialog closes on any outside press unless `disablePointerDismissal` is set; unpdf empties the byte array you give it and returns an empty string for a scanned CV without any error. Handle each explicitly.
