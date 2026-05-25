import { useState, useEffect } from "react";
import { 
  Video, 
  Wand2, 
  Loader2, 
  Download, 
  Share2, 
  Play, 
  Square, 
  Volume2, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  FileDown, 
  AlertCircle,
  GraduationCap,
  Sparkles,
  VolumeX,
  Languages,
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { generateEducationalStoryboard, StoryboardData, StoryboardFrame } from "../lib/gemini";
import { saveResource } from "../lib/db";
import { useAppContext } from "../lib/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";

export default function VideoGen() {
  const { t, language } = useAppContext();
  
  // Inputs
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Biologiya");
  const [ageGroup, setAgeGroup] = useState("O'rta sinf (5-9 sinflar)");
  const [style, setStyle] = useState("3D Render");
  const [complexity, setComplexity] = useState("O'rtacha");

  // Output States
  const [loading, setLoading] = useState(false);
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  
  // Frame Visual Generation States
  const [frameImages, setFrameImages] = useState<Record<number, string>>({});
  const [generatingFrameIdx, setGeneratingFrameIdx] = useState<number | null>(null);

  // Text-To-Speech / Audio States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPlayingSim, setIsPlayingSim] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<"uz" | "ru" | "en">("uz");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Collapsible Accordion State for Pedagogical Plan
  const [showPedagogicalPlan, setShowPedagogicalPlan] = useState(false);

  // Save & Share States
  const [resourceId, setResourceId] = useState<string | number | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Initialize Speech Voices & Sync Language
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    if (language) {
      setSpeechLanguage(language as "uz" | "ru" | "en");
    }
  }, [language]);

  // Reset states when starting new storyboard
  const handleReset = () => {
    setStoryboard(null);
    setActiveFrameIdx(0);
    setFrameImages({});
    setResourceId(null);
    setIsShared(false);
    setIsPlayingSim(false);
    setShowPedagogicalPlan(false);
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
  };

  // Web Speech API - Text to Speech with robust Language selection
  const speakText = (text: string, onEndCallback?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure locale code
    let langCode = "uz-UZ";
    if (speechLanguage === "ru") {
      langCode = "ru-RU";
    } else if (speechLanguage === "en") {
      langCode = "en-US";
    }

    utterance.lang = langCode;

    // Find custom matching voice in system
    const matchedVoice = voices.find(
      (v) => v.lang.toLowerCase().startsWith(speechLanguage)
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.rate = 0.95; // Slightly slower for better clarity
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      if (onEndCallback) onEndCallback();
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPlayingSim(false);
  };

  // Storyboard Simulation Play loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingSim && storyboard) {
      const currentFrame = storyboard.frames[activeFrameIdx];
      
      speakText(currentFrame.scriptText, () => {
        // Wait 2.5 seconds, then advance
        timer = setTimeout(() => {
          if (activeFrameIdx < storyboard.frames.length - 1) {
            setActiveFrameIdx(prev => prev + 1);
          } else {
            // End of simulation
            setIsPlayingSim(false);
            setActiveFrameIdx(0);
          }
        }, 2500);
      });
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isPlayingSim, activeFrameIdx, storyboard]);

  // Sequential Background visual generation
  const triggerSequentialGeneration = async (framesList: StoryboardFrame[]) => {
    for (let i = 0; i < framesList.length; i++) {
      // Generate each frame's image sequentially to load them in background
      await generateFrameVisual(i, framesList[i].visualDescription);
    }
  };

  // Storyboard Yaratish
  const handleCreateStoryboard = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    handleReset();

    try {
      // Passes active interface language so the AI generates contents directly in the chosen language!
      const data = await generateEducationalStoryboard(topic, subject, ageGroup, style, language);
      setStoryboard(data);
      
      // Auto-trigger background generation of all frame visuals sequentially
      setTimeout(() => {
        triggerSequentialGeneration(data.frames);
      }, 200);
    } catch (e) {
      console.error("Storyboard generatsiyasida xato:", e);
      alert("Storyboard yaratishda muammo yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  // Fast Pollinations AI drawing loader
  const generateFrameVisual = async (idx: number, visualDesc: string) => {
    setGeneratingFrameIdx(idx);
    try {
      // 1. Prompt sanitization (removes quotes/newlines and slices to 200 chars for extreme URL safety)
      const cleanDesc = visualDesc
        .replace(/["'\n\r]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);

      const seed = Math.floor(Math.random() * 9999999);
      const stylePrompt = style === "3D Render" ? "isometric 3D render, minimalist cartoon style, vibrant colors" :
                          style === "Realistik" ? "realistic photography, documentary educational style, highly detailed" :
                          style === "Infografik / Diagramma" ? "educational infographic, labeled vector schematic, clear vector diagram" :
                          style === "Multfilm / Illyustratsiya" ? "vibrant school book illustration, colorful drawing style" :
                          "minimalist modern flat vector design, clean paths";

      // Blazing fast default Pollinations AI model (removed model=flux to speed up from 25s to 0.6s!)
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        cleanDesc + `, professional ${stylePrompt}, high quality educational material`
      )}?width=1024&height=1024&seed=${seed}&nologo=true`;
      
      // Instantly set the frame image URL to let the browser begin downloading and rendering it immediately
      setFrameImages(prev => ({ ...prev, [idx]: url }));

      // Asynchronously preload/wait in background for 3.5 seconds to elegantly pace the sequential generation
      await new Promise<boolean>((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => {
          resolve(false);
        }, 3500);
        
        img.onload = () => {
          clearTimeout(timer);
          resolve(true);
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(false);
        };
        img.src = url;
      });
    } catch (err) {
      console.error("Rasm chizishda xato:", err);
    } finally {
      setGeneratingFrameIdx(null);
    }
  };

  // Storyboardni saqlash
  const handleSaveStoryboard = async () => {
    if (!storyboard) return;
    try {
      const id = await saveResource({
        type: "video", // schema mapping: "video" represents storyboard data
        title: storyboard.animationTitle,
        prompt: topic,
        content: JSON.stringify({
          storyboard,
          frameImages
        })
      });
      setResourceId(id);
      alert("Storyboard muvaffaqiyatli saqlandi!");
    } catch (err) {
      console.error("Saqlashda xato:", err);
      alert("Saqlashda xatolik yuz berdi.");
    }
  };

  // Hamjamiyatga ulashish
  const handleShare = async () => {
    if (!resourceId) return;
    try {
      await import("../lib/db").then(m => m.togglePublic(resourceId, true));
      setIsShared(true);
      alert("Storyboard hamjamiyatga muvaffaqiyatli ulashildi!");
    } catch (err) {
      alert("Ulashishda xatolik yuz berdi");
    }
  };

  // Helper for Base64 image conversions
  const getImgBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg"));
      };
      img.onerror = () => resolve("");
      img.src = url;
    });
  };

  // PDF dars ishlanmasi yuklab olish
  const handleDownloadPDF = async () => {
    if (!storyboard) return;
    setExportingPDF(true);
    
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      
      // Page 1: Cover and Pedagogical Plan
      doc.setFontSize(22);
      doc.text("EDUVISUAL AI STORYBOARD", 105, 25, { align: "center" });
      doc.setFontSize(14);
      doc.text(storyboard.animationTitle.toUpperCase(), 105, 36, { align: "center" });
      
      doc.setLineWidth(0.5);
      doc.line(20, 44, 190, 44);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fan / Subject: ${subject} | Auditoriya: ${ageGroup}`, 20, 52);
      doc.text(`Sana / Date: ${new Date().toLocaleDateString()}`, 150, 52);

      // Goal Card
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(20, 60, 170, 25, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Pedagogik Maqsad / Pedagogical Goal:", 24, 67);
      doc.setFont("helvetica", "normal");
      const goalLines = doc.splitTextToSize(storyboard.pedagogicalGoal, 160);
      doc.text(goalLines, 24, 73);

      // AI Evaluations
      doc.setFont("helvetica", "bold");
      doc.text("AI Pedagogik Baholash Ko'rsatkichlari:", 20, 97);
      doc.setFont("helvetica", "normal");
      doc.text(`• Fanga mosligi: ${storyboard.pedagogicalEvaluation.subjectAlignment}/5`, 25, 105);
      doc.text(`• Ilmiy aniqligi: ${storyboard.pedagogicalEvaluation.scientificAccuracy}/5`, 25, 112);
      doc.text(`• Tushunarliligi: ${storyboard.pedagogicalEvaluation.clarity}/5`, 25, 119);
      doc.text(`• Yosh darajasiga muvofiqligi: ${storyboard.pedagogicalEvaluation.ageAppropriateness}/5`, 25, 126);
      doc.setFont("helvetica", "bold");
      doc.text(`Umumiy Muvofiqlik Reytingi: ${storyboard.pedagogicalEvaluation.overallScorePercentage}%`, 25, 136);

      // Integration
      doc.text("Dars Bosqichiga Integratsiya:", 20, 150);
      doc.setFillColor(240, 244, 255);
      doc.roundedRect(20, 154, 170, 40, 3, 3, "F");
      
      doc.setFontSize(9);
      doc.text("DARS BOSQICHI / STAGE:", 24, 161);
      doc.setFont("helvetica", "normal");
      doc.text(storyboard.lessonIntegration.stage, 72, 161);
      
      doc.setFont("helvetica", "bold");
      doc.text("METODIK TAVSIYA / METHOD:", 24, 169);
      doc.setFont("helvetica", "normal");
      doc.text(storyboard.lessonIntegration.method, 79, 169);

      doc.setFont("helvetica", "bold");
      doc.text("YO'RIQNOMA / INSTRUCTIONS:", 24, 177);
      doc.setFont("helvetica", "normal");
      const instLines = doc.splitTextToSize(storyboard.lessonIntegration.teacherInstructions, 115);
      doc.text(instLines, 82, 177);

      // Pages 2+: Frames List with Images
      for (let i = 0; i < storyboard.frames.length; i++) {
        const frame = storyboard.frames[i];
        doc.addPage();
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(`Kadr #${frame.frameNumber}: ${frame.title}`, 20, 20);
        doc.setLineWidth(0.3);
        doc.line(20, 25, 190, 25);
        
        // Render Image
        const imgUrl = frameImages[i];
        if (imgUrl) {
          try {
            const base64 = await getImgBase64(imgUrl);
            if (base64) {
              doc.addImage(base64, "JPEG", 20, 30, 90, 90);
            } else {
              doc.rect(20, 30, 90, 90);
              doc.setFontSize(10);
              doc.text("Tasvir yuklanmadi", 45, 75);
            }
          } catch (e) {
            doc.rect(20, 30, 90, 90);
          }
        } else {
          doc.setFillColor(245, 245, 245);
          doc.rect(20, 30, 90, 90, "F");
          doc.setFontSize(10);
          doc.text("Tasvir yaratilmagan", 40, 75);
        }

        // Details Side
        const xOffset = 118;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("1. Ssenariy / Ovoz Nutqi:", xOffset, 34);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const scriptLines = doc.splitTextToSize(frame.scriptText, 72);
        doc.text(scriptLines, xOffset, 41);

        const yPos1 = 41 + (scriptLines.length * 5) + 6;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("2. Animatsiya Harakati:", xOffset, yPos1);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const animLines = doc.splitTextToSize(frame.animationDescription, 72);
        doc.text(animLines, xOffset, yPos1 + 7);

        const yPos2 = yPos1 + 7 + (animLines.length * 5) + 6;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("3. Pedagogik Qiymati:", xOffset, yPos2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const pedLines = doc.splitTextToSize(frame.pedagogicalValue, 72);
        doc.text(pedLines, xOffset, yPos2 + 7);
      }

      doc.save(`${storyboard.animationTitle.replace(/\s+/g, "_")}_dars_rejasi.pdf`);
    } catch (e) {
      console.error("PDF yaratishda xato:", e);
      alert("PDF yaratishda xatolik yuz berdi.");
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      
      {/* Test Rejimi Ogohlantirish Banneri */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/30 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
        <AlertCircle className="shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" size={18} />
        <div>
          <span className="font-extrabold text-[10px] text-amber-800 dark:text-amber-400 tracking-wider uppercase block">Test Rejimi / Test Mode:</span>
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 leading-relaxed mt-0.5">
            Storyboardlar hozirda test rejimida ishlamoqda. Sun'iy intellekt modellarining yuklamasi yoki ulanish tezligi sababli kadr rasmlarining chizilishi yoki yuklanishida ba'zi kechikishlar hamda kutilmagan xatoliklar yuz berishi mumkin.
          </p>
        </div>
      </div>
      
      {/* ----------------- STATE A: CONFIGURATION FORM ----------------- */}
      {!storyboard && !loading && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header Panel */}
          <div className="relative p-6 md:p-8 bg-gradient-to-r from-slate-50 via-indigo-50/50 to-slate-50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 rounded-[32px] border border-slate-200/80 dark:border-indigo-500/10 shadow-sm text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-pink-600 dark:text-pink-500 font-extrabold text-[10px] tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              EDUVISUAL STORYBOARD STUDIO
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center justify-center gap-2">
              <Video className="text-pink-600 dark:text-pink-500" size={24} /> Storyboard Yaratish
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-md mx-auto leading-relaxed">
              Darsingiz uchun kadrlar ketma-ketligi, qadamli animatsiyalar va audio ssenariylarni bir zumda chizib oling.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[28px] border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-700">
              <GraduationCap className="text-pink-600 dark:text-pink-500" size={22} />
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">Metodik shartlar</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">Loyiha ssenariysi parametrlari</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Ta'lim Fani:
                  </label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-pink-500 text-xs font-bold text-slate-850 dark:text-slate-200 transition-colors"
                  >
                    {["Biologiya", "Fizika", "Kimyo", "Informatika", "Matematika", "Tarix", "Geografiya", "Boshlang'ich ta'lim", "Kasbiy fanlar"].map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Mo'ljallangan Sinf / Yosh:
                  </label>
                  <select
                    value={ageGroup}
                    onChange={e => setAgeGroup(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-pink-500 text-xs font-bold text-slate-850 dark:text-slate-200 transition-colors"
                  >
                    {["Boshlang'ich sinf (1-4 sinflar)", "O'rta sinf (5-9 sinflar)", "Kollej / Oliy ta'lim"].map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Visual Uslub:
                  </label>
                  <select
                    value={style}
                    onChange={e => setStyle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-pink-500 text-xs font-bold text-slate-850 dark:text-slate-200 transition-colors"
                  >
                    {["3D Render", "Infografik / Diagramma", "Realistik", "Multfilm / Illyustratsiya", "Minimalizm"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Murakkablik:
                  </label>
                  <select
                    value={complexity}
                    onChange={e => setComplexity(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-pink-500 text-xs font-bold text-slate-850 dark:text-slate-200 transition-colors"
                  >
                    {["Sodda", "O'rtacha", "Mukammal"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                  Dars mavzusi yoki Ssenariy g'oyasi:
                </label>
                <textarea
                  rows={4}
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Masalan: Quyosh atrofida sayyoralarning aylanishi va tortishish kuchi..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-pink-500 transition-colors resize-none text-xs font-medium text-slate-805 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              onClick={handleCreateStoryboard}
              disabled={loading || !topic.trim()}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 disabled:from-slate-100 disabled:to-slate-100 dark:disabled:from-slate-800 dark:disabled:to-slate-800 disabled:text-slate-400 dark:disabled:text-slate-655 disabled:cursor-not-allowed text-white font-extrabold text-xs tracking-wider uppercase rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              <Wand2 size={16} />
              Storyboard Yaratish
            </button>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/30 p-5 rounded-[24px] border border-slate-200/60 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-2 text-center">
            <span className="font-extrabold text-pink-650 dark:text-pink-500 text-[10px] tracking-wider uppercase">Nima uchun storyboard?</span>
            <p className="leading-relaxed max-w-md mx-auto">
              Storyboard ta'limiy animatsion resursning bosqichma-bosqich rejasidir. U orqali o'qituvchi vizual elementlarni dars rejasi va metodik yo'riqnomalar bilan qulay bog'lay oladi.
            </p>
          </div>
        </div>
      )}

      {/* ----------------- STATE B: LOADING SCREEN ----------------- */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 p-12 min-h-[450px] rounded-[32px] border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center text-center shadow-sm space-y-4 max-w-2xl mx-auto">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-pink-600 rounded-full animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-black text-slate-800 dark:text-white text-base tracking-wide animate-pulse">Loyiha ssenariysi tuzilmoqda...</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mx-auto">
              Sun'iy intellekt dars mavzusini chuqur tahlil qilib, dars rejasi, audio matnlar va kadr animatsiyalarini tayyorlamoqda.
            </p>
          </div>
        </div>
      )}

      {/* ----------------- STATE C: GENERATED STORYBOARD WORKSPACE ----------------- */}
      {storyboard && !loading && (
        <div className="space-y-6">
          
          {/* Back/Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-colors cursor-pointer border border-slate-200 dark:border-slate-800"
            >
              <ArrowLeft size={14} />
              Mavzuni o'zgartirish (Orqaga)
            </button>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleDownloadPDF}
                disabled={exportingPDF}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 shadow-sm"
              >
                {exportingPDF ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Dars Rejasini (PDF) Yuklash
              </button>

              <button
                onClick={handleSaveStoryboard}
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-slate-800"
                title="Kutubxonaga saqlash"
              >
                <Download size={14} />
              </button>

              {resourceId && !isShared && (
                <button
                  onClick={handleShare}
                  className="p-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-colors cursor-pointer"
                  title="Hamjamiyatga ulashish"
                >
                  <Share2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Title block */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <span className="text-[8px] font-black text-pink-600 dark:text-pink-500 uppercase tracking-widest block mb-0.5">Storyboard Ssenariysi:</span>
            <h2 className="text-lg font-black text-slate-850 dark:text-white leading-tight">{storyboard.animationTitle}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                Baholash: {storyboard.pedagogicalEvaluation.overallScorePercentage}% Pedagogik muvofiqlik
              </span>
            </div>
          </div>

          {/* Timeline dots / Selector */}
          <div className="flex items-center justify-center gap-2 py-2">
            {storyboard.frames.map((frame, idx) => {
              const isCurrent = activeFrameIdx === idx;
              const hasImg = !!frameImages[idx];
              const isGenerating = generatingFrameIdx === idx;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveFrameIdx(idx);
                    stopSpeaking();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 border ${
                    isCurrent
                      ? "bg-pink-600 border-pink-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span>Kadr #{idx + 1}</span>
                  {isGenerating ? (
                    <Loader2 size={10} className="animate-spin text-pink-500 ml-1" />
                  ) : hasImg ? (
                    <CheckCircle size={10} className="text-emerald-500 ml-1" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Simple Spacious Cinema Player Layout (Single Column / 16:9 aspect) */}
          <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden shadow-sm flex flex-col items-center p-6 space-y-6">
            
            {/* Widescreen Cinema Screen (16:9 Aspect Video container) */}
            <div className="w-full max-w-3xl aspect-video bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-900 shadow-md flex items-center justify-center">
              {frameImages[activeFrameIdx] ? (
                <>
                  {generatingFrameIdx === activeFrameIdx && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs">
                      <Loader2 size={32} className="animate-spin text-pink-500" />
                      <p className="text-white text-[10px] font-black mt-2 tracking-wide animate-pulse">Tasvir chizilmoqda...</p>
                    </div>
                  )}
                  <img
                    src={frameImages[activeFrameIdx]}
                    alt={`Kadr #${activeFrameIdx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </>
              ) : (
                <div className="p-6 text-center text-slate-500 flex flex-col items-center gap-3">
                  {generatingFrameIdx === activeFrameIdx ? (
                    <>
                      <Loader2 size={32} className="animate-spin text-pink-500" />
                      <p className="text-[10px] font-black text-slate-400 animate-pulse">Tasvir chizilmoqda...</p>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} className="text-slate-700 animate-pulse" />
                      <p className="text-[10px] text-slate-500 font-extrabold">Tasvir fonda tayyorlanmoqda...</p>
                    </>
                  )}
                </div>
              )}

              {/* Cinema HUD overlay */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/5 text-white text-[9px] font-black tracking-widest uppercase">
                {storyboard.frames[activeFrameIdx].title}
              </div>
            </div>

            {/* Script card under the screen */}
            <div className="w-full max-w-3xl p-5 bg-pink-50/30 dark:bg-pink-950/20 border border-pink-100/50 dark:border-pink-900/20 rounded-2xl space-y-1 relative">
              <span className="text-[8px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest block flex items-center gap-1 justify-between">
                <span className="flex items-center gap-0.5">
                  <Volume2 size={10} /> Ssenariy / Ovoz Nutqi:
                </span>
                <span className="bg-pink-500/10 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-[8px] font-extrabold flex items-center gap-0.5">
                  <Languages size={8} /> {speechLanguage === "uz" ? "🇺🇿 UZ" : speechLanguage === "ru" ? "🇷🇺 RU" : "🇬🇧 EN"} talaffuzi
                </span>
              </span>
              <p className="text-xs md:text-sm font-semibold text-slate-800 dark:text-pink-100 leading-relaxed italic text-center">
                "{storyboard.frames[activeFrameIdx].scriptText}"
              </p>
            </div>

            {/* Sub-details (Actions and Pedagogical details stacked cleanly) */}
            <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-850/50 space-y-1">
                <span className="font-extrabold text-slate-450 dark:text-slate-550 block text-[9px] uppercase tracking-wider">🎬 Animatsiya Harakati (Kadrda):</span>
                <p className="text-slate-700 dark:text-slate-350 leading-relaxed">{storyboard.frames[activeFrameIdx].animationDescription}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-850/50 space-y-1">
                <span className="font-extrabold text-slate-450 dark:text-slate-550 block text-[9px] uppercase tracking-wider">💡 Pedagogik Qiymat (O'quvchiga):</span>
                <p className="text-slate-700 dark:text-slate-350 leading-relaxed">{storyboard.frames[activeFrameIdx].pedagogicalValue}</p>
              </div>
            </div>

            {/* Playback Controls & Voice selection row */}
            <div className="w-full max-w-3xl pt-5 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Voice and Sim Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    } else {
                      speakText(storyboard.frames[activeFrameIdx].scriptText);
                    }
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSpeaking 
                      ? "bg-amber-600 text-white shadow-sm" 
                      : "bg-slate-105 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-850"
                  }`}
                >
                  {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  {isSpeaking ? "Ovozni to'xtatish" : "Kadrni ovozli eshitish"}
                </button>

                <button
                  onClick={() => {
                    if (isPlayingSim) {
                      setIsPlayingSim(false);
                      if (typeof window !== "undefined") {
                        window.speechSynthesis.cancel();
                      }
                      setIsSpeaking(false);
                    } else {
                      setIsPlayingSim(true);
                      setActiveFrameIdx(0);
                    }
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    isPlayingSim 
                      ? "bg-rose-600 text-white animate-pulse" 
                      : "bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white shadow-sm"
                  }`}
                >
                  {isPlayingSim ? <Square size={11} /> : <Play size={11} />}
                  {isPlayingSim ? "To'xtatish" : "Avtomatik Simulyatsiya"}
                </button>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850">
                <span className="text-[8px] font-black text-slate-450 dark:text-slate-600 uppercase tracking-widest pl-1">Talaffuz:</span>
                {[
                  { code: "uz", flag: "🇺🇿", label: "UZ" },
                  { code: "ru", flag: "🇷🇺", label: "RU" },
                  { code: "en", flag: "🇬🇧", label: "EN" }
                ].map((langObj) => (
                  <button
                    key={langObj.code}
                    onClick={() => {
                      setSpeechLanguage(langObj.code as any);
                      if (isSpeaking) {
                        speakText(storyboard.frames[activeFrameIdx].scriptText);
                      }
                    }}
                    className={`px-2 py-1 rounded-lg text-[9px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                      speechLanguage === langObj.code 
                        ? "bg-indigo-600 text-white shadow-xs" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
                    }`}
                  >
                    <span>{langObj.flag}</span>
                    <span>{langObj.label}</span>
                  </button>
                ))}
              </div>

              {/* Stepping arrows */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    if (activeFrameIdx > 0) {
                      setActiveFrameIdx(prev => prev - 1);
                      stopSpeaking();
                    }
                  }}
                  disabled={activeFrameIdx === 0}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-slate-655 dark:text-slate-400 border border-slate-200 dark:border-slate-850 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => {
                    if (activeFrameIdx < storyboard.frames.length - 1) {
                      setActiveFrameIdx(prev => prev + 1);
                      stopSpeaking();
                    }
                  }}
                  disabled={activeFrameIdx === storyboard.frames.length - 1}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-slate-655 dark:text-slate-400 border border-slate-200 dark:border-slate-850 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

            </div>

          </div>

          {/* Accordion Collapsible Methodological Lesson Plan & evaluations */}
          <div className="bg-white dark:bg-slate-800 rounded-[28px] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden shadow-sm">
            <button
              onClick={() => setShowPedagogicalPlan(p => !p)}
              className="w-full p-5 flex items-center justify-between text-slate-800 dark:text-white font-black text-sm transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-750/30 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <GraduationCap className="text-pink-600 dark:text-pink-500" size={20} />
                Dars Rejasi va AI Pedagogik Bahosi
              </span>
              {showPedagogicalPlan ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence>
              {showPedagogicalPlan && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-slate-100 dark:border-slate-700 p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs"
                >
                  {/* Method card */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-100 dark:border-slate-700 flex items-center gap-1">
                      📋 Dars Integratsiyasi
                    </h4>
                    <div className="space-y-3.5">
                      <div>
                        <span className="font-extrabold text-slate-450 dark:text-slate-500 uppercase text-[8px] tracking-wider block mb-0.5">Dars Bosqichi:</span>
                        <p className="font-bold text-indigo-650 dark:text-indigo-400">{storyboard.lessonIntegration.stage}</p>
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-450 dark:text-slate-500 uppercase text-[8px] tracking-wider block mb-0.5">Tavsiya etiladigan metod:</span>
                        <p className="font-bold text-pink-650 dark:text-pink-400">{storyboard.lessonIntegration.method}</p>
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-450 dark:text-slate-500 uppercase text-[8px] tracking-wider block mb-0.5">O'qituvchi uchun yo'riqnoma:</span>
                        <p className="italic font-medium text-slate-700 dark:text-slate-300 leading-relaxed">"{storyboard.lessonIntegration.teacherInstructions}"</p>
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Card */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-100 dark:border-slate-700 flex items-center gap-1">
                      ⭐ Pedagogik Baholar (AI)
                    </h4>
                    <div className="space-y-3">
                      {[
                        { label: "Mavzuga va fanga mosligi", score: storyboard.pedagogicalEvaluation.subjectAlignment },
                        { label: "Ilmiy va vizual aniqligi", score: storyboard.pedagogicalEvaluation.scientificAccuracy },
                        { label: "O'quvchiga tushunarliligi", score: storyboard.pedagogicalEvaluation.clarity },
                        { label: "Yosh darajasiga muvofiqligi", score: storyboard.pedagogicalEvaluation.ageAppropriateness }
                      ].map((evalItem, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex justify-between text-slate-700 dark:text-slate-300 font-extrabold text-[11px]">
                            <span>{evalItem.label}</span>
                            <span>{evalItem.score} / 5</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(evalItem.score / 5) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}
      
    </div>
  );
}
