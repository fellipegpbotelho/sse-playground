# SSE Playground

A hands-on project for learning **Server-Sent Events (SSE)** — the simplest way to push real-time data from a server to a browser.

Built with **FastAPI** (Python) and **vanilla JavaScript**. No frontend framework, no build step — so you can focus entirely on understanding SSE.

## What you will learn

- What SSE is and how it differs from WebSockets and polling
- The raw wire format (`data:`, `event:`, `id:`, `retry:`)
- How the browser's `EventSource` API works
- How to implement SSE streams in FastAPI with async generators
- Auto-reconnect and the `Last-Event-ID` mechanism
- How to push events from the server on demand (via a queue)

## How it works

```
Browser                            FastAPI
  |                                   |
  |── GET /stream/notifications ─────►|
  |                                   |  async generator runs forever
  |◄── event: info\ndata: {...}\n\n ──|  yields every 2 s
  |◄── event: alert\ndata: {...}\n\n ─|
  |                                   |
  |── GET /stream/progress ──────────►|
  |◄── id: 0\ndata: {"pct":0}\n\n ───|  yields 10 steps, then closes
  |◄── id: 1\ndata: {"pct":10}\n\n ──|
  |                                   |
  |── GET /stream/logs ──────────────►|
  |◄── data: {"msg":"connected"}\n\n ─|  yields from asyncio.Queue
  |                                   |
  |── POST /trigger-log ─────────────►|  you push a message
  |◄── data: {"msg":"your msg"}\n\n ──|  stream delivers it
```

## Project structure

```
.
├── main.py          # FastAPI app — all three SSE endpoints
├── pyproject.toml   # uv project config
├── static/
│   └── index.html   # Vanilla JS frontend, three panels
└── README.md
```

## Running locally

Requires [uv](https://docs.astral.sh/uv/).

```bash
git clone https://github.com/your-username/sse-playground
cd sse-playground
uv sync
uv run uvicorn main:app --reload
```

Open [http://localhost:8000](http://localhost:8000).

> **Tip:** open DevTools → Network → click any `/stream/*` request → EventStream tab to see the raw SSE frames as they arrive.

## The three streams

### Stream 1 — Notifications (`GET /stream/notifications`)

Pushes a named event every 2 seconds. Demonstrates the `event:` field — the browser
uses `addEventListener('info', …)` and `addEventListener('alert', …)` instead of the
generic `onmessage`.

```
event: info
data: {"id": 0, "message": "System healthy", "timestamp": "..."}

event: alert
data: {"id": 2, "message": "High memory usage detected!", "timestamp": "..."}
```

### Stream 2 — Progress (`GET /stream/progress`)

Yields 10 steps then closes the stream. Demonstrates the `id:` and `retry:` fields.

- `id:` — the browser stores this as `lastEventId`. On reconnect it sends a
  `Last-Event-ID` request header so the server knows where to resume.
- `retry: 3000` — overrides the browser's default reconnect delay to 3 seconds.

```
id: 3
retry: 3000
data: {"step": 3, "percent": 30, "done": false}
```

### Stream 3 — Logs (`GET /stream/logs`)

Events are queued server-side in an `asyncio.Queue`. A separate `POST /trigger-log`
endpoint inserts entries into the queue, which the open SSE stream delivers immediately.
Also sends SSE comment lines (`: heartbeat`) every 15 seconds to prevent intermediate
proxies from closing idle connections.

```
: heartbeat

data: {"level": "MANUAL", "msg": "Hello from the browser!", "ts": "..."}
```

## SSE wire format reference

Events are plain text, separated by a blank line (`\n\n`).

| Field | Example | Purpose |
|---|---|---|
| `data:` | `data: {"msg":"hi"}` | The payload. Repeat for multi-line values. |
| `event:` | `event: alert` | Named event type. Triggers `addEventListener('alert', …)`. |
| `id:` | `id: 42` | Event bookmark. Sent as `Last-Event-ID` on reconnect. |
| `retry:` | `retry: 3000` | Browser reconnect delay in milliseconds. |
| `: comment` | `: heartbeat` | Ignored by browser; resets proxy idle timers. |

## SSE vs WebSockets vs Polling

| | SSE | WebSockets | Short Polling |
|---|---|---|---|
| Direction | Server → Client | Bidirectional | Client pulls |
| Protocol | HTTP/1.1+ | Upgraded TCP (`ws://`) | HTTP |
| Auto-reconnect | Built-in | You implement it | N/A |
| Binary support | No (text only) | Yes | Yes |
| Proxy friendly | Yes | Sometimes blocked | Yes |
| Complexity | Low | Medium | Low |

**Use SSE when** the server needs to push data and the client doesn't need to stream back.  
Common examples: live notifications, progress bars, log tailing, AI token streaming (how ChatGPT streams responses).

**Use WebSockets when** you need low-latency bidirectional communication: chat, multiplayer games, collaborative editing.

## Key concepts in code

### Server — async generator pattern

```python
@app.get("/stream/example")
async def stream(request: Request):
    async def generator():
        while True:
            if await request.is_disconnected():
                break                          # clean up when the tab closes
            yield {"event": "ping", "data": "hello"}
            await asyncio.sleep(1)             # must await to yield the event loop

    return EventSourceResponse(generator())
```

### Browser — EventSource API

```js
const source = new EventSource('/stream/example')

// Generic handler (no event: field on the server side)
source.onmessage = (e) => console.log(e.data)

// Named event handler
source.addEventListener('ping', (e) => console.log(e.data))

// Reconnect state
source.onerror = () => console.log('dropped — browser will retry automatically')

// Manual close
source.close()
```

## License

MIT
