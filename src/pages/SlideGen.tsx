import { useState, useEffect, useCallback } from "react";
import * as Icons from "lucide-react";
import {
  Presentation, Loader2, FileText, ChevronLeft, ChevronRight, Download,
  Maximize2, Share2, CheckCircle, ImageIcon, RefreshCw, Sparkles, Eye, EyeOff
} from "lucide-react";
import { generateEducationalSlides, SlideData, getSlideImageUrl } from "../lib/gemini";
import { saveResource, togglePublic } from "../lib/db";
import Markdown from "react-markdown";
import { useAppContext } from "../lib/AppContext";
import pptxgen from "pptxgenjs";
import { useSearchParams } from "react-router-dom";

/* ─── Color maps ─────────────────────────────────────────────────────────── */
const colorGradients: Record<string, string> = {
  blue:    "from-blue-700 to-blue-900",
  emerald: "from-emerald-600 to-emerald-800",
  rose:    "from-rose-600 to-rose-800",
  amber:   "from-amber-500 to-orange-700",
  indigo:  "from-indigo-700 to-indigo-900",
  purple:  "from-purple-700 to-fuchsia-800",
  cyan:    "from-cyan-600 to-blue-700",
  slate:   "from-slate-700 to-slate-900",
  zinc:    "from-zinc-700 to-zinc-900",
  gray:    "from-gray-600 to-gray-800",
  teal:    "from-teal-600 to-teal-800",
  sky:     "from-sky-500 to-blue-700",
  navy:    "from-slate-800 to-slate-950",
};

const hexColors: Record<string, string> = {
  blue: "1D4ED8", emerald: "059669", rose: "E11D48", amber: "D97706",
  indigo: "4338CA", purple: "7E22CE", cyan: "0891B2", slate: "334155",
  zinc: "3F3F46", gray: "4B5563", teal: "0F766E", sky: "0284C7", navy: "0F172A"
};

/* ─── Theme definitions ──────────────────────────────────────────────────── */
const THEMES = [
  { id: "tech",    label: "Tech",    desc: "Zamonaviy",  preview: "from-blue-700 to-indigo-900" },
  { id: "edu",     label: "Edu",     desc: "Yorqin",     preview: "from-emerald-500 to-cyan-600" },
  { id: "corp",    label: "Corp",    desc: "Rasmiy",     preview: "from-slate-600 to-slate-800" },
  { id: "nature",  label: "Nature",  desc: "Tabiat",     preview: "from-green-600 to-teal-700" },
  { id: "space",   label: "Space",   desc: "Kosmik",     preview: "from-indigo-900 to-purple-900" },
  { id: "warm",    label: "Warm",    desc: "Issiq",      preview: "from-rose-500 to-amber-600" },
  { id: "minimal", label: "Minimal", desc: "Sof",        preview: "from-gray-700 to-gray-900" },
  { id: "ocean",   label: "Ocean",   desc: "Okean",      preview: "from-cyan-600 to-blue-700" },
  { id: "sunset",  label: "Sunset",  desc: "Botmoq",     preview: "from-rose-600 to-purple-700" },
];

const themeInstruction: Record<string, string> = {
  tech:    "Tech/Minimal: quyuq sovuq ranglar – 'blue', 'indigo', 'slate', 'zinc'.",
  edu:     "Edu/Bright: yorqin – 'emerald', 'amber', 'rose', 'cyan'.",
  corp:    "Corporate: rasmiy – 'sky', 'gray', 'teal', 'navy'.",
  nature:  "Nature: tabiiy – 'emerald', 'teal', 'amber'.",
  space:   "Space: kosmik – 'indigo', 'purple', 'slate'.",
  warm:    "Warm: issiq – 'rose', 'amber', 'indigo'.",
  minimal: "Minimal: sof – 'gray', 'slate', 'zinc'.",
  ocean:   "Ocean: okean – 'cyan', 'sky', 'blue'.",
  sunset:  "Sunset: botmoq – 'rose', 'purple', 'amber'.",
};

/* ─── Slide layout badge labels ─────────────────────────────────────────── */
const LAYOUT_LABELS: Record<string, string> = {
  intro_title:          "Kirish",
  text_icon:            "Matn",
  process_diagram:      "Jarayon",
  "3d_illustration":    "Illyustratsiya",
  comparison:           "Taqqoslash",
  statistics_highlight: "Statistika",
};

/* ─── SlideGen component ─────────────────────────────────────────────────── */
export default function SlideGen() {
  const [searchParams] = useSearchParams();
  const { t } = useAppContext();

  const [topic, setTopic]       = useState("");
  const [theme, setTheme]       = useState("tech");
  const [slides, setSlides]     = useState<SlideData[] | null>(null);
  const [loading, setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timer, setTimer]       = useState(0);
  const [resourceId, setResourceId] = useState<string | number | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Per-slide image state
  const [slideImages, setSlideImages]           = useState<Record<number, string>>({});
  const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({});
  const [imageGenEnabled, setImageGenEnabled]   = useState(true);

  // Export progress
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  /* ── URL param ── */
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setTopic(q);
  }, [searchParams]);

  /* ── Timer while loading ── */
  useEffect(() => {
    let interval: any;
    if (loading) {
      setTimer(0);
      interval = setInterval(() => setTimer(p => p + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  /* ── Generate a single slide's image ── */
  const generateSingleImage = useCallback(async (idx: number, prompt: string) => {
    setGeneratingImages(prev => ({ ...prev, [idx]: true }));
    try {
      const url = await getSlideImageUrl(prompt);
      setSlideImages(prev => ({ ...prev, [idx]: url }));
    } catch {
      // silent — no image
    } finally {
      setGeneratingImages(prev => ({ ...prev, [idx]: false }));
    }
  }, []);

  /* ── Generate images for all slides (parallel, non-blocking) ── */
  const generateAllImages = useCallback((slidesArr: SlideData[]) => {
    slidesArr.forEach((s, idx) => {
      if (s.imagePrompt) generateSingleImage(idx, s.imagePrompt);
    });
  }, [generateSingleImage]);

  /* ── Main generation ��─ */
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setSlides(null);
    setSlideImages({});
    setGeneratingImages({});
    setCurrentIdx(0);
    setResourceId(null);
    setIsShared(false);
    setErrorMsg(null);
    setShareSuccess(false);

    try {
      const resp = await generateEducationalSlides(topic, theme);
      setSlides(resp);
      if (imageGenEnabled) generateAllImages(resp);

      const id = await saveResource({
        type: "slide",
        title: topic,
        prompt: `${topic} (${theme})`,
        content: JSON.stringify(resp)
      });
      setResourceId(id);
    } catch (e: any) {
      setErrorMsg(e?.message || "Xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!resourceId) return;
    try {
      await togglePublic(resourceId, true);
      setIsShared(true);
      setShareSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Ulashishda xatolik.");
    }
  };

  const toggleFullscreen = () => {
    const el = document.getElementById("slide-preview");
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  /* ── PPTX export ── */
  const downloadPPT = async () => {
    if (!slides) return;
    const pptx = new pptxgen();
    setExporting(true);
    setExportProgress({ current: 0, total: slides.length });

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideObj = pptx.addSlide();
      const bgHex = hexColors[slide.colorScheme] || "1E293B";
      slideObj.background = { color: bgHex };

      // Background image from generated images
      const imgUrl = slideImages[i];
      if (imgUrl) {
        try {
          let base64 = imgUrl;
          if (imgUrl.startsWith("http")) {
            const resp = await fetch(imgUrl);
            const blob = await resp.blob();
            base64 = await new Promise<string>(res => {
              const reader = new FileReader();
              reader.onloadend = () => res(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }
          slideObj.addImage({ data: base64, x: 0, y: 0, w: "100%", h: "100%", sizing: { type: "cover", w: 10, h: 5.625 } });
          // Dark overlay
          slideObj.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "000000", transparency: 45 } });
        } catch { /* fallback to color bg */ }
      }

      // Top accent bar
      slideObj.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: "FFFFFF", transparency: 40 } });

      if (slide.layoutType === "intro_title") {
        slideObj.addText(slide.title, { x: 0, y: 1.8, w: "100%", h: 1.5, fontSize: 44, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial" });
        slideObj.addShape(pptx.ShapeType.line, { x: 3.5, y: 3.4, w: 3.0, h: 0, line: { color: "FFFFFF", width: 3, transparency: 30 } });
        slideObj.addText("EduGen • " + topic, { x: 0, y: 3.8, w: "100%", h: 0.5, fontSize: 16, color: "FFFFFF", align: "center", italic: true, transparency: 20 });
      } else if (slide.layoutType === "comparison" && slide.comparisonData) {
        slideObj.addText(slide.title, { x: 0.5, y: 0.15, w: "90%", h: 0.7, fontSize: 28, bold: true, color: "FFFFFF", align: "left" });
        slideObj.addShape(pptx.ShapeType.roundRect, { x: 0.4, y: 1.1, w: 4.3, h: 4.0, fill: { color: "FFFFFF", transparency: 80 }, line: { color: "FFFFFF", transparency: 60 } });
        slideObj.addText(slide.comparisonData.leftTitle, { x: 0.5, y: 1.2, w: 4.1, h: 0.5, fontSize: 17, bold: true, color: "FFFFFF", align: "center" });
        slideObj.addText(slide.comparisonData.left.map(s => "• " + s).join("\n"), { x: 0.6, y: 1.8, w: 3.8, h: 3.0, fontSize: 14, color: "FFFFFF", valign: "top" });
        slideObj.addShape(pptx.ShapeType.roundRect, { x: 5.3, y: 1.1, w: 4.3, h: 4.0, fill: { color: "FFFFFF", transparency: 80 }, line: { color: "FFFFFF", transparency: 60 } });
        slideObj.addText(slide.comparisonData.rightTitle, { x: 5.4, y: 1.2, w: 4.1, h: 0.5, fontSize: 17, bold: true, color: "FFFFFF", align: "center" });
        slideObj.addText(slide.comparisonData.right.map(s => "• " + s).join("\n"), { x: 5.5, y: 1.8, w: 3.8, h: 3.0, fontSize: 14, color: "FFFFFF", valign: "top" });
      } else if (slide.layoutType === "statistics_highlight" && slide.statValue) {
        slideObj.addText(slide.title, { x: 0.5, y: 0.15, w: "90%", h: 0.7, fontSize: 28, bold: true, color: "FFFFFF", align: "left" });
        slideObj.addText(slide.statValue, { x: 0, y: 1.8, w: "100%", h: 1.8, fontSize: 100, bold: true, color: "FFFFFF", align: "center" });
        slideObj.addText(slide.statDesc || "", { x: 0, y: 3.7, w: "100%", h: 0.7, fontSize: 22, color: "FFFFFF", align: "center", italic: true });
      } else if (slide.layoutType === "process_diagram" && slide.diagramSteps) {
        slideObj.addText(slide.title, { x: 0.5, y: 0.15, w: "90%", h: 0.7, fontSize: 28, bold: true, color: "FFFFFF", align: "left" });
        const bw = 8.5 / slide.diagramSteps.length;
        slide.diagramSteps.forEach((step, j) => {
          const xp = 0.4 + j * bw;
          slideObj.addShape(pptx.ShapeType.roundRect, { x: xp, y: 1.1, w: bw - 0.15, h: 1.0, fill: { color: "FFFFFF", transparency: 75 } });
          slideObj.addText(step, { x: xp, y: 1.1, w: bw - 0.15, h: 1.0, fontSize: 13, bold: true, color: "FFFFFF", align: "center" });
          if (j < slide.diagramSteps!.length - 1)
            slideObj.addShape(pptx.ShapeType.rightArrow, { x: xp + bw - 0.15, y: 1.45, w: 0.15, h: 0.3, fill: { color: "FFFFFF" } });
        });
        const txt = slide.content.replace(/!\[.*?\]\(.*?\)/g, "").replace(/\*\*/g, "").replace(/^#+\s/gm, "").replace(/^-\s/gm, "• ");
        slideObj.addText(txt, { x: 0.5, y: 2.3, w: "90%", h: 3.0, fontSize: 18, color: "FFFFFF", valign: "top", lineSpacing: 28 });
      } else {
        // text_icon + 3d_illustration + fallback
        slideObj.addText(slide.title, { x: 0.5, y: 0.15, w: "90%", h: 0.7, fontSize: 28, bold: true, color: "FFFFFF", align: "left" });
        const txt = slide.content.replace(/!\[.*?\]\(.*?\)/g, "").replace(/\*\*/g, "").replace(/^#+\s/gm, "").replace(/^-\s/gm, "• ");
        slideObj.addText(txt, { x: 0.5, y: 1.1, w: "90%", h: 4.3, fontSize: 18, color: "FFFFFF", valign: "top", lineSpacing: 28 });
      }

      slideObj.addNotes(slide.speakerNotes);
      setExportProgress({ current: i + 1, total: slides.length });
    }

    setExporting(false);
    setExportProgress(null);
    pptx.writeFile({ fileName: `${topic}_EduGen.pptx` });
  };

  /* ── Derived values ── */
  const currentSlide = slides?.[currentIdx];
  const gradient = currentSlide
    ? (colorGradients[currentSlide.colorScheme] || colorGradients.blue)
    : colorGradients.blue;
  const IconComponent = currentSlide?.iconName
    ? ((Icons as any)[currentSlide.iconName] || Presentation)
    : Presentation;

  const bgImage = slideImages[currentIdx] || null;
  const isGeneratingCurrentImg = !!generatingImages[currentIdx];

  /* ── Count how many images still loading ── */
  const totalImgLoading = Object.values(generatingImages).filter(Boolean).length;
  const totalImgDone = Object.keys(slideImages).length;

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col overflow-x-hidden">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Slayd yaratish</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">AI yordamida professional dizaynli prezentatsiya</p>
        </div>
        {/* Image gen toggle */}
        <button
          onClick={() => setImageGenEnabled(p => !p)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${imageGenEnabled ? "border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800"}`}
          title="Slayd rasmlari generatsiyasi"
        >
          {imageGenEnabled ? <><Sparkles size={12} /> Rasmlar yoqiq</> : <><EyeOff size={12} /> Rasmlar o'chiq</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 flex-1 min-h-0">

        {/* ── LEFT PANEL ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 overflow-y-auto lg:max-h-[calc(100vh-160px)]">

          {/* Settings card */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-3">Dizayn teması</p>

            {/* 3x3 theme grid */}
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {THEMES.map(th => (
                <button
                  key={th.id}
                  onClick={() => setTheme(th.id)}
                  className={`relative flex flex-col items-center py-2 rounded-lg border-2 transition-all overflow-hidden ${theme === th.id ? "border-blue-500" : "border-transparent"}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${th.preview} opacity-80`} />
                  <span className={`relative text-[11px] font-semibold ${theme === th.id ? "text-white" : "text-white/90"}`}>{th.label}</span>
                  <span className="relative text-[9px] text-white/70">{th.desc}</span>
                </button>
              ))}
            </div>

            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Mavzu nomi</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Masalan: Koinot sirlari"
              onKeyDown={e => e.key === "Enter" && handleGenerate()}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 mb-3 transition-colors"
            />

            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
              {loading ? `Tayyorlanmoqda... ${timer}s` : "Yaratish"}
            </button>

            {errorMsg && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
                <button onClick={() => setErrorMsg(null)} className="text-xs text-red-400 underline mt-1">Yopish</button>
              </div>
            )}
          </div>

          {/* Actions + slide list */}
          {slides && (
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col gap-3">

              {/* Image generation progress */}
              {(totalImgLoading > 0 || totalImgDone > 0) && imageGenEnabled && (
                <div className="flex items-center gap-2 py-1.5">
                  {totalImgLoading > 0 && <Loader2 size={12} className="animate-spin text-blue-500 flex-shrink-0" />}
                  {totalImgLoading === 0 && <CheckCircle size={12} className="text-green-500 flex-shrink-0" />}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {totalImgLoading > 0
                      ? `${totalImgDone}/${slides.length} rasm yuklandi`
                      : `${totalImgDone} ta rasm tayyor`}
                  </span>
                  <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500 rounded-full" style={{ width: `${(totalImgDone / slides.length) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={downloadPPT}
                  disabled={exporting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {exporting
                    ? <><Loader2 size={14} className="animate-spin" /> {exportProgress ? `${exportProgress.current}/${exportProgress.total}` : ""}...</>
                    : <><Download size={14} /> PPTX yuklash</>}
                </button>

                {resourceId && !isShared && (
                  <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                    <Share2 size={14} /> Ulashish
                  </button>
                )}
                {(isShared || shareSuccess) && (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle size={14} /> Ulashildi
                  </div>
                )}
              </div>

              {/* Thumbnail slide list */}
              <div className="space-y-1 max-h-[340px] overflow-y-auto">
                {slides.map((s, i) => {
                  const isCurrent = i === currentIdx;
                  const hasImg = !!slideImages[i];
                  const isGen = !!generatingImages[i];
                  const grad = colorGradients[s.colorScheme] || colorGradients.blue;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentIdx(i)}
                      className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${isCurrent ? "bg-blue-600 text-white" : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
                    >
                      {/* Mini thumbnail */}
                      <div className="w-14 h-9 rounded flex-shrink-0 overflow-hidden relative border border-white/10">
                        {hasImg
                          ? <img src={slideImages[i]} alt="" className="w-full h-full object-cover" />
                          : <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
                              {isGen && <Loader2 size={9} className="animate-spin text-white/70" />}
                            </div>
                        }
                        {/* Slide number overlay */}
                        <span className="absolute bottom-0 right-0 bg-black/50 text-white text-[8px] px-1 leading-4">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">{s.title}</p>
                        <p className={`text-[9px] ${isCurrent ? "text-blue-200" : "text-gray-400"}`}>{LAYOUT_LABELS[s.layoutType] || s.layoutType}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── MAIN PREVIEW ────────────────────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-3">

          <div id="slide-preview" className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Slaydlar yaratilmoqda... {timer}s</p>
              </div>
            ) : slides && currentSlide ? (
              <>
                {/* ── Background layer ── */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

                {/* Generated background image */}
                {bgImage && (
                  <img
                    src={bgImage}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: 0.35, filter: "blur(1px)", transform: "scale(1.04)" }}
                  />
                )}

                {/* Gradient overlay for text readability */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-70`} />

                {/* Decorative top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20" />

                {/* Fullscreen + image regenerate buttons */}
                <div className="absolute top-3 right-3 z-30 flex gap-2">
                  {imageGenEnabled && currentSlide.imagePrompt && (
                    <button
                      onClick={() => generateSingleImage(currentIdx, currentSlide.imagePrompt!)}
                      disabled={isGeneratingCurrentImg}
                      className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-lg text-white/80 hover:text-white transition-colors disabled:opacity-50"
                      title="Rasmni qayta yaratish"
                    >
                      {isGeneratingCurrentImg
                        ? <Loader2 size={14} className="animate-spin" />
                        : <RefreshCw size={14} />}
                    </button>
                  )}
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-lg text-white/80 hover:text-white transition-colors"
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>

                {/* Slide number badge */}
                <div className="absolute top-3 left-3 z-30 px-2.5 py-1 bg-black/40 backdrop-blur-sm rounded-lg text-white/70 text-[10px] font-medium">
                  {currentIdx + 1} / {slides.length}
                </div>

                {/* ── Slide content ── */}
                <div className="absolute inset-0 z-10 flex flex-col p-8 md:p-12">
                  {currentSlide.layoutType === "intro_title" ? (
                    <div className="m-auto text-center max-w-2xl">
                      <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight drop-shadow-2xl">
                        {currentSlide.title}
                      </h1>
                      <div className="w-20 h-0.5 bg-white/50 mx-auto mb-5" />
                      <p className="text-base text-white/70 italic">EduGen · {topic}</p>
                    </div>
                  ) : currentSlide.layoutType === "statistics_highlight" && currentSlide.statValue ? (
                    <div className="m-auto text-center">
                      <h2 className="text-xl font-semibold text-white/80 mb-8">{currentSlide.title}</h2>
                      <div className="text-7xl md:text-9xl font-black text-white drop-shadow-2xl leading-none mb-4">
                        {currentSlide.statValue}
                      </div>
                      <p className="text-lg md:text-xl text-white/90 italic">{currentSlide.statDesc}</p>
                    </div>
                  ) : currentSlide.layoutType === "comparison" && currentSlide.comparisonData ? (
                    <div className="flex flex-col h-full">
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-5 drop-shadow-md shrink-0">
                        {currentSlide.title}
                      </h2>
                      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                        {[
                          { title: currentSlide.comparisonData.leftTitle, items: currentSlide.comparisonData.left },
                          { title: currentSlide.comparisonData.rightTitle, items: currentSlide.comparisonData.right }
                        ].map((col, ci) => (
                          <div key={ci} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15 flex flex-col min-h-0">
                            <h3 className="text-sm font-bold text-white mb-3 text-center border-b border-white/10 pb-2">{col.title}</h3>
                            <ul className="space-y-1.5 overflow-y-auto flex-1 text-white/90">
                              {col.items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 text-xs leading-snug">
                                  <Icons.CheckCircle size={12} className="shrink-0 mt-0.5 text-white/70" /> {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight drop-shadow-md shrink-0">
                        {currentSlide.title}
                      </h2>

                      {currentSlide.layoutType === "process_diagram" && currentSlide.diagramSteps && (
                        <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                          {currentSlide.diagramSteps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-white text-center">
                                <span className="text-white/50 mr-1">{idx + 1}.</span>{step}
                              </div>
                              {idx < currentSlide.diagramSteps!.length - 1 && (
                                <Icons.ChevronRight size={12} className="text-white/40 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-6 flex-1 min-h-0">
                        <div className="flex-1 min-h-0 overflow-y-auto">
                          <div className="prose prose-sm prose-invert max-w-none text-white/90 [&>ul]:space-y-1 [&>ul>li]:text-sm [&>p]:text-sm [&>p]:leading-relaxed">
                            <Markdown>{String(currentSlide.content)}</Markdown>
                          </div>
                        </div>

                        {/* Right side: image panel for 3d_illustration */}
                        {currentSlide.layoutType === "3d_illustration" && (
                          <div className="w-2/5 shrink-0 flex items-center justify-center">
                            {bgImage ? (
                              <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/20 shadow-2xl">
                                <img src={bgImage} alt="Illustration" className="w-full h-full object-cover" />
                              </div>
                            ) : isGeneratingCurrentImg ? (
                              <div className="w-full aspect-square rounded-xl bg-white/10 flex flex-col items-center justify-center gap-2 border border-white/10">
                                <Loader2 size={28} className="animate-spin text-white/50" />
                                <span className="text-xs text-white/50">Rasm chizilmoqda...</span>
                              </div>
                            ) : (
                              <div className="w-full aspect-square rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                <ImageIcon size={40} className="text-white/30" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Icon for text_icon */}
                        {currentSlide.layoutType === "text_icon" && currentSlide.iconName && (
                          <div className="w-1/4 shrink-0 flex items-center justify-center">
                            <div className="w-24 h-24 md:w-32 md:h-32 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/15 shadow-xl">
                              <IconComponent size={60} className="text-white/80" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Image loading indicator overlay */}
                {isGeneratingCurrentImg && (
                  <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white/80 text-[11px]">
                    <Loader2 size={11} className="animate-spin" /> Fon rasmi yaratilmoqda...
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                  <Presentation size={28} className="text-gray-500" />
                </div>
                <p className="text-sm text-gray-500">Hali slayd yaratilmadi</p>
                <p className="text-xs text-gray-600 mt-1">Chap paneldan mavzu kiriting va yaratish tugmasini bosing</p>
              </div>
            )}
          </div>

          {/* Navigation bar under slide */}
          {slides && currentSlide && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-5 py-3 flex items-center gap-4">
              <button
                onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
                disabled={currentIdx === 0}
                className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Dot indicators */}
              <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`transition-all rounded-full flex-shrink-0 ${i === currentIdx ? "w-5 h-2 bg-blue-600" : "w-2 h-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-400"}`}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrentIdx(p => Math.min(slides.length - 1, p + 1))}
                disabled={currentIdx === slides.length - 1}
                className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>

              <div className="shrink-0 text-right">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Nutq matni</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-1 max-w-xs">{currentSlide.speakerNotes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
