import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import {
  Send, Plus, Globe, MessageSquare, Bot, User,
  Loader2
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'rj', label: 'Rajasthani' },
];

const PROMPT_STARTERS = [
  "What fertilizer should I use for wheat?",
  "How to manage cotton bollworm?",
  "Best practices for soil health",
  "When to apply urea for paddy?",
  "Current market price trends"
];

export default function AIChat() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('en');
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEnd = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/chat/sessions');
      setSessions(res.data);
    } catch {}
  };

  const loadSession = async (sessionId) => {
    setActiveSession(sessionId);
    try {
      const res = await api.get(`/api/chat/messages/${sessionId}`);
      setMessages(res.data);
    } catch {}
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || sending) return;

    const userMsg = { role: 'user', content: msg, language, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await api.post('/api/chat/send', {
        session_id: activeSession,
        message: msg,
        language
      });
      if (!activeSession) {
        setActiveSession(res.data.session_id);
        fetchSessions();
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        language,
        timestamp: new Date().toISOString()
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        language: 'en',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setSending(false);
    }
  };

  const newChat = () => {
    setActiveSession(null);
    setMessages([]);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-4 lg:-m-6" data-testid="ai-chat-page">
      {/* Sessions sidebar */}
      <div className={`${showSidebar ? 'w-64' : 'w-0 overflow-hidden'} border-r border-[#D8D3CB] dark:border-[#2B4738] bg-white dark:bg-[#14251D] flex flex-col transition-all duration-200`}>
        <div className="p-3 border-b border-[#D8D3CB] dark:border-[#2B4738]">
          <button
            onClick={newChat}
            data-testid="new-chat-btn"
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#1A3C2B] hover:bg-[#142F21] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              data-testid={`chat-session-${s.id}`}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors truncate ${
                activeSession === s.id
                  ? 'bg-[#EAE5DC] dark:bg-[#1E362A] text-[#1A3C2B] dark:text-[#D4A853] font-medium'
                  : 'text-[#4A5D52] dark:text-[#A0B0A7] hover:bg-[#EAE5DC]/50 dark:hover:bg-[#1E362A]/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{s.title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat main */}
      <div className="flex-1 flex flex-col bg-[#F5F0E8] dark:bg-[#0E1A14]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D8D3CB] dark:border-[#2B4738] bg-white/50 dark:bg-[#14251D]/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 hover:bg-[#EAE5DC] dark:hover:bg-[#1E362A] rounded-lg transition-colors lg:hidden"
            >
              <MessageSquare className="w-4 h-4 text-[#4A5D52]" />
            </button>
            <Bot className="w-5 h-5 text-[#1A3C2B] dark:text-[#D4A853]" />
            <h3 className="font-serif text-lg text-[#1A3C2B] dark:text-[#F5F0E8]">AI Agronomist</h3>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#4A5D52]" />
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              data-testid="language-selector"
              className="px-2 py-1.5 bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-md text-xs text-[#0E1A14] dark:text-[#F5F0E8]"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6" data-testid="chat-empty-state">
              <div className="w-16 h-16 rounded-2xl bg-[#1A3C2B]/10 dark:bg-[#D4A853]/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-[#1A3C2B] dark:text-[#D4A853]" />
              </div>
              <div className="text-center">
                <h3 className="font-serif text-xl text-[#1A3C2B] dark:text-[#F5F0E8] mb-1">AI Agronomist</h3>
                <p className="text-sm text-[#4A5D52] dark:text-[#A0B0A7] max-w-sm">
                  Ask me anything about crop management, fertilizers, pest control, or market trends.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 max-w-lg justify-center">
                {PROMPT_STARTERS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(p)}
                    data-testid={`prompt-starter-${i}`}
                    className="px-3 py-2 bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-xs text-[#4A5D52] dark:text-[#A0B0A7] hover:border-[#1A3C2B] dark:hover:border-[#D4A853] hover:text-[#1A3C2B] dark:hover:text-[#D4A853] transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}
                data-testid={`chat-message-${i}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-[#1A3C2B] flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-[#D4A853]" />
                  </div>
                )}
                <div className={`max-w-[75%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#1A3C2B] text-white rounded-br-sm'
                    : 'bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] text-[#0E1A14] dark:text-[#F5F0E8] rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-[#D4A853] flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-[#1A3C2B]" />
                  </div>
                )}
              </motion.div>
            ))
          )}
          {sending && (
            <div className="flex gap-3" data-testid="typing-indicator">
              <div className="w-8 h-8 rounded-lg bg-[#1A3C2B] flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-[#D4A853]" />
              </div>
              <div className="px-4 py-3 bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-xl rounded-bl-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-[#4A5D52] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#4A5D52] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#4A5D52] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#D8D3CB] dark:border-[#2B4738] bg-white/50 dark:bg-[#14251D]/50 backdrop-blur-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask the AI Agronomist..."
              data-testid="chat-input"
              className="flex-1 px-4 py-3 bg-white dark:bg-[#0E1A14] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8] placeholder:text-[#4A5D52]/50 focus:outline-none focus:ring-2 focus:ring-[#1A3C2B]/20"
            />
            <button
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
              data-testid="chat-send-btn"
              className="px-4 py-3 bg-[#1A3C2B] hover:bg-[#142F21] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
