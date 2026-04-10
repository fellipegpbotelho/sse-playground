/**
 * WireTapContext — shares the wire tap recorder across all panels
 *
 * Any panel can call `record(streamName, eventType, data, id)` to push
 * a reconstructed SSE frame into the global tap log.
 * The WireTapPanel reads `frames` and renders them.
 */

import { createContext, useCallback, useContext, useState } from 'react'

const WireTapContext = createContext(null)

export function WireTapProvider({ children }) {
  const [frames, setFrames] = useState([])
  const [filter, setFilter] = useState('all')

  // Reconstruct the text/event-stream wire format from EventSource event fields.
  // EventSource abstracts the raw bytes, so we rebuild it from what we can observe.
  const record = useCallback((streamName, eventType, data, id) => {
    let frame = ''
    if (eventType && eventType !== 'message') frame += `event: ${eventType}\n`
    if (id)                                   frame += `id: ${id}\n`
    frame += `data: ${data}`

    setFrames((prev) => [
      ...prev.slice(-299),   // keep last 300 frames
      { streamName, frame, key: `${Date.now()}-${Math.random()}` },
    ])
  }, [])

  const clear = useCallback(() => setFrames([]), [])

  return (
    <WireTapContext.Provider value={{ frames, filter, setFilter, record, clear }}>
      {children}
    </WireTapContext.Provider>
  )
}

export const useWireTap = () => useContext(WireTapContext)
