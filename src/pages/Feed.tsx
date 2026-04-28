import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
// import { collection, query, orderBy, getDocs, limit, deleteDoc, doc } from "firebase/firestore"; // Removed
import Markdown from "react-markdown";
import { ImageIcon, Presentation, MessageSquare, ExternalLink, FileText, Download, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../lib/AppContext";
import { Globe } from "lucide-react";

export default function Feed() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>("all");
  const nav = useNavigate();
  const { t } = useAppContext();

  useEffect(() => {
    // Firebase o'chirilgan, shuning uchun yuklash ham o'chirildi
    setLoading(false);
  }, []);

  const filtered = activeType === "all" ? resources.filter(r => r.type !== 'chat') : resources.filter(r => r.type === activeType);

  const getTypeIcon = (type: string) => {
    if (type === "image") return <ImageIcon size={16} />;
    if (type === "slide") return <Presentation size={16} />;
    if (type === "test") return <FileText size={16} />;
    return <MessageSquare size={16} />;
  };
  
  const getTypeName = (type: string) => {
    if (type === "image") return t.image;
    if (type === "slide") return t.slide;
    if (type === "test") return t.testBtn;
    return t.chatTab;
  }

  const handleCopy = (prompt: string, type: string) => {
    nav(`/${type === 'chat' ? 'chat' : type}?q=${encodeURIComponent(prompt)}`);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await deleteDoc(doc(db, "resources", id));
      setResources(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `resources/${id}`);
    }
  };

  const handleDownload = async (r: any) => {
    if (r.type === 'image') {
      try {
        const res = await fetch(r.content);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${r.title}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        window.open(r.content, '_blank');
      }
    } else {
      const blob = new Blob([r.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${r.title}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t.feedTitle}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{t.feedDesc}</p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-1">
          {["all", "image", "slide", "test"].map(type => (
             <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-2 capitalize font-medium text-sm rounded-lg transition-colors ${activeType === type ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              {type === "all" ? t.all : getTypeName(type)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20 opacity-50">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-dashed rounded-3xl">
          <Globe className="mx-auto text-slate-300 dark:text-slate-600 w-12 h-12 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t.noResources}</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t.noResourcesDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                  {getTypeIcon(r.type)}
                  <span>{getTypeName(r.type)}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug break-words">{r.title}</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 break-words font-mono opacity-70 border-l-2 border-slate-200 dark:border-slate-700 pl-2">
                  {t.translationFallback}: {r.prompt || "---"}
                </div>
                
                <div className="mt-auto pt-4 relative">
                  {r.type === "image" && (
                    <img src={r.content} alt={r.title} referrerPolicy="no-referrer" className="w-full h-48 object-cover rounded-xl bg-slate-100 dark:bg-slate-700" />
                  )}
                  {r.type === "slide" && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 h-48 overflow-hidden relative">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{t.slidesBtn}:</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-6 opacity-80 font-mono">
                        {r.content.substring(0, 300)}...
                      </div>
                      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-slate-50 dark:from-slate-900/90 to-transparent"></div>
                    </div>
                  )}
                  {r.type === "chat" && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 h-48 overflow-hidden relative">
                      <div className="markdown-body text-sm text-slate-700 dark:text-slate-300">
                        <Markdown>{r.content.substring(0, 200) + '...'}</Markdown>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-blue-50/50 dark:from-slate-900/90 to-transparent"></div>
                    </div>
                  )}
                  {r.type === "test" && (
                    <div className="bg-green-50/50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30 h-48 overflow-hidden relative">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">{t.testBtn}:</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium whitespace-pre-line overflow-hidden line-clamp-6 opacity-90">
                        {r.content.substring(0, 250)}...
                      </div>
                      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-green-50/50 dark:from-slate-900/90 to-transparent"></div>
                    </div>
                  )}
                  
                  {/* Overlay action */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-white dark:bg-slate-800 bg-opacity-95 dark:bg-opacity-95 backdrop-blur border-t border-slate-100 dark:border-slate-700 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-between gap-2">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate flex-1">
                      {t.author} <span className="text-slate-800 dark:text-slate-200">{r.authorName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {auth.currentUser?.uid === r.authorId && (
                        <button 
                          onClick={() => handleDelete(r.id)}
                          className="flex items-center justify-center text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2 py-1.5 rounded-lg transition-colors"
                          title={t.delete}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDownload(r)}
                        className="flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-2 py-1.5 rounded-lg transition-colors"
                        title={t.download}
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={() => handleCopy(r.prompt, r.type)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/30 px-3 py-1.5 rounded-lg transition-colors"
                        title={t.edit}
                      >
                        <ExternalLink size={14} /> {t.copy}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
