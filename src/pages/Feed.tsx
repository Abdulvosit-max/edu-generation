import { useEffect, useState, useCallback } from "react";
import { ImageIcon, Presentation, MessageSquare, ExternalLink, FileText, Download, Sparkles, User as UserIcon, Calendar, Library, Share2, Lock, Globe, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../lib/AppContext";
import { fetchResources, fetchUserResources, Resource, togglePublic } from "../lib/db";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Feed Sahifasi - Hamjamiyat ishlari va Shaxsiy kutubxona
 */
export default function Feed() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>("all");
  const [showMyResources, setShowMyResources] = useState(false);
  const nav = useNavigate();
  const { t } = useAppContext();

  // Ma'lumotlarni yuklash funksiyasi
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = showMyResources ? await fetchUserResources() : await fetchResources(30);
      setResources(data);
    } catch (err) {
      console.error("Ma'lumot yuklashda xato:", err);
    } finally {
      setLoading(false);
    }
  }, [showMyResources]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrlash mantiqi
  const filtered = activeType === "all"
    ? resources.filter(r => r.type !== "chat")
    : resources.filter(r => r.type === activeType);

  // Ikonkalarni olish
  const getTypeIcon = (type: string) => {
    if (type === "image") return <ImageIcon size={14} />;
    if (type === "slide") return <Presentation size={14} />;
    if (type === "test") return <FileText size={14} />;
    return <MessageSquare size={14} />;
  };

  // Tur nomini olish
  const getTypeName = (type: string) => {
    if (type === "image") return t.image;
    if (type === "slide") return t.slide;
    if (type === "test") return t.testBtn;
    return t.chatTab;
  };

  // Ranglar va stillar
  const getTypeStyles = (type: string) => {
    if (type === "image") return "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50";
    if (type === "slide") return "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50";
    if (type === "test") return "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50";
    return "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50";
  };

  // Hamjamiyatga chiqarishni boshqarish
  const handleTogglePublic = async (r: Resource) => {
    try {
      await togglePublic(r.id!, !r.is_public);
      loadData();
    } catch (err) {
      alert("Xatolik: Statusni o'zgartirib bo'lmadi");
    }
  };

  // Promptdan nusxa olish va generatorga o'tish
  const handleCopy = (prompt: string, type: string) => {
    nav(`/${type === "chat" ? "chat" : type}?q=${encodeURIComponent(prompt)}`);
  };

  // Yuklab olish
  const handleDownload = async (r: any) => {
    if (r.type === "image") {
      try {
        const res = await fetch(r.content);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${r.title}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        window.open(r.content, "_blank");
      }
    } else {
      const blob = new Blob([r.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.title}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
      {/* Yuqori qism: Sarlavha va Navigatsiya */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-3">
             <Sparkles className="text-blue-500" size={20} />
             <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">
               {showMyResources ? "Mening Kutubxonam" : "Hamjamiyat"}
             </span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
            {showMyResources ? "Mening Ishlarim" : "Hamjamiyat Ishlari"}
          </h1>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-1.5">
            <button
              onClick={() => setShowMyResources(false)}
              className={`px-5 py-2.5 flex items-center gap-2 font-bold text-xs rounded-xl transition-all ${!showMyResources ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"}`}
            >
              <Globe size={14} /> Barchasi
            </button>
            <button
              onClick={() => setShowMyResources(true)}
              className={`px-5 py-2.5 flex items-center gap-2 font-bold text-xs rounded-xl transition-all ${showMyResources ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"}`}
            >
              <Library size={14} /> Mening ishlarim
            </button>
          </div>

          <div className="flex bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-1.5">
            {["all", "image", "slide", "test"].map(type => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-4 py-2.5 capitalize font-bold text-xs rounded-xl transition-all ${activeType === type ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900" : "text-slate-500"}`}
              >
                {type === "all" ? "Hammasi" : getTypeName(type)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kontent qismi */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Yuklanmoqda...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px]">
          <Globe size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Hech narsa topilmadi</h3>
          <p className="text-slate-500 mt-2">Birinchi bo'lib resurs yarating!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filtered.map((r, idx) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getTypeStyles(r.type)}`}>
                      {getTypeName(r.type)}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                      <Calendar size={12} />
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "Yaqinda"}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">{r.title}</h3>
                  <p className="text-xs text-slate-500 italic mb-4 line-clamp-2">"{r.prompt}"</p>

                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 mb-6">
                    {r.type === "image" ? (
                      <img src={r.content} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        {r.type === "slide" ? <Presentation size={40} /> : <FileText size={40} />}
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button onClick={() => handleDownload(r)} className="p-3 bg-white text-slate-900 rounded-xl hover:scale-110 transition-transform">
                        <Download size={20} />
                      </button>
                      <button onClick={() => handleCopy(r.prompt, r.type)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:scale-110 transition-transform">
                        Nusxalash
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                        {r.author_photo ? <img src={r.author_photo} alt="" /> : <UserIcon className="p-2 text-slate-400" />}
                      </div>
                      <span className="text-[11px] font-bold dark:text-white">{r.author_name}</span>
                    </div>

                    {showMyResources && (
                      <button
                        onClick={() => handleTogglePublic(r)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${r.is_public ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}
                      >
                        {r.is_public ? <Share2 size={12} /> : <Lock size={12} />}
                        {r.is_public ? "Ochiq" : "Yopiq"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
