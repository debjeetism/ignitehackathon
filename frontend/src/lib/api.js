/**
 * API client for backend communication
 */

// Use Vite proxy in development, or env variable in production
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

/**
 * Make a POST request to the API
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} Response data
 */
export async function apiPost(endpoint, data = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Make a GET request to the API
 * @param {string} endpoint - API endpoint path
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Response data
 */
export async function apiGet(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString()
  const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

export async function apiDelete(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'DELETE' })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  return response.json()
}

async function uploadCsv(endpoint, file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', body: formData })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.detail || `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export function previewIngestion(file) {
  return uploadCsv('/api/v1/ingestion/preview', file)
}

export function importIngestion(file) {
  return uploadCsv('/api/v1/ingestion/import', file)
}

export function getIngestionWorkflowAvailability() {
  return apiGet('/api/v1/ingestion/workflow')
}

export function startIngestionWorkflow(file) {
  return uploadCsv('/api/v1/ingestion/workflow/start', file)
}

export function getIngestionWorkflowStatus(runId) {
  return apiGet(`/api/v1/ingestion/workflow/${runId}`)
}

/**
 * Create an SSE connection for streaming responses
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request body data
 * @param {Function} onMessage - Callback for each message
 * @param {Function} onError - Callback for errors
 * @returns {Function} Cleanup function to close connection
 */
export function createSSEConnection(endpoint, data, onMessage, onError) {
  const eventSource = new EventSource(
    `${API_BASE_URL}${endpoint}?data=${encodeURIComponent(JSON.stringify(data))}`
  )
  
  eventSource.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data)
      onMessage(parsed)
    } catch (err) {
      onMessage({ content: event.data })
    }
  }
  
  eventSource.onerror = (error) => {
    onError?.(error)
    eventSource.close()
  }
  
  return () => eventSource.close()
}

/**
 * Health check
 * @returns {Promise<Object>} Health status
 */
export async function checkHealth() {
  return apiGet('/api/v1/health')
}

/**
 * Analyze query
 * @param {string} query - Query string
 * @param {boolean} includeGraph - Include graph data
 * @param {boolean} includeSearch - Include search results
 * @returns {Promise<Object>} Analysis response
 */
export async function analyzeQuery(query, includeGraph = true, includeSearch = true, batchId = null, supplierId = null) {
  return apiPost('/api/v1/analyze', {
    query,
    include_graph: includeGraph,
    include_search: includeSearch,
    batch_id: batchId,
    supplier_id: supplierId,
  })
}

export async function streamAnalysis(query, onEvent, includeGraph = true, includeSearch = true, batchId = null, supplierId = null) {
  const response = await fetch(`${API_BASE_URL}/api/v1/analyze/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, include_graph: includeGraph, include_search: includeSearch, batch_id: batchId, supplier_id: supplierId }),
  })
  if (!response.ok || !response.body) throw new Error(`HTTP error! status: ${response.status}`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done = false
  while (!done) {
    const result = await reader.read()
    done = result.done
    buffer += decoder.decode(result.value || new Uint8Array(), { stream: !done })
    const messages = buffer.split('\n\n')
    buffer = messages.pop() || ''
    messages.forEach((message) => {
      const line = message.split('\n').find((entry) => entry.startsWith('data: '))
      if (line) onEvent(JSON.parse(line.slice(6)))
    })
  }
}

export async function getPersistentState() {
  return apiGet('/api/v1/state')
}

export async function clearPersistentChat() {
  return apiDelete('/api/v1/state/chat')
}

export async function getIncidentEvents(incidentId) {
  return apiGet(`/api/v1/incidents/${incidentId}/events`)
}

export async function getIncidentAlternatives(incidentId) {
  return apiGet(`/api/v1/incidents/${incidentId}/alternatives`)
}

export async function createSimulatedAction(incidentId, action, actor = 'demo-operator') {
  return apiPost(`/api/v1/incidents/${incidentId}/actions`, { action, actor, confirmed: true })
}

export async function getGraphNodeOptions(label = '*', limit = 100) {
  return apiGet('/api/v1/graph/nodes', { label, limit })
}

/**
 * Send chat message
 * @param {Array} messages - Message history
 * @param {boolean} stream - Enable streaming
 * @returns {Promise<Object>} Chat response
 */
export async function sendChatMessage(messages, stream = false) {
  return apiPost('/api/v1/chat', {
    messages,
    stream,
  })
}

/**
 * Search using Tavily
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Object>} Search results
 */
export async function searchWeb(query, maxResults = 5) {
  return apiPost('/api/v1/search', {
    query,
    max_results: maxResults,
  })
}

/**
 * Get graph nodes
 * @param {string} label - Node label
 * @param {number} limit - Maximum nodes
 * @returns {Promise<Array>} Graph nodes
 */
export async function getGraphNodes(label = '*', limit = 50) {
  return apiGet('/api/v1/graph/nodes', { label, limit })
}

/**
 * Get the complete traceability network with nodes and relationships
 * @returns {Promise<Object>} Graph data
 */
export async function getGraphOverview() {
  return apiGet('/api/v1/graph/overview')
}

/**
 * Get subgraph
 * @param {string} nodeId - Node ID
 * @param {number} depth - Search depth
 * @returns {Promise<Object>} Graph data
 */
export async function getSubgraph(nodeId, depth = 2) {
  return apiGet('/api/v1/graph/subgraph', { node_id: nodeId, depth })
}
