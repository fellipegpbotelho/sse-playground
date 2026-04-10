# SSE Playground

> A hands-on project for learning **Server-Sent Events (SSE)** — the simplest way to push real-time data from a server to a browser.

[![CI](https://github.com/fellipegpbotelho/sse-playground/actions/workflows/ci.yml/badge.svg)](https://github.com/fellipegpbotelho/sse-playground/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.12+-blue)
![uv](https://img.shields.io/badge/uv-package%20manager-purple)
![React](https://img.shields.io/badge/React-19-61dafb)
![License](https://img.shields.io/badge/license-MIT-green)

**FastAPI** backend with two frontend implementations you can compare side by side:

| | Vanilla JS | React |
|---|---|---|
| URL | `localhost:8000` | `localhost:5173` |
| Purpose | Understand the raw protocol | Use SSE the way you would in a real app |
| Key file | `static/index.html` | `frontend/src/hooks/useSSE.js` |

![SSE Playground preview](docs/preview.png)

---

## What you will learn

| | Concept |
|---|---|
| 📡 | What SSE is and how it differs from WebSockets and polling |
| 🔌 | The raw wire format — `data:`, `event:`, `id:`, `retry:` |
| 🌐 | How the browser `EventSource` API works |
| 🐍 | How to implement SSE streams in FastAPI with async generators |
| 🔄 | Auto-reconnect and the `Last-Event-ID` resumption mechanism |
| 📬 | How to push events on demand via a server-side queue |
| 🤖 | Token-by-token AI streaming (how ChatGPT works under the hood) |
| 💥 | `readyState` lifecycle and reconnect behaviour on connection drops |
| 📣 | Fan-out broadcasting to multiple clients simultaneously |
| 🔍 | How to read raw SSE wire frames without opening DevTools |
| ⚛️ | The `useSSE` custom hook pattern for React apps |

---

## Quickstart

**1 — Start the backend** (required for both frontends)

```bash
git clone https://github.com/fellipegpbotelho/sse-playground
cd sse-playground
uv sync
make dev        # FastAPI on http://localhost:8000
```

**2a — Vanilla JS frontend** (no extra setup)

Open [http://localhost:8000](http://localhost:8000) — served directly by FastAPI.

**2b — React frontend**

```bash
make frontend-install   # first time only
make frontend-dev       # Vite on http://localhost:5173
```

Both frontends connect to the same backend, so you can open them simultaneously and send broadcast messages between them.

> **Tip:** open both frontends, connect the Broadcast panel in each, and send a message from one — both receive it.

Or run everything in Docker:

```bash
make docker-build
make docker-run
```

---

## Project structure

```
.
├── main.py              # FastAPI — all six SSE endpoints
├── pyproject.toml       # uv project config
├── Makefile
├── Dockerfile
├── static/
│   └── index.html       # Vanilla JS frontend — raw EventSource API
└── frontend/            # React + Vite frontend
    ├── vite.config.js   # proxies /stream/* → FastAPI on :8000
    └── src/
        ├── hooks/
        │   └── useSSE.js          # ← core custom hook, start here
        ├── context/
        │   └── WireTapContext.jsx # cross-panel wire tap state
        └── components/
            ├── ui.jsx             # shared primitives
            ├── Panel.jsx
            ├── *Panel.jsx         # one file per stream
            └── WireTapPanel.jsx
```

---

## How it works

A single HTTP `GET` — the server keeps writing `data: …\n\n` lines, and the browser fires a JS event for each one.

```
Browser                              FastAPI
   │                                    │
   │──── GET /stream/notifications ────►│
   │                                    │  async generator, runs forever
   │◄─── event: info                    │
   │     data: {"msg":"System healthy"} │  yields every 2 s
   │                                    │
   │◄─── event: alert                   │
   │     data: {"msg":"High CPU!"}      │
   │                                    │
   │──── GET /stream/progress ─────────►│
   │◄─── id: 0 / data: {"pct": 0}      │  yields 10 steps, then closes
   │◄─── id: 1 / data: {"pct": 10}     │
   │                                    │
   │──── GET /stream/logs ─────────────►│
   │◄─── data: {"msg":"connected"}      │  reads from asyncio.Queue
   │                                    │
   │──── POST /trigger-log ────────────►│  you push a message
   │◄─── data: {"msg":"your message"}   │  stream delivers it live
```

---

## The six streams

### 1 · Notifications — named events

`GET /stream/notifications`

Pushes an event every 2 s. Uses the `event:` field so the browser distinguishes event types with `addEventListener` instead of the generic `onmessage`.

```
event: info
data: {"id": 0, "message": "System healthy", "timestamp": "..."}

event: alert
data: {"id": 2, "message": "High memory usage detected!", "timestamp": "..."}
```

```js
source.addEventListener('info',  (e) => { /* only info events  */ })
source.addEventListener('alert', (e) => { /* only alert events */ })
```

---

### 2 · Progress — `id:` and `retry:`

`GET /stream/progress`

Yields 10 steps then closes. Demonstrates two underused SSE fields:

- **`id:`** — the browser stores this as `lastEventId` and sends it as a `Last-Event-ID` request header on reconnect so the server can resume from the right step.
- **`retry:`** — overrides the browser's reconnect delay (default ~3 s).

```
id: 3
retry: 3000
data: {"step": 3, "percent": 30, "done": false}
```

---

### 3 · Logs — server-side queue + heartbeat

`GET /stream/logs` · `POST /trigger-log`

Events are queued in an `asyncio.Queue`. A separate `POST /trigger-log` writes into it; the open stream delivers the entry immediately. Also sends SSE **comment lines** every 15 s to prevent proxies from closing idle connections.

```
: heartbeat

data: {"level": "MANUAL", "msg": "Hello from the browser!", "ts": "..."}
```

---

### 4 · AI token streaming — word-by-word

`GET /stream/ai`

Yields a response one word at a time. This is the exact pattern used by ChatGPT, Claude, and every LLM chat UI. Each token carries an `id:` so streaming can resume mid-sentence if the connection drops.

```
id: 12
data: {"token": "automatically ", "done": false}
```

---

### 5 · Unstable connection — auto-reconnect in action

`GET /stream/unstable`

The server deliberately closes the connection after 2–5 events. The browser auto-reconnects and sends `Last-Event-ID`, so the server resumes the counter from where it left off. Watch the `readyState` badge cycle through OPEN → CLOSED → CONNECTING → OPEN.

```
id: 7
retry: 1500
data: {"count": 7, "will_drop_in": 2, "resumed_from": "4", "ts": "..."}
```

---

### 6 · Broadcast — fan-out to all clients

`GET /stream/broadcast` · `POST /broadcast`

Each connected client gets its own `asyncio.Queue`. `POST /broadcast` puts the same message into every queue simultaneously. Open two tabs (or one vanilla + one React), connect both, and send a message — both receive it instantly.

```
data: {"msg": "Hello everyone!", "clients": 2, "ts": "..."}
```

---

### Wire tap — built-in raw frame viewer

A full-width panel at the bottom reconstructs the actual `text/event-stream` wire format from every event fired across all streams. Filter by stream or watch all at once — no DevTools needed.

---

## SSE wire format

Events are plain text separated by a **blank line** (`\n\n`). The content-type must be `text/event-stream`.

| Field | Example | What it does |
|---|---|---|
| `data:` | `data: {"msg":"hi"}` | The payload. Repeat the field for multi-line values. |
| `event:` | `event: alert` | Names the event. Browser routes it to `addEventListener('alert', …)`. |
| `id:` | `id: 42` | Bookmarks the stream. Browser sends it as `Last-Event-ID` on reconnect. |
| `retry:` | `retry: 3000` | Sets the browser reconnect delay in ms. |
| `: comment` | `: heartbeat` | Ignored by browser; resets proxy idle timers. |

---

## SSE vs WebSockets vs Polling

| | SSE | WebSockets | Polling |
|---|:---:|:---:|:---:|
| Direction | Server → Client | Bidirectional | Client pulls |
| Protocol | HTTP | Upgraded TCP (`ws://`) | HTTP |
| Auto-reconnect | ✅ Built-in | ❌ Manual | — |
| Binary support | ❌ Text only | ✅ | ✅ |
| Proxy friendly | ✅ | ⚠️ Sometimes blocked | ✅ |
| Complexity | Low | Medium | Low |

**Use SSE** when the server pushes and the client only listens — notifications, progress bars, log tailing, AI token streaming.

**Use WebSockets** when you need bidirectional real-time communication — chat, multiplayer games, collaborative editing.

---

## Key concepts in code

**Server — async generator (FastAPI)**

```python
@app.get("/stream/example")
async def stream(request: Request):
    async def generator():
        while True:
            if await request.is_disconnected():
                break                           # clean up when tab closes
            yield {"event": "ping", "data": "hello"}
            await asyncio.sleep(1)              # must await to release the event loop

    return EventSourceResponse(generator())
```

**Vanilla JS — EventSource API**

```js
const source = new EventSource('/stream/example')

source.onmessage = (e) => console.log(e.data)               // unnamed events
source.addEventListener('ping', (e) => console.log(e.data)) // named events
source.onerror = () => console.log('dropped — will retry automatically')
source.close()                                               // manual disconnect
```

**React — `useSSE` custom hook**

```js
// The hook lives in frontend/src/hooks/useSSE.js
// useRef holds the EventSource — not useState — so events don't cause re-renders
// connect() returns a cleanup function to drop in useEffect's return

const { connect, disconnect, readyState, rsLabel, lastEventId } = useSSE('/stream/example')

useEffect(() => {
  const cleanup = connect({
    onMessage: (e) => setText((prev) => prev + JSON.parse(e.data).token),
    events:    { alert: (e) => console.log('named event:', e.data) },
    onError:   () => console.log('dropped'),
  })
  return cleanup   // closes the connection when the component unmounts
}, [connect])
```

---

## License

MIT
