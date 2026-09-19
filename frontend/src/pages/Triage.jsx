import { useEffect, useState } from 'react'
import { ClipboardCheck, ExternalLink, Mail, MessageCircle, ShieldAlert } from 'lucide-react'
import { getPersistentState } from '../lib/api'
import { buildTriagePlan, getOwnerDirectory } from '../lib/triage'

function Triage() {
  const [analysis, setAnalysis] = useState(null)

  useEffect(() => {
    getPersistentState().then((state) => setAnalysis(state.analysis)).catch(() => {})
  }, [])

  const plan = buildTriagePlan(analysis)
  const batch = analysis?.blast_radius?.tainted_batch_id || 'No traced batch'
  const hasAnalysis = Boolean(analysis)

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Operations / owner routing</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-100">Incident triage desk</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Assign verified containment work to accountable owners and open prepared drafts.</p>
        </div>
        <span className="status-indicator status-online"><span className="h-2 w-2 rounded-full bg-emerald-300" />Simulation mode</span>
      </header>

      {!hasAnalysis && <section className="card border-amber-400/30 bg-amber-400/5 text-sm text-amber-100">Run an incident trace from the War room first. Triage assignments will use the persisted verified result.</section>}

      <section className="card border-cyan-900/70">
        <div className="mb-4 flex items-center gap-3"><div className="rounded-lg border border-red-400/30 bg-red-400/10 p-2 text-red-300"><ShieldAlert className="h-5 w-5" /></div><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current incident</p><h2 className="text-lg font-semibold">{batch}</h2></div></div>
        <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-3"><div><span className="text-slate-500">Incident ID</span><p className="mt-1 font-mono text-cyan-200">{analysis?.incident_id || 'pending'}</p></div><div><span className="text-slate-500">Kitchens to investigate</span><p className="mt-1 font-semibold text-red-200">{analysis?.blast_radius?.affected_kitchens?.length || 0}</p></div><div><span className="text-slate-500">Confirmed dishes to remove</span><p className="mt-1 font-semibold text-amber-200">{analysis?.blast_radius?.disabled_dishes?.length || 0}</p></div></div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-[#d7a45d]" /><h2 className="text-xl font-semibold">Assigned owners</h2></div>
        <div className="grid gap-4 lg:grid-cols-2">{plan.map((draft) => <article key={draft.owner.email} className="card border-[#234044] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.16em] text-cyan-300">{draft.owner.role}</p><h3 className="mt-1 text-lg font-semibold text-slate-100">{draft.owner.name}</h3><p className="mt-1 text-xs text-slate-500">{draft.owner.email} · simulation contact</p></div><span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-200">Assigned</span></div><p className="mt-4 text-sm font-medium text-[#f4d49b]">{draft.subject}</p><p className="mt-2 min-h-16 text-sm leading-6 text-slate-400">{draft.body}</p><div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4"><a className="btn-secondary inline-flex items-center gap-2 text-sm" href={draft.mailto}><Mail className="h-4 w-4" />Email draft</a><a className="btn-secondary inline-flex items-center gap-2 text-sm" href={draft.whatsapp} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp draft</a><a className="ml-auto inline-flex items-center gap-1 px-2 py-2 text-xs text-slate-500 hover:text-cyan-200" href={draft.mailto}><ExternalLink className="h-3.5 w-3.5" />Draft</a></div></article>)}</div>
      </section>

      <section className="card"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Directory</p><h2 className="text-lg font-semibold">Escalation contacts</h2></div><span className="text-xs text-slate-500">Simulation only</span></div><div className="grid gap-2 md:grid-cols-2">{getOwnerDirectory().map((owner) => <div key={owner.email} className="flex items-center justify-between border border-slate-800 bg-slate-950/40 p-3 text-sm"><span><strong className="text-slate-200">{owner.name}</strong><span className="ml-2 text-slate-500">{owner.role}</span></span><span className="font-mono text-xs text-cyan-300/70">{owner.email}</span></div>)}</div></section>
    </div>
  )
}

export default Triage
