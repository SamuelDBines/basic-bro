# basic-bro

> A tiny, dependency-free Node framework with batteries included:
> HTTP server, routing, middleware, validation, and a lightweight JSX runtime.

**basic-bro** is an experiment in building a _fully-standalone_ web stack:

- No giant framework dependency.
- No hidden magic – Everything is explicit TypeScript. You can read the source and understand what’s going on.
- Server + client helpers that are just TypeScript + Node + DOM.
- Composable – Middleware, routers, and validation are all composable functions.
- Strict but friendly types – Designed to scale from “simple script” to more serious projects.

Batteries included, not welded in – You get compression, cors, static, logging, sessions, etc., but you can also swap them out or write your own.

Later on, there will be optional helpers for Postgres and friends – but those will be thin wrappers around libraries **you** install and control.

---

## Features

### 🔧 Server (Node) – `basic-bro/server`

- Minimal but powerful **app** + **router**:
  - Express-ish `app.get('/path', ...handlers)` and nested routers.
  - Route params (`/users/:id`) with automatic parsing.
  - Per-route middleware, nested handlers, pattern-based routes.
- Built-in **middleware** (no external deps):
  - `cors()` – CORS headers.
  - `compression()` – gzip/deflate/brotli, content-aware.
  - `serveStatic()` – static files from `public/`, with path safety.
  - `logger()` – request logging with levels and colors.
  - `rateLimit()` – simple in-memory rate limiting.
  - `sessions()` – cookie/session helper.
  - `jwt()` (planned / WIP) – sign/verify helpers for stateless auth.
- Nice **response helpers**:
  - `res.status(code)`
  - `res.header(name, value)`
  - `res.json(body)`
  - `res.text(body)`
  - `res.html(body)`
  - `res.send(body)` – smart fallback for strings, buffers, JSON, etc.
- **OpenAPI support** (via your validation library):
  - As you define routes & schemas, OpenAPI can be generated automatically.
- 100% **TypeScript-first** – generics for `req`/`res` extensions, middleware, etc.

### 🎨 Client (browser) – `basic-bro/client`

- Tiny, React-style **JSX runtime**:
  - `h(type, props, ...children)` factory.
  - `Fragment` support: `<> ... </>`.
  - Function components: `const Button = (props) => <button>...</button>`.
- No virtual DOM – just **real DOM nodes**:
  - Components render once; state can be wired with simple signals (no diffing).
- Lives in `public/js` (or similar) – you decide the bundler / build step.
- Works great with **TypeScript** + `jsxFactory: "h"` + `jsxFragmentFactory: "Fragment"`.

### ✅ Validation – (integrated / recommended)

basic-bro is designed to pair with your validation / schema library:

- Declarative schemas: `v.object({ email: v.string().email(), ... })`.
- Runtime validation: `schema.validate(input)`.
- `validate()` middleware to check `body`, `query`, `params` etc.
- OpenAPI generation: `openapi({ routes: [...] })` from schemas.

---

## Installation

> **Note:** Names are placeholders. Adjust to your actual package names.

```bash
pnpm add basic-bro
```

## Quick start - Server

```ts
// src/server/index.ts
import http from 'node:http';
import path from 'node:path';
import {
	app as createApp,
	router,
	cors,
	compression,
	logger,
	sessions,
	rateLimit,
	serveStatic,
} from 'basic-bro/server';
import { v, validate } from '@samuelbines/ex-val';

const publicDir = path.join(__dirname, '..', 'public');

const app = createApp({
	title: 'basic-bro demo',
	docsPath: '/docs',
	staticPath: publicDir,
});

app.use(logger());
app.use(cors());
app.use(compression());
app.use(sessions());

const api = router('/api');

const HealthResponse = v.object({ ok: v.boolean() });

api.get('/health', (_req, res) => {
	res.json({ ok: true });
});

const UserParams = v.object({ id: v.string().min(4) });

api.get('/users/:id', validate({ params: UserParams }), (req, res) => {
	res.json({ userId: req.params.id });
});

api.get('/limited', rateLimit({ windowMs: 60_000, max: 10 }), (_req, res) => {
	res.json({ ok: true, note: 'You can only hit this 10 times per minute' });
});

app.use(api);

const server = http.createServer(app.handle);

server.listen(3000, 'localhost', () => {
	console.log('basic-bro server running at http://localhost:3000');
});
```

## Response Helpers

```ts
app.get('/hello', (_req, res) => {
	res.status(200).text('Hello from basic-bro!');
});

app.get('/json', (_req, res) => {
	res.json({ hello: 'world' }); // sets content-type + JSON.stringify
});

app.get('/html', (_req, res) => {
	res.html('<h1>Hello</h1><p>From basic-bro</p>');
});

// Smart send:
app.get('/smart', (_req, res) => {
	res.send({ ok: true }); // => JSON
	// res.send(Buffer.from('raw')); // => octet-stream
});
```

## Sessions and Rate Limiting

```ts
import { sessions, rateLimit } from 'basic-bro/server';

app.use(sessions({ secret: 'super-secret-key' }));

app.get('/session-demo', (req, res) => {
	const count = (req.session?.count ?? 0) + 1;
	req.session.count = count;
	res.json({ visits: count });
});

app.get(
	'/rate-limited',
	rateLimit({ windowMs: 10_000, max: 3 }),
	(_req, res) => {
		res.json({ ok: true });
	}
);
```

## Quick Start – Client (JSX Runtime)

```tsx
// src/client/runtime.ts
import {
	Child,
	Component,
	h,
	Fragment,
	state,
	textSignal,
} from 'basic-bro/client';

// Example component
export const Counter: Component = () => {
	const count = state(0);

	return (
		<button onClick={() => count.set(count.get() + 1)}>
			Clicked {textSignal(count)} times
		</button>
	);
};
```

## Attach to the Dom

```tsx
// src/client/main.ts
import { Counter } from './runtime';

const app = document.getElementById('app');
if (app) {
	app.innerHTML = '';
	app.appendChild(Counter());
}
```

## Validation & OpenApi

```ts
import { v, openapi, HttpMethod } from '@samuelbines/ex-val';
import { app, router } from 'basic-bro/server';

const app = createApp({
	title: 'My API',
	docsPath: '/docs', //Exposed to /docs by default
});

const api = router('/api');

const User = v.object({
	email: v.string().email(),
	name: v.string().min(2),
});

const Ok = v.object({ ok: v.boolean() });

api.post('/users', validate({ body: User }), (req, res) => {
	const user = req.body; // typed from schema
	res.json({ ok: true, user });
});

// Under the hood, routes can be fed into openapi(...)
const docs = openapi({
	title: 'My API',
	version: '1.0.0',
	routes: [
		openapi.route({
			method: HttpMethod.POST,
			path: '/api/users',
			requestBody: User,
			responses: { 200: Ok },
		}),
	],
});
```

---

## RoadMap

Roadmap / Ideas

Planned / experimental:

- Core:

  - App + router with nested handlers and per-route middleware
  - Static file serving
  - CORS, compression, logging, sessions, rate limiting
  - JSX runtime with signals-based reactivity

- Server:

  - JWT middleware (jwt()): sign/verify, attach req.user
  - Better template helpers (HTML layouts, partials, etc.)

- Client:

  - Small “hooks” layer for state/effects
  - Simple router for SPA-style navigation

- Data:
  - PG helpers & DB “bro”: thin wrapper around pg or other drivers
  - You install the DB driver; basic-bro gives you a typed, reusable wrapper

---

## Status

This is early-stage and APIs may change frequently.

If you’re trying it out and something feels off, over-complicated, or under-powered, open an issue or tweak the README to match what you actually implemented.

## License

Open source MIT
