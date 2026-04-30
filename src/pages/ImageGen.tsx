import { useState } from "react";
import { ImageIcon, Wand2, Loader2, Download, Share2 } from "lucide-react";
import { generateEducationalImage } from "../lib/gemini";
import { saveResource } from "../lib/db";
import { useAppContext } from "../lib/AppContext";

export default function ImageGen() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [resourceId, setResourceId] = useState<string | number | null>(null);
  const [isShared, setIsShared] = useState(false);
  const { t } = useAppContext();

  // Tasvir yaratish mantiqi
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setImgLoading(true);
    setImage(null);
    setImgError(false);
    setResourceId(null);
    setIsShared(false);

    let generatedUrl = "";
    try {
      generatedUrl = await generateEducationalImage(prompt);
      setImage(generatedUrl);
    } catch (e: any) {
      console.error("AI Tasvir yaratishda xato:", e);
      generatedUrl = `https://loremflickr.com/1024/768/${encodeURIComponent(prompt)}`;
      setImage(generatedUrl);
    } finally {
      setLoading(false);
    }

    // Django Backend-ga saqlash (bu alohida xatolik bo'lsa ham rasm qolaveradi)
    try {
      const id = await saveResource({
        type: "image",
        title: prompt.substring(0, 50) + (prompt.length > 50 ? "..." : ""),
        prompt: prompt,
        content: generatedUrl
      });
      setResourceId(id);
    } catch (dbErr) {
      console.error("Backend-ga saqlashda xato:", dbErr);
    }
  };

  // Hamjamiyatga ulashish
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
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <ImageIcon className="text-blue-600 dark:text-blue-400" /> {t.imageTitle}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">{t.imageDesc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Control Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">{t.whatImage}</label>
            <textarea
              rows={4}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={t.imagePlaceholder}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-shadow resize-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-600/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
              {loading ? t.generating : t.generateImage}
            </button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-3xl p-6 text-sm text-blue-800 dark:text-blue-200">
            <h4 className="font-bold mb-2 flex items-center gap-2">💡 {t.tipsTitle}</h4>
            <ul className="list-disc pl-4 space-y-1.5 opacity-90 marker:text-blue-400 dark:marker:text-blue-500">
              <li>{t.tip1}</li>
              <li>{t.tip2}</li>
              <li>{t.tip3}</li>
              <li>{t.tip4}</li>
            </ul>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="flex-1 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] bg-white dark:bg-slate-800 border text-center border-slate-200 dark:border-slate-700 rounded-3xl p-4 sm:p-8 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
            {(loading || imgLoading) && image && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm animate-in fade-in">
                <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg"></div>
                <p className="mt-4 font-medium text-blue-600 dark:text-blue-400">{t.generating}</p>
              </div>
            )}

            {loading && !image ? (
              <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-slate-500">
                <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg"></div>
                <p className="font-medium animate-pulse text-blue-600 dark:text-blue-400">{t.generating}</p>
              </div>
            ) : imgError ? (
              <div className="flex flex-col items-center gap-4 text-red-500">
                <p className="font-semibold text-center">Rasm yuklashda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.</p>
                <button onClick={handleGenerate} className="px-6 py-2 bg-blue-600 text-white rounded-xl">Qayta urinish</button>
              </div>
            ) : image ? (
              <div className="w-full relative group">
                <img
                  src={image}
                  alt="Generated"
                  referrerPolicy="no-referrer"
                  onLoad={() => setImgLoading(false)}
                  onError={() => {
                    setImgError(true);
                    setImgLoading(false);
                  }}
                  className={`w-full max-h-[600px] object-contain rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 transition-opacity duration-500 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
                />
                <div className="mt-4 flex items-center justify-between px-2 w-full max-w-2xl">
                  <div className="flex gap-3">
                    <a
                      href={image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2.5 text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all"
                    >
                      <Download size={14} /> Yuklab olish
                    </a>
                    
                    {resourceId && !isShared && (
                      <button
                        onClick={handleShare}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all animate-in fade-in slide-in-from-bottom-2"
                      >
                        <Share2 size={14} /> Hamjamiyatga chiqarish
                      </button>
                    )}

                    {isShared && (
                      <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Hamjamiyatga qo'shildi
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 dark:text-slate-500 max-w-sm flex flex-col items-center">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-100 dark:ring-slate-800">
                  <ImageIcon size={40} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="font-medium text-lg text-slate-600 dark:text-slate-400">{t.noImage}</p>
                <p className="text-sm mt-2 opacity-80">{t.noImageDesc}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          Ushbu platforma va AI modellari EduGen jamoasi tomonidan ta'limni rivojlantirish maqsadida yaratildi
        </p>
      </div>
    </div>
  );
}
