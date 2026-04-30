import { useState, useRef, useEffect, useCallback } from "react";
import { generateEducationalChat } from "../lib/gemini";
import Markdown from "react-markdown";
import { Send, Bot, User as UserIcon, Sparkles } from "lucide-react";
import { useAppContext } from "../lib/AppContext";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
}

const MAX_MESSAGES = 50;

export default function Chat() {
  const { t } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "model", text: t.chatWelcome }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: input.trim() };
    setMessages(prev => {
      const updated = [...prev, userMsg];
      return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
    });
    setInput("");
    setLoading(true);

    try {
      const resp = await generateEducationalChat(
        messages.map(m => ({ role: m.role, text: m.text })),
        userMsg.text
      );
      setMessages(prev => {
        const updated = [...prev, { id: Date.now().toString(), role: "model" as const, text: resp }];
        return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
      });
    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "model", text: `Xatolik: ${e.message || "Xabar yuborib bo'lmadi."}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t.chatTitle}</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="hidden sm:flex bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-100 dark:border-blue-800/50 items-center gap-1.5">
              <Sparkles size={10} /> Edu-Gen AI
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 pb-32 w-full max-w-4xl mx-auto flex flex-col gap-6 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: idx === messages.length - 1 ? 0 : 0 }}
                className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-3`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                    <Bot size={16} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-[24px] p-5 text-sm leading-relaxed shadow-sm border ${
                    isUser
                      ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-none border-blue-500/30"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border-slate-200/50 dark:border-slate-700/50"
                  }`}
                >
                  <div className={`prose prose-sm max-w-none ${isUser ? "prose-invert" : "prose-slate"} marker:text-current markdown-body`}>
                    <Markdown>{String(m.text)}</Markdown>
                  </div>
                </div>
                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-sm border border-blue-200/50 dark:border-blue-800/50">
                    <UserIcon size={16} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start items-end gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
               <Bot size={16} />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-[24px] rounded-bl-none p-5 pr-10 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 sm:p-6 bg-transparent absolute bottom-0 left-0 right-0 z-20">
        <div className="max-w-4xl mx-auto relative flex items-center group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t.askQuestion}
            className="relative w-full pl-6 pr-14 py-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 shadow-xl transition-all"
            disabled={loading}
          />
          <button
            disabled={!input.trim() || loading}
            onClick={handleSend}
            className="absolute right-2.5 h-10 w-10 flex items-center justify-center bg-blue-600 text-white disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
