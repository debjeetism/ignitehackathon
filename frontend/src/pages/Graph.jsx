import { useState, useEffect } from 'react'
import { Share2, RefreshCw } from 'lucide-react'
import GraphViewer from '../components/GraphViewer'
import { useApi } from '../hooks/useApi'
import { getGraphNodes, getGraphOverview, getSubgraph } from '../lib/api'

/**
 * Graph visualization page
 */
function Graph() {
  const [selectedNode, setSelectedNode] = useState('')
  
  const {
    data: nodesData,
    loading: loadingNodes,
    execute: fetchNodes,
  } = useApi(getGraphNodes)

  const {
    data: subgraphData,
    loading: loadingSubgraph,
    execute: fetchSubgraph,
  } = useApi(getSubgraph)

  const {
    data: overviewData,
    loading: loadingOverview,
    execute: fetchOverview,
  } = useApi(getGraphOverview)

  useEffect(() => {
    fetchNodes('*', 20)
    fetchOverview()
  }, [fetchNodes, fetchOverview])

  const handleNodeSelect = async (nodeId) => {
    setSelectedNode(nodeId)
    await fetchSubgraph(nodeId, 2)
  }

  const handleRefresh = () => {
    fetchNodes('*', 20)
    fetchOverview()
  }

  const hasSubgraph = subgraphData?.nodes?.length > 0
  const nodes = hasSubgraph ? subgraphData.nodes : overviewData?.nodes || nodesData || []
  const edges = hasSubgraph ? subgraphData.edges : overviewData?.edges || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="w-6 h-6 text-purple-500" />
            Knowledge Graph
          </h2>
          <p className="text-slate-400 mt-1">
            Visualize entity relationships from Neo4j graph database
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loadingNodes}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingNodes ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Node Selector */}
      {nodesData && nodesData.length > 0 && (
        <div className="card">
          <label className="block text-sm text-slate-400 mb-2">
            Select a node to explore its subgraph
          </label>
          <select
            value={selectedNode}
            onChange={(e) => handleNodeSelect(e.target.value)}
            className="input-field"
          >
            <option value="">All Nodes</option>
            {nodesData.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label} - {node.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Graph Visualization */}
      <GraphViewer
        nodes={nodes}
        edges={edges}
        loading={loadingNodes || loadingSubgraph || loadingOverview}
        onNodeClick={handleNodeSelect}
      />

      {/* Node List */}
      {nodes.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Nodes ({nodes.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => handleNodeSelect(node.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedNode === node.id
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <p className="font-medium text-sm truncate">{node.label === 'Kitchen' ? node.properties?.region || node.properties?.name || node.id : node.properties?.name || node.properties?.batchNumber || node.id}</p>
                <p className="text-xs text-cyan-300/70 truncate">{node.label}</p>
                <p className="text-xs text-slate-500 truncate">{node.id}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Graph
