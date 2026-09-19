import { Activity, ClipboardCheck, Command, LayoutDashboard, MessageSquare, Share2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import { useHealthCheck } from '../hooks/useApi'

const navItems = [
  { path: '/dashboard', label: 'War room', icon: LayoutDashboard },
  { path: '/chat', label: 'Comms desk', icon: MessageSquare },
  { path: '/graph', label: 'Graph explorer', icon: Share2 },
  { path: '/triage', label: 'Incident triage', icon: ClipboardCheck },
]

function Navbar() {
  const { status, checkHealth } = useHealthCheck()

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [checkHealth])

  return (
    <nav className="sticky top-0 z-30 border-b border-[#234044]/80 bg-[#071014]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6">
        <NavLink to="/dashboard" className="group flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#d7a45d] text-[#071014] shadow-[0_0_24px_rgba(215,164,93,0.24)]"><Command className="h-5 w-5" /></span>
          <span><span className="block text-[0.65rem] uppercase tracking-[0.24em] text-[#7ea19c]">Ignite / incident command</span><span className="block text-lg font-bold text-[#eef8f2] transition-colors group-hover:text-[#d7a45d]">Trace control</span></span>
        </NavLink>
        <div className="flex items-center gap-1 rounded-xl border border-[#234044] bg-[#0b191c] p-1">
          {navItems.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${isActive ? 'bg-[#d7a45d] font-semibold text-[#071014] shadow-[0_4px_16px_rgba(215,164,93,0.18)]' : 'text-[#8da8a4] hover:bg-[#173136] hover:text-[#eef8f2]'}`}><Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span></NavLink>)}
        </div>
        <div className={`hidden items-center gap-2 text-xs uppercase tracking-wider md:flex ${status.api === 'online' ? 'text-emerald-300' : 'text-red-300'}`}><Activity className="h-3.5 w-3.5" /><span>API {status.api}</span></div>
      </div>
    </nav>
  )
}

export default Navbar
