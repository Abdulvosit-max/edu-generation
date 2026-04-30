import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { Presentation, Loader2, FileText, ChevronLeft, ChevronRight, Download, Maximize2, Share2, CheckCircle, Palette } from "lucide-react";
import { generateEducationalSlides, SlideData } from "../lib/gemini";
import { saveResource, togglePublic } from "../lib/db";
import Markdown from "react-markdown";
import { useAppContext } from "../lib/AppContext";
import pptxgen from "pptxgenjs";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const colorGradients: Record<string, string> = {
  blue: "from-blue-600 to-blue-800",
  emerald: "from-emerald-500 to-emerald-700",
  rose: "from-rose-500 to-rose-700",
  amber: "from-amber-500 to-orange-600",
  indigo: "from-indigo-600 to-indigo-800",
  purple: "from-purple-600 to-fuchsia-700",
  cyan: "from-cyan-500 to-blue-600",
  slate: "from-slate-700 to-slate-900",
  zinc: "from-zinc-700 to-zinc-900",
  gray: "from-gray-600 to-gray-800",
  teal: "from-teal-600 to-teal-800",
  sky: "from-sky-500 to-blue-600",
  navy: "from-slate-800 to-slate-950",
};

const hexColors: Record<string, string> = {
  blue: "1D4ED8", emerald: "059669", rose: "E11D48", amber: "D97706",
  indigo: "4338CA", purple: "7E22CE", cyan: "0891B2", slate: "334155",
  zinc: "3F3F46", gray: "4B5563", teal: "0F766E", sky: "0284C7", navy: "0F172A"
};

export default function SlideGen() {
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState("");
  const [theme, setTheme] = useState("tech");
  const [slides, setSlides] = useState<SlideData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timer, setTimer] = useState(0);
  const [resourceId, setResourceId] = useState<string | number | null>(null);
  const [isShared, setIsShared] = useState(false);
  const { t } = useAppContext();

  const toggleFullscreen = () => {
    const el = document.getElementById("presentation-container");
    if (el) {
      if (!document.fullscreenElement) {
        el.requestFullscreen().catch(err => alert(`Xatolik: ${err.message}`));
      } else {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    let interval: any;
    if (loading) {
      setTimer(18);
      interval = setInterval(() => setTimer(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setTopic(q);
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setSlides(null);
    setCurrentIdx(0);
    setResourceId(null);
    setIsShared(false);
    
    try {
      const resp = await generateEducationalSlides(topic, theme);
      setSlides(resp);

      const id = await saveResource({
        type: "slide",
        title: topic,
        prompt: `${topic} (${theme})`,
        content: JSON.stringify(resp)
      });
      setResourceId(id);
    } catch (e: any) {
      console.error(e);
      alert(`Xatolik: ${e.message || "Birozdan so'ng qayta urining."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!resourceId) return;
    try {
      await togglePublic(resourceId, true);
      setIsShared(true);
      alert("Slaydlar hamjamiyatga muvaffaqiyatli qo'shildi!");
    } catch (err) {
      alert("Xatolik: Ulashib bo'lmadi");
    }
  };

  const downloadPPT = async () => {
    if (!slides) return;
    const pptx = new pptxgen();
    setExporting(true);
    
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideObj = pptx.addSlide();
      
      const bgColor = hexColors[slide.colorScheme] || "1E293B";
      slideObj.background = { color: bgColor };
      
      // Decorative top bar
      slideObj.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.2, fill: { color: "FFFFFF", transparency: 90 } });
      
      // Slide Title
      slideObj.addText(slide.title, { x: 0.5, y: 0.2, w: "90%", h: 0.8, fontSize: 32, bold: true, color: "FFFFFF", align: "left", fontFace: "Arial" });
      
      // Decorative line
      slideObj.addShape(pptx.ShapeType.line, { x: 0.5, y: 1.1, w: "90%", h: 0, line: { color: "FFFFFF", width: 2, transparency: 50 } });

      // Slide Content
      const textContent = slide.content.replace(/!\[.*?\]\(.*?\)/g, "").replace(/\*\*/g, "").replace(/^#+\s/gm, "").replace(/^-\s/gm, "• ");
      slideObj.addText(textContent, { x: 0.5, y: 1.5, w: "80%", h: 4.5, fontSize: 20, color: "FFFFFF", valign: "top", fontFace: "Arial", lineSpacing: 32 });
      
      // Speaker Notes
      slideObj.addNotes(slide.speakerNotes);
    }
    
    setExporting(false);
    pptx.writeFile({ fileName: `${topic}_EduGen.pptx` });
  };

  const currentSlide = slides?.[currentIdx];
  const gradient = currentSlide ? (colorGradients[currentSlide.colorScheme] || colorGradients.blue) : colorGradients.blue;
  const IconComponent = currentSlide ? ((Icons as any)[currentSlide.iconName] || Presentation) : Presentation;

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen flex flex-col overflow-x-hidden">
      <div className="mb-6 shrink-0 mt-2 md:mt-0">
        <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <Presentation className="text-blue-600" /> Slayd Yaratish
        </h1>
        <p className="text-slate-500 text-sm mt-1">Zamonaviy vektor va ranglar asosida slaydlar tayyorlash.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3"><Palette size={14} className="inline mr-1"/> Dizayn Uslubi</label>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { id: "tech", label: "Tech", desc: "Zamonaviy" },
                { id: "edu", label: "Edu", desc: "Yorqin" },
                { id: "corp", label: "Corp", desc: "Rasmiy" }
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setTheme(t.id)} 
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border-2 transition-all ${theme === t.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "border-transparent bg-slate-50 dark:bg-slate-900 text-slate-500"}`}
                >
                  <span className="text-xs font-black uppercase">{t.label}</span>
                  <span className="text-[9px] opacity-70">{t.desc}</span>
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Mavzu nomi</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Masalan: Koinot sirlari"
              onKeyDown={e => e.key === "Enter" && handleGenerate()}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 mb-4"
            />

            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" /> : <FileText />} {loading ? "Tayyorlanmoqda..." : "Yaratish"}
            </button>
          </div>

          {slides && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <button onClick={downloadPPT} disabled={exporting} className="w-full bg-slate-800 dark:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
                  {exporting ? <Loader2 className="animate-spin" /> : <Download />} PPTX yuklash
                </button>
                
                {resourceId && !isShared && (
                  <button onClick={handleShare} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors">
                    <Share2 size={18} /> Hamjamiyatga chiqarish
                  </button>
                )}
                
                {isShared && (
                  <div className="w-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                    <CheckCircle size={18} /> Hamjamiyatga qo'shildi
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {slides.map((s, i) => (
                  <button key={i} onClick={() => setCurrentIdx(i)} className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all border ${i === currentIdx ? "bg-blue-600 text-white" : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700"}`}>
                    {i + 1}. {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div id="presentation-container" className="lg:col-span-8 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900 rounded-[40px] p-2 border border-slate-200 dark:border-slate-800">
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-[32px] flex flex-col relative overflow-hidden shadow-2xl">
            {loading ? (
              <div className="m-auto flex flex-col items-center gap-4">
                <Loader2 size={48} className="animate-spin text-blue-600" />
                <p className="font-bold">Slaydlar tayyorlanmoqda... {timer}s</p>
              </div>
            ) : slides && currentSlide ? (
              <div className="h-full flex flex-col relative">
                <button onClick={toggleFullscreen} className="absolute top-8 right-8 z-30 p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"><Maximize2 size={20} /></button>
                
                <div className="flex-1 p-6 md:p-12 pt-16 flex flex-col gap-8">
                  <div className={`flex-1 rounded-[40px] bg-gradient-to-br ${gradient} p-8 md:p-12 flex flex-col justify-center shadow-2xl overflow-hidden relative`}>
                    
                    {/* Background Decorative Shapes */}
                    <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute top-[10%] right-[10%] w-32 h-32 border-4 border-white/5 rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-[20%] right-[20%] w-16 h-16 border-2 border-white/10 rotate-45 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center h-full">
                      <div className="flex-1 order-2 md:order-1">
                         <h2 className="text-4xl md:text-5xl font-black text-white mb-8 leading-tight drop-shadow-md">{currentSlide.title}</h2>
                         <div className="prose prose-lg prose-invert max-w-none text-white/90">
                           <Markdown>{Array.isArray(currentSlide.content) ? currentSlide.content.join("\n") : String(currentSlide.content)}</Markdown>
                         </div>
                      </div>
                      
                      <div className="w-full md:w-1/3 flex justify-center items-center order-1 md:order-2">
                        <div className="w-40 h-40 md:w-48 md:h-48 bg-white/10 backdrop-blur-xl rounded-[40px] flex items-center justify-center border border-white/20 shadow-2xl transform md:rotate-3 md:hover:rotate-0 transition-transform duration-500">
                          <IconComponent size={80} className="text-white drop-shadow-lg" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-8 pb-6 flex items-center justify-between">
                  <div className="flex-1 pr-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Nutq matni</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-2">{currentSlide.speakerNotes}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentIdx(p => Math.max(0, p - 1))} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"><ChevronLeft /></button>
                    <button onClick={() => setCurrentIdx(p => Math.min(slides.length - 1, p + 1))} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"><ChevronRight /></button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="m-auto text-center p-12">
                <Presentation size={56} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Hali slayd yaratilmadi</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
