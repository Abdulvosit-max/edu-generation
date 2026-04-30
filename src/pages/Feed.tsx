import { Rocket, Sparkles, Globe, Clock, LayoutTemplate, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppContext } from "../lib/AppContext";

export default function Feed() {
  const { t } = useAppContext();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto h-full flex flex-col items-center justify-center text-center overflow-y-auto">
      <div className="relative mb-12">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/30 blur-[60px] rounded-full"></div>
        
        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 w-28 h-28 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
          <Globe size={56} />
          <div className="absolute -top-3 -right-3 bg-white dark:bg-slate-800 text-amber-500 p-2 rounded-xl shadow-lg transform rotate-12">
            <Star size={20} className="fill-amber-500" />
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="text-blue-500" size={20} />
        <span className="text-sm font-black text-blue-500 uppercase tracking-[0.3em]">
          Tez Kunda
        </span>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-6">
        Edu-Gen Hamjamiyati
      </h1>
      
      <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
        Hozirda ilovamizning MVP (minimal ishlovchi) versiyasidasiz. Barcha sun'iy intellekt vositalarimiz (Chat, Slayd, Test, Rasm) to'liq bepul va cheklovlarsiz ishlamoqda. Tarixni saqlash va hamjamiyat bilan ulashish funksiyalari tez kunda qo'shiladi!
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-12">
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
            <LayoutTemplate size={24} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">Cheksiz Yaratish</h3>
          <p className="text-xs text-slate-500">Barcha sun'iy intellekt vositalarimiz ishlab turibdi.</p>
        </div>
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center text-center relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
            <Clock size={24} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">Tarixni Saqlash</h3>
          <p className="text-xs text-slate-500">Keyingi versiyada barcha ishlaringiz saqlanib qoladi.</p>
          <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">Tez kunda</div>
        </div>
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center text-center relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
            <Rocket size={24} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">Ijtimoiy Tarmoq</h3>
          <p className="text-xs text-slate-500">O'z ishlaringizni boshqa o'qituvchilar bilan ulashish.</p>
          <div className="absolute top-0 right-0 bg-purple-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">Tez kunda</div>
        </div>
      </div>

      <div className="flex gap-4">
        <Link to="/chat" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
          <Sparkles size={18} />
          {t.newProject}
        </Link>
      </div>
    </div>
  );
}

