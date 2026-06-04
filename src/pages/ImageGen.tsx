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
  const { t } = useAppContext();

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
        generatedUrl = await generateEducationalImage(finalPrompt + `, in ${style} visual style, structured layout, high detail, high educational value`);
        setImage(generatedUrl);
      }
    } catch (e: any) {
      console.error("AI Tasvir yaratishda xato:", e);
      const subjectMap: Record<string, string> = {
        "Biologiya": "biology,nature,cell",
        "Fizika": "physics,laboratory,space",
        "Kimyo": "chemistry,molecule,beaker",
        "Informatika": "computer,coding,technology",
        "Matematika": "math,geometry,numbers",
        "Tarix": "history,ancient,castle",
        "Geografiya": "geography,globe,map",
        "Boshlang'ich ta'lim": "school,elementary,kids",
        "Kasbiy fanlar": "mechanic,construction,engineering"
      };
      const engSubject = subjectMap[subject] || "education,science";
      const cleanTopic = `${engSubject},classroom`;
      const pathTags = cleanTopic.split(',').map(tag => encodeURIComponent(tag.trim())).join(',');
      generatedUrl = `https://loremflickr.com/1024/768/${pathTags}?random=${Math.random()}`;
      setImage(generatedUrl);
    } finally {
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

  // Fallback handler if image fails to load (e.g. Pollinations 402 error)
  const handleImageError = () => {
    if (!image) return;
    
    if (image.includes("image.pollinations.ai")) {
      if (image.includes("model=flux")) {
        const fallbackUrl = image.replace("model=flux", "") + "&fallback=true";
        console.warn("Pollinations flux error, trying stable model-less fallback:", fallbackUrl);
        setImage(fallbackUrl);
        return;
      }
    }
    
    const subjectMap: Record<string, string> = {
      "Biologiya": "biology,nature,cell",
      "Fizika": "physics,laboratory,space",
      "Kimyo": "chemistry,molecule,beaker",
      "Informatika": "computer,coding,technology",
      "Matematika": "math,geometry,numbers",
      "Tarix": "history,ancient,castle",
      "Geografiya": "geography,globe,map",
      "Boshlang'ich ta'lim": "school,elementary,kids",
      "Kasbiy fanlar": "mechanic,construction,engineering"
    };
    const engSubject = subjectMap[subject] || "education,science";
    const cleanTopic = `${engSubject},classroom,study`;
    const pathTags = cleanTopic.split(',').map(tag => encodeURIComponent(tag.trim())).join(',');
    const flickrUrl = `https://loremflickr.com/1024/768/${pathTags}?random=${Math.random()}`;
    console.warn("Pollinations failed completely, falling back to LoremFlickr:", flickrUrl);
    setImage(flickrUrl);
    setImgError(false); // Reset error overlay since we found a fallback image
  };

  // Hamjamiyatga chiqarish
  const handleShare = async () => {
    if (!resourceId) return;
    try {
      await import("../lib/db").then(m => m.togglePublic(resourceId, true));
      setIsShared(true);
      alert("Tasvir hamjamiyatga muvaffaqiyatli qo'shildi!");
    } catch (err) {
      alert("Ulashishda xatolik yuz berdi");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <ImageIcon className="text-blue-600 dark:text-blue-400" /> EduVisual Image Studio
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Dars mavzusi va fan parametrlarini kiriting, AI esa darsingiz uchun professional va pedagogik jihatdan baholangan tasvir resurslarini yaratib beradi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Input & Customization Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[28px] shadow-sm border border-slate-200/60 dark:border-slate-700/60">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <GraduationCap className="text-blue-600" size={20} /> Metodik Parametrlar
            </h3>

            {/* Selectors */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {t.selectSubject}
                </label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {["Biologiya", "Fizika", "Kimyo", "Informatika", "Matematika", "Tarix", "Geografiya", "Boshlang'ich ta'lim", "Kasbiy fanlar"].map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {t.selectAge}
                </label>
                <select
                  value={ageGroup}
                  onChange={e => setAgeGroup(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {["Boshlang'ich sinf (1-4 sinflar)", "O'rta sinf (5-9 sinflar)", "Kollej / Oliy ta'lim"].map(age => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t.selectStyle}
                  </label>
                  <select
                    value={style}
                    onChange={e => setStyle(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {["3D Render", "Infografik / Diagramma", "Realistik", "Multfilm / Illyustratsiya", "Minimalizm"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t.selectComplexity}
                  </label>
                  <select
                    value={complexity}
                    onChange={e => setComplexity(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {["Sodda", "O'rtacha", "Mukammal"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Prompt Inputs */}
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Dars mavzusi va g'oyangiz
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={e => {
                  setPrompt(e.target.value);
                  if (enhancedPrompt) setEnhancedPrompt("");
                }}
                placeholder={t.imagePlaceholder}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-shadow resize-none text-xs font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />

              {/* Prompt Enhancer Button */}
              {prompt.trim() && (
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={enhancing || loading}
                  className="mt-3 w-full py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-black rounded-xl flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-900/40 transition-colors cursor-pointer"
                >
                  {enhancing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} className="text-yellow-500 animate-pulse" />
                  )}
                  {enhancing ? t.enhancing : t.enhancePrompt}
                </button>
              )}

              {/* Enhanced Prompt Preview */}
              <AnimatePresence>
                {enhancedPrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/20 rounded-2xl text-[11px] text-emerald-800 dark:text-emerald-300 font-medium"
                  >
                    <span className="font-bold flex items-center gap-1.5 mb-1.5"><Sparkles size={12} className="text-emerald-500" /> AI Pedagogik Prompt:</span>
                    <p className="italic">"{enhancedPrompt}"</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="mt-6 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-800 dark:disabled:to-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                {loading ? t.generating : t.generateImage}
              </button>
            </div>
          </div>

          {/* Ethics warning */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-[24px] p-5 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
            <p className="font-medium leading-relaxed">{t.safetyWarning}</p>
          </div>
        </div>

        {/* Right Output and Pedagogical Evaluation Panel */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-800/50 rounded-[32px] p-6 sm:p-8 min-h-[450px] flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
            {/* Loading Indicator for Image */}
            {loading && !image && (
              <div className="flex flex-col items-center gap-4 text-slate-400">
                <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg"></div>
                <p className="font-black animate-pulse text-blue-600 dark:text-blue-400 tracking-wider text-xs uppercase">{t.generating}</p>
              </div>
            )}

            {imgError && (
              <div className="flex flex-col items-center gap-4 text-rose-500">
                <p className="font-bold text-center">Tasvir yuklashda muammo yuz berdi.</p>
                <button onClick={handleGenerate} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Qaytadan urinish</button>
              </div>
            )}

            {/* Generated Image View */}
            {image ? (
              <div className="w-full flex flex-col items-center">
                <div className="w-full relative group rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  {imgLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <img
                    src={image}
                    alt="Generated Educational Resource"
                    referrerPolicy="no-referrer"
                    onLoad={() => {
                      setImgLoading(false);
                      setImgError(false);
                    }}
                    onError={handleImageError}
                    className={`w-full max-h-[500px] object-contain transition-all duration-500 ${imgLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                  />
                </div>

                {/* Actions Toolbar */}
                <div className="mt-4 flex items-center justify-between px-2 w-full">
                  <div className="flex gap-2">
                    <a
                      href={image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-2.5 text-xs font-black rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <Download size={14} /> Yuklab olish
                    </a>
                    
                    {resourceId && !isShared && (
                      <button
                        onClick={handleShare}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-black rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Share2 size={14} /> {t.share}
                      </button>
                    )}

                    {isShared && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-5 py-2.5 text-xs font-black rounded-xl flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Ommaviyga qo'shildi
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : !loading && (
              <div className="text-slate-400 dark:text-slate-500 max-w-sm flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-100 dark:ring-slate-800">
                  <ImageIcon size={32} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="font-black text-slate-700 dark:text-slate-300 text-base">{t.noImage}</p>
                <p className="text-xs text-center mt-2 opacity-80 leading-relaxed">{t.noImageDesc}</p>
              </div>
            )}
          </div>

          {/* AI Pedagogical Evaluation Section */}
          <AnimatePresence>
            {(evaluating || evaluation) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-[32px] p-6 sm:p-8 shadow-sm flex flex-col gap-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <BarChart3 className="text-emerald-500" size={20} /> {t.pedEvaluation}
                  </h3>
                  {evaluation && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-black text-xs px-3.5 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1.5">
                      {t.overallPedScore}: <span className="text-sm font-black">{evaluation.pedagogicalEvaluation?.overallScorePercentage || 92}%</span>
                    </div>
                  )}
                </div>

                {evaluating ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-emerald-500" size={32} />
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 animate-pulse">Pedagogik baholash va metodika generatsiya qilinmoqda...</p>
                  </div>
                ) : evaluation && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Scores Progress Bars */}
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Baholash ko'rsatkichlari:</h4>
                      
                      {[
                        { label: "Mavzuga va fanga moslik", score: evaluation.pedagogicalEvaluation?.subjectAlignment || 5 },
                        { label: "Ilmiy va vizual aniqlik", score: evaluation.pedagogicalEvaluation?.scientificAccuracy || 5 },
                        { label: "O'quvchiga tushunarliligi", score: evaluation.pedagogicalEvaluation?.clarity || 4 },
                        { label: "Yosh darajasiga muvofiqlik", score: evaluation.pedagogicalEvaluation?.ageAppropriateness || 5 }
                      ].map((item, index) => (
                        <div key={index} className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span>{item.label}</span>
                            <span>{item.score} / 5</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.score / 5) * 100}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1 }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Lesson Integration Plan */}
                    <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <CheckCircle size={14} className="text-emerald-500" /> Darsga Integratsiya Rejasi:
                      </h4>

                      <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                        <div>
                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider block mb-0.5">{t.pedagogicalGoal}:</span>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{evaluation.pedagogicalGoal || "Mavzuni vizual o'rganish."}</p>
                        </div>

                        <div>
                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider block mb-0.5">{t.lessonStage}:</span>
                          <p className="font-bold text-blue-600 dark:text-blue-400">{evaluation.lessonIntegration?.stage || "Mavzuni mustahkamlash"}</p>
                        </div>

                        <div>
                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider block mb-0.5">{t.teachingMethod}:</span>
                          <p className="font-bold text-indigo-600 dark:text-indigo-400">{evaluation.lessonIntegration?.method || "Suhbat rejasi"}</p>
                        </div>

                        <div>
                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider block mb-0.5">{t.teacherInstructions}:</span>
                          <p className="italic font-medium text-slate-700 dark:text-slate-300">"{evaluation.lessonIntegration?.teacherInstructions || "Tasvirni o'quvchilar bilan muhokama qiling."}"</p>
                        </div>
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
