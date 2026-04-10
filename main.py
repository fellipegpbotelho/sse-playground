"""
SSE Playground — demonstrates Server-Sent Events with FastAPI.

Streams:
  /stream/notifications  — periodic push, named events (info/alert)
  /stream/progress       — one-shot stream with id: and retry: fields
  /stream/logs           — async queue, manual push via POST /trigger-log
  /stream/broadcast      — fan-out: one POST pushes to ALL connected clients
  /stream/ai             — token-by-token streaming, like ChatGPT
"""

import asyncio
import json
from datetime import UTC, datetime

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

app = FastAPI()

# ---------------------------------------------------------------------------
# Shared queue for the /stream/logs endpoint
# ---------------------------------------------------------------------------
log_queue: asyncio.Queue[str] = asyncio.Queue()


# ---------------------------------------------------------------------------
# Stream 1: Notifications — periodic push with named events
# ---------------------------------------------------------------------------
@app.get("/stream/notifications")
async def stream_notifications(request: Request):
    """
    Yields a named SSE event every 2 seconds.
    Alternates between event types 'info' and 'alert'.

    SSE fields demonstrated:
      - data:  the JSON payload
      - event: named event type (browser uses addEventListener)
    """

    async def generator():
        counter = 0
        while True:
            if await request.is_disconnected():
                break

            event_type = "info" if counter % 3 != 2 else "alert"
            message = "System healthy" if event_type == "info" else "High memory usage detected!"
            payload = {
                "id": counter,
                "message": message,
                "timestamp": datetime.now(UTC).isoformat(),
            }
            yield {"event": event_type, "data": json.dumps(payload)}

            counter += 1
            await asyncio.sleep(2)

    return EventSourceResponse(generator())


# ---------------------------------------------------------------------------
# Stream 2: Progress — one-shot with id: and retry:
# ---------------------------------------------------------------------------
@app.get("/stream/progress")
async def stream_progress(request: Request):
    """
    Yields 10 progress steps then closes the stream.

    SSE fields demonstrated:
      - data:  progress percentage
      - id:    lets browser resume with Last-Event-ID on reconnect
      - retry: hints how many ms the browser waits before reconnecting
    """

    async def generator():
        for step in range(11):
            if await request.is_disconnected():
                break

            pct = step * 10
            yield {
                "id": str(step),
                "retry": 3000,  # browser reconnects after 3 s if connection drops
                "data": json.dumps({"step": step, "percent": pct, "done": pct == 100}),
            }
            await asyncio.sleep(0.8)

    return EventSourceResponse(generator())


# ---------------------------------------------------------------------------
# Stream 3: Logs — async queue + manual trigger
# ---------------------------------------------------------------------------
@app.get("/stream/logs")
async def stream_logs(request: Request):
    """
    Streams log lines from an asyncio.Queue.
    Also emits a heartbeat comment every 15 s to keep the connection alive.

    SSE fields demonstrated:
      - data: the log line
      - comment lines (:) for keep-alive heartbeats
    """

    async def generator():
        # Inject a welcome line immediately
        yield {"data": json.dumps({"level": "INFO", "msg": "Log stream connected", "ts": _now()})}

        heartbeat_task = asyncio.ensure_future(_heartbeat())
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    # Wait up to 15 s for a new log entry, then send a heartbeat comment
                    msg = await asyncio.wait_for(log_queue.get(), timeout=15)
                    yield {"data": msg}
                except TimeoutError:
                    # SSE comment — keeps the TCP connection alive through proxies
                    yield {"comment": "heartbeat"}
        finally:
            heartbeat_task.cancel()

    return EventSourceResponse(generator())


async def _heartbeat():
    """Dummy coroutine so ensure_future has something to cancel."""
    await asyncio.sleep(9999)


@app.post("/trigger-log")
async def trigger_log(request: Request):
    """Push a manual log entry into the shared queue."""
    body = await request.json()
    msg = body.get("msg", "Manual trigger")
    entry = json.dumps({"level": "MANUAL", "msg": msg, "ts": _now()})
    await log_queue.put(entry)
    return {"queued": True}


def _now() -> str:
    return datetime.now(UTC).isoformat()


# ---------------------------------------------------------------------------
# Stream 4: AI token streaming — word-by-word, like ChatGPT
# ---------------------------------------------------------------------------

# The text is about SSE itself — meta and educational.
_AI_TEXT = (
    "SSE stands for Server-Sent Events. "
    "It is a one-way channel from server to browser over plain HTTP. "
    "The browser opens a single GET request and the server keeps the connection alive, "
    "writing text frames separated by blank lines. "
    "Each frame carries a payload in the data field, "
    "an optional event name, an id for resumability, and a retry hint. "
    "The browser automatically reconnects if the connection drops, "
    "replaying the last seen id so the server can resume the stream without gaps. "
    "This makes SSE ideal for live feeds, progress bars, log tailing, "
    "and token-by-token AI responses — exactly like this one."
)


@app.get("/stream/ai")
async def stream_ai(request: Request):
    """
    Yields the response one word at a time with a short delay between tokens.
    This is the exact pattern used by ChatGPT, Claude, and every other LLM chat UI.

    SSE fields demonstrated:
      - id:   token index — browser tracks it as lastEventId
      - data: the token chunk + done flag
    """

    async def generator():
        words = _AI_TEXT.split()
        for i, word in enumerate(words):
            if await request.is_disconnected():
                break
            yield {
                "id": str(i),
                "data": json.dumps({"token": word + " ", "done": False}),
            }
            await asyncio.sleep(0.07)
        yield {"data": json.dumps({"token": "", "done": True})}

    return EventSourceResponse(generator())


# ---------------------------------------------------------------------------
# Stream 5: Broadcast — fan-out to all connected clients
# ---------------------------------------------------------------------------

# One queue per open connection. POST /broadcast puts a message into every queue.
broadcast_clients: set[asyncio.Queue] = set()


@app.get("/stream/broadcast")
async def stream_broadcast(request: Request):
    """
    Each connected client gets its own asyncio.Queue.
    POST /broadcast pushes the same message into every queue simultaneously.

    SSE concept demonstrated:
      - fan-out pattern: one producer, many consumers
    """
    queue: asyncio.Queue[str] = asyncio.Queue()
    broadcast_clients.add(queue)

    async def generator():
        yield {
            "data": json.dumps(
                {"msg": "Connected to broadcast", "clients": len(broadcast_clients), "ts": _now()}
            )
        }
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15)
                    yield {"data": msg}
                except TimeoutError:
                    yield {"comment": "heartbeat"}
        finally:
            broadcast_clients.discard(queue)

    return EventSourceResponse(generator())


@app.post("/broadcast")
async def broadcast(request: Request):
    """Push a message to every open /stream/broadcast connection at once."""
    body = await request.json()
    msg = body.get("msg", "Broadcast message")
    entry = json.dumps({"msg": msg, "clients": len(broadcast_clients), "ts": _now()})
    for q in broadcast_clients:
        await q.put(entry)
    return {"delivered_to": len(broadcast_clients)}


# ---------------------------------------------------------------------------
# Static files + root redirect
# ---------------------------------------------------------------------------
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return RedirectResponse("/static/index.html")
