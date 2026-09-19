import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { Bot, Loader2, Send, Trash2, User } from 'lucide-react'
import MarkdownMessage from './MarkdownMessage'

function AgentChat({ messages, streaming, onSendMessage, onClear }) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (input.trim() && !streaming) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  return (
    <section className="card flex h-[650px] flex-col border-cyan-900/70">
      <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-4"><div className="flex items-center gap-3"><span className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-2 text-cyan-200"><Bot className="h-5 w-5" /></span><div><p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Communications officer</p><h2 className="text-lg font-semibold">Incident briefing desk</h2></div></div><button onClick={onClear} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-400/10 hover:text-red-300" title="Clear briefing"><Trash2 className="h-4 w-4" /></button></div>
      <div className="mb-4 flex-1 space-y-4 overflow-y-auto pr-2">
        {messages.length === 0 && <div className="flex h-full flex-col items-center justify-center text-center text-slate-500"><Bot className="mb-3 h-12 w-12 opacity-50" /><p>Ask for a concise recall brief or mitigation update.</p></div>}
        {messages.map((message, index) => <div key={`${message.timestamp}-${index}`} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}><div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${message.role === 'user' ? 'bg-[#d7a45d] text-[#071014]' : 'bg-slate-800 text-cyan-200'}`}>{message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</div><div className={`max-w-[82%] rounded-xl px-4 py-3 ${message.role === 'user' ? 'bg-[#d7a45d] text-[#071014]' : 'bg-slate-900 text-slate-100'}`}>{message.role === 'user' ? <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p> : <MarkdownMessage className="text-sm leading-6">{message.content}</MarkdownMessage>}<span className="mt-2 block text-[10px] uppercase tracking-wider opacity-50">{new Date(message.timestamp).toLocaleTimeString()}</span></div></div>)}
        {streaming && <div className="flex items-center gap-3 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> Preparing a verified briefing...</div>}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about the affected batch or next action..." className="input-field flex-1" disabled={streaming} /><button type="submit" disabled={!input.trim() || streaming} className="btn-primary grid w-11 place-items-center p-0 disabled:cursor-not-allowed disabled:opacity-50" title="Send briefing request"><Send className="h-4 w-4" /></button></form>
    </section>
  )
}

AgentChat.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.shape({ role: PropTypes.string.isRequired, content: PropTypes.string.isRequired, timestamp: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired })).isRequired,
  streaming: PropTypes.bool.isRequired,
  onSendMessage: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
}

export default AgentChat
