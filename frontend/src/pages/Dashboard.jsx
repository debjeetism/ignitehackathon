import { useEffect, useState } from 'react'
import { AlertTriangle, Database, Globe2, Loader2, Mail, Search, ShieldAlert, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatCardGrid from '../components/StatCardGrid'
import GraphViewer from '../components/GraphViewer'
import ActivityFeed from '../components/ActivityFeed'
import IncidentEvidence from '../components/IncidentEvidence'
import IngestionPanel from '../components/IngestionPanel'
import SearchResults from '../components/SearchResults'
import MarkdownMessage from '../components/MarkdownMessage'
import { useApi } from '../hooks/useApi'
import { createSimulatedAction, getGraphNodeOptions, getIncidentAlternatives, getIncidentEvents, getPersistentState, searchWeb, streamAnalysis } from '../lib/api'
import { buildTriagePlan } from '../lib/triage'

const DEFAULT_INCIDENT = 'A hospital reports food poisoning in Noida from Paneer Tikka. Isolate the contaminated batch, find every other kitchen using it, identify the dishes that must be removed, and draft our recall alerts.'

function Dashboard() {
  const [incident, setIncident] = useState(DEFAULT_INCIDENT)
  const [selectedNode, setSelectedNode] = useState(null)
  const [batchId, setBatchId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [nodeOptions, setNodeOptions] = useState([])
  const [events, setEvents] = useState([])
  const [alternatives, setAlternatives] = useState([])
  const [liveEvents, setLiveEvents] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [streamError, setStreamError] = useState(null)
  const { data, setData } = useApi(async () => null)
  const { data: searchData, loading: searching, execute: executeSearch } = useApi(searchWeb)
  const radius = data?.blast_radius || {}
  const graph = data?.graph_data || { nodes: [], edges: [] }
  const triagePlan = buildTriagePlan(data)

  useEffect(() => {
    getPersistentState().then((state) => {
      if (state.analysis) {
        setData(state.analysis)
        setIncident(state.analysis.query)
      }
    }).catch(() => {})
    getGraphNodeOptions('*', 100).then(setNodeOptions).catch(() => {})
  }, [setData])

  useEffect(() => {
    if (!data?.incident_id) return
    getIncidentEvents(data.incident_id).then(setEvents).catch(() => {})
    getIncidentAlternatives(data.incident_id).then(setAlternatives).catch(() => {})
  }, [data])

  useEffect(() => {
    if (data) localStorage.setItem('ignite-incident-context', JSON.stringify({
      incident_id: data.incident_id,
      query: data.query,
      graph_verified: Boolean(data.graph_data?.nodes?.length),
      ...data.blast_radius,
    }))
  }, [data])

  const submitIncident = async (event) => {
    event.preventDefault()
    if (!incident.trim() || streaming) return
    setStreaming(true)
    setStreamError(null)
    setLiveEvents([])
    try {
      await streamAnalysis(incident.trim(), (event) => {
        if (event.event === 'analysis_ready') setData(event.analysis)
        else if (event.event === 'graph_completed') {
          setData((current) => ({ ...(current || {}), incident_id: event.incident_id, query: incident.trim(), graph_data: event.graph_data, blast_radius: event.blast_radius }))
          setLiveEvents((current) => [...current, event])
        }
        else if (!event.done && event.event !== 'done') setLiveEvents((current) => [...current, event])
      }, true, true, batchId || null, supplierId || null)
    } catch (streamFailure) {
      setStreamError(streamFailure.message || 'Live trace failed')
    } finally {
      setStreaming(false)
    }
  }

  const confirmAction = async (action) => {
    if (!data?.incident_id || !window.confirm(`Confirm simulated ${action.replace('_', ' ')}?`)) return
    const created = await createSimulatedAction(data.incident_id, action)
    setEvents((current) => [...current, { event: 'action_simulated', message: `${created.action} confirmed for ${created.target}`, source: 'Simulation', status: 'success', timestamp: created.timestamp }])
  }

  const runEvidenceSearch = async () => {
    if (incident.trim()) await executeSearch(`food safety recall ${incident.trim()}`, 5)
  }

  const stats = [
    { title: 'Affected kitchens', value: radius.affected_kitchens?.length || 0, change: 'verified', icon: ShieldAlert, color: 'red' },
    { title: 'Dishes for review', value: radius.disabled_dishes?.length || 0, change: 'from graph', icon: AlertTriangle, color: 'yellow' },
    { title: 'Trace risk score', value: `${Math.round(radius.total_risk_score || 0)}%`, change: 'contextual', icon: Database, color: 'blue' },
    { title: 'Evidence sources', value: data?.sources?.length || 0, change: data?.provider_status?.tavily || 'pending', icon: Globe2, color: 'green' },
  ]

  const groupedKitchens = (radius.affected_kitchens || []).reduce((groups, kitchen) => {
    const match = graph.nodes.find((node) => node.label === 'Kitchen' && (node.properties?.name === kitchen || node.id === kitchen))
    const region = match?.properties?.region || match?.properties?.city || 'Delhi-NCR'
    groups[region] = [...(groups[region] || []), kitchen]
    return groups
  }, {})

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Emergency operations / Delhi-NCR</p><h1 className="mt-2 text-4xl font-bold text-slate-100">Contamination command center</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Trace verified supplier-to-dish impact in seconds. Graph facts stay authoritative when AI or web evidence is unavailable.</p></div><div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_#6ee7b7]" />Operational surface</div></header>
      <section className="card border-cyan-900/70"><div className="mb-4 flex items-center gap-3"><div className="rounded-lg border border-red-400/30 bg-red-400/10 p-2 text-red-300"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Incident intake</p><h2 className="text-lg font-semibold">Flag a supplier or batch</h2></div></div><form onSubmit={submitIncident} className="space-y-3"><textarea value={incident} onChange={(event) => setIncident(event.target.value)} className="input-field min-h-28 resize-y" aria-label="Incident report" /><div className="grid gap-3 md:grid-cols-2"><select value={batchId} onChange={(event) => setBatchId(event.target.value)} className="input-field" aria-label="Trace batch"><option value="">Auto-resolve batch from report</option>{nodeOptions.filter((node) => node.label === 'Batch').map((node) => <option key={node.id} value={node.id}>{node.properties?.batchNumber || node.id} · exact batch</option>)}</select><select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="input-field" aria-label="Trace supplier"><option value="">Auto-resolve supplier from report</option>{nodeOptions.filter((node) => node.label === 'Supplier').map((node) => <option key={node.id} value={node.id}>{node.properties?.name || node.id} · exact supplier</option>)}</select></div><p className="text-xs text-slate-500">Optional exact selectors override name or location matching in the incident report.</p><div className="flex flex-wrap items-center gap-3"><button className="btn-primary inline-flex items-center gap-2" disabled={streaming || !incident.trim()}>{streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}{streaming ? 'Tracing live...' : 'Trace contamination'}</button><button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={runEvidenceSearch} disabled={searching || !incident.trim()}><Search className="h-4 w-4" />{searching ? 'Searching...' : 'Refresh evidence'}</button><span className="text-xs text-slate-500">Neo4j: {data?.provider_status?.neo4j || 'ready to query'} · Tavily: {data?.provider_status?.tavily || 'ready to query'}</span></div></form><div className="mt-5 border-t border-cyan-900/60 pt-4"><ActivityFeed events={streaming || liveEvents.length > 0 ? liveEvents : events} /></div>{streamError && <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">Live trace error: {streamError}</p>}</section>
      <StatCardGrid stats={stats} />
      <IngestionPanel onImported={() => getGraphNodeOptions('*', 100).then(setNodeOptions).catch(() => {})} />
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><GraphViewer nodes={graph.nodes} edges={graph.edges} loading={streaming} onNodeClick={setSelectedNode} /><section className="card min-h-[500px]"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Containment map</p><h2 className="text-lg font-semibold">Kitchen clusters</h2></div><Timer className="h-5 w-5 text-cyan-300" /></div>{Object.keys(groupedKitchens).length === 0 ? <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">Submit an incident to reveal affected geography.</div> : <div className="space-y-4">{Object.entries(groupedKitchens).map(([region, kitchens]) => <div key={region} className="border-l-2 border-amber-400/70 pl-4"><p className="text-sm font-semibold text-amber-200">{region}</p>{kitchens.map((kitchen) => <p key={kitchen} className="mt-1 text-sm text-slate-300">{kitchen}</p>)}</div>)}</div>}{selectedNode && <div className="mt-6 border-t border-slate-800 pt-4"><p className="text-xs uppercase tracking-wider text-slate-500">Selected node</p><p className="mt-1 font-semibold text-slate-100">{selectedNode}</p>{graph.nodes.find((node) => node.id === selectedNode)?.properties && <pre className="mt-2 overflow-auto text-xs text-slate-400">{JSON.stringify(graph.nodes.find((node) => node.id === selectedNode).properties, null, 2)}</pre>}</div>}</section></div>
      {data && <section className="card"><div className="mb-3 flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-emerald-300" /><h2 className="text-lg font-semibold">Investigator brief</h2></div><MarkdownMessage className="text-sm leading-6 text-slate-300">{data.summary}</MarkdownMessage><div className="mt-5 grid gap-3 md:grid-cols-3">{(data.recommended_actions || []).map((action) => <div key={action} className="border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">{action}</div>)}</div></section>}
      {data && <IncidentEvidence analysis={data} alternatives={alternatives} onAction={confirmAction} />}
      {data && <section className="card border-amber-400/30"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-amber-200">Immediate owner routing</p><h2 className="mt-1 text-lg font-semibold">Open drafted incident communications</h2></div><Link to="/triage" className="btn-secondary inline-flex items-center justify-center gap-2 text-sm">Open triage desk <Timer className="h-4 w-4" /></Link></div><div className="grid gap-2 md:grid-cols-2">{triagePlan.slice(0, 4).map((draft) => <a key={draft.owner.email} href={draft.mailto} className="flex items-center gap-3 border border-slate-800 bg-slate-950/40 p-3 transition hover:border-amber-400/50"><Mail className="h-4 w-4 shrink-0 text-[#d7a45d]" /><span className="min-w-0"><strong className="block truncate text-sm text-slate-200">{draft.owner.name}</strong><span className="block truncate text-xs text-slate-500">{draft.subject}</span></span><span className="ml-auto text-xs text-cyan-300">Draft</span></a>)}</div><p className="mt-3 text-xs text-slate-500">Simulation only. Opening a link prepares a message; it does not send one.</p></section>}
      <SearchResults results={searchData?.results || data?.search_results || []} loading={searching} query={incident} />
    </div>
  )
}

export default Dashboard
