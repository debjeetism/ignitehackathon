import { MessageSquare, ShieldCheck } from 'lucide-react'
import AgentChat from '../components/AgentChat'
import { useChatStream } from '../hooks/useApi'

function Chat() {
  const { messages, streaming, sendMessage, clearMessages } = useChatStream()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header><p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Comms desk / verified context</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-bold text-slate-100"><MessageSquare className="h-7 w-7 text-[#d7a45d]" /> Incident communications</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Draft localized recall notices and mitigation updates from the structured investigator result. The graph remains the source of truth for counts and entities.</p></header>
      <div className="flex items-center gap-2 border-y border-slate-800 py-3 text-xs uppercase tracking-wider text-emerald-300"><ShieldCheck className="h-4 w-4" /> Graph facts authoritative · external evidence contextual · actions simulated</div>
      <AgentChat messages={messages} streaming={streaming} onSendMessage={sendMessage} onClear={clearMessages} />
    </div>
  )
}

export default Chat
