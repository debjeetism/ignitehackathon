import { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { ZoomIn, ZoomOut, RefreshCw, Move } from 'lucide-react'

function getNodeName(node) {
  if (node.label === 'Kitchen') return node.properties?.region || node.properties?.name || node.id
  return node.properties?.name || node.properties?.batchNumber || node.id
}

/**
 * Graph visualization component
 * @param {Object} props
 * @param {Array} props.nodes - Graph nodes
 * @param {Array} props.edges - Graph edges
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onNodeClick - Node click handler
 */
function GraphViewer({
  nodes = [],
  edges = [],
  loading = false,
  onNodeClick = () => {},
}) {
  const canvasRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Simple force-directed layout simulation
  const calculatePositions = useCallback(() => {
    const width = canvasRef.current?.clientWidth || 800
    const height = canvasRef.current?.clientHeight || 600
    const centerX = width / 2
    const centerY = height / 2

    const positions = {}
    const radius = Math.min(width, height) * 0.35

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        ...node,
      }
    })

    return positions
  }, [nodes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    if (nodes.length === 0) return

    const positions = calculatePositions()

    // Draw relationships before nodes so endpoints remain readable.
    ctx.strokeStyle = '#78a6a8'
    ctx.fillStyle = '#78a6a8'
    ctx.lineWidth = 1.5
    edges.forEach((edge) => {
      const source = positions[edge.source]
      const target = positions[edge.target]
      if (source && target) {
        ctx.beginPath()
        ctx.moveTo(source.x + offset.x, source.y + offset.y)
        ctx.lineTo(target.x + offset.x, target.y + offset.y)
        ctx.stroke()

        const angle = Math.atan2(target.y - source.y, target.x - source.x)
        const arrowSize = 6
        ctx.beginPath()
        ctx.moveTo(target.x + offset.x, target.y + offset.y)
        ctx.lineTo(target.x + offset.x - arrowSize * Math.cos(angle - Math.PI / 6), target.y + offset.y - arrowSize * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(target.x + offset.x - arrowSize * Math.cos(angle + Math.PI / 6), target.y + offset.y - arrowSize * Math.sin(angle + Math.PI / 6))
        ctx.closePath()
        ctx.fill()
      }
    })

    // Draw nodes
    Object.values(positions).forEach((node) => {
      const x = node.x + offset.x
      const y = node.y + offset.y

      // Node circle
      ctx.beginPath()
      ctx.arc(x, y, 20 * scale, 0, 2 * Math.PI)
      ctx.fillStyle = '#3b82f6'
      ctx.fill()
      ctx.strokeStyle = '#60a5fa'
      ctx.lineWidth = 2
      ctx.stroke()

      // Node label
      ctx.fillStyle = '#f1f5f9'
      ctx.font = `${12 * scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const name = getNodeName(node)
      const maxLabelLength = 18
      ctx.fillText(name.length > maxLabelLength ? `${name.substring(0, maxLabelLength - 1)}...` : name, x, y)
    })
  }, [nodes, edges, scale, offset, calculatePositions])

  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current
    if (!canvas || nodes.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top
    const positions = calculatePositions()
    const selectedNode = Object.values(positions).find((node) => {
      const distance = Math.hypot(
        clickX - (node.x + offset.x),
        clickY - (node.y + offset.y)
      )
      return distance <= 24 * scale
    })

    if (selectedNode) onNodeClick(selectedNode.id)
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => setScale((s) => Math.min(s * 1.2, 3))
  const handleZoomOut = () => setScale((s) => Math.max(s / 1.2, 0.3))
  const handleReset = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div className="card h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Move className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold">Knowledge Graph</h3>
          <span className="text-sm text-slate-500">
            ({nodes.length} nodes, {edges.length} edges)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-400 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-slate-950 rounded-lg overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
            <Move className="w-12 h-12 mb-3 opacity-50" />
            <p>No graph data available</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
          />
        )}
      </div>
    </div>
  )
}

GraphViewer.propTypes = {
  nodes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      properties: PropTypes.object,
    })
  ),
  edges: PropTypes.arrayOf(
    PropTypes.shape({
      source: PropTypes.string.isRequired,
      target: PropTypes.string.isRequired,
      type: PropTypes.string,
      properties: PropTypes.object,
    })
  ),
  loading: PropTypes.bool,
  onNodeClick: PropTypes.func,
}

export default GraphViewer
