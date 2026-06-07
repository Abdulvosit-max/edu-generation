import { useState, useEffect, useRef } from "react";
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
import { generateEducationalStoryboard, StoryboardData, StoryboardFrame, generateEducationalImage } from "../lib/gemini";
import { saveResource } from "../lib/db";
import { useAppContext } from "../lib/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import pptxgen from "pptxgenjs";

// ParticleOverlay component removed as it was unused and distracted from clean storyboard visuals



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
  
  const [frameImages, setFrameImages] = useState<Record<number, string>>({});
  const [generatingFrames, setGeneratingFrames] = useState<Record<number, boolean>>({});
  const [frameElapsedTimes, setFrameElapsedTimes] = useState<Record<number, number>>({});
  const [animationMode, setAnimationMode] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [speechLanguage, setSpeechLanguage] = useState<"uz" | "ru" | "en">("uz");
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [activeDetailTab, setActiveDetailTab] = useState<"explanation" | "terms" | "activity" | "script">("explanation");

  // Text-To-Speech / Audio States
  const [narrationType, setNarrationType] = useState<"google" | "native" | "azure">(
    () => (localStorage.getItem("edu_gen_narration_type") as any) || "google"
  );
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [speechVolume, setSpeechVolume] = useState(1.0);
  const [azureKey, setAzureKey] = useState(() => localStorage.getItem("edu_gen_azure_key") || "");
  const [azureRegion, setAzureRegion] = useState(() => localStorage.getItem("edu_gen_azure_region") || "eastus");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPlayingSim, setIsPlayingSim] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Toast notification state
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "error" | "info" }[]>([]);
  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };
  
  // Collapsible Accordion State for Pedagogical Plan
  const [showPedagogicalPlan, setShowPedagogicalPlan] = useState(false);

  // Save & Share States
  const [resourceId, setResourceId] = useState<string | number | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingPPT, setExportingPPT] = useState(false);
  const [exportingVideo, setExportingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState<{ step: string; current: number; total: number } | null>(null);

  // Initialize Speech Voices
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
    setImageErrors({});
    setResourceId(null);
    setIsShared(false);
    setIsPlayingSim(false);
    setShowPedagogicalPlan(false);
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // OpenAI TTS via backend — asosiy naratsiya
  const speakTextOpenAI = async (text: string, onEndCallback?: () => void): Promise<boolean> => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://fibot.pythonanywhere.com/api";
      // Ovoz: nova (ayol, tabiiy), onyx (erkak, chuqur)
      const voice = speechLanguage === "uz" ? "nova" : speechLanguage === "ru" ? "echo" : "nova";
      const resp = await fetch(`${API_URL}/ai/tts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, speed: 1.0 })
      });
      if (!resp.ok) throw new Error(`TTS HTTP ${resp.status}`);
      const blob = await resp.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = speechRate;
      audio.volume = speechVolume;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        if (onEndCallback) onEndCallback();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        speakTextNative(text, onEndCallback);
      };
      activeAudioRef.current = audio;
      setIsSpeaking(true);
      await audio.play();
      return true;
    } catch (err) {
      console.warn("OpenAI TTS xatosi, Web Speech API ga o'tilmoqda:", err);
      return false;
    }
  };

  // Asosiy naratsiya dispatcher — narrationType ga qarab yo'naltiradi
  const speakText = async (text: string, onEndCallback?: () => void) => {
    if (typeof window === "undefined") return;
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (!text) return;

    if (narrationType === "native") {
      // Faqat brauzer Web Speech API
      speakTextNative(text, onEndCallback);
      return;
    }

    // "google" yoki "azure": OpenAI TTS → Web Speech fallback
    const openaiOk = await speakTextOpenAI(text, onEndCallback);
    if (!openaiOk) speakTextNative(text, onEndCallback);
  };

  // Web Speech API Native Fallback
  const speakTextNative = (text: string, onEndCallback?: () => void) => {
    if (!window.speechSynthesis) {
      setIsSpeaking(false);
      if (onEndCallback) onEndCallback();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    let langCode = "uz-UZ";
    if (speechLanguage === "ru") langCode = "ru-RU";
    else if (speechLanguage === "en") langCode = "en-US";

    utterance.lang = langCode;

    const matchedVoice = voices.find(
      (v) => v.lang.toLowerCase().startsWith(speechLanguage)
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = speechVolume;

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
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPlayingSim(false);
  };

  // Storyboard Simulation Play loop with visual progress and audio syncing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let transitionTimer: NodeJS.Timeout;
    
    if (isPlayingSim && storyboard) {
      const currentFrame = storyboard.frames[activeFrameIdx];
      const duration = Math.min(9500, Math.max(3800, currentFrame.scriptText.length * 68)); // dynamic reading duration
      
      setSimProgress(0);
      
      // Start TTS audio narration
      speakText(currentFrame.scriptText);
      
      const startTime = Date.now();
      
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const percent = Math.min(100, (elapsed / duration) * 100);
        setSimProgress(percent);
        
        if (percent >= 100) {
          clearInterval(interval);
          
          // Wait 1.2s after audio/progress ends before moving to next frame
          transitionTimer = setTimeout(() => {
            if (activeFrameIdx < storyboard.frames.length - 1) {
              setActiveFrameIdx(prev => prev + 1);
            } else {
              // End of storyboard simulation
              setIsPlayingSim(false);
              setActiveFrameIdx(0);
              stopSpeaking();
            }
          }, 1200);
        }
      }, 100);
    } else {
      setSimProgress(0);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(transitionTimer);
    };
  }, [isPlayingSim, activeFrameIdx, storyboard]);

  // Priority Sequential Background visual generation
  const triggerSequentialGeneration = async (framesList: StoryboardFrame[], startIdx = 0) => {
    // 1. Generate active frame first with top priority
    await generateFrameVisual(startIdx, framesList[startIdx].visualDescription);
    
    // 2. Generate other frames sequentially with a delay to prevent API rate-limits
    for (let i = 0; i < framesList.length; i++) {
      if (i === startIdx) continue;
      // Wait 700ms before starting next one to pace requests elegantly
      await new Promise(r => setTimeout(r, 700));
      await generateFrameVisual(i, framesList[i].visualDescription);
    }
  };

  // Trigger active frame generation on-the-fly if not already generated
  useEffect(() => {
    if (storyboard && !frameImages[activeFrameIdx] && !generatingFrames[activeFrameIdx]) {
      generateFrameVisual(activeFrameIdx, storyboard.frames[activeFrameIdx].visualDescription);
    }
  }, [activeFrameIdx, storyboard]);

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
        triggerSequentialGeneration(data.frames, 0);
      }, 200);
    } catch (e) {
      console.error("Storyboard generatsiyasida xato:", e);
      showToast("Storyboard yaratishda muammo yuz berdi. Qayta urinib ko'ring.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle image loading error with automatic fallback to a model-less stable request
  // and then to a relevant placeholder image from loremflickr.com if Pollinations fails completely.
  const handleImageError = (idx: number) => {
    setImageErrors(prev => ({ ...prev, [idx]: true }));
    setFrameImages(prev => {
      const originalUrl = prev[idx];
      if (!originalUrl) return prev;
      
      if (originalUrl.includes("image.pollinations.ai")) {
        if (originalUrl.includes("model=flux")) {
          // Fallback 1: try grok-imagine
          const fallbackUrl = originalUrl.replace("model=flux", "model=grok-imagine");
          console.warn(`Rasm yuklashda xatolik! Kadr #${idx + 1} uchun grok-imagine fallback URL ga o'tilmoqda:`, fallbackUrl);
          return { ...prev, [idx]: fallbackUrl };
        } else if (originalUrl.includes("model=grok-imagine")) {
          // Fallback 2: try gptimage
          const fallbackUrl = originalUrl.replace("model=grok-imagine", "model=gptimage");
          console.warn(`Rasm yuklashda xatolik! Kadr #${idx + 1} uchun gptimage fallback URL ga o'tilmoqda:`, fallbackUrl);
          return { ...prev, [idx]: fallbackUrl };
        } else if (originalUrl.includes("model=gptimage")) {
          // Fallback 3: try zimage
          const fallbackUrl = originalUrl.replace("model=gptimage", "model=zimage");
          console.warn(`Rasm yuklashda xatolik! Kadr #${idx + 1} uchun zimage fallback URL ga o'tilmoqda:`, fallbackUrl);
          return { ...prev, [idx]: fallbackUrl };
        }
      }
      
      // Final fallback to Lorem Picsum
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
      // We use Lorem Picsum with seed to get consistent, beautiful, cat-free stock photos
      const picsumUrl = `https://picsum.photos/seed/${encodeURIComponent(engSubject)}/1024/1024`;
      console.warn(`Pollinations butunlay xatolik berdi. Lorem Picsum orqali rasm yuklanmoqda:`, picsumUrl);
      return { ...prev, [idx]: picsumUrl };
    });
  };

  // Fast Pollinations AI drawing loader with Puter.js free text-to-image integration
  // Fast Pollinations AI drawing loader with Puter.js free text-to-image integration
  const generateFrameVisual = async (idx: number, visualDesc: string) => {
    setGeneratingFrames(prev => ({ ...prev, [idx]: true }));
    setImageErrors(prev => ({ ...prev, [idx]: false })); // Reset error state on new generation
    setFrameElapsedTimes(prev => ({ ...prev, [idx]: 0 }));

    let timerInterval: any;
    const startTime = Date.now();
    timerInterval = setInterval(() => {
      setFrameElapsedTimes(prev => ({
        ...prev,
        [idx]: parseFloat(((Date.now() - startTime) / 1000).toFixed(1))
      }));
    }, 100);

    try {
      // 1. Prompt sanitization (removes quotes/newlines and slices to 200 chars for extreme URL safety)
      const cleanDesc = visualDesc
        .replace(/["'\n\r]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);

      const stylePrompt = style === "3D Render" ? "isometric 3D render, minimalist cartoon style, vibrant colors" :
                          style === "Realistik" ? "realistic photography, documentary educational style, highly detailed" :
                          style === "Infografik / Diagramma" ? "educational infographic, labeled vector schematic, clear vector diagram" :
                          style === "Multfilm / Illyustratsiya" ? "vibrant school book illustration, colorful drawing style" :
                          "minimalist modern flat vector design, clean paths";
      
      const promptText = `${cleanDesc}, professional ${stylePrompt}, high quality educational material`;

      // 1. Check if Puter.js is loaded and active for 100% free keyless AI generation!
      const puter = typeof window !== "undefined" && (window as any).puter;
      if (puter && puter.ai) {
        try {
          console.log("Puter.js orqali AI tasvir generatsiya qilinmoqda...");
          // Call Puter.js txt2img (Stable Diffusion/Flux based free engine)
          const imgElement = await puter.ai.txt2img(promptText);
          if (imgElement && imgElement.src) {
            setFrameImages(prev => ({ ...prev, [idx]: imgElement.src }));
            return; // Exit successfully!
          }
        } catch (puterErr) {
          console.warn("Puter.js generatsiya xatosi, backend proxy-ga o'tilmoqda:", puterErr);
        }
      }

      // 2. Call backend proxy or frontend fallback
      const imgUrl = await generateEducationalImage(promptText, style, "1:1");
      setFrameImages(prev => ({ ...prev, [idx]: imgUrl }));
    } catch (err) {
      console.error("Rasm chizishda xato:", err);
    } finally {
      clearInterval(timerInterval);
      setGeneratingFrames(prev => ({ ...prev, [idx]: false }));
    }
  };

  // Regenerate visual for a specific frame
  const handleRegenerateFrameVisual = async (idx: number) => {
    if (!storyboard) return;
    const frame = storyboard.frames[idx];
    await generateFrameVisual(idx, frame.visualDescription);
  };

  // Copy current script to clipboard
  const handleCopyScript = () => {
    if (!storyboard) return;
    const currentScript = storyboard.frames[activeFrameIdx].scriptText;
    navigator.clipboard.writeText(currentScript);
    showToast("Ssenariy matni buferga nusxalandi!");
  };

  // Download all scripts as a clean text file
  const handleDownloadFullScript = () => {
    if (!storyboard) return;
    const fullText = storyboard.frames
      .map(f => `Kadr #${f.frameNumber}: ${f.title}\nScript: ${f.scriptText}\nAnimation: ${f.animationDescription}\n\n`)
      .join("");
    
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${storyboard.animationTitle.replace(/\s+/g, "_")}_ssenariy.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  // Download active frame image
  const handleDownloadImage = async () => {
    const url = frameImages[activeFrameIdx];
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${storyboard?.animationTitle.replace(/\s+/g, "_") || "kadr"}_kadr_${activeFrameIdx + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // CORS fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const loadImageEl = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("img load failed"));
      img.src = url + (url.includes("?") ? "&" : "?") + "_nc=" + Date.now();
    });

  // Blob → base64 data URL
  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

  // Canvas-ga ko'p qatorli matn yozish (wrap)
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    for (const word of words) {
      const test = line + word + " ";
      if (ctx.measureText(test).width > maxWidth && line !== "") {
        ctx.fillText(line.trim(), x, currentY);
        line = word + " ";
        currentY += lineHeight;
      } else {
        line = test;
      }
    }
    if (line.trim()) ctx.fillText(line.trim(), x, currentY);
    return currentY;
  };

  // ── PPT Export ────────────────────────────────────────────────────────────
  const handleDownloadPPT = async () => {
    if (!storyboard) return;
    setExportingPPT(true);
    showToast("PPT tayyorlanmoqda...", "info");
    try {
      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_WIDE"; // 16:9

      for (let i = 0; i < storyboard.frames.length; i++) {
        const frame = storyboard.frames[i];
        const slide = pptx.addSlide();
        slide.background = { color: "0F172A" };

        // Background image
        const imgUrl = frameImages[i];
        if (imgUrl) {
          try {
            const resp = await fetch(imgUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              const b64 = await blobToBase64(blob);
              slide.addImage({ data: b64, x: 0, y: 0, w: "100%", h: "100%",
                sizing: { type: "cover", w: 13.33, h: 7.5 } });
              // dark overlay
              slide.addShape(pptx.ShapeType.rect, {
                x: 0, y: 0, w: "100%", h: "100%",
                fill: { color: "000000", transparency: 45 }
              });
            }
          } catch { /* no image — dark bg only */ }
        }

        // Top gradient bar
        slide.addShape(pptx.ShapeType.rect, {
          x: 0, y: 0, w: "100%", h: 0.06,
          fill: { color: "3B82F6", transparency: 0 }
        });

        // Frame label
        slide.addText(`Kadr ${frame.frameNumber} / ${storyboard.frames.length}`, {
          x: 0.3, y: 0.15, w: 3, h: 0.35,
          fontSize: 11, color: "FFFFFF", transparency: 40, fontFace: "Arial"
        });

        // Title
        slide.addText(frame.title, {
          x: 0.3, y: 0.6, w: 12.7, h: 1.2,
          fontSize: 32, bold: true, color: "FFFFFF", fontFace: "Arial",
          shadow: { type: "outer", blur: 8, offset: 2, angle: 45, color: "000000" }
        });

        // Subtitle area (bottom caption)
        slide.addShape(pptx.ShapeType.rect, {
          x: 0, y: 5.9, w: "100%", h: 1.6,
          fill: { color: "000000", transparency: 30 }
        });
        slide.addText(frame.scriptText, {
          x: 0.4, y: 6.0, w: 12.5, h: 1.4,
          fontSize: 16, color: "FFFFFF", italic: true,
          fontFace: "Arial", valign: "middle", wrap: true
        });

        // Speaker notes
        slide.addNotes(`${frame.scriptText}\n\nBatafsil: ${frame.detailedExplanation || ""}\nAtamalar: ${frame.keyTerms || ""}`);
      }

      await pptx.writeFile({ fileName: `${storyboard.animationTitle.replace(/\s+/g, "_")}_Storyboard.pptx` });
      showToast("PPTX muvaffaqiyatli yuklandi!");
    } catch (err) {
      showToast("PPT yaratishda xatolik yuz berdi.", "error");
      console.error(err);
    } finally {
      setExportingPPT(false);
    }
  };

  // ── Video (WebM) Export ────────────────────────────────────────────────────
  const handleDownloadVideo = async () => {
    if (!storyboard) return;

    if (!window.MediaRecorder) {
      showToast("Brauzeringiz video yozishni qo'llab-quvvatlamaydi.", "error");
      return;
    }

    setExportingVideo(true);
    setVideoProgress({ step: "Tayyorlanmoqda...", current: 0, total: storyboard.frames.length });
    showToast("Video yaratilmoqda. Bu 1-2 daqiqa olishi mumkin.", "info");

    const W = 1280, H = 720;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Audio context for mixing TTS
    const audioCtx = new AudioContext();
    const audioDest = audioCtx.createMediaStreamDestination();

    const videoStream = canvas.captureStream(30);
    const combined = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks()
    ]);

    const mimeType = ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]
      .find(t => MediaRecorder.isTypeSupported(t)) || "video/webm";

    const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.start(200);

    const API_URL = import.meta.env.VITE_API_URL || "https://fibot.pythonanywhere.com/api";

    // Intro frame
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#3B82F6";
    ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 52px Arial";
    ctx.textAlign = "center";
    ctx.fillText(storyboard.animationTitle, W / 2, H / 2 - 20);
    ctx.font = "24px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("EduGen · AI Ta'lim Platformasi", W / 2, H / 2 + 40);
    await sleep(2000);

    for (let i = 0; i < storyboard.frames.length; i++) {
      const frame = storyboard.frames[i];
      setVideoProgress({ step: `Kadr #${i + 1} ovoz yuklanmoqda...`, current: i + 1, total: storyboard.frames.length });

      // Load image
      let imgEl: HTMLImageElement | null = null;
      const imgUrl = frameImages[i];
      if (imgUrl) {
        try { imgEl = await loadImageEl(imgUrl); } catch { /* no image */ }
      }

      // Get TTS audio
      let frameDurationMs = Math.max(3500, frame.scriptText.length * 65);
      try {
        const ttsResp = await fetch(`${API_URL}/ai/tts/`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: frame.scriptText, voice: speechLanguage === "ru" ? "echo" : "nova", speed: 1.0 })
        });
        if (ttsResp.ok) {
          const ttsBlob = await ttsResp.blob();
          const arrayBuf = await ttsBlob.arrayBuffer();
          const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
          frameDurationMs = (audioBuf.duration + 0.5) * 1000;
          const src = audioCtx.createBufferSource();
          src.buffer = audioBuf;
          src.connect(audioDest);
          src.start(audioCtx.currentTime);
        }
      } catch { /* fallback to text-length duration */ }

      setVideoProgress({ step: `Kadr #${i + 1} yozilmoqda...`, current: i + 1, total: storyboard.frames.length });

      // Draw frame continuously
      const drawFn = () => {
        // Background
        if (imgEl) {
          // Scale to cover
          const scale = Math.max(W / imgEl.width, H / imgEl.height);
          const sw = imgEl.width * scale, sh = imgEl.height * scale;
          ctx.drawImage(imgEl, (W - sw) / 2, (H - sh) / 2, sw, sh);
        } else {
          ctx.fillStyle = "#1E293B";
          ctx.fillRect(0, 0, W, H);
        }
        // Dark overlay
        ctx.fillStyle = "rgba(0,0,0,0.52)";
        ctx.fillRect(0, 0, W, H);
        // Top blue bar
        ctx.fillStyle = "#3B82F6";
        ctx.fillRect(0, 0, W, 4);
        // Frame counter (top-left)
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.font = "16px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`Kadr ${frame.frameNumber} / ${storyboard.frames.length}`, 30, 35);
        // Title
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 42px Arial";
        ctx.textAlign = "left";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 12;
        ctx.fillText(frame.title, 40, 110);
        ctx.shadowBlur = 0;
        // Subtitle bar
        const subBarH = 110;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, H - subBarH, W, subBarH);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        wrapText(ctx, frame.scriptText, W / 2, H - subBarH + 28, W - 80, 28);
      };

      const intervalId = setInterval(drawFn, 33);
      await sleep(frameDurationMs);
      clearInterval(intervalId);

      // Brief black between frames
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);
      await sleep(300);
    }

    // Outro
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#3B82F6";
    ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("EduGen tomonidan yaratildi", W / 2, H / 2 - 10);
    ctx.font = "20px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("edu-generation.vercel.app", W / 2, H / 2 + 35);
    await sleep(2000);

    recorder.stop();
    setVideoProgress({ step: "Fayl saqlanmoqda...", current: storyboard.frames.length, total: storyboard.frames.length });

    await new Promise<void>(resolve => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${storyboard!.animationTitle.replace(/\s+/g, "_")}_EduGen.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      };
    });

    audioCtx.close();
    setExportingVideo(false);
    setVideoProgress(null);
    showToast("Video muvaffaqiyatli yuklandi!");
  };

  // ── Storyboardni saqlash
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
      showToast("Storyboard kutubxonaga saqlandi!");
    } catch (err) {
      console.error("Saqlashda xato:", err);
      showToast("Saqlashda xatolik yuz berdi.", "error");
    }
  };

  // Hamjamiyatga ulashish
  const handleShare = async () => {
    if (!resourceId) return;
    try {
      await import("../lib/db").then(m => m.togglePublic(resourceId, true));
      setIsShared(true);
      showToast("Storyboard hamjamiyatga ulashildi!");
    } catch (err) {
      showToast("Ulashishda xatolik yuz berdi.", "error");
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
      doc.text(`• Fanga mosligi: ${(storyboard.pedagogicalEvaluation?.subjectAlignment || 5)}/5`, 25, 105);
      doc.text(`• Ilmiy aniqligi: ${(storyboard.pedagogicalEvaluation?.scientificAccuracy || 5)}/5`, 25, 112);
      doc.text(`• Tushunarliligi: ${(storyboard.pedagogicalEvaluation?.clarity || 4)}/5`, 25, 119);
      doc.text(`• Yosh darajasiga muvofiqligi: ${(storyboard.pedagogicalEvaluation?.ageAppropriateness || 5)}/5`, 25, 126);
      doc.setFont("helvetica", "bold");
      doc.text(`Umumiy Muvofiqlik Reytingi: ${(storyboard.pedagogicalEvaluation?.overallScorePercentage || 92)}%`, 25, 136);

      // Integration
      doc.text("Dars Bosqichiga Integratsiya:", 20, 150);
      doc.setFillColor(240, 244, 255);
      doc.roundedRect(20, 154, 170, 40, 3, 3, "F");
      
      doc.setFontSize(9);
      doc.text("DARS BOSQICHI / STAGE:", 24, 161);
      doc.setFont("helvetica", "normal");
      doc.text(storyboard.lessonIntegration?.stage || "Mavzuni mustahkamlash", 72, 161);
      
      doc.setFont("helvetica", "bold");
      doc.text("METODIK TAVSIYA / METHOD:", 24, 169);
      doc.setFont("helvetica", "normal");
      doc.text(storyboard.lessonIntegration?.method || "Suhbat rejasi", 79, 169);

      doc.setFont("helvetica", "bold");
      doc.text("YO'RIQNOMA / INSTRUCTIONS:", 24, 177);
      doc.setFont("helvetica", "normal");
      const instLines = doc.splitTextToSize(storyboard.lessonIntegration?.teacherInstructions || "Tasvirni o'quvchilar bilan birgalikda muhokama qiling.", 115);
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
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("1. Ssenariy / Ovoz Nutqi:", xOffset, 34);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const scriptLines = doc.splitTextToSize(frame.scriptText, 72);
        doc.text(scriptLines, xOffset, 40);

        const yPos1 = 40 + (scriptLines.length * 4.5) + 5;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("2. Animatsiya Harakati:", xOffset, yPos1);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const animLines = doc.splitTextToSize(frame.animationDescription, 72);
        doc.text(animLines, xOffset, yPos1 + 6);

        const yPos2 = yPos1 + 6 + (animLines.length * 4.5) + 5;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("3. Pedagogik Qiymati:", xOffset, yPos2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const pedLines = doc.splitTextToSize(frame.pedagogicalValue, 72);
        doc.text(pedLines, xOffset, yPos2 + 6);

        // Section Underneath (Below image and side details, y starts at 128mm)
        let yUnder = 128;
        
        // 4. Batafsil ilmiy tushuntirish
        if (frame.detailedExplanation) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("4. Batafsil Mavzu Tushuntirishi:", 20, yUnder);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          const detailedLines = doc.splitTextToSize(frame.detailedExplanation, 170);
          doc.text(detailedLines, 20, yUnder + 6);
          yUnder = yUnder + 6 + (detailedLines.length * 4.5) + 6;
        }

        // 5. Tayanch atamalar va topshiriqlar
        if (frame.keyTerms || frame.studentActivity) {
          const colWidth = 82;
          const col2Offset = 108;
          let maxHeightAdded = 0;
          
          if (frame.keyTerms) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("5. Tayanch Atamalar:", 20, yUnder);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            const termsLines = doc.splitTextToSize(frame.keyTerms, colWidth);
            doc.text(termsLines, 20, yUnder + 6);
            maxHeightAdded = Math.max(maxHeightAdded, 6 + (termsLines.length * 4.5));
          }
          
          if (frame.studentActivity) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("6. Interfaol Savol / Topshiriq:", col2Offset, yUnder);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            const activityLines = doc.splitTextToSize(frame.studentActivity, colWidth);
            doc.text(activityLines, col2Offset, yUnder + 6);
            maxHeightAdded = Math.max(maxHeightAdded, 6 + (activityLines.length * 4.5));
          }
          
          yUnder += maxHeightAdded + 6;
        }
      }

      doc.save(`${storyboard.animationTitle.replace(/\s+/g, "_")}_dars_rejasi.pdf`);
    } catch (e) {
      console.error("PDF yaratishda xato:", e);
      showToast("PDF yaratishda xatolik yuz berdi.", "error");
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-auto ${toast.type === "success" ? "bg-green-600 text-white" : toast.type === "error" ? "bg-red-600 text-white" : "bg-blue-600 text-white"}`}>
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"} {toast.msg}
          </div>
        ))}
      </div>


      {/* ----------------- STATE A: CONFIGURATION FORM ----------------- */}
      {!storyboard && !loading && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Storyboard yaratish</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Dars mavzusi bo'yicha kadrlar ketma-ketligi va audio ssenariy</p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Parametrlar</p>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ta'lim fani</label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 transition-colors"
                  >
                    {["Biologiya", "Fizika", "Kimyo", "Informatika", "Matematika", "Tarix", "Geografiya", "Boshlang'ich ta'lim", "Kasbiy fanlar"].map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sinf / Yosh</label>
                  <select
                    value={ageGroup}
                    onChange={e => setAgeGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 transition-colors"
                  >
                    {["Boshlang'ich sinf (1-4 sinflar)", "O'rta sinf (5-9 sinflar)", "Kollej / Oliy ta'lim"].map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Visual uslub</label>
                  <select
                    value={style}
                    onChange={e => setStyle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 transition-colors"
                  >
                    {["3D Render", "Infografik / Diagramma", "Realistik", "Multfilm / Illyustratsiya", "Minimalizm"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Murakkablik</label>
                  <select
                    value={complexity}
                    onChange={e => setComplexity(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 transition-colors"
                  >
                    {["Sodda", "O'rtacha", "Mukammal"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Dars mavzusi
                </label>
                <textarea
                  rows={4}
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Masalan: Quyosh atrofida sayyoralarning aylanishi..."
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 transition-colors resize-none text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              onClick={handleCreateStoryboard}
              disabled={loading || !topic.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Wand2 size={16} />
              Storyboard Yaratish
            </button>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300 text-center">
            <p>Storyboard — dars uchun vizual kadrlar va audio ssenariy rejasi</p>
          </div>
        </div>
      )}

      {/* ----------------- STATE B: LOADING SCREEN ----------------- */}
      {loading && (
        <div className="bg-white dark:bg-gray-900 p-12 min-h-[350px] rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-4 max-w-2xl mx-auto">
          <div className="w-10 h-10 border-2 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin" />
          <div className="space-y-1.5">
            <h3 className="font-medium text-gray-800 dark:text-white text-base">Storyboard tuzilmoqda...</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
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
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
            >
              <ArrowLeft size={14} />
              Mavzuni o'zgartirish (Orqaga)
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                disabled={exportingPDF}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 border border-gray-200 dark:border-gray-700"
              >
                {exportingPDF ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                PDF
              </button>

              <button
                onClick={handleDownloadPPT}
                disabled={exportingPPT}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="PowerPoint slayd sifatida yuklab olish"
              >
                {exportingPPT ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                PPTX
              </button>

              <button
                onClick={handleDownloadVideo}
                disabled={exportingVideo}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="TTS ovoz bilan video (WebM) yuklab olish"
              >
                {exportingVideo ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
                {exportingVideo && videoProgress ? videoProgress.step : "Video (WebM)"}
              </button>

              <button
                onClick={handleSaveStoryboard}
                className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
                title="Kutubxonaga saqlash"
              >
                <Download size={14} />
              </button>

              {resourceId && !isShared && (
                <button
                  onClick={handleShare}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                  title="Hamjamiyatga ulashish"
                >
                  <Share2 size={14} />
                </button>
              )}
            </div>

            {/* Video export progress bar */}
            {exportingVideo && videoProgress && (
              <div className="w-full mt-2 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500 rounded-full"
                  style={{ width: `${(videoProgress.current / videoProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Title block */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Storyboard</p>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{storyboard.animationTitle}</h2>
            <span className="inline-block mt-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
              {storyboard.pedagogicalEvaluation.overallScorePercentage}% pedagogik muvofiqlik
            </span>
          </div>

          {/* Timeline dots / Selector */}
          <div className="flex items-center justify-center gap-2 py-2">
            {storyboard.frames.map((frame, idx) => {
              const isCurrent = activeFrameIdx === idx;
              const hasImg = !!frameImages[idx];
              const isGenerating = !!generatingFrames[idx];

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveFrameIdx(idx);
                    stopSpeaking();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border ${
                    isCurrent
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
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
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col items-center p-6 space-y-6">
            
            {/* Widescreen Cinema Screen (16:9 Aspect Video container) */}
            <div className="w-full max-w-3xl aspect-video bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-900 shadow-md flex items-center justify-center group/screen">
              {frameImages[activeFrameIdx] ? (
                <>
                  {!!generatingFrames[activeFrameIdx] && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs gap-2">
                      <Loader2 size={32} className="animate-spin text-pink-500" />
                      <p className="text-white text-[10px] font-black tracking-wide animate-pulse">Tasvir chizilmoqda...</p>
                      <div className="px-3 py-1 bg-pink-500/20 border border-pink-500/40 rounded-xl">
                        <span className="font-mono text-xs font-black text-pink-400">
                          {(frameElapsedTimes[activeFrameIdx] || 0.0).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  )}
                  <motion.img
                    key={activeFrameIdx}
                    src={frameImages[activeFrameIdx]}
                    alt={`Kadr #${activeFrameIdx + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(activeFrameIdx)}
                    onLoad={() => setImageErrors(prev => ({ ...prev, [activeFrameIdx]: false }))}
                    animate={animationMode ? {
                      scale: [1.02, 1.08, 1.02],
                      x: [-4, 4, -4],
                      y: [-2, 2, -2]
                    } : {}}
                    transition={{
                      duration: 18,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  {/* Image loading error retry overlay */}
                  {imageErrors[activeFrameIdx] && (
                    <div className="absolute inset-0 z-15 flex flex-col items-center justify-center bg-slate-900/90 text-center p-4 space-y-2">
                      <p className="text-white text-[11px] font-bold">Rasm yuklanishida xatolik yuz berdi (Internet sust bo'lishi mumkin).</p>
                      <button
                        onClick={() => handleRegenerateFrameVisual(activeFrameIdx)}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95"
                      >
                        Tasvirni qayta chizish
                      </button>
                    </div>
                  )}
                  
                  {/* Premium glassmorphic animated subtitles overlay (Karaoke word-by-word highlight) */}
                  {showSubtitles && (
                    <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-center pointer-events-auto select-text">
                      <motion.div 
                        key={activeFrameIdx + "-" + isPlayingSim}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/75 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-white text-xs md:text-sm font-black tracking-wide text-center shadow-lg max-w-[95%] leading-relaxed max-h-[85px] md:max-h-[100px] overflow-y-auto custom-scrollbar"
                      >
                        <span className="text-pink-500 font-extrabold mr-1.5 uppercase text-[9px] tracking-wider block mb-1 text-center flex items-center justify-center gap-1">
                          {isSpeaking ? (
                            <>
                              <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-ping" />
                              {speechLanguage === "uz" ? "🎙️ ANIMATSION SSENARIY (OVOZLI)" : "🎙️ NARRATION (AUDIO ACTIVE)"}
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                              {speechLanguage === "uz" ? "🎙️ ANIMATSION SSENARIY" : "🎙️ NARRATION"}
                            </>
                          )}
                        </span>
                        <span className="text-white leading-relaxed">
                          {storyboard.frames[activeFrameIdx].scriptText.split(" ").map((word, wordIdx, arr) => {
                            const wordProgressThreshold = (wordIdx / arr.length) * 100;
                            const isHighlighted = isPlayingSim ? (simProgress >= wordProgressThreshold) : true;
                            return (
                              <span key={wordIdx} className="inline-block mr-1">
                                <span 
                                  className={`transition-all duration-200 ${
                                    isHighlighted 
                                      ? "text-pink-400 scale-105 font-black drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" 
                                      : "text-white/60 font-semibold"
                                  }`}
                                >
                                  {word}
                                </span>
                                {" "}
                              </span>
                            );
                          })}
                        </span>
                      </motion.div>
                    </div>
                  )}

                  {/* Hover Action Overlay to Re-draw image */}
                  <div className="absolute top-3 right-3 z-20 opacity-0 group-hover/screen:opacity-100 transition-opacity flex gap-2">
                    <button
                      onClick={() => handleRegenerateFrameVisual(activeFrameIdx)}
                      disabled={generatingFrames[activeFrameIdx]}
                      className="px-3 py-1.5 bg-black/75 hover:bg-black/90 text-white rounded-lg text-[10px] font-black flex items-center gap-1.5 backdrop-blur-md border border-white/10 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Ushbu kadr tasvirini boshqatdan chizish"
                    >
                      <Sparkles size={11} className="text-pink-500 animate-pulse" />
                      Tasvirni qayta chizish
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-slate-500 flex flex-col items-center gap-3">
                  {!!generatingFrames[activeFrameIdx] ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={24} className="animate-spin text-blue-500" />
                      <p className="text-xs text-gray-400">{(frameElapsedTimes[activeFrameIdx] || 0.0).toFixed(1)}s</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Tasvir tayyorlanmoqda...</p>
                  )}
                </div>
              )}

              {/* Cinema HUD overlay */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/5 text-white text-[9px] font-black tracking-widest uppercase z-20">
                {storyboard.frames[activeFrameIdx].title}
              </div>
            </div>

            {/* Utility Action Buttons (Toggle Subtitles, Download Image, Copy Script, Download Full Script) */}
            <div className="w-full max-w-3xl flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setShowSubtitles(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showSubtitles
                    ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                    : "border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900"
                }`}
              >
                {showSubtitles ? "Subtitrlar yoqiq" : "Subtitrlar o'chiq"}
              </button>

              <button
                onClick={handleDownloadImage}
                disabled={!frameImages[activeFrameIdx]}
                className="px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 text-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Download size={13} />
                Tasvirni yuklash
              </button>

                <button
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 bg-white hover:bg-slate-105 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Joriy ssenariy audio matnini nusxalash"
                >
                  <span>📋</span> Ssenariyni Nusxalash
                </button>

                <button
                  onClick={handleDownloadFullScript}
                  className="px-3 py-1.5 bg-white hover:bg-slate-105 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Barcha kadrlar ssenariysini .txt shaklida yuklash"
                >
                  <span>📄</span> To'liq Ssenariy (.txt)
                </button>
              </div>

            {/* Script card under the screen */}
            <div className="w-full max-w-3xl p-4 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Volume2 size={12} /> Ssenariy nutqi
                </span>
                <span className="text-xs text-gray-400">{speechLanguage.toUpperCase()}</span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed italic">
                "{storyboard.frames[activeFrameIdx].scriptText}"
              </p>
              {isPlayingSim && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full bg-blue-500 transition-all duration-100 ease-linear"
                    style={{ width: `${simProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Tab Bar */}
            <div className="w-full max-w-3xl border-b border-gray-200 dark:border-gray-700 flex gap-1 overflow-x-auto pb-px">
              {[
                { id: "explanation", label: "Tahlil" },
                { id: "terms", label: "Atamalar" },
                { id: "activity", label: "Topshiriq" },
                { id: "script", label: "Animatsiya" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as any)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeDetailTab === tab.id
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="w-full max-w-3xl min-h-[120px] text-sm">
              <AnimatePresence mode="wait">
                {activeDetailTab === "explanation" && (
                  <motion.div
                    key="explanation"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 max-h-[200px] overflow-y-auto"
                  >
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {storyboard.frames[activeFrameIdx].detailedExplanation || "Batafsil tushuntirish mavjud emas."}
                    </p>
                  </motion.div>
                )}

                {activeDetailTab === "terms" && (
                  <motion.div key="terms" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 max-h-[200px] overflow-y-auto">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {storyboard.frames[activeFrameIdx].keyTerms || "Tayanch atamalar mavjud emas."}
                    </p>
                  </motion.div>
                )}

                {activeDetailTab === "activity" && (
                  <motion.div key="activity" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 max-h-[200px] overflow-y-auto">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">
                      {storyboard.frames[activeFrameIdx].studentActivity || "Topshiriqlar mavjud emas."}
                    </p>
                  </motion.div>
                )}

                {activeDetailTab === "script" && (
                  <motion.div key="script" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Animatsiya harakati</p>
                      <p className="text-gray-700 dark:text-gray-300">{storyboard.frames[activeFrameIdx].animationDescription}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pedagogik qiymat</p>
                      <p className="text-gray-700 dark:text-gray-300">{storyboard.frames[activeFrameIdx].pedagogicalValue}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Playback Controls & Voice selection row */}
            <div className="w-full max-w-3xl pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { if (isSpeaking) stopSpeaking(); else speakText(storyboard.frames[activeFrameIdx].scriptText); }}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    isSpeaking
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  {isSpeaking ? "To'xtatish" : "Ovozli eshitish"}
                </button>

                <button
                  onClick={() => { if (isPlayingSim) { setIsPlayingSim(false); stopSpeaking(); } else { setIsPlayingSim(true); setActiveFrameIdx(0); } }}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isPlayingSim
                      ? "bg-red-600 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isPlayingSim ? <Square size={13} /> : <Play size={13} />}
                  {isPlayingSim ? "To'xtatish" : "Simulyatsiya"}
                </button>

                <button
                  onClick={() => setAnimationMode(prev => !prev)}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    animationMode
                      ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500"
                  }`}
                >
                  <Sparkles size={13} />
                  Animatsiya
                </button>
              </div>

              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <span className="text-xs text-gray-500 dark:text-gray-400 px-1">Til:</span>
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
                    className={`px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                      speechLanguage === langObj.code
                        ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                  className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
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
                  className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

            </div>

            {/* Ovoz sozlamalari (Tezlik, Ton va Balandlik + Azure Config) */}
            <div className="w-full max-w-3xl p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 space-y-3 text-sm">

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Volume2 size={14} /> Nutq tizimi
                </span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  {[
                    { id: "google", label: "OpenAI TTS" },
                    { id: "native", label: "Local" },
                    { id: "azure", label: "Azure" }
                  ].map(sys => (
                    <button
                      key={sys.id}
                      onClick={() => {
                        setNarrationType(sys.id as any);
                        localStorage.setItem("edu_gen_narration_type", sys.id);
                        if (isSpeaking) speakText(storyboard.frames[activeFrameIdx].scriptText);
                      }}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        narrationType === sys.id
                          ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {sys.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Azure Config Form (Conditionally visible when azure selected) */}
              {narrationType === "azure" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 bg-indigo-50/10 dark:bg-indigo-950/20 rounded-2xl border border-indigo-150/40 dark:border-indigo-900/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                      Microsoft Azure Cognitive Speech Sozlamalari
                    </span>
                    <a
                      href="https://azure.microsoft.com/en-us/products/ai-services/ai-speech/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[9px] text-indigo-500 hover:underline"
                    >
                      Kalit olish (Free 500k chars)
                    </a>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                        Azure API Subscription Key:
                      </label>
                      <input
                        type="password"
                        placeholder="Kalitni kiriting (Ocp-Apim-Subscription-Key)..."
                        value={azureKey}
                        onChange={(e) => {
                          setAzureKey(e.target.value);
                          localStorage.setItem("edu_gen_azure_key", e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                        Azure API Service Region:
                      </label>
                      <select
                        value={azureRegion}
                        onChange={(e) => {
                          setAzureRegion(e.target.value);
                          localStorage.setItem("edu_gen_azure_region", e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        {["eastus", "westeurope", "southeastasia", "centralus", "eastasia", "westus2", "northeurope"].map(reg => (
                          <option key={reg} value={reg}>{reg}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Sliders Container */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                <span>Nutq Parametrlari:</span>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                  {/* Speech Rate Slider */}
                  <div className="flex items-center gap-2 w-full sm:w-40 justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">Tezlik: {speechRate}x</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value);
                        setSpeechRate(rate);
                        if (activeAudioRef.current) {
                          activeAudioRef.current.playbackRate = rate;
                        }
                      }}
                      className="w-20 accent-pink-600 cursor-pointer"
                    />
                  </div>
                  {/* Speech Pitch Slider */}
                  <div className="flex items-center gap-2 w-full sm:w-40 justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">Toni: {speechPitch}x</span>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={speechPitch}
                      onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                      className="w-20 accent-pink-600 cursor-pointer"
                    />
                  </div>
                  {/* Speech Volume Slider */}
                  <div className="flex items-center gap-2 w-full sm:w-40 justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">Balandlik: {Math.round(speechVolume * 100)}%</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={speechVolume}
                      onChange={(e) => {
                        const vol = parseFloat(e.target.value);
                        setSpeechVolume(vol);
                        if (activeAudioRef.current) {
                          activeAudioRef.current.volume = vol;
                        }
                      }}
                      className="w-20 accent-pink-600 cursor-pointer"
                    />
                  </div>
                </div>
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
                        <p className="font-bold text-indigo-650 dark:text-indigo-400">{storyboard.lessonIntegration?.stage || "Mavzuni mustahkamlash"}</p>
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-450 dark:text-slate-500 uppercase text-[8px] tracking-wider block mb-0.5">Tavsiya etiladigan metod:</span>
                        <p className="font-bold text-pink-650 dark:text-pink-400">{storyboard.lessonIntegration?.method || "Suhbat rejasi"}</p>
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-450 dark:text-slate-500 uppercase text-[8px] tracking-wider block mb-0.5">O'qituvchi uchun yo'riqnoma:</span>
                        <p className="italic font-medium text-slate-700 dark:text-slate-300 leading-relaxed">"{storyboard.lessonIntegration?.teacherInstructions || "Tasvirni o'quvchilar bilan birgalikda muhokama qiling."}"</p>
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
                        { label: "Mavzuga va fanga mosligi", score: storyboard.pedagogicalEvaluation?.subjectAlignment || 5 },
                        { label: "Ilmiy va vizual aniqligi", score: storyboard.pedagogicalEvaluation?.scientificAccuracy || 5 },
                        { label: "O'quvchiga tushunarliligi", score: storyboard.pedagogicalEvaluation?.clarity || 4 },
                        { label: "Yosh darajasiga muvofiqligi", score: storyboard.pedagogicalEvaluation?.ageAppropriateness || 5 }
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
