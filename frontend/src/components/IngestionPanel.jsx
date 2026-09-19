import { useState } from 'react'
import PropTypes from 'prop-types'
import { CheckCircle2, FileSpreadsheet, Loader2, UploadCloud, XCircle } from 'lucide-react'
import { importIngestion, previewIngestion } from '../lib/api'

function IngestionPanel({ onImported }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const inspectFile = async (selectedFile) => {
    setFile(selectedFile)
    setPreview(null)
    setError('')
    if (!selectedFile) return
    setBusy(true)
    try {
      setPreview(await previewIngestion(selectedFile))
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  const confirmImport = async () => {
    if (!file || !preview?.valid_rows) return
    setBusy(true)
    setError('')
    try {
      const result = await importIngestion(file)
      setPreview(result)
      onImported?.(result)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return <section className="card border-emerald-900/60"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-3"><div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-2 text-emerald-300"><FileSpreadsheet className="h-5 w-5" /></div><div><p className="text-xs uppercase tracking-[0.18em] text-emerald-300">No-code graph intake</p><h2 className="text-lg font-semibold">Add operational records</h2></div></div><p className="mt-2 max-w-2xl text-sm text-slate-400">Upload a UTF-8 CSV export. Preview validation first; only confirmed rows are written to the traceability graph.</p></div><label className="btn-secondary inline-flex cursor-pointer items-center justify-center gap-2 text-sm"><UploadCloud className="h-4 w-4" />Choose CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => inspectFile(event.target.files?.[0] || null)} /></label></div>{busy && <p className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300"><Loader2 className="h-4 w-4 animate-spin" />Validating records...</p>}{error && <p className="mt-4 flex items-center gap-2 text-sm text-red-300"><XCircle className="h-4 w-4" />{error}</p>}{preview && <div className="mt-5 border-t border-slate-800 pt-4"><div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><span className="text-slate-300">{preview.filename}</span><span className="text-emerald-300">{preview.valid_rows} valid</span><span className={preview.rejected_rows ? 'text-amber-300' : 'text-slate-400'}>{preview.rejected_rows} rejected</span>{preview.imported && <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-4 w-4" />Imported</span>}</div>{preview.errors?.length > 0 && <div className="mt-3 space-y-1 text-xs text-amber-200">{preview.errors.slice(0, 3).map((item) => <p key={item}>{item}</p>)}</div>}<div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" className="btn-primary text-sm" disabled={busy || !preview.valid_rows || preview.imported} onClick={confirmImport}>Confirm graph import</button><span className="text-xs text-slate-500">Creates Supplier, Batch, Kitchen, Dish, delivery, and usage records.</span></div></div>}</section>
}

IngestionPanel.propTypes = { onImported: PropTypes.func }
export default IngestionPanel