import { useState, useCallback, useEffect } from 'react'
import { clearPersistentChat, getPersistentState } from '../lib/api'

/**
 * Hook for making API calls with loading and error states
 * @param {Function} apiFunction - API function to call
 * @returns {Object} { data, loading, error, execute }
 */
export function useApi(apiFunction) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFunction(...args)
      setData(result)
      return result
    } catch (err) {
      setError(err.message || 'An error occurred')
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFunction])

  return { data, loading, error, execute, setData }
}

/**
 * Hook for health check status
 * @returns {Object} { status, loading, checkHealth }
 */
export function useHealthCheck() {
  const [status, setStatus] = useState({
    api: 'unknown',
    timestamp: null,
  })
  const [loading, setLoading] = useState(false)

  const checkHealth = useCallback(async () => {
    setLoading(true)
    try {
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const response = await fetch(
        `${baseUrl}/api/v1/health`
      )
      if (response.ok) {
        const data = await response.json()
        setStatus({
          api: 'online',
          timestamp: data.timestamp,
        })
      } else {
        setStatus({ api: 'offline', timestamp: null })
      }
    } catch {
      setStatus({ api: 'offline', timestamp: null })
    } finally {
      setLoading(false)
    }
  }, [])

  return { status, loading, checkHealth }
}

/**
 * Hook for streaming chat responses
 * @returns {Object} { messages, streaming, sendMessage, clearMessages }
 */
export function useChatStream() {
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)

  useEffect(() => {
    getPersistentState().then((state) => {
      if (state.messages?.length) setMessages(state.messages)
      if (state.analysis) {
        localStorage.setItem('ignite-incident-context', JSON.stringify({
          incident_id: state.analysis.incident_id,
          query: state.analysis.query,
          graph_verified: Boolean(state.analysis.graph_data?.nodes?.length),
          ...state.analysis.blast_radius,
        }))
      }
    }).catch(() => {})
  }, [])

  const sendMessage = useCallback(async (content) => {
    const userMessage = { role: 'user', content, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMessage])
    setStreaming(true)

    const newMessages = [...messages, userMessage]
    const storedContext = localStorage.getItem('ignite-incident-context')
    const context = storedContext ? JSON.parse(storedContext) : null
    
    try {
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const response = await fetch(
        `${baseUrl}/api/v1/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages, stream: false, context }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${err.message}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setStreaming(false)
    }
  }, [messages])

  const clearMessages = useCallback(() => {
    setMessages([])
    clearPersistentChat().catch(() => {})
  }, [])

  return { messages, streaming, sendMessage, clearMessages }
}
