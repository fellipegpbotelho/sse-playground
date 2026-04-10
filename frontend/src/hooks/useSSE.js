/**
 * useSSE — core custom hook for Server-Sent Events in React
 *
 * Key React patterns demonstrated:
 *   - useRef  to hold the EventSource without causing re-renders
 *   - useCallback  to keep connect/disconnect stable across renders
 *   - cleanup function returned from connect() to close on unmount
 *
 * Usage:
 *   const { connect, disconnect, readyState, rsLabel, rsClass, lastEventId } = useSSE('/stream/example')
 *
 *   useEffect(() => {
 *     const cleanup = connect({
 *       onMessage: (e) => console.log(e.data),
 *       events: { alert: (e) => console.log('named event:', e.data) },
 *       onError:   () => console.log('dropped — will retry'),
 *     })
 *     return cleanup   // ← closes the connection when the component unmounts
 *   }, [connect])
 */

import { useCallback, useRef, useState } from 'react'

const RS_LABELS  = ['● 0 CONNECTING', '● 1 OPEN', '● 2 CLOSED']
const RS_CLASSES = ['rs-connecting',   'rs-open',  'rs-closed']

export function useSSE(url) {
  const sourceRef   = useRef(null)
  const intervalRef = useRef(null)

  const [readyState,   setReadyState]   = useState(2)    // start CLOSED
  const [lastEventId,  setLastEventId]  = useState(null)

  const connect = useCallback(
    ({ onMessage, events = {}, onError } = {}) => {
      // Close any existing connection before opening a new one
      sourceRef.current?.close()
      clearInterval(intervalRef.current)

      const source = new EventSource(url)
      sourceRef.current = source

      // Poll readyState every 300 ms — EventSource has no onopen/onclose for state changes
      intervalRef.current = setInterval(
        () => setReadyState(source.readyState),
        300
      )

      if (onMessage) {
        source.onmessage = (e) => {
          setLastEventId(e.lastEventId || null)
          onMessage(e)
        }
      }

      // Wire up named event listeners (event: field on the server side)
      Object.entries(events).forEach(([name, handler]) => {
        source.addEventListener(name, (e) => {
          setLastEventId(e.lastEventId || null)
          handler(e)
        })
      })

      source.onerror = () => onError?.()

      // Return cleanup so callers can drop it in a useEffect return
      return () => {
        clearInterval(intervalRef.current)
        source.close()
      }
    },
    [url]
  )

  const disconnect = useCallback(() => {
    clearInterval(intervalRef.current)
    sourceRef.current?.close()
    sourceRef.current = null
    setReadyState(2)
    setLastEventId(null)
  }, [])

  return {
    connect,
    disconnect,
    readyState,
    lastEventId,
    rsLabel: RS_LABELS[readyState] ?? RS_LABELS[2],
    rsClass: RS_CLASSES[readyState] ?? RS_CLASSES[2],
  }
}
