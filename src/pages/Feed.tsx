import { useState, useEffect, useMemo } from "react";
import { 
  Globe, 
  FolderHeart, 
  Search, 
  Presentation, 
  FileText, 
  ImageIcon, 
  Trash2, 
  Share2, 
  Eye, 
  Download, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Clock,
  User,
  ExternalLink,
  Lock,
  Unlock,
  CheckCircle,
  HelpCircle,
  Play,
  Video,
  Volume2,
  GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  fetchResources, 
  fetchUserResources, 
  togglePublic, 
  deleteResource, 
  Resource 
} from "../lib/db";
import { StoryboardData, StoryboardFrame } from "../lib/gemini";
import { useAppContext } from "../lib/AppContext";
import { cn } from "../lib/utils";
import Markdown from "react-markdown";
import jsPDF from "jspdf";
import pptxgen from "pptxgenjs";

// Slayd ranglari va geks kodlari
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
};

const hexColors: Record<string, string> = {
  blue: "1D4ED8", emerald: "059669", rose: "E11D48", amber: "D97706",
  indigo: "4338CA", purple: "7E22CE", cyan: "0891B2", slate: "334155",
  zinc: "3F3F46", gray: "4B5563", teal: "0F766E", sky: "0284C7", navy: "0F172A"
};

export default function Feed() {
  const { t, theme, language } = useAppContext();
  const [activeTab, setActiveTab] = useState<"community" | "library">("community");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "slide" | "test" | "image" | "video">("all");
  
  // Preview Modal State
  const [previewItem, setPreviewItem] = useState<Resource | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Ma'lumotlarni yuklab olish
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "community") {
        const data = await fetchResources();
        setResources(data);
      } else {
        const data = await fetchUserResources();
        setResources(data);
      }
    } catch (err) {
      console.error("Xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // preview ochiq bo'lganda fon skrolini o'chirish
    if (previewItem) setPreviewItem(null);
  }, [activeTab]);

  // Hamjamiyatga chiqarish yoki bekor qilish (toggle share)
  const handleToggleShare = async (item: Resource, e: React.MouseEvent) => {
    e.stopPropagation(); // Kartani bosilishini to'xtatish
    if (!item.id) return;
    const newStatus = !item.is_public;
    try {
      await togglePublic(item.id, newStatus);
      setResources(prev => 
        prev.map(r => r.id === item.id ? { ...r, is_public: newStatus } : r)
      );
      if (previewItem && previewItem.id === item.id) {
        setPreviewItem(prev => prev ? { ...prev, is_public: newStatus } : null);
      }
      alert(newStatus ? "Resurs hamjamiyatga muvaffaqiyatli ulashildi!" : "Resurs ommaviyligi bekor qilindi!");
    } catch {
      alert("Xatolik yuz berdi. Qayta urinib ko'ring.");
    }
  };

  // Resursni o'chirish
  const handleDelete = async (item: Resource, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.id) return;
    if (!window.confirm(t.deleteConfirm || "Haqiqatan ham bu resursni o'chirmoqchimisiz?")) return;
    
    try {
      await deleteResource(item.id);
      setResources(prev => prev.filter(r => r.id !== item.id));
      if (previewItem && previewItem.id === item.id) {
        setPreviewItem(null);
      }
    } catch {
      alert("O'chirishda xatolik yuz berdi.");
    }
  };

  // Qidiruv va filtrlash
  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            res.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "all" || res.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [resources, searchQuery, selectedType]);

  // Modalni yopish va reset qilish
  const closePreview = () => {
    setPreviewItem(null);
    setSlideIdx(0);
    setTestAnswers({});
    setTestSubmitted(false);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // PPTX Slayd yuklab olish
  const downloadPPTX = async (item: Resource) => {
    let slidesData = [];
    try {
      slidesData = JSON.parse(item.content);
    } catch {
      alert("Slayd kontenti buzilgan.");
      return;
    }
    
    setExporting(true);
    const pptx = new pptxgen();
    
    for (let i = 0; i < slidesData.length; i++) {
      const slide = slidesData[i];
      const slideObj = pptx.addSlide();
      
      const bgColor = hexColors[slide.colorScheme] || "1E293B";
      slideObj.background = { color: bgColor };
      
      // Bezaklar (Standard for all)
      slideObj.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.2, fill: { color: "FFFFFF", transparency: 92 } });

      if (slide.layoutType === "intro_title") {
        slideObj.addText(slide.title, { x: 0, y: 2.0, w: "100%", h: 1.5, fontSize: 44, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial" });
        slideObj.addShape(pptx.ShapeType.line, { x: 3.5, y: 3.6, w: 3.0, h: 0, line: { color: "FFFFFF", width: 4 } });
        slideObj.addText("Edu-Gen Professional Taqdimot", { x: 0, y: 4.0, w: "100%", h: 0.5, fontSize: 18, color: "FFFFFF", align: "center", fontFace: "Arial", italic: true });
        
      } else if (slide.layoutType === "comparison" && slide.comparisonData) {
        slideObj.addText(slide.title, { x: 0.5, y: 0.2, w: "90%", h: 0.8, fontSize: 32, bold: true, color: "FFFFFF", align: "left", fontFace: "Arial" });
        
        // Left Column
        slideObj.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.5, w: 4.2, h: 4.0, fill: { color: "FFFFFF", transparency: 85 } });
        slideObj.addText(slide.comparisonData.leftTitle, { x: 0.6, y: 1.6, w: 4.0, h: 0.5, fontSize: 20, bold: true, color: "1E293B", align: "center" });
        const leftText = slide.comparisonData.left.map((t: string) => "• " + t).join("\n");
        slideObj.addText(leftText, { x: 0.7, y: 2.2, w: 3.8, h: 3.0, fontSize: 16, color: "334155", valign: "top" });

        // Right Column
        slideObj.addShape(pptx.ShapeType.roundRect, { x: 5.3, y: 1.5, w: 4.2, h: 4.0, fill: { color: "FFFFFF", transparency: 85 } });
        slideObj.addText(slide.comparisonData.rightTitle, { x: 5.4, y: 1.6, w: 4.0, h: 0.5, fontSize: 20, bold: true, color: "1E293B", align: "center" });
        const rightText = slide.comparisonData.right.map((t: string) => "• " + t).join("\n");
        slideObj.addText(rightText, { x: 5.5, y: 2.2, w: 3.8, h: 3.0, fontSize: 16, color: "334155", valign: "top" });

      } else if (slide.layoutType === "statistics_highlight" && slide.statValue) {
        slideObj.addText(slide.title, { x: 0.5, y: 0.2, w: "90%", h: 0.8, fontSize: 32, bold: true, color: "FFFFFF", align: "left", fontFace: "Arial" });
        slideObj.addText(slide.statValue, { x: 0, y: 2.2, w: "100%", h: 1.5, fontSize: 96, bold: true, color: "FFFFFF", align: "center" });
        slideObj.addText(slide.statDesc || "", { x: 0, y: 3.8, w: "100%", h: 0.8, fontSize: 24, color: "FFFFFF", align: "center", italic: true });
        
      } else if (slide.layoutType === "process_diagram" && slide.diagramSteps) {
        slideObj.addText(slide.title, { x: 0.5, y: 0.2, w: "90%", h: 0.8, fontSize: 32, bold: true, color: "FFFFFF", align: "left", fontFace: "Arial" });
        const stepCount = slide.diagramSteps.length;
        const boxWidth = 8.0 / stepCount;
        for(let j=0; j<stepCount; j++) {
          const xPos = 0.5 + (j * boxWidth);
          slideObj.addShape(pptx.ShapeType.roundRect, { x: xPos, y: 1.5, w: boxWidth - 0.2, h: 1.2, fill: { color: "FFFFFF", transparency: 20 }, line: { color: "FFFFFF", width: 1 } });
          slideObj.addText(slide.diagramSteps[j], { x: xPos, y: 1.5, w: boxWidth - 0.2, h: 1.2, fontSize: 16, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial" });
          if (j < stepCount - 1) slideObj.addShape(pptx.ShapeType.rightArrow, { x: xPos + boxWidth - 0.2, y: 1.9, w: 0.2, h: 0.3, fill: { color: "FFFFFF" } });
        }
        const textContent = slide.content.replace(/!\[.*?\]\(.*?\)/g, "").replace(/\*\*/g, "").replace(/^#+\s/gm, "").replace(/^-\s/gm, "• ");
        slideObj.addText(textContent, { x: 0.5, y: 3.0, w: "90%", h: 3.5, fontSize: 20, color: "FFFFFF", valign: "top", fontFace: "Arial", lineSpacing: 32 });

      } else if (slide.layoutType === "3d_illustration" && slide.imagePrompt) {
        slideObj.addText(slide.title, { x: 0.5, y: 0.2, w: "90%", h: 0.8, fontSize: 32, bold: true, color: "FFFFFF", align: "left", fontFace: "Arial" });
        const textContent = slide.content.replace(/!\[.*?\]\(.*?\)/g, "").replace(/\*\*/g, "").replace(/^#+\s/gm, "").replace(/^-\s/gm, "• ");
        slideObj.addText(textContent, { x: 0.5, y: 1.5, w: "50%", h: 4.5, fontSize: 18, color: "FFFFFF", valign: "top", fontFace: "Arial", lineSpacing: 32 });
        const seed = Math.floor(Math.random() * 9999);
        const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(slide.imagePrompt + ", 3d isometric render, minimalist illustration on white background, high quality")}?model=flux&width=800&height=800&nologo=true&seed=${seed}`;
        try {
          const resp = await fetch(imgUrl);
          const blob = await resp.blob();
          const base64 = await new Promise<string>((res) => { const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(blob); });
          slideObj.addImage({ data: base64, x: 5.8, y: 1.5, w: 4.0, h: 4.0, rounding: true });
        } catch (e) {
          slideObj.addShape(pptx.ShapeType.ellipse, { x: 6.2, y: 1.5, w: 3.5, h: 3.5, fill: { color: "FFFFFF", transparency: 80 }});
        }
      } else {
        slideObj.addText(slide.title, { x: 0.5, y: 0.2, w: "90%", h: 0.8, fontSize: 32, bold: true, color: "FFFFFF", align: "left", fontFace: "Arial" });
        slideObj.addShape(pptx.ShapeType.donut, { x: 8.0, y: -1.0, w: 4, h: 4, fill: { color: "FFFFFF", transparency: 90 } });
        const textContent = slide.content.replace(/!\[.*?\]\(.*?\)/g, "").replace(/\*\*/g, "").replace(/^#+\s/gm, "").replace(/^-\s/gm, "• ");
        slideObj.addText(textContent, { x: 0.5, y: 1.5, w: "70%", h: 4.5, fontSize: 22, color: "FFFFFF", valign: "top", fontFace: "Arial", lineSpacing: 32 });
      }
      
      slideObj.addNotes(slide.speakerNotes);
    }
    
    pptx.writeFile({ fileName: `${item.title}_EduGen.pptx` });
    setExporting(false);
  };

  // PDF Testlar yuklab olish
  const downloadPDF = (item: Resource) => {
    let testData = [];
    try {
      testData = JSON.parse(item.content);
    } catch {
      alert("Test kontenti xato yozilgan.");
      return;
    }

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("EDUGEN TEST TIZIMI", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Mavzu: ${item.title}`, 20, 35);
    doc.text(`Sana: ${new Date().toLocaleDateString()}`, 150, 35);
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);

    let yPos = 55;
    testData.forEach((test: any, index: number) => {
      if (yPos > 260) { doc.addPage(); yPos = 20; }
      doc.setFont("helvetica", "bold");
      const questionLines = doc.splitTextToSize(`${index + 1}. ${test.question}`, 170);
      doc.text(questionLines, 20, yPos);
      yPos += (questionLines.length * 6) + 2;
      doc.setFont("helvetica", "normal");
      test.options.forEach((opt: string, oIdx: number) => {
        const prefix = String.fromCharCode(65 + oIdx) + ") ";
        const optLines = doc.splitTextToSize(`${prefix}${opt}`, 160);
        doc.text(optLines, 30, yPos);
        yPos += optLines.length * 6;
      });
      yPos += 8;
    });
    doc.save(`${item.title}_Testlar.pdf`);
  };

  // Test Javobini Tanlash
  const handleSelectAnswer = (qIdx: number, opt: string) => {
    if (testSubmitted) return;
    setTestAnswers(prev => ({ ...prev, [qIdx]: opt }));
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen flex flex-col overflow-x-hidden relative">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-10 left-0 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      {/* Header and Tab Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 shrink-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
             <Globe className="text-blue-600 dark:text-blue-500" /> {activeTab === "community" ? t.feedTitle : t.myLibrary}
          </h1>
          <p className="text-slate-500 text-sm mt-2">{t.feedDesc}</p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
          <button 
            onClick={() => setActiveTab("community")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "community" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-500 dark:text-slate-400 hover:text-slate-800"}`}
          >
            <Globe size={16} /> Hamjamiyat ishlari
          </button>
          <button 
            onClick={() => setActiveTab("library")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "library" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-500 dark:text-slate-400 hover:text-slate-800"}`}
          >
            <FolderHeart size={16} /> Mening kutubxonam
          </button>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl p-4 rounded-[24px] border border-slate-200/50 dark:border-slate-800/50 shadow-sm mb-8">
        
        {/* Type Buttons */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {[
            { id: "all", label: "Barchasi" },
            { id: "slide", label: "Slaydlar" },
            { id: "test", label: "Testlar" },
            { id: "image", label: "Rasmlar" },
            { id: "video", label: "Storyboardlar" }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedType === type.id ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-800 hover:bg-slate-50"}`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80 group">
          <input
            type="text"
            placeholder="Mavzuni qidirish..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl outline-none text-xs font-medium focus:ring-2 ring-blue-500 transition-all text-slate-700 dark:text-slate-200"
          />
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
      </div>

      {/* Resources Feed Content */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
          <p className="mt-4 font-bold text-slate-500 dark:text-slate-400">{t.loading}</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="flex-1 bg-white/40 dark:bg-slate-800/30 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-[32px] py-24 px-6 text-center shadow-inner flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
            <HelpCircle size={36} className="text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.noResources}</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">{t.noResourcesDesc}</p>
        </div>
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1"
        >
          <AnimatePresence mode="popLayout">
            {filteredResources.map(item => {
              // Har bir resurs turiga mos ranglar va ikonkalar
              const isSlide = item.type === "slide";
              const isTest = item.type === "test";
              const isImage = item.type === "image";
              
              let typeLabel = "Resurs";
              let typeColor = "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50";
              let TypeIcon = Presentation;
              
              if (isSlide) {
                typeLabel = "Slayd taqdimot";
                typeColor = "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50";
                TypeIcon = Presentation;
              } else if (isTest) {
                typeLabel = "Test savollari";
                typeColor = "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50";
                TypeIcon = FileText;
              } else if (isImage) {
                typeLabel = "Sun'iy rasm";
                typeColor = "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-100 dark:border-orange-800/50";
                TypeIcon = ImageIcon;
              }

              // Slayd soni yoki savol sonini aniqlash
              let countInfo = "";
              try {
                if (isSlide) {
                  const data = JSON.parse(item.content);
                  countInfo = `${data.length} slayd`;
                } else if (isTest) {
                  const data = JSON.parse(item.content);
                  countInfo = `${data.length} ta savol`;
                }
              } catch {}

              return (
                <motion.div
                  key={item.id}
                  layoutId={`card-${item.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setPreviewItem(item)}
                  className="group bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-500/50 dark:hover:border-blue-500/40 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1"
                >
                  <div>
                    {/* Card Top Information */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${typeColor}`}>
                        {typeLabel}
                      </span>
                      {countInfo && (
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock size={10} /> {countInfo}
                        </span>
                      )}
                    </div>

                    {/* Card Visual Thumbnail */}
                    {isImage ? (() => {
                      let imageUrl = item.content;
                      let imageMeta: any = null;
                      try {
                        if (item.content.trim().startsWith("{")) {
                          imageMeta = JSON.parse(item.content);
                          imageUrl = imageMeta.imageUrl || item.content;
                        }
                      } catch (e) {}

                      return (
                        <div className="w-full h-40 rounded-2xl overflow-hidden mb-4 border border-slate-100 dark:border-slate-700 relative bg-slate-50 dark:bg-slate-900">
                          <img 
                            src={imageUrl} 
                            alt={item.title} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          {imageMeta && imageMeta.subject && (
                            <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {imageMeta.subject}
                            </span>
                          )}
                          {imageMeta && imageMeta.evaluation?.pedagogicalEvaluation?.overallScorePercentage && (
                            <span className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                              ★ {imageMeta.evaluation.pedagogicalEvaluation.overallScorePercentage}%
                            </span>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 text-white text-[10px] font-bold">
                            Batafsil ko'rish
                          </div>
                        </div>
                      );
                    })() : (
                      <div className={cn(
                        "w-full h-40 rounded-2xl mb-4 relative flex flex-col justify-between p-4 overflow-hidden border transition-all duration-300",
                        isSlide 
                          ? "bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-100/50 dark:border-indigo-900/20" 
                          : "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-100/50 dark:border-emerald-900/20"
                      )}>
                        {/* Decorative blur lights */}
                        <div className={cn(
                          "absolute -right-6 -top-6 w-20 h-20 rounded-full blur-xl opacity-30 dark:opacity-20",
                          isSlide ? "bg-indigo-500" : "bg-emerald-500"
                        )} />
                        
                        <div className="flex justify-between items-start z-10">
                          <div className={cn(
                            "p-2.5 rounded-xl border",
                            isSlide 
                              ? "bg-indigo-500/10 border-indigo-100/30 text-indigo-600 dark:text-indigo-400" 
                              : "bg-emerald-500/10 border-emerald-100/30 text-emerald-600 dark:text-emerald-400"
                          )}>
                            <TypeIcon size={18} />
                          </div>
                        </div>
                        
                        <div className="z-10 mt-auto">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">
                            {isSlide ? "Taqdimot materiali" : "Bilim testi"}
                          </span>
                          <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                            {countInfo}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug mb-1">
                      {item.title}
                    </h3>
                    
                    {/* Prompt info */}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mb-4 font-semibold italic">
                      "{item.prompt}"
                    </p>
                  </div>

                  <div>
                    {/* Card Bottom - Author and Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-auto">
                      
                      {/* Author */}
                      <div className="flex items-center gap-2 max-w-[60%]">
                        {item.author_photo ? (
                          <img src={item.author_photo} alt={item.author_name} className="w-6 h-6 rounded-full border border-slate-200" />
                        ) : (
                          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-[10px] font-black">
                            {item.author_name.charAt(0)}
                          </div>
                        )}
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 truncate">
                          {item.author_name}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1">
                        
                        {/* Share status / toggle button inside library */}
                        {activeTab === "library" && (
                          <button
                            onClick={(e) => handleToggleShare(item, e)}
                            title={item.is_public ? "Hamjamiyatga ulashilgan (Ommaviy)" : "Shaxsiy (Faqat sizga ko'rinadi)"}
                            className={`p-2 rounded-xl border transition-all hover:scale-105 ${item.is_public ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400" : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800"}`}
                          >
                            {item.is_public ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>
                        )}

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewItem(item);
                          }}
                          className="p-2 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Eye size={14} />
                        </button>

                        {activeTab === "library" && (
                          <button
                            onClick={(e) => handleDelete(item, e)}
                            className="p-2 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* INTERACTIVE PREVIEW MODAL */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Modal backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePreview}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            />

            {/* Modal Content Box */}
            <motion.div
              layoutId={`card-${previewItem.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 w-full max-w-5xl shadow-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
            >
              
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    {previewItem.type === "slide" && <Presentation size={18} />}
                    {previewItem.type === "test" && <FileText size={18} />}
                    {previewItem.type === "image" && <ImageIcon size={18} />}
                  </div>
                  <div>
                    <h2 className="text-sm md:text-base font-black text-slate-800 dark:text-slate-100 truncate max-w-[280px] md:max-w-md">
                      {previewItem.title}
                    </h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                      Muallif: {previewItem.author_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  
                  {/* PPTX or PDF download buttons depending on content */}
                  {previewItem.type === "slide" && (
                    <button
                      onClick={() => downloadPPTX(previewItem)}
                      disabled={exporting}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-colors"
                    >
                      {exporting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Download size={14} />}
                      PPTX Yuklash
                    </button>
                  )}

                  {previewItem.type === "test" && (
                    <button
                      onClick={() => downloadPDF(previewItem)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-colors"
                    >
                      <Download size={14} /> PDF Yuklash
                    </button>
                  )}

                  {/* Share button in My Library */}
                  {activeTab === "library" && (
                    <button
                      onClick={(e) => handleToggleShare(previewItem, e)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${previewItem.is_public ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/50" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      <Share2 size={14} />
                      {previewItem.is_public ? "Ulashilgan" : "Hamjamiyatga chiqarish"}
                    </button>
                  )}

                  <button 
                    onClick={closePreview}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body (Responsive and Interactive Content Viewer) */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 min-h-0 bg-slate-50/20 dark:bg-slate-900/20">
                
                {/* 1. SLIDE VIEWER */}
                {previewItem.type === "slide" && (() => {
                  let slides: any[] = [];
                  try {
                    slides = JSON.parse(previewItem.content);
                  } catch {
                    return <p className="text-red-500 font-bold">Taqdimot kontentini o'qib bo'lmadi.</p>;
                  }
                  
                  const activeSlide = slides[slideIdx];
                  if (!activeSlide) return null;
                  
                  const gradient = colorGradients[activeSlide.colorScheme] || colorGradients.blue;

                  return (
                    <div className="flex flex-col gap-6 h-full max-w-4xl mx-auto">
                      {/* Interactive slide screen */}
                      <div className={`aspect-[16/9] w-full rounded-3xl bg-gradient-to-br ${gradient} p-8 md:p-12 flex flex-col justify-center shadow-2xl relative overflow-hidden border border-white/10 select-none`}>
                        {/* Decorative circle shapes */}
                        <div className="absolute top-[-20%] right-[-10%] w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-60 h-60 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>

                        <div className="relative z-10 h-full flex flex-col justify-center">
                          {activeSlide.layoutType === "intro_title" ? (
                            <div className="text-center">
                              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 drop-shadow-2xl">{activeSlide.title}</h2>
                              <div className="w-16 h-1 bg-white mx-auto mb-4"></div>
                              <p className="text-base text-white/80 italic">Edu-Gen Professional Taqdimot</p>
                            </div>
                          ) : activeSlide.layoutType === "comparison" && activeSlide.comparisonData ? (
                            <div className="h-full flex flex-col justify-center">
                               <h2 className="text-2xl md:text-3xl font-black text-white mb-6 drop-shadow-md">{activeSlide.title}</h2>
                               <div className="grid grid-cols-2 gap-4 flex-1 items-stretch">
                                  <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/20 flex flex-col justify-center">
                                     <h3 className="text-base font-bold text-white mb-3 text-center border-b border-white/10 pb-1.5">{activeSlide.comparisonData.leftTitle}</h3>
                                     <ul className="space-y-1.5 text-white/90">
                                        {activeSlide.comparisonData.left.map((item: string, idx: number) => (
                                          <li key={idx} className="flex items-start gap-1.5 text-xs"><CheckCircle size={14} className="shrink-0 mt-0.5" /> {item}</li>
                                        ))}
                                     </ul>
                                  </div>
                                  <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/20 flex flex-col justify-center">
                                     <h3 className="text-base font-bold text-white mb-3 text-center border-b border-white/10 pb-1.5">{activeSlide.comparisonData.rightTitle}</h3>
                                     <ul className="space-y-1.5 text-white/90">
                                        {activeSlide.comparisonData.right.map((item: string, idx: number) => (
                                          <li key={idx} className="flex items-start gap-1.5 text-xs"><CheckCircle size={14} className="shrink-0 mt-0.5" /> {item}</li>
                                        ))}
                                     </ul>
                                  </div>
                               </div>
                            </div>
                          ) : activeSlide.layoutType === "statistics_highlight" && activeSlide.statValue ? (
                            <div className="text-center">
                               <h2 className="text-xl font-black text-white mb-6 opacity-80">{activeSlide.title}</h2>
                               <div className="text-6xl md:text-8xl font-black text-white mb-4 drop-shadow-2xl leading-none">{activeSlide.statValue}</div>
                               <p className="text-lg md:text-xl text-white/90 font-medium italic">{activeSlide.statDesc}</p>
                            </div>
                          ) : (
                            <>
                              <h2 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight drop-shadow-md">{activeSlide.title}</h2>
                              {activeSlide.layoutType === "process_diagram" && activeSlide.diagramSteps && (
                                <div className="mb-4 flex flex-wrap gap-2.5">
                                  {activeSlide.diagramSteps.map((step: string, idx: number) => (
                                    <div key={idx} className="flex-1 min-w-[100px] bg-white/20 backdrop-blur-md p-3 rounded-xl flex items-center justify-center text-center font-bold text-xs text-white border border-white/30">
                                      {step}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex flex-col gap-4 flex-1">
                                <div className="prose prose-sm prose-invert max-w-none text-white/90 text-xs md:text-sm">
                                  <Markdown>{Array.isArray(activeSlide.content) ? activeSlide.content.join("\n") : String(activeSlide.content)}</Markdown>
                                </div>
                                {activeSlide.layoutType === "3d_illustration" && activeSlide.imagePrompt && (
                                  <div className="w-full h-32 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 p-2 text-white/60 text-xs font-medium gap-2">
                                     <Sparkles size={16} /> 3D Rasm generatsiya ko'rinishi
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Notes & Controls bar */}
                      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                        <div className="flex-1 pr-6">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Ma'ruzachi nutqi matni</span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-3">{activeSlide.speakerNotes || "Izohlar yo'q."}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-black text-slate-400">
                            {slideIdx + 1} / {slides.length}
                          </span>
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => setSlideIdx(p => Math.max(0, p - 1))}
                              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-slate-600 dark:text-slate-200 transition-colors"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button 
                              onClick={() => setSlideIdx(p => Math.min(slides.length - 1, p + 1))}
                              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-slate-600 dark:text-slate-200 transition-colors"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. TEST VIEWER */}
                {previewItem.type === "test" && (() => {
                  let tests: any[] = [];
                  try {
                    tests = JSON.parse(previewItem.content);
                  } catch {
                    return <p className="text-red-500 font-bold">Test kontentini o'qib bo'lmadi.</p>;
                  }

                  let score = 0;
                  if (testSubmitted) {
                    tests.forEach((t: any, idx: number) => {
                      if (testAnswers[idx] === t.correctAnswer) score++;
                    });
                  }

                  return (
                    <div className="max-w-3xl mx-auto flex flex-col gap-6">
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-5 rounded-2xl flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Interaktiv Bilim Testi</h4>
                          <p className="text-xs text-slate-500 mt-1">Savollarga javob bering va bilimingizni tahlil qiling.</p>
                        </div>
                        {testSubmitted && (
                          <div className="bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 animate-bounce">
                            Natija: {score} / {tests.length}
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        {tests.map((test: any, idx: number) => {
                          const isCorrect = testAnswers[idx] === test.correctAnswer;
                          return (
                            <div key={idx} className={`p-5 rounded-2xl border transition-all ${testSubmitted ? (isCorrect ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-800/40" : "bg-rose-50/50 border-rose-200 dark:bg-rose-950/10 dark:border-rose-800/40") : "bg-white dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50"}`}>
                              <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 mb-3">{idx + 1}. {test.question}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {test.options.map((opt: string) => {
                                  const isSelected = testAnswers[idx] === opt;
                                  const isRightOpt = opt === test.correctAnswer;
                                  
                                  let btnStyle = "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-300";
                                  
                                  if (isSelected) {
                                    btnStyle = "bg-blue-600 border-blue-600 text-white";
                                  }
                                  
                                  if (testSubmitted) {
                                    if (isRightOpt) {
                                      btnStyle = "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20";
                                    } else if (isSelected) {
                                      btnStyle = "bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-500/20";
                                    } else {
                                      btnStyle = "opacity-50 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-500";
                                    }
                                  }

                                  return (
                                    <button
                                      key={opt}
                                      disabled={testSubmitted}
                                      onClick={() => handleSelectAnswer(idx, opt)}
                                      className={`p-3.5 text-left rounded-xl border text-xs font-semibold transition-all ${btnStyle} ${!testSubmitted && "hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-98"}`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {!testSubmitted ? (
                        <button 
                          onClick={() => setTestSubmitted(true)}
                          disabled={Object.keys(testAnswers).length < tests.length}
                          className="w-full py-4 bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all flex justify-center items-center gap-2 cursor-pointer"
                        >
                          <Play size={16} /> Testni yakunlash va tekshirish
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setTestSubmitted(false);
                            setTestAnswers({});
                          }}
                          className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all flex justify-center items-center gap-2 cursor-pointer"
                        >
                          Qayta yechish
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* 3. IMAGE VIEWER */}
                {previewItem.type === "image" && (() => {
                  let imageUrl = previewItem.content;
                  let imageMeta: any = null;
                  try {
                    if (previewItem.content.trim().startsWith("{")) {
                      imageMeta = JSON.parse(previewItem.content);
                      imageUrl = imageMeta.imageUrl;
                    }
                  } catch (e) {}

                  return (
                    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                      <div className="w-full max-h-[50vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                        <img 
                          src={imageUrl} 
                          alt={previewItem.title} 
                          referrerPolicy="no-referrer"
                          className="w-full max-h-[50vh] object-contain"
                        />
                      </div>
                                 {imageMeta && imageMeta.evaluation && (
                        <div className="bg-white dark:bg-slate-850 border border-slate-200/50 dark:border-slate-700/50 p-6 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                              <span>AI Pedagogik Baholash:</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-[10px]">
                                Umumiy moslik: {imageMeta.evaluation.pedagogicalEvaluation?.overallScorePercentage || 92}%
                              </span>
                            </h4>
                            <div className="space-y-3.5">
                              {[
                                { label: "Mavzuga moslik", score: imageMeta.evaluation.pedagogicalEvaluation?.subjectAlignment || 5 },
                                { label: "Ilmiy aniqlik", score: imageMeta.evaluation.pedagogicalEvaluation?.scientificAccuracy || 5 },
                                { label: "Tushunarlilik", score: imageMeta.evaluation.pedagogicalEvaluation?.clarity || 4 },
                                { label: "Yoshga muvofiqlik", score: imageMeta.evaluation.pedagogicalEvaluation?.ageAppropriateness || 5 }
                              ].map((scoreItem, idx) => (
                                <div key={idx} className="flex flex-col gap-1">
                                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <span>{scoreItem.label}</span>
                                    <span>{scoreItem.score} / 5</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(scoreItem.score / 5) * 100}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                              <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span> Darsda Qo'llash Metodikasi
                            </h4>
                            <div className="space-y-3 text-slate-600 dark:text-slate-400">
                              <div>
                                <span className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider block">Pedagogik maqsad:</span>
                                <p className="font-medium text-slate-800 dark:text-slate-200">{imageMeta.evaluation.pedagogicalGoal || "Mavzuni vizual o'rganish."}</p>
                              </div>
                              <div>
                                <span className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider block">Dars bosqichi & Metod:</span>
                                <p className="font-bold text-blue-600 dark:text-blue-400">{(imageMeta.evaluation.lessonIntegration?.stage || "Mavzuni mustahkamlash")} • {(imageMeta.evaluation.lessonIntegration?.method || "Suhbat rejasi")}</p>
                              </div>
                              <div>
                                <span className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider block">Yo'riqnoma:</span>
                                <p className="italic font-medium text-slate-700 dark:text-slate-300">"{(imageMeta.evaluation.lessonIntegration?.teacherInstructions || "Tasvirni o'quvchilar bilan birgalikda muhokama qiling.")}"</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 p-5 rounded-2xl w-full flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                        <div className="flex-1">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Mavzu va Fan ma'lumoti</span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                            {previewItem.prompt} {imageMeta && `| Fan: ${imageMeta.subject} | Yosh guruhi: ${imageMeta.ageGroup}`}
                          </p>
                        </div>
                        <div className="shrink-0 flex gap-2">
                          <a 
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg"
                          >
                            <ExternalLink size={14} /> To'liq rasm (HD)
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. STORYBOARD VIEWER */}
                {previewItem.type === "video" && (() => {
                  let storyboardMeta: any = null;
                  try {
                    storyboardMeta = JSON.parse(previewItem.content);
                  } catch (e) {
                    return <p className="text-red-500 font-bold">Storyboard kontentini o'qib bo'lmadi.</p>;
                  }

                  const storyboardData: StoryboardData = storyboardMeta.storyboard;
                  const frameImagesDict = storyboardMeta.frameImages || {};
                  
                  if (!storyboardData) return null;

                  const frames = storyboardData.frames || [];
                  const currentFrameIdx = Math.min(slideIdx, frames.length - 1);
                  const activeFrame = frames[currentFrameIdx];
                  if (!activeFrame) return null;

                  const speakCurrentText = () => {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(activeFrame.scriptText);
                    if (language === "ru") utterance.lang = "ru-RU";
                    else if (language === "en") utterance.lang = "en-US";
                    else utterance.lang = "uz-UZ";

                    utterance.onend = () => setIsSpeaking(false);
                    utterance.onerror = () => setIsSpeaking(false);
                    setIsSpeaking(true);
                    window.speechSynthesis.speak(utterance);
                  };

                  const stopSpeakingLocal = () => {
                    window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                  };

                  const downloadStoryboardPDF = async () => {
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

                    try {
                      const doc = new jsPDF();
                      doc.setFont("helvetica", "bold");
                      doc.setFontSize(22);
                      doc.text("EDUGEN ANIMATSION STORYBOARD", 105, 25, { align: "center" });
                      doc.setFontSize(14);
                      doc.text(storyboardData.animationTitle.toUpperCase(), 105, 36, { align: "center" });
                      doc.line(20, 44, 190, 44);
                      
                      doc.setFontSize(10);
                      doc.setFont("helvetica", "normal");
                      doc.text(`Mavzu: ${previewItem.title}`, 20, 52);
                      doc.text(`Sana: ${new Date().toLocaleDateString()}`, 150, 52);

                      doc.setFillColor(245, 247, 250);
                      doc.roundedRect(20, 60, 170, 25, 3, 3, "F");
                      doc.setFont("helvetica", "bold");
                      doc.text("Pedagogik Maqsad:", 24, 67);
                      doc.setFont("helvetica", "normal");
                      const goalLines = doc.splitTextToSize(storyboardData.pedagogicalGoal, 160);
                      doc.text(goalLines, 24, 73);

                      doc.setFont("helvetica", "bold");
                      doc.text("AI Pedagogik Baholar:", 20, 97);
                      doc.setFont("helvetica", "normal");
                      doc.text(`• Fanga mosligi: ${(storyboardData.pedagogicalEvaluation?.subjectAlignment || 5)}/5`, 25, 105);
                      doc.text(`• Ilmiy aniqligi: ${(storyboardData.pedagogicalEvaluation?.scientificAccuracy || 5)}/5`, 25, 112);
                      doc.text(`• Tushunarliligi: ${(storyboardData.pedagogicalEvaluation?.clarity || 4)}/5`, 25, 119);
                      doc.text(`• Yosh mosligi: ${(storyboardData.pedagogicalEvaluation?.ageAppropriateness || 5)}/5`, 25, 126);
                      doc.setFont("helvetica", "bold");
                      doc.text(`Umumiy Muvofiqlik: ${(storyboardData.pedagogicalEvaluation?.overallScorePercentage || 92)}%`, 25, 136);

                      doc.text("Metodik Tavsiyalar:", 20, 150);
                      doc.setFillColor(240, 244, 255);
                      doc.roundedRect(20, 154, 170, 40, 3, 3, "F");
                      doc.setFontSize(9);
                      doc.text("DARS BOSQICHI: " + (storyboardData.lessonIntegration?.stage || "Mavzuni mustahkamlash"), 24, 161);
                      doc.text("METODIK TAVSIYA: " + (storyboardData.lessonIntegration?.method || "Suhbat rejasi"), 24, 169);
                      const instLines = doc.splitTextToSize("YO'RIQNOMA: " + (storyboardData.lessonIntegration?.teacherInstructions || "Tasvirni o'quvchilar bilan birgalikda muhokama qiling."), 160);
                      doc.text(instLines, 24, 177);

                      for (let i = 0; i < frames.length; i++) {
                        const frame = frames[i];
                        doc.addPage();
                        doc.setFontSize(16);
                        doc.setFont("helvetica", "bold");
                        doc.text(`Kadr #${frame.frameNumber}: ${frame.title}`, 20, 20);
                        doc.line(20, 25, 190, 25);

                        const frameImg = frameImagesDict[i];
                        if (frameImg) {
                          try {
                            const base64 = await getImgBase64(frameImg);
                             if (base64) doc.addImage(base64, "JPEG", 20, 30, 90, 90);
                             else doc.rect(20, 30, 90, 90);
                          } catch (e) {
                            doc.rect(20, 30, 90, 90);
                          }
                        } else {
                          doc.setFillColor(245, 245, 245);
                          doc.rect(20, 30, 90, 90, "F");
                        }

                        const xOffset = 118;
                        doc.setFontSize(11);
                        doc.setFont("helvetica", "bold");
                        doc.text("1. Ssenariy Matni (Ovozli):", xOffset, 34);
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(9);
                        const scriptLines = doc.splitTextToSize(frame.scriptText, 70);
                        doc.text(scriptLines, xOffset, 41);

                        const yPos1 = 41 + (scriptLines.length * 5) + 6;
                        doc.setFontSize(11);
                        doc.setFont("helvetica", "bold");
                        doc.text("2. Animatsiya Harakati:", xOffset, yPos1);
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(9);
                        const animLines = doc.splitTextToSize(frame.animationDescription, 70);
                        doc.text(animLines, xOffset, yPos1 + 7);

                        const yPos2 = yPos1 + 7 + (animLines.length * 5) + 6;
                        doc.setFontSize(11);
                        doc.setFont("helvetica", "bold");
                        doc.text("3. Pedagogik Qiymati:", xOffset, yPos2);
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(9);
                        const pedLines = doc.splitTextToSize(frame.pedagogicalValue, 70);
                        doc.text(pedLines, xOffset, yPos2 + 7);
                      }

                      doc.save(`${storyboardData.animationTitle.replace(/\s+/g, "_")}_dars_ishlanmasi.pdf`);
                    } catch (err) {
                      console.error("PDF yaratishda xato:", err);
                      alert("PDF yuklashda xatolik.");
                    }
                  };

                  return (
                    <div className="flex flex-col gap-6 max-w-4xl mx-auto h-full text-slate-800 dark:text-slate-205">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        <div className="bg-slate-950 rounded-[28px] overflow-hidden relative border border-slate-800 shadow-lg min-h-[300px] flex items-center justify-center aspect-square md:aspect-auto">
                          {frameImagesDict[currentFrameIdx] ? (
                            <img
                              src={frameImagesDict[currentFrameIdx]}
                              alt={`Kadr #${currentFrameIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="p-6 text-center text-slate-500 flex flex-col items-center gap-2">
                              <Sparkles size={24} className="text-slate-700 animate-pulse" />
                              <p className="text-[10px] text-slate-400 font-medium">Ushbu kadr uchun tasvir yaratilmagan</p>
                            </div>
                          )}
                          <span className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                            Kadr #{currentFrameIdx + 1}
                          </span>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[28px] border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex flex-col justify-between gap-4 text-xs">
                          <div className="space-y-4">
                            <div>
                              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Kadr Sarlavhasi:</span>
                              <h4 className="font-black text-slate-800 dark:text-slate-100">{activeFrame.title}</h4>
                            </div>

                            <div className="p-4 bg-pink-50/50 dark:bg-pink-950/20 border border-pink-100/50 dark:border-pink-900/20 rounded-xl">
                              <span className="text-[8px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest block mb-1 flex items-center gap-1 font-bold">
                                <Volume2 size={10} /> Ssenariy / Ovoz Nutqi:
                              </span>
                              <p className="font-medium text-slate-800 dark:text-slate-200 italic leading-relaxed">
                                "{activeFrame.scriptText}"
                              </p>
                            </div>

                            <div className="space-y-2 text-[10px] text-slate-500 dark:text-slate-400">
                              <p><strong className="text-slate-600 dark:text-slate-300">🎬 Animatsiya Harakati:</strong> {activeFrame.animationDescription}</p>
                              <p><strong className="text-slate-600 dark:text-slate-300">💡 Pedagogik Qiymati:</strong> {activeFrame.pedagogicalValue}</p>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 dark:border-slate-750 flex items-center justify-between">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (isSpeaking) stopSpeakingLocal();
                                  else speakCurrentText();
                                }}
                                className={`px-4 py-2 rounded-xl font-black text-[10px] flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isSpeaking 
                                    ? "bg-amber-600 text-white animate-pulse" 
                                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200"
                                }`}
                              >
                                <Volume2 size={12} />
                                {isSpeaking ? "To'xtatish" : "Ovozli tinglash"}
                              </button>

                              <button
                                onClick={downloadStoryboardPDF}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] flex items-center gap-1.5 cursor-pointer"
                              >
                                <Download size={12} /> PDF yuklash
                              </button>
                            </div>

                            <div className="flex gap-1 items-center">
                              <span className="text-[10px] font-black text-slate-400 mr-2">{currentFrameIdx + 1} / {frames.length}</span>
                              <button
                                onClick={() => {
                                  if (currentFrameIdx > 0) {
                                    setSlideIdx(currentFrameIdx - 1);
                                    stopSpeakingLocal();
                                  }
                                }}
                                disabled={currentFrameIdx === 0}
                                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-355 rounded-xl"
                              >
                                <ChevronLeft size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  if (currentFrameIdx < frames.length - 1) {
                                    setSlideIdx(currentFrameIdx + 1);
                                    stopSpeakingLocal();
                                  }
                                }}
                                disabled={currentFrameIdx === frames.length - 1}
                                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-355 rounded-xl"
                              >
                                <ChevronRight size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-2">Ssenariy Kadrlari:</span>
                        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                          {frames.map((f, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSlideIdx(idx);
                                stopSpeakingLocal();
                              }}
                              className={`w-8 h-8 rounded-lg font-black text-xs transition-all flex items-center justify-center shrink-0 border ${
                                currentFrameIdx === idx 
                                  ? "bg-pink-600 border-pink-600 text-white shadow-md shadow-pink-500/25 scale-105" 
                                  : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                              }`}
                            >
                              {f.frameNumber}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[28px] border border-slate-200/60 dark:border-slate-700/60 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-3">
                          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <GraduationCap size={14} className="text-pink-500" /> Metodik Dars Ishlanmasi:
                          </h4>
                          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                            <div>
                              <span className="font-bold text-[9px] text-slate-400 dark:text-slate-500 uppercase block">Dars Bosqichi:</span>
                              <p className="font-bold text-blue-600 dark:text-blue-400">{storyboardData.lessonIntegration?.stage}</p>
                            </div>
                            <div>
                              <span className="font-bold text-[9px] text-slate-400 dark:text-slate-500 uppercase block">Tavsiya qilinadigan Metod:</span>
                              <p className="font-bold text-indigo-600 dark:text-indigo-400">{storyboardData.lessonIntegration?.method}</p>
                            </div>
                            <div>
                              <span className="font-bold text-[9px] text-slate-400 dark:text-slate-500 uppercase block">O'qituvchiga Yo'riqnoma:</span>
                              <p className="italic font-medium text-slate-700 dark:text-slate-350">"{storyboardData.lessonIntegration?.teacherInstructions}"</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            <span>AI Baholash Ko'rsatkichlari:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-[9px]">
                              Muvofiqlik: {storyboardData.pedagogicalEvaluation?.overallScorePercentage}%
                            </span>
                          </h4>
                          <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                            {[
                              { label: "Mavzuga va fanga mosligi", score: storyboardData.pedagogicalEvaluation?.subjectAlignment },
                              { label: "Ilmiy va vizual aniqligi", score: storyboardData.pedagogicalEvaluation?.scientificAccuracy },
                              { label: "O'quvchiga tushunarliligi", score: storyboardData.pedagogicalEvaluation?.clarity },
                              { label: "Yoshga muvofiqligi", score: storyboardData.pedagogicalEvaluation?.ageAppropriateness }
                            ].map((evalIt, i) => (
                              <div key={i} className="flex flex-col gap-1">
                                <div className="flex justify-between font-bold text-[10px]">
                                  <span>{evalIt.label}</span>
                                  <span>{evalIt.score} / 5</span>
                                </div>
                                <div className="w-full h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(evalIt.score / 5) * 100}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
