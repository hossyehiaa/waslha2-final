'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, X, Sparkles, Loader2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_QUESTIONS = [
  'How many shipments today?',
  'What is the total COD pending?',
  'Show me the top clients',
  'كم شحنة تم توصيلها اليوم؟',
  'What is the financial summary?',
  'Which drivers have the most deliveries?',
]

export function AIChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am Wslahali AI Assistant. I can see your dashboard data in real-time. Ask me anything about shipments, clients, drivers, COD, finances, and more!\n\nTry one of the suggested questions below to get started.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  async function sendMessage(text?: string) {
    const content = text || input.trim()
    if (!content || loading) return

    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: AbortSignal.timeout(55000), // 55s client timeout
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages([...newMessages, { role: 'assistant', content: `Error: ${data.error || 'Failed to get response'}` }])
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }])
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '⏳ جاري المحاولة مرة أخرى... السؤال البسيط يأخذ وقتاً أقل.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setOpen(true)}
              size="icon"
              className="h-14 w-14 rounded-full shadow-premium bg-primary hover:bg-primary/90 relative"
            >
              <Bot className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] flex flex-col rounded-2xl shadow-premium border border-border bg-card overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-emerald-700 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    Wslahali AI
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs text-white/70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected to dashboard
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={() => setOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-premium p-4 space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
                        <Bot className="w-3 h-3" />
                        AI Assistant
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</div>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm p-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}

              {/* Suggested questions (only show at start) */}
              {messages.length === 1 && !loading && (
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-2 px-1">Suggested questions:</div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t bg-card">
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your dashboard..."
                  disabled={loading}
                  className="flex-1 h-10 rounded-xl"
                />
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-xl shrink-0"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
