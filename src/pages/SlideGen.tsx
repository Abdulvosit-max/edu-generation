import { useState, useEffect } from "react";
import { Presentation, Loader2, FileText, ChevronLeft, ChevronRight, Download, ImageIcon } from "lucide-react";
import { generateEducationalSlides, SlideData } from "../lib/gemini";
import Markdown from "react-markdown";
import { useAppContext } from "../lib/AppContext";
import pptxgen from "pptxgenjs";
import { useSearchParams } from "react-router-dom";

const SLIDE_GRADIENTS = [
  "from-blue-600/95 to-indigo-700/95",
  "from-emerald-600/95 to-teal-700/95",
  "from-purple-600/95 to-fuchsia-700/95",
  "from-rose-600/95 to-pink-700/95",
  "from-orange-500/95 to-red-600/95",
  "from-cyan-600/95 to-blue-700/95",
  "from-violet-600/95 to-purple-700/95",
  "from-teal-600/95 to-emerald-700/95",
];

// topic stringidan deterministik seed hosil qiladi — har render da bir xil rasm
function topicSeed(topic: string, idx: number): number {
  let h = idx * 1000;
  for (let i = 0; i < topic.length; i++) h = (h * 31 + topic.charCodeAt(i)) & 0xfffffff;
  return Math.abs(h);
}

function getSlideImageUrl(imagePrompt: string, seed: number): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt + ", educational, detailed, colorful")}?width=800&height=600&nologo=true&seed=${seed}`;
}

function SlideImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  return (
    <div className="w-full h-full min-h-[160px] rounded-2xl overflow-hidden bg-white/10 flex items-center justify-center">
      {status === "error" ? (
        <div className="flex flex-col items-center gap-2 text-white/50 p-4">
          <ImageIcon size={32} />
          <span className="text-xs">Rasm yuklanmadi</span>
        </div>
      ) : (
        <>
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-white/50" />
            </div>
          )}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setStatus("ok")}
            onError={() => setStatus("error")}
            className={`w-full h-full object-cover rounded-2xl shadow-lg transition-opacity duration-500 ${status === "ok" ? "opacity-100" : "opacity-0"}`}
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
  const { t } = useAppContext();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setTopic(q);
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setSlides(null);
    setCurrentIdx(0);
    try {
      const resp = await generateEducationalSlides(topic);
      setSlides(resp);
    } catch (e: any) {
      alert(`Xatolik: ${e.message || t.errorOccurred}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadPPT = async () => {
    if (!slides) return;
    const pptx = new pptxgen();
    setExporting(true);

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideObj = pptx.addSlide();

      slideObj.addText(slide.title, {
        x: 0.5, y: 0.2, w: "90%", h: 0.8,
        fontSize: 26, bold: true, color: "1E293B",
        align: "center", fontFace: "Arial",
      });

      const textContent = slide.content.replace(/!\[.*?\]\(.*?\)/g, "").replace(/\*\*/g, "").replace(/^#+\s/gm, "").replace(/^-\s/gm, "• ");

      slideObj.addText(textContent, {
        x: 0.5, y: 1.2, w: "55%", h: 4.5,
        fontSize: 16, color: "334155", valign: "top", fontFace: "Arial",
      });

      // imagePrompt dan Pollinations URL hosil qilib PPT ga qo'shamiz
      if (slide.imagePrompt) {
        const imageUrl = getSlideImageUrl(slide.imagePrompt, topicSeed(topic, i));
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          slideObj.addImage({ data: base64Data, x: 6.0, y: 1.2, w: 3.5, h: 4.0, rounding: true });
        } catch {
          // rasm yuklanmasa, to'liq matnli layout
          slideObj.addText(textContent, { x: 0.5, y: 1.2, w: "90%", h: 4.5, fontSize: 18, color: "334155", valign: "top", fontFace: "Arial" });
        }
      }

      slideObj.addNotes(slide.speakerNotes);
    }

    setExporting(false);
    pptx.writeFile({ fileName: `${topic}_EduGen.pptx` });
  };

  const currentSlide = slides?.[currentIdx];
  const imageUrl = currentSlide?.imagePrompt
    ? getSlideImageUrl(currentSlide.imagePrompt, topicSeed(topic, currentIdx))
    : null;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <Presentation className="text-blue-600 dark:text-blue-400" /> {t.slideTitle}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">{t.slideDesc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">

        {/* Settings Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">{t.whatTopic}</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder={t.topicPlaceholder}
              onKeyDown={e => e.key === "Enter" && handleGenerate()}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-shadow text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="mt-4 w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="animate-spin" /> : <FileText />}
              {loading ? t.slidePreparing : t.generateSlide}
            </button>
          </div>

          {slides && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/30 flex flex-col gap-3">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 text-sm">{t.totalSlides}: {slides.length}</h3>

              {/* Slide thumbnails */}
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {slides.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors truncate ${i === currentIdx ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700"}`}
                  >
                    {i + 1}. {s.title}
                  </button>
                ))}
              </div>

              <button
                onClick={downloadPPT}
                disabled={exporting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 flex items-center justify-center gap-2 rounded-xl transition-colors shadow-sm mt-2"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {exporting ? "Tayyorlanmoqda..." : t.downloadPPT}
              </button>
            </div>
          )}
        </div>

        {/* Presentation Area */}
        <div className="lg:col-span-8 flex flex-col min-h-[500px]">
          <div className="bg-white dark:bg-slate-800 flex-1 border border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col relative overflow-hidden shadow-sm">
            {loading ? (
              <div className="m-auto flex flex-col items-center gap-4 text-blue-600 dark:text-blue-400">
                <Loader2 size={48} className="animate-spin" />
                <p className="font-medium">{t.slidePreparing}</p>
              </div>

            ) : slides && currentSlide ? (
              <>
                {/* Slide counter */}
                <div className="px-6 pt-5 pb-0 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Slide {currentIdx + 1} / {slides.length}
                  </span>
                  <div className="flex gap-1">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIdx(i)}
                        className={`h-1.5 rounded-full transition-all ${i === currentIdx ? "w-6 bg-blue-600" : "w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Main slide content */}
                <div className={`flex-1 m-4 rounded-2xl bg-gradient-to-br ${SLIDE_GRADIENTS[currentIdx % SLIDE_GRADIENTS.length]} p-6 md:p-8 flex flex-col md:flex-row gap-6 overflow-hidden`}>

                  {/* Left: title + content */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4 leading-tight drop-shadow">
                      {currentSlide.title}
                    </h2>
                    <div className="prose prose-sm prose-invert max-w-none text-white/90 [&>ul]:space-y-1.5 [&>ul>li]:text-sm [&>ul>li]:leading-relaxed markdown-body">
                      <Markdown>{currentSlide.content}</Markdown>
                    </div>
                  </div>

                  {/* Right: image */}
                  {imageUrl && (
                    <div className="md:w-2/5 shrink-0 relative">
                      <SlideImage src={imageUrl} alt={currentSlide.title} />
                    </div>
                  )}
                </div>

                {/* Speaker notes */}
                <div className="px-6 pb-5 pt-3 border-t border-slate-100 dark:border-slate-700/50 shrink-0">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.speakerNotes}: </span>
                  <span className="text-slate-500 dark:text-slate-400 italic text-xs">{currentSlide.speakerNotes}</span>
                </div>

                {/* Prev / Next */}
                <div className="absolute inset-y-0 left-2 flex items-center">
                  <button
                    onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
                    disabled={currentIdx === 0}
                    className="p-2.5 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-20 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-all backdrop-blur"
                  >
                    <ChevronLeft size={20} />
                  </button>
                </div>
                <div className="absolute inset-y-0 right-2 flex items-center">
                  <button
                    onClick={() => setCurrentIdx(p => Math.min(slides.length - 1, p + 1))}
                    disabled={currentIdx === slides.length - 1}
                    className="p-2.5 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-20 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-all backdrop-blur"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </>

            ) : (
              <div className="m-auto text-center max-w-sm p-8">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex mx-auto items-center justify-center mb-6 shadow-inner ring-1 ring-slate-100 dark:ring-slate-800">
                  <Presentation size={40} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="font-medium text-lg text-slate-600 dark:text-slate-400">{t.noSlide}</p>
                <p className="text-sm mt-2 opacity-80 text-slate-500 dark:text-slate-400">{t.noSlideDesc}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
