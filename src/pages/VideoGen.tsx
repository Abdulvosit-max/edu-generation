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
import { generateEducationalStoryboard, StoryboardData, StoryboardFrame } from "../lib/gemini";
import { saveResource } from "../lib/db";
import { useAppContext } from "../lib/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";

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
  const [animationMode, setAnimationMode] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [speechVolume, setSpeechVolume] = useState(1.0);
  const [activeDetailTab, setActiveDetailTab] = useState<"explanation" | "terms" | "activity" | "script">("explanation");
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [narrationType, setNarrationType] = useState<"google" | "native" | "azure">(() => {
    try {
      return (localStorage.getItem("edu_gen_narration_type") as any) || "google";
    } catch {
      return "google";
    }
  });
  const [azureKey, setAzureKey] = useState(() => {
    try {
      return localStorage.getItem("edu_gen_azure_key") || "";
    } catch {
      return "";
    }
  });
  const [azureRegion, setAzureRegion] = useState(() => {
    try {
      return localStorage.getItem("edu_gen_azure_region") || "eastus";
    } catch {
      return "eastus";
    }
  });

  // Text-To-Speech / Audio States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPlayingSim, setIsPlayingSim] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [speechLanguage, setSpeechLanguage] = useState<"uz" | "ru" | "en">("uz");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  
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

  // Microsoft Azure Cognitive Speech Synthesis helper using REST API
  const fetchAzureTTS = async (
    text: string, 
    apiKey: string, 
    region: string, 
    voiceName = "uz-UZ-MadinaNeural", 
    rate = 1.0, 
    pitch = 1.0
  ): Promise<string> => {
    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    
    // Relative speed and pitch in SSML
    const ratePercent = `${Math.round((rate - 1.0) * 100)}%`;
    const pitchPercent = `${Math.round((pitch - 1.0) * 50)}%`;
    
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='uz-UZ'>
      <voice name='${voiceName}'>
        <prosody rate='${rate >= 1.0 ? "+" : ""}${ratePercent}' pitch='${pitch >= 1.0 ? "+" : ""}${pitchPercent}'>
          ${text}
        </prosody>
      </voice>
    </speak>`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        "User-Agent": "EduVisualAI"
      },
      body: ssml
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure TTS error: ${response.status} - ${errorText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  // Google Translate TTS Fallback
  const speakTextGoogle = (text: string, onEndCallback?: () => void) => {
    try {
      let langCode = "uz";
      if (speechLanguage === "ru") langCode = "ru";
      else if (speechLanguage === "en") langCode = "en";

      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      
      audio.onended = () => {
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback();
      };
      
      audio.onerror = (e) => {
        console.warn("Google TTS xatosi, Web Speech API ga o'tilmoqda...", e);
        speakTextNative(text, onEndCallback);
      };

      activeAudioRef.current = audio;
      setIsSpeaking(true);
      
      audio.defaultPlaybackRate = speechRate;
      audio.playbackRate = speechRate;
      audio.volume = speechVolume;
      
      audio.play().catch(err => {
        console.warn("Autoplay blocked, playing via Web Speech API...", err);
        speakTextNative(text, onEndCallback);
      });
    } catch (err) {
      speakTextNative(text, onEndCallback);
    }
  };

  // Dispatcher for Narration Types
  const speakText = async (text: string, onEndCallback?: () => void) => {
    if (typeof window === "undefined") return;
    
    // Stop any currently playing audio/speech
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (!text) return;

    if (narrationType === "azure" && azureKey.trim()) {
      try {
        setIsSpeaking(true);
        const voiceName = speechLanguage === "uz" ? "uz-UZ-MadinaNeural" : 
                          speechLanguage === "ru" ? "ru-RU-SvetlanaNeural" : "en-US-AvaNeural";
        const audioUrl = await fetchAzureTTS(text, azureKey, azureRegion, voiceName, speechRate, speechPitch);
        
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          setIsSpeaking(false);
          if (onEndCallback) onEndCallback();
        };
        audio.onerror = (e) => {
          console.warn("Azure TTS xatosi, Google TTS ga o'tilmoqda...", e);
          speakTextGoogle(text, onEndCallback);
        };
        
        activeAudioRef.current = audio;
        audio.volume = speechVolume;
        audio.play().catch(err => {
          console.warn("Azure audio play blocklandi, Google TTS ga o'tilmoqda...", err);
          speakTextGoogle(text, onEndCallback);
        });
      } catch (err) {
        console.warn("Azure TTS so'rovida xatolik, Google TTS ga o'tilmoqda...", err);
        speakTextGoogle(text, onEndCallback);
      }
      return;
    }

    if (narrationType === "native") {
      speakTextNative(text, onEndCallback);
      return;
    }

    // Default: Google TTS
    speakTextGoogle(text, onEndCallback);
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
      alert("Storyboard yaratishda muammo yuz berdi. Qayta urinib ko'ring.");
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
  const generateFrameVisual = async (idx: number, visualDesc: string) => {
    setGeneratingFrames(prev => ({ ...prev, [idx]: true }));
    setImageErrors(prev => ({ ...prev, [idx]: false })); // Reset error state on new generation
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
          console.warn("Puter.js generatsiya xatosi, Pollinations-ga o'tilmoqda:", puterErr);
        }
      }

      // 2. Fallback to Pollinations AI
      const seed = Math.floor(Math.random() * 9999999);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;
      
      // Instantly set the frame image URL to let the browser begin downloading and rendering it immediately
      setFrameImages(prev => ({ ...prev, [idx]: url }));

      // Asynchronously preload image in background (non-blocking fire-and-forget!)
      const img = new Image();
      img.src = url;
    } catch (err) {
      console.error("Rasm chizishda xato:", err);
    } finally {
      // Stop showing generation spinner after a short aesthetic timeout (500ms)
      setTimeout(() => {
        setGeneratingFrames(prev => ({ ...prev, [idx]: false }));
      }, 500);
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
    alert("Ssenariy matni buferga muvaffaqiyatli nusxalandi!");
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
              const isGenerating = !!generatingFrames[idx];

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
            <div className="w-full max-w-3xl aspect-video bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-900 shadow-md flex items-center justify-center group/screen">
              {frameImages[activeFrameIdx] ? (
                <>
                  {!!generatingFrames[activeFrameIdx] && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs">
                      <Loader2 size={32} className="animate-spin text-pink-500" />
                      <p className="text-white text-[10px] font-black mt-2 tracking-wide animate-pulse">Tasvir chizilmoqda...</p>
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
                    <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-center pointer-events-none select-none">
                      <motion.div 
                        key={activeFrameIdx + "-" + isPlayingSim}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/75 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-white text-xs md:text-sm font-black tracking-wide text-center shadow-lg max-w-[95%] leading-relaxed"
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
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/5 text-white text-[9px] font-black tracking-widest uppercase z-20">
                {storyboard.frames[activeFrameIdx].title}
              </div>
            </div>

            {/* Utility Action Buttons (Toggle Subtitles, Download Image, Copy Script, Download Full Script) */}
            <div className="w-full max-w-3xl flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 text-xs font-bold text-slate-655 dark:text-slate-350 shadow-xs">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
                🛠️ Kadr Boshqaruvi:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowSubtitles(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    showSubtitles 
                      ? "border-pink-200 bg-pink-50/20 text-pink-600 dark:border-pink-900/30 dark:text-pink-400" 
                      : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950"
                  }`}
                  title="Subtitrlarni ko'rsatish/yashirish"
                >
                  {showSubtitles ? <span className="text-pink-500">👁️ Subtitrlar Yoqilgan</span> : <span>👁️‍Dars Subtitrlari Yashirilgan</span>}
                </button>

                <button
                  onClick={handleDownloadImage}
                  disabled={!frameImages[activeFrameIdx]}
                  className="px-3 py-1.5 bg-white hover:bg-slate-105 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                  title="Kadr tasvirini kompyuterga yuklab olish"
                >
                  <Download size={13} />
                  Tasvirni Yuklash
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
            </div>

            {/* Script card under the screen */}
            <div className="w-full max-w-3xl p-5 bg-pink-50/30 dark:bg-pink-950/20 border border-pink-100/50 dark:border-pink-900/20 rounded-2xl space-y-1.5 relative overflow-hidden">
              <span className="text-[8px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest block mb-0.5 flex items-center justify-between">
                <span className="flex items-center gap-0.5">
                  <Volume2 size={10} /> Ssenariy / Ovoz Nutqi:
                </span>
                <span className="bg-pink-500/10 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-[8px] font-extrabold flex items-center gap-0.5">
                  <Languages size={8} /> {speechLanguage === "uz" ? "🇺🇿 UZ" : speechLanguage === "ru" ? "🇷🇺 RU" : "🇬🇧 EN"} talaffuzi
                </span>
              </span>
              <p className="text-xs md:text-sm font-semibold text-slate-800 dark:text-pink-100 leading-relaxed italic text-center relative z-10">
                "{storyboard.frames[activeFrameIdx].scriptText}"
              </p>
              {/* Progress bar overlay at bottom of script card during simulation */}
              {isPlayingSim && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200/50 dark:bg-slate-800/50">
                  <div 
                    className="h-full bg-pink-500 transition-all duration-100 ease-linear"
                    style={{ width: `${simProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Sub-details (Actions and Pedagogical details stacked cleanly) */}
            {/* Beautiful Tab Bar for Frame details */}
            <div className="w-full max-w-3xl border-b border-slate-200 dark:border-slate-700 flex gap-2 overflow-x-auto pb-px">
              {[
                { id: "explanation", label: "📖 Batafsil Tahlil", activeColor: "border-indigo-500 text-indigo-650 dark:text-indigo-400" },
                { id: "terms", label: "🔑 Tayanch Atamalar", activeColor: "border-emerald-500 text-emerald-600 dark:text-emerald-400" },
                { id: "activity", label: "🙋 Interfaol Topshiriq", activeColor: "border-pink-500 text-pink-600 dark:text-pink-400" },
                { id: "script", label: "🎬 Ssenariy & Animatsiya", activeColor: "border-amber-500 text-amber-600 dark:text-amber-400" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as any)}
                  className={`px-4 py-2.5 text-xs font-black border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                    activeDetailTab === tab.id
                      ? `${tab.activeColor} scale-102`
                      : "border-transparent text-slate-400 hover:text-slate-655 dark:hover:text-slate-350"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sub-details Tab Contents with beautiful slide/fade-in transitions */}
            <div className="w-full max-w-3xl min-h-[140px] text-xs">
              <AnimatePresence mode="wait">
                {activeDetailTab === "explanation" && (
                  <motion.div
                    key="explanation"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="p-5 bg-indigo-50/10 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/30 space-y-2"
                  >
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block text-[9px] uppercase tracking-wider flex items-center gap-1">
                      <span>📖</span> Batafsil Mavzu Tushuntirishi:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs md:text-sm font-semibold">
                      {storyboard.frames[activeFrameIdx].detailedExplanation || "Ushbu kadr uchun batafsil tushuntirish mavjud emas."}
                    </p>
                  </motion.div>
                )}

                {activeDetailTab === "terms" && (
                  <motion.div
                    key="terms"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="p-5 bg-emerald-50/10 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100/40 dark:border-emerald-950/20 space-y-2"
                  >
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block text-[9px] uppercase tracking-wider flex items-center gap-1">
                      <span>🔑</span> Tayanch Atamalar va Ibora Ta'riflari:
                    </span>
                    <p className="text-slate-750 dark:text-emerald-250 leading-relaxed text-xs md:text-sm font-bold whitespace-pre-line">
                      {storyboard.frames[activeFrameIdx].keyTerms || "Ushbu kadr uchun tayanch atamalar mavjud emas."}
                    </p>
                  </motion.div>
                )}

                {activeDetailTab === "activity" && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="p-5 bg-pink-50/10 dark:bg-pink-950/10 rounded-2xl border border-pink-100/40 dark:border-pink-950/20 space-y-2"
                  >
                    <span className="font-extrabold text-pink-650 dark:text-pink-400 block text-[9px] uppercase tracking-wider flex items-center gap-1">
                      <span>🙋</span> O'quvchilar uchun Interfaol Savol / Topshiriq:
                    </span>
                    <p className="text-slate-755 dark:text-pink-250 leading-relaxed text-xs md:text-sm italic font-semibold">
                      {storyboard.frames[activeFrameIdx].studentActivity || "Ushbu kadr uchun topshiriqlar mavjud emas."}
                    </p>
                  </motion.div>
                )}

                {activeDetailTab === "script" && (
                  <motion.div
                    key="script"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-850/50 space-y-1">
                      <span className="font-extrabold text-slate-450 dark:text-slate-550 block text-[9px] uppercase tracking-wider flex items-center gap-1">
                        <span>🎬</span> Animatsiya Harakati (Kadrda):
                      </span>
                      <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-medium">
                        {storyboard.frames[activeFrameIdx].animationDescription}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-850/50 space-y-1">
                      <span className="font-extrabold text-slate-450 dark:text-slate-550 block text-[9px] uppercase tracking-wider flex items-center gap-1">
                        <span>💡</span> Pedagogik Qiymat (O'quvchiga):
                      </span>
                      <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-medium">
                        {storyboard.frames[activeFrameIdx].pedagogicalValue}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Playback Controls & Voice selection row */}
            <div className="w-full max-w-3xl pt-5 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Voice and Sim Buttons */}
              <div className="flex flex-wrap items-center gap-2">
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
                      stopSpeaking();
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

                {/* Animated Resource Toggle Switch */}
                <button
                  onClick={() => setAnimationMode(prev => !prev)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    animationMode 
                      ? "bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400" 
                      : "bg-slate-105 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-850"
                  }`}
                  title="Ken Burns kameraning siljishi va Canvas animatsiya effektlarini yoqish/o'chirish"
                >
                  <Sparkles size={13} className={animationMode ? "text-pink-500 animate-spin" : "text-slate-400"} />
                  Animatsiya Rejimi
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

            {/* Ovoz sozlamalari (Tezlik, Ton va Balandlik + Azure Config) */}
            <div className="w-full max-w-3xl p-5 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-150 dark:border-slate-800/80 space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
              
              {/* Narration System Toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center gap-2">
                  <Volume2 size={14} className="text-pink-650 dark:text-pink-500 animate-pulse" />
                  <span className="font-extrabold">Nutq Tizimi (TTS Speech System):</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850">
                  {[
                    { id: "google", label: "Google (Free)" },
                    { id: "native", label: "Local Speech" },
                    { id: "azure", label: "Azure Neural (HD)" }
                  ].map(sys => (
                    <button
                      key={sys.id}
                      onClick={() => {
                        setNarrationType(sys.id as any);
                        localStorage.setItem("edu_gen_narration_type", sys.id);
                        if (isSpeaking) {
                          speakText(storyboard.frames[activeFrameIdx].scriptText);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        narrationType === sys.id
                          ? "bg-pink-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
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
