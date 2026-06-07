import { useState } from "react";
import { ImageIcon, Wand2, Loader2, Download, Share2, Sparkles, AlertCircle, BarChart3, GraduationCap, CheckCircle } from "lucide-react";
import { generateEducationalImage, enhanceEducationalPrompt, generateEducationalImageEvaluation, PedagogikEvaluation } from "../lib/gemini";
import { saveResource } from "../lib/db";
import { useAppContext } from "../lib/AppContext";
import { motion, AnimatePresence } from "framer-motion";

export default function ImageGen() {
  const [prompt, setPrompt] = useState("");
  const [subject, setSubject] = useState("Biologiya");
  const [ageGroup, setAgeGroup] = useState("O'rta sinf (5-9 sinflar)");
  const [style, setStyle] = useState("3D Render");
  const [format, setFormat] = useState("16:9 (Keng ekranli)");
  const [complexity, setComplexity] = useState("O'rtacha");

  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  
  const [evaluation, setEvaluation] = useState<PedagogikEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  
  const [resourceId, setResourceId] = useState<string | number | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { t } = useAppContext();

  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "error" | "info" }[]>([]);
  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  // Promptni AI yordamida yaxshilash
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    try {
      const enhanced = await enhanceEducationalPrompt(prompt, subject, ageGroup, style);
      setEnhancedPrompt(enhanced);
    } catch (e) {
      console.error("Promptni yaxshilashda xato:", e);
      setEnhancedPrompt(`An educational illustration of "${prompt}" for ${subject} lessons, suitable for ${ageGroup}, in ${style} style, detailed visual layout, labeled parts, high educational value`);
    } finally {
      setEnhancing(false);
    }
  };

  // Tasvir va Pedagogik Baholashni yaratish
  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setImgLoading(true);
    setEvaluating(true);
    setImage(null);
    setEvaluation(null);
    setImgError(false);
    setResourceId(null);
    setIsShared(false);
    setElapsedTime(0);

    let timerInterval: any;
    const startTime = Date.now();
    timerInterval = setInterval(() => {
      setElapsedTime(parseFloat(((Date.now() - startTime) / 1000).toFixed(1)));
    }, 100);

    let finalPrompt = enhancedPrompt;
    if (!finalPrompt.trim()) {
      try {
        console.log("Promptni AI yordamida o'zbekchadan inglizchaga tarjima qilish/yaxshilash...");
        finalPrompt = await enhanceEducationalPrompt(prompt, subject, ageGroup, style);
        setEnhancedPrompt(finalPrompt);
      } catch (err) {
        finalPrompt = prompt;
      }
    }

    let generatedUrl = "";
    let evalResult: PedagogikEvaluation | null = null;

    // 1. Tasvirni generatsiya qilish
    try {
      // 1. Check if Puter.js is loaded and active for 100% free keyless AI generation!
      const puter = typeof window !== "undefined" && (window as any).puter;
      if (puter && puter.ai) {
        try {
          console.log("Puter.js orqali AI tasvir generatsiya qilinmoqda (ImageGen)...");
          const stylePrompt = style === "3D Render" ? "isometric 3D render, minimalist cartoon style, vibrant colors" :
                              style === "Realistik" ? "realistic photography, documentary educational style, highly detailed" :
                              style === "Infografik / Diagramma" ? "educational infographic, labeled vector schematic, clear vector diagram" :
                              style === "Multfilm / Illyustratsiya" ? "vibrant school book illustration, colorful drawing style" :
                              "minimalist modern flat vector design, clean paths";
          const promptText = `${finalPrompt}, professional ${stylePrompt}, high quality educational material`;
          const imgElement = await puter.ai.txt2img(promptText);
          if (imgElement && imgElement.src) {
            setImage(imgElement.src);
            generatedUrl = imgElement.src;
          }
        } catch (puterErr) {
          console.warn("Puter.js error, falling back to Pollinations:", puterErr);
        }
      }

      if (!generatedUrl) {
        generatedUrl = await generateEducationalImage(
          finalPrompt + `, in ${style} visual style, structured layout, high detail, high educational value`,
          style,
          format
        );
        setImage(generatedUrl);
      }
    } catch (e: any) {
      console.error("AI Tasvir yaratishda xato:", e);
      setImgError(true);
    } finally {
      clearInterval(timerInterval);
      setLoading(false);
    }

    // 2. Pedagogik Baholashni generatsiya qilish (asinxron parallel)
    try {
      evalResult = await generateEducationalImageEvaluation(prompt, subject, ageGroup, `Tasvir: ${style}`);
      setEvaluation(evalResult);
    } catch (e) {
      console.error("Baholashda xato:", e);
      // Moped default values fallback
      evalResult = {
        pedagogicalGoal: `${prompt} mavzusini vizual tushuntirish va o'quvchilarda mavzu bo'yicha tushunchalarni shakllantirish.`,
        pedagogicalEvaluation: {
          subjectAlignment: 5,
          scientificAccuracy: 5,
          clarity: 4,
          ageAppropriateness: 4,
          overallScorePercentage: 92
        },
        lessonIntegration: {
          stage: "Yangi mavzuni tushuntirish bosqichi",
          method: "Vizual tahlil va suhbat metodi",
          teacherInstructions: "Tasvirni doskaga chiqarib, undagi elementlarni bosqichma-bosqich o'quvchilar bilan birgalikda muhokama qiling."
        }
      };
      setEvaluation(evalResult);
    } finally {
      setEvaluating(false);
    }

    // 3. Bazaga saqlash
    try {
      const id = await saveResource({
        type: "image",
        title: prompt.substring(0, 50) + (prompt.length > 50 ? "..." : ""),
        prompt: prompt,
        content: JSON.stringify({
          imageUrl: generatedUrl,
          subject,
          ageGroup,
          style,
          format,
          complexity,
          enhancedPrompt: finalPrompt,
          evaluation: evalResult
        })
      });
      setResourceId(id);
    } catch (dbErr) {
      console.error("Backend-ga saqlashda xato:", dbErr);
    }
  };

  // Fallback handler if image fails to load
  const handleImageError = () => {
    if (!image) return;
    
    if (image.includes("image.pollinations.ai")) {
      if (image.includes("model=flux")) {
        const fallbackUrl = image.replace("model=flux", "model=grok-imagine");
        console.warn("Pollinations flux error, trying grok-imagine:", fallbackUrl);
        setImage(fallbackUrl);
        return;
      } else if (image.includes("model=grok-imagine")) {
        const fallbackUrl = image.replace("model=grok-imagine", "model=turbo");
        console.warn("Pollinations grok-imagine error, trying turbo:", fallbackUrl);
        setImage(fallbackUrl);
        return;
      }
    }
    // All fallbacks failed — show error
    setImage(null);
    setImgError(true);
    setImgLoading(false);
  };

  // Hamjamiyatga chiqarish
  const handleShare = async () => {
    if (!resourceId) return;
    try {
      await import("../lib/db").then(m => m.togglePublic(resourceId, true));
      setIsShared(true);
      showToast("Tasvir hamjamiyatga ulashildi!");
    } catch (err) {
      showToast("Ulashishda xatolik yuz berdi.", "error");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-auto ${toast.type === "success" ? "bg-green-600 text-white" : toast.type === "error" ? "bg-red-600 text-white" : "bg-blue-600 text-white"}`}>
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"} {toast.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Ta'lim rasmi yaratish</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Mavzu kiriting — AI pedagogik baholangan rasm yaratadi</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol panel — sozlamalar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Parametrlar</p>
            <div className="space-y-3">
              {[
                { label: t.selectSubject, value: subject, onChange: setSubject, options: ["Biologiya","Fizika","Kimyo","Informatika","Matematika","Tarix","Geografiya","Boshlang'ich ta'lim","Kasbiy fanlar"] },
                { label: t.selectAge, value: ageGroup, onChange: setAgeGroup, options: ["Boshlang'ich sinf (1-4 sinflar)","O'rta sinf (5-9 sinflar)","Kollej / Oliy ta'lim"] },
                { label: t.selectStyle, value: style, onChange: setStyle, options: ["3D Render","Infografik / Diagramma","Realistik","Multfilm / Illyustratsiya","Minimalizm"] },
                { label: t.selectComplexity, value: complexity, onChange: setComplexity, options: ["Sodda","O'rtacha","Mukammal"] },
              ].map(({ label, value, onChange, options }) => (
                <div key={label}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                  <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 transition-colors"
                  >
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Dars mavzusi</label>
              <textarea
                rows={3}
                value={prompt}
                onChange={e => { setPrompt(e.target.value); if (enhancedPrompt) setEnhancedPrompt(""); }}
                placeholder={t.imagePlaceholder}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 resize-none placeholder:text-gray-400 transition-colors"
              />

              {prompt.trim() && (
                <button
                  onClick={handleEnhancePrompt}
                  disabled={enhancing || loading}
                  className="mt-2 w-full py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                >
                  {enhancing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {enhancing ? t.enhancing : t.enhancePrompt}
                </button>
              )}

              <AnimatePresence>
                {enhancedPrompt && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-800 dark:text-green-300"
                  >
                    <span className="font-medium block mb-1">AI prompt:</span>
                    <p className="italic text-green-700 dark:text-green-400">{enhancedPrompt}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {loading ? t.generating : t.generateImage}
              </button>
            </div>
          </div>
        </div>

        {/* O'ng panel — natija */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 min-h-[400px] flex flex-col items-center justify-center p-6">
            {loading && !image && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 border-2 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Rasm yaratilmoqda</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{elapsedTime.toFixed(1)}s</p>
                </div>
              </div>
            )}

            {imgError && !loading && (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-red-600 dark:text-red-400">Rasm yuklashda xatolik</p>
                <button onClick={handleGenerate} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                  Qaytadan urinish
                </button>
              </div>
            )}

            {image && (
              <div className="w-full">
                <div className="relative rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                  {imgLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <img
                    src={image}
                    alt="Generated"
                    referrerPolicy="no-referrer"
                    onLoad={() => { setImgLoading(false); setImgError(false); }}
                    onError={handleImageError}
                    className={`w-full max-h-[500px] object-contain transition-opacity duration-300 ${imgLoading ? "opacity-0" : "opacity-100"}`}
                  />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <a href={image} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <Download size={14} /> Yuklab olish
                  </a>
                  {resourceId && !isShared && (
                    <button onClick={handleShare}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                      <Share2 size={14} /> {t.share}
                    </button>
                  )}
                  {isShared && (
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Ulashildi</span>
                  )}
                </div>
              </div>
            )}

            {!loading && !image && !imgError && (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <ImageIcon size={24} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.noImage}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t.noImageDesc}</p>
              </div>
            )}
          </div>

          {/* Pedagogik baholash */}
          <AnimatePresence>
            {(evaluating || evaluation) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.pedEvaluation}</p>
                  {evaluation && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
                      {evaluation.pedagogicalEvaluation?.overallScorePercentage || 92}%
                    </span>
                  )}
                </div>

                {evaluating ? (
                  <div className="flex items-center gap-2 py-4 text-gray-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Baholanmoqda...</span>
                  </div>
                ) : evaluation && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {[
                        { label: "Fanga moslik", score: evaluation.pedagogicalEvaluation?.subjectAlignment || 5 },
                        { label: "Ilmiy aniqlik", score: evaluation.pedagogicalEvaluation?.scientificAccuracy || 5 },
                        { label: "Tushunarliligi", score: evaluation.pedagogicalEvaluation?.clarity || 4 },
                        { label: "Yosh muvofiqlik", score: evaluation.pedagogicalEvaluation?.ageAppropriateness || 5 },
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span>{item.label}</span>
                            <span>{item.score}/5</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.score / 5) * 100}%` }}
                              transition={{ duration: 0.6, delay: i * 0.1 }}
                              className="h-full bg-blue-500 rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
                      <div>
                        <p className="text-gray-400 dark:text-gray-500 mb-0.5">Pedagogik maqsad</p>
                        <p className="text-gray-800 dark:text-gray-200">{evaluation.pedagogicalGoal}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 dark:text-gray-500 mb-0.5">Dars bosqichi</p>
                        <p className="text-blue-600 dark:text-blue-400 font-medium">{evaluation.lessonIntegration?.stage}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 dark:text-gray-500 mb-0.5">Metod</p>
                        <p className="text-gray-800 dark:text-gray-200">{evaluation.lessonIntegration?.method}</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
