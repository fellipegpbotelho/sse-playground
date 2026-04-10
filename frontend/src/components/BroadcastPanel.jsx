import { useState } from 'react'
import { useWireTap } from '../context/WireTapContext'
import { useSSE } from '../hooks/useSSE'
import { Btn, InputRow, LogArea, ReadyStateBadge, StatusBadge } from './ui'
import { Panel } from './Panel'

export function BroadcastPanel() {
  const { connect, disconnect, readyState, rsLabel, rsClass } = useSSE('/stream/broadcast')
  const { record } = useWireTap()
  const [status, setStatus] = useState('disconnected')
  const [lines,  setLines]  = useState([])
  const [input,  setInput]  = useState('')

  const addLine = (text, cls = 'system') =>
    setLines((prev) => [...prev, { text, cls, key: `${Date.now()}-${Math.random()}` }])

  function handleConnect() {
    setStatus('connected')
    connect({
      onMessage: (e) => {
        record('broadcast', null, e.data, e.lastEventId)
        const d = JSON.parse(e.data)
        addLine(`[${d.ts}] ${d.msg}  (${d.clients} client(s))`, 'info')
      },
      onError: () => {
        setStatus('error')
        addLine('⚠ Connection error', 'alert')
      },
    })
  }

  function handleDisconnect() {
    disconnect()
    setStatus('disconnected')
    addLine('— disconnected —')
  }

  async function handleSend() {
    const msg = input.trim() || 'Hello everyone!'
    setInput('')
    await fetch('/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg }),
    })
  }

  return (
    <Panel
      title="Stream 5 — Broadcast"
      description="Fan-out: one <code>POST /broadcast</code> delivers the same message to <em>every</em> connected client. Each client has its own <code>asyncio.Queue</code>. Open in two tabs to see it."
      controls={<>
        <Btn variant="primary" onClick={handleConnect}>Connect</Btn>
        <Btn variant="danger"  onClick={handleDisconnect}>Disconnect</Btn>
        <StatusBadge state={status} />
        <ReadyStateBadge rsClass={rsClass} rsLabel={rsLabel} />
      </>}
    >
      <InputRow
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        placeholder="Message to all clients…"
        submitLabel="Broadcast"
      />
      <LogArea lines={lines} />
    </Panel>
  )
}
