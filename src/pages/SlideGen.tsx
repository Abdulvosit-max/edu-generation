import { useState, useEffect } from "react";
import { Presentation, Save, Loader2, FileText, ChevronLeft, ChevronRight, Share2, Download } from "lucide-react";
import { generateEducationalSlides, SlideData } from "../lib/gemini";
import Markdown from "react-markdown";
import { auth } from "../lib/firebase";
// import { collection, addDoc, serverTimestamp } from "firebase/firestore"; // Removed
import { useAppContext } from "../lib/AppContext";
import pptxgen from "pptxgenjs";
import { useSearchParams } from "react-router-dom";

const SLIDE_GRADIENTS = [
  "from-red-500/90 to-orange-500/90",
  "from-blue-500/90 to-indigo-500/90",
  "from-emerald-500/90 to-teal-500/90",
  "from-purple-500/90 to-fuchsia-500/90",
  "from-rose-500/90 to-pink-500/90",
  "from-cyan-500/90 to-blue-500/90",
];

export default function SlideGen() {
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState<SlideData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sharing, setSharing] = useState(false);
  const { t } = useAppContext();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setTopic(q);
    }
  }, [searchParams]);

  const downloadPPT = async () => {
    if (!slides) return;
    const pptx = new pptxgen();
    
    setLoading(true); // Re-use loading to show progress
    
    for (const slide of slides) {
      let slideObj = pptx.addSlide();
      
      // Title
      slideObj.addText(slide.title, { 
        x: 0.5, y: 0.3, w: '90%', h: 0.8, 
        fontSize: 28, bold: true, color: '2D3748', 
        align: 'center', fontFace: 'Arial' 
      });

      // Clean content (remove markdown images for text box)
      const textContent = slide.content.replace(/!\[.*?\]\(.*?\)/g, '').replace(/\*/g, '').replace(/#/g, '');
      
      // Extract image URL
      const imgMatch = slide.content.match(/!\[.*?\]\((.*?)\)/);
      const imageUrl = imgMatch ? imgMatch[1] : null;

      if (imageUrl) {
        // Layout with image
        slideObj.addText(textContent, { 
          x: 0.5, y: 1.2, w: '55%', h: 4.5, 
          fontSize: 16, color: '4A5568', valign: 'top', fontFace: 'Arial' 
        });

        try {
          // Fetch image and convert to Base64
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          
          slideObj.addImage({ 
            data: base64Data, 
            x: 6.2, y: 1.2, w: 3.3, h: 4.0,
            rounding: true
          });
        } catch (e) {
          console.error("Image fetch failed", e);
        }
      } else {
        // Full width text layout
        slideObj.addText(textContent, { 
          x: 0.5, y: 1.2, w: '90%', h: 4.5, 
          fontSize: 18, color: '4A5568', valign: 'top', fontFace: 'Arial' 
        });
      }

      slideObj.addNotes(slide.speakerNotes);
    }
    
    setLoading(false);
    pptx.writeFile({ fileName: `${topic}_EduGen.pptx` });
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setSlides(null);
    setCurrentIdx(0);
    try {
      const resp = await generateEducationalSlides(topic);
      setSlides(resp);
    } catch(e: any) {
      console.error(e);
      alert(t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    alert("Firebase o'chirilgan.");
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
             <Presentation className="text-blue-600 dark:text-blue-400" /> {t.slideTitle}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{t.slideDesc}</p>
        </div>
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
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-shadow text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            
            <button 
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="animate-spin" /> : <FileText />}
              {loading ? t.slidePreparing : t.generateSlide}
            </button>
          </div>

          {slides && (
             <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/30 flex flex-col gap-4">
               <h3 className="font-bold text-blue-900 dark:text-blue-200">{t.totalSlides}: {slides.length}</h3>
               <button 
                  onClick={downloadPPT}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 flex items-center justify-center gap-2 rounded-xl transition-colors shadow-sm"
               >
                 <Download size={16} /> 
                 {t.downloadPPT}
               </button>
               {/* Share button removed */}
             </div>
          )}
        </div>

        {/* Presentation Area */}
        <div className="lg:col-span-8 flex flex-col min-h-[500px]">
          <div className="bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] bg-white dark:bg-slate-800 flex-1 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-10 flex flex-col relative overflow-hidden shadow-sm">
            {loading ? (
              <div className="m-auto flex flex-col items-center gap-4 text-blue-600 dark:text-blue-400">
                 <Loader2 size={48} className="animate-spin" />
                 <p className="font-medium">{t.slidePreparing}</p>
              </div>
            ) : slides ? (
              <>
                 <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-8">
                   Slide {currentIdx + 1} / {slides.length}
                 </div>
                 
                 <div className={`flex-1 flex flex-col justify-center w-full rounded-2xl bg-gradient-to-br ${SLIDE_GRADIENTS[currentIdx % SLIDE_GRADIENTS.length]} p-8 md:p-12 shadow-inner overflow-y-auto mb-6 text-white`}>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-8 tracking-tight leading-tight drop-shadow-md">
                       {slides[currentIdx].title}
                    </h2>
                    <div className="prose prose-lg prose-invert markdown-body prose-img:rounded-xl prose-img:shadow-lg prose-img:max-h-64 prose-img:object-cover prose-a:text-white max-w-none text-white/95">
                       <Markdown>{slides[currentIdx].content}</Markdown>
                    </div>
                 </div>

                 <div className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{t.speakerNotes}</div>
                    <p className="text-slate-600 dark:text-slate-400 italic text-sm font-medium">{slides[currentIdx].speakerNotes}</p>
                 </div>

                 <div className="absolute inset-y-0 left-0 flex items-center p-4">
                   <button 
                     onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
                     disabled={currentIdx === 0}
                     className="p-3 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-white/80 dark:disabled:hover:bg-slate-800/80 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-all backdrop-blur"
                   >
                     <ChevronLeft size={24} />
                   </button>
                 </div>
                 <div className="absolute inset-y-0 right-0 flex items-center p-4">
                   <button 
                     onClick={() => setCurrentIdx(p => Math.min(slides.length - 1, p + 1))}
                     disabled={currentIdx === slides.length - 1}
                     className="p-3 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-white/80 dark:disabled:hover:bg-slate-800/80 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-all backdrop-blur"
                   >
                     <ChevronRight size={24} />
                   </button>
                 </div>
              </>
            ) : (
              <div className="m-auto text-center max-w-sm">
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
