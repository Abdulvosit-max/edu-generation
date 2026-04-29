import { useState, useRef, useEffect, useCallback } from "react";
import { generateEducationalChat } from "../lib/gemini";
import Markdown from "react-markdown";
import { Send } from "lucide-react";
import { useAppContext } from "../lib/AppContext";

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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative">
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{t.chatTitle}</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400 dark:bg-red-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 dark:bg-yellow-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 dark:bg-green-500/80"></div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 pb-32 w-full max-w-4xl mx-auto flex flex-col gap-6">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none"
                }`}
              >
                {!isUser && m.id !== "1" && (
                  <div className="text-xs text-blue-500 dark:text-blue-400 font-bold mb-2 uppercase tracking-wide">Edu-Gen</div>
                )}
                <div className={`prose prose-sm max-w-none ${isUser ? "prose-invert" : "prose-slate"} marker:text-current markdown-body`}>
                  <Markdown>{m.text}</Markdown>
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none p-4 pr-8 text-sm">
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <div className="max-w-4xl mx-auto relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t.askQuestion}
            className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
            disabled={loading}
          />
          <button
            disabled={!input.trim() || loading}
            onClick={handleSend}
            className="absolute right-2 top-0 bottom-0 my-auto h-8 w-8 flex items-center justify-center p-1.5 bg-blue-600 text-white disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-100 dark:disabled:text-slate-500 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
