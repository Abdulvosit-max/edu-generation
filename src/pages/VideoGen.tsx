import { Video, Loader2, PlaySquare } from "lucide-react";
import { useAppContext } from "../lib/AppContext";

export default function VideoGen() {
  const { t } = useAppContext();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto h-full flex flex-col items-center justify-center text-center">
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 w-24 h-24 rounded-3xl flex items-center justify-center text-white mb-8 shadow-xl shadow-purple-500/30 transform rotate-3">
        <PlaySquare size={48} className="transform -rotate-3" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 mb-6 drop-shadow-sm">
        {t.videoGenTitle}
      </h1>
      
      <div className="relative mb-12 group">
        <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
        <div className="relative px-8 py-3 bg-white dark:bg-slate-800 ring-1 ring-slate-900/5 dark:ring-slate-100/10 rounded-full leading-none flex items-center justify-center gap-3 space-x-2">
          <span className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold uppercase tracking-widest text-sm">
            <Loader2 className="animate-spin" size={16} />
            {t.comingSoon}
          </span>
        </div>
      </div>
      
      <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
        {t.videoGenDesc}
      </p>
    </div>
  );
}
