import { useState, useEffect, useCallback } from "react";
import { Presentation, Loader2, FileText, ChevronLeft, ChevronRight, Download, ImageIcon, Maximize2, Share2, CheckCircle } from "lucide-react";
import { generateEducationalSlides, SlideData } from "../lib/gemini";
import { saveResource, togglePublic } from "../lib/db";
import Markdown from "react-markdown";
import { useAppContext } from "../lib/AppContext";
import pptxgen from "pptxgenjs";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const SLIDE_GRADIENTS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-600 to-teal-700",
  "from-purple-600 to-fuchsia-700",
  "from-rose-600 to-pink-700",
  "from-orange-500 to-red-600",
  "from-cyan-600 to-blue-700",
  "from-violet-600 to-purple-700",
  "from-teal-600 to-emerald-700",
];

function topicSeed(topic: string, idx: number): number {
  let h = idx * 1000;
  for (let i = 0; i < topic.length; i++) h = (h * 31 + topic.charCodeAt(i)) & 0xfffffff;
  return Math.abs(h);
}

function getSlideImageUrl(imageSearchTerm: string, seed: number): string {
  return `https://source.unsplash.com/featured/800x600/?${encodeURIComponent(imageSearchTerm)}&sig=${seed}`;
}

function SlideImage({ src, alt, onLoaded, topic }: { src: string; alt: string; onLoaded: () => void; topic?: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [displaySrc, setDisplaySrc] = useState(src);

  const handleLoad = () => {
    setStatus("ok");
    onLoaded();
  };

  const handleError = () => {
    if (status === "loading" && topic) {
      const fallback = `https://loremflickr.com/800/600/${encodeURIComponent(topic || "education")}`;
      setDisplaySrc(fallback);
      return;
    }
    setStatus("error");
    onLoaded();
  };

  return (
    <div className="w-full h-full min-h-[160px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 flex items-center justify-center relative">
      {status === "error" ? (
        <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-white/50 p-4">
          <ImageIcon size={32} />
          <span className="text-xs">Rasm yuklanmadi</span>
        </div>
      ) : (
        <>
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 dark:bg-black/10 backdrop-blur-sm z-10">
              <Loader2 size={32} className="animate-spin text-blue-600 dark:text-white" />
            </div>
          )}
          <img
            src={displaySrc}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-full object-cover rounded-2xl shadow-lg transition-opacity duration-700 ${status === "ok" ? "opacity-100" : "opacity-0"}`}
          />
        </>
      )}
    </div>
  );
}

export default function SlideGen() {
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState<SlideData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [timer, setTimer] = useState(0);
  const [resourceId, setResourceId] = useState<string | number | null>(null);
  const [isShared, setIsShared] = useState(false);
  const { t } = useAppContext();

  const toggleFullscreen = () => {
    const el = document.getElementById("presentation-container");
    if (el) {
      if (!document.fullscreenElement) {
        el.requestFullscreen().catch(err => {
          alert(`Xatolik: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    let interval: any;
    if (loading) {
      setTimer(18);
      interval = setInterval(() => {
        setTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
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
    setLoadedImages({});
    setResourceId(null);
    setIsShared(false);
    
    try {
      const resp = await generateEducationalSlides(topic);
      setSlides(resp);

      const id = await saveResource({
        type: "slide",
        title: topic,
        prompt: topic,
        content: JSON.stringify(resp)
      });
      setResourceId(id);
    } catch (e: any) {
      alert(`Xatolik: AI tizimi band. Birozdan so'ng qayta urining.`);
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

  const handleImageLoaded = useCallback((idx: number) => {
    setLoadedImages(prev => ({ ...prev, [idx]: true }));
  }, []);

  const downloadPPT = async () => {
    if (!slides) return;
    const pptx = new pptxgen();
    setExporting(true);
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideObj = pptx.addSlide();
      slideObj.addText(slide.title, { x: 0.5, y: 0.2, w: "90%", h: 0.8, fontSize: 26, bold: true, color: "1E293B", align: "center", fontFace: "Arial" });
      const textContent = slide.content.replace(/!\[.*?\]\(.*?\)/g, "").replace(/\*\*/g, "").replace(/^#+\s/gm, "").replace(/^-\s/gm, "• ");
      slideObj.addText(textContent, { x: 0.5, y: 1.2, w: "55%", h: 4.5, fontSize: 16, color: "334155", valign: "top", fontFace: "Arial" });
      if (slide.imagePrompt) {
        const imageUrl = getSlideImageUrl(slide.imagePrompt, topicSeed(topic, i));
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const base64Data = await new Promise<string>((res, rej) => {
            const r = new FileReader(); r.onloadend = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob);
          });
          slideObj.addImage({ data: base64Data, x: 6.0, y: 1.2, w: 3.5, h: 4.0, rounding: true });
        } catch {
          slideObj.addText(textContent, { x: 0.5, y: 1.2, w: "90%", h: 4.5, fontSize: 18, color: "334155", valign: "top", fontFace: "Arial" });
        }
      }
      slideObj.addNotes(slide.speakerNotes);
    }
    setExporting(false);
    pptx.writeFile({ fileName: `${topic}_EduGen.pptx` });
  };

  const currentSlide = slides?.[currentIdx];
  const isImageReady = loadedImages[currentIdx];

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen flex flex-col overflow-x-hidden">
      <div className="mb-6 shrink-0 mt-2 md:mt-0">
        <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <Presentation className="text-blue-600" /> Slayd Yaratish
        </h1>
        <p className="text-slate-500 text-sm mt-1">Sun'iy intellekt orqali professional slaydlar tayyorlang.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Mavzu nomi</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Masalan: Quyosh tizimi"
              onKeyDown={e => e.key === "Enter" && handleGenerate()}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-500"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="mt-4 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" /> : <FileText />} {loading ? "Tayyorlanmoqda..." : "Yaratish"}
            </button>
          </div>

          {slides && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <button onClick={downloadPPT} disabled={exporting} className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                  {exporting ? <Loader2 className="animate-spin" /> : <Download />} PPTX yuklash
                </button>
                
                {resourceId && !isShared && (
                  <button onClick={handleShare} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                    <Share2 size={18} /> Hamjamiyatga chiqarish
                  </button>
                )}
                
                {isShared && (
                  <div className="w-full bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                    <CheckCircle size={18} /> Hamjamiyatga qo'shildi
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {slides.map((s, i) => (
                  <button key={i} onClick={() => setCurrentIdx(i)} className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all border ${i === currentIdx ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-500"}`}>
                    {i + 1}. {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div id="presentation-container" className="lg:col-span-8 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900 rounded-[40px] p-2 border border-slate-200">
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-[32px] flex flex-col relative overflow-hidden shadow-2xl">
            {loading ? (
              <div className="m-auto flex flex-col items-center gap-4">
                <Loader2 size={48} className="animate-spin text-blue-600" />
                <p className="font-bold">Slaydlar tayyorlanmoqda... {timer}s</p>
              </div>
            ) : slides && currentSlide ? (
              <div className="h-full flex flex-col relative">
                <button onClick={toggleFullscreen} className="absolute top-8 right-8 z-30 p-3 bg-white/20 backdrop-blur-md rounded-full text-white"><Maximize2 size={20} /></button>
                
                <div className="flex-1 p-8 pt-12 flex flex-col md:flex-row gap-8">
                  <div className={`flex-1 rounded-[40px] bg-gradient-to-br ${SLIDE_GRADIENTS[currentIdx % SLIDE_GRADIENTS.length]} p-8 flex flex-col md:flex-row gap-8 shadow-2xl overflow-hidden`}>
                    <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[32px]">
                       <h2 className="text-3xl font-black text-white mb-6">{currentSlide.title}</h2>
                       <div className="prose prose-invert max-w-none text-white/90">
                         <Markdown>{Array.isArray(currentSlide.content) ? currentSlide.content.join("\n") : String(currentSlide.content)}</Markdown>
                       </div>
                    </div>
                    <div className="md:w-1/3 aspect-square bg-white/10 backdrop-blur-md rounded-[32px] p-3">
                       <SlideImage 
                         src={getSlideImageUrl((currentSlide as any).imageSearchTerm || (currentSlide as any).imagePrompt, topicSeed(topic, currentIdx))} 
                         alt={currentSlide.title}
                         topic={currentSlide.title}
                         onLoaded={() => handleImageLoaded(currentIdx)}
                       />
                    </div>
                  </div>
                </div>

                <div className="px-8 pb-6 flex items-center justify-between">
                  <div className="flex-1 pr-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Nutq matni</span>
                    <p className="text-xs text-slate-600 italic line-clamp-2">{currentSlide.speakerNotes}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentIdx(p => Math.max(0, p - 1))} className="p-3 bg-slate-100 rounded-full"><ChevronLeft /></button>
                    <button onClick={() => setCurrentIdx(p => Math.min(slides.length - 1, p + 1))} className="p-3 bg-slate-100 rounded-full"><ChevronRight /></button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="m-auto text-center p-12">
                <Presentation size={56} className="mx-auto text-slate-200 mb-4" />
                <h3 className="text-xl font-bold">Hali slayd yaratilmadi</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
