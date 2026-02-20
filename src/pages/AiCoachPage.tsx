import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { getEntries, getHobbies } from '../lib/storage'

interface Message {
  id: number
  role: 'user' | 'ai'
  content: string
}

function getContext() {
  const entries = getEntries()
  const hobbies = getHobbies().filter(h => !h.archived)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const weekEntries = entries.filter(e => e.entry_date >= weekAgo)
  const totalMin = weekEntries.reduce((s, e) => s + e.duration_min, 0)

  const hobbyCount: Record<string, number> = {}
  weekEntries.forEach(e => {
    const name = e.hobby_name || '기타'
    hobbyCount[name] = (hobbyCount[name] || 0) + 1
  })

  const summary = Object.entries(hobbyCount).map(([k, v]) => `${k} ${v}회`).join(', ')
  return { weekEntries: weekEntries.length, totalMin, summary, hobbies }
}

function mockAiResponse(userMsg: string): string {
  const ctx = getContext()

  if (userMsg.includes('분석') || userMsg.includes('어때') || userMsg.includes('요약')) {
    if (ctx.weekEntries === 0) return '이번 주 기록이 없네요! 오늘부터 시작해볼까요? 작은 것부터 기록하는 게 중요해요 💪'
    return `이번 주 ${ctx.weekEntries}회 기록, 총 ${Math.floor(ctx.totalMin / 60)}시간 ${ctx.totalMin % 60}분 연습했어요!\n\n📊 ${ctx.summary}\n\n꾸준히 잘 하고 있어요! 다음 주에는 조금 더 시간을 늘려보는 건 어때요?`
  }

  if (userMsg.includes('팁') || userMsg.includes('추천') || userMsg.includes('조언')) {
    const tips = [
      '연습 전에 5분간 워밍업을 해보세요. 부상 방지에도 좋고 집중력도 올라가요!',
      '같은 시간에 연습하는 습관을 들이면 자연스럽게 루틴이 됩니다 ⏰',
      '기록을 남기는 것만으로도 성장의 50%입니다. 계속 기록하세요! 📝',
      '힘든 날은 10분만이라도 해보세요. 작은 성취가 모여 큰 변화를 만듭니다 🌱',
      '다른 사람과 비교하지 마세요. 어제의 나보다 나아지면 됩니다 ✨',
    ]
    return tips[Math.floor(Math.random() * tips.length)]
  }

  if (userMsg.includes('안녕') || userMsg.includes('하이')) {
    return `안녕하세요! 🤖 저는 AI 코치예요.\n\n${ctx.weekEntries > 0 ? `이번 주 ${ctx.summary} 기록하셨네요! 대단해요 👏` : '아직 이번 주 기록이 없어요. 오늘 시작해볼까요?'}\n\n뭐든 물어보세요 — 연습 팁, 주간 분석, 목표 설정 도움 드릴게요!`
  }

  return `좋은 질문이에요! 🤔\n\n현재 ${ctx.hobbies.length}개의 취미를 관리하고 계시네요. ${ctx.weekEntries > 0 ? `이번 주 ${ctx.weekEntries}회나 기록하셨어요!` : ''}\n\n더 구체적으로 물어보시면 맞춤 조언을 드릴 수 있어요:\n• "이번 주 분석해줘"\n• "연습 팁 줘"\n• "목표 추천해줘"`
}

export function AiCoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'ai', content: '안녕하세요! 🤖 AI 코치예요.\n취미 기록을 분석하고 맞춤 조언을 드릴게요.\n\n"이번 주 분석해줘" 또는 "팁 줘"라고 말해보세요!' },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!input.trim()) return
    const userMsg: Message = { id: Date.now(), role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const aiMsg: Message = { id: Date.now() + 1, role: 'ai', content: mockAiResponse(userMsg.content) }
      setMessages(prev => [...prev, aiMsg])
      setIsTyping(false)
    }, 800 + Math.random() * 700)
  }

  const ctx = getContext()

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100dvh-64px)]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold">AI 코치</h1>
            <p className="text-[10px] text-[#64748b]">
              {ctx.weekEntries > 0 ? `이번 주 ${ctx.summary} 기반 분석` : '기록을 남기면 더 정확한 조언이 가능해요'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-[#6366f1]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={14} className="text-[#818cf8]" />
              </div>
            )}
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
              msg.role === 'user'
                ? 'bg-[#6366f1] text-white rounded-br-md'
                : 'bg-[#13131a] border border-[#1e1e2e] text-[#f1f5f9] rounded-bl-md'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-[#1e1e2e] flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={14} className="text-[#64748b]" />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-[#6366f1]/20 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-[#818cf8]" />
            </div>
            <div className="bg-[#13131a] border border-[#1e1e2e] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#64748b] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#64748b] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#64748b] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#1e1e2e] bg-[#0a0a0f]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-2.5 bg-[#13131a] border border-[#1e1e2e] rounded-xl text-sm focus:outline-none focus:border-[#6366f1] placeholder:text-[#3e3e4e]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 bg-[#6366f1] rounded-xl flex items-center justify-center hover:bg-[#818cf8] transition-colors disabled:opacity-40"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
