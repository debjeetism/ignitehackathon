import PropTypes from 'prop-types'
import { Activity, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

const statusStyles = {
  success: 'text-emerald-300 border-emerald-400/30',
  warning: 'text-amber-200 border-amber-400/30',
  running: 'text-cyan-300 border-cyan-400/30',
  info: 'text-slate-300 border-slate-700',
}

function ActivityFeed({ events = [] }) {
  const validEvents = events.filter((event) => event?.message && event?.timestamp && !Number.isNaN(Date.parse(event.timestamp)))
  return <section className="card"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-cyan-300" /><div><p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Evidence timeline</p><h2 className="text-lg font-semibold">Incident activity</h2></div></div><span className="text-xs text-slate-500">{validEvents.length} events</span></div>{validEvents.length === 0 ? <p className="py-6 text-sm text-slate-500">Trace an incident to populate the operational timeline.</p> : <div className="space-y-2">{validEvents.map((event, index) => { const active = event.status === 'running' && index === validEvents.length - 1; const Icon = active ? Loader2 : event.status === 'warning' ? AlertCircle : CheckCircle2; return <div key={`${event.timestamp}-${index}`} className={`flex items-start gap-3 border-l-2 pl-3 ${statusStyles[event.status] || statusStyles.info}`}><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'animate-spin' : ''}`} /><div className="min-w-0"><p className="text-sm text-slate-200">{event.message}</p><p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">{event.source} · {new Date(event.timestamp).toLocaleTimeString()}</p></div></div> })}</div>}</section>
}

ActivityFeed.propTypes = { events: PropTypes.arrayOf(PropTypes.shape({ timestamp: PropTypes.string, message: PropTypes.string, source: PropTypes.string, status: PropTypes.string })) }
export default ActivityFeed
