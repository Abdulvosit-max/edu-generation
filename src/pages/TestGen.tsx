import { useState, useEffect } from "react";
import { FileText, Loader2, Download, Search, CheckCircle, XCircle, Award, Share2, Lock } from "lucide-react";
import { generateEducationalTests, analyzeTestResults, TestData } from "../lib/gemini";
import { saveResource, togglePublic } from "../lib/db";
import { useAppContext } from "../lib/AppContext";
import jsPDF from "jspdf";
import { useSearchParams } from "react-router-dom";
import Markdown from "react-markdown";

/**
 * Test Generator Sahifasi
 */
export default function TestGen() {
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [tests, setTests] = useState<TestData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [testCount, setTestCount] = useState(10);
  const [teacherName, setTeacherName] = useState("");
  const [resourceId, setResourceId] = useState<string | number | null>(null);
  const [isShared, setIsShared] = useState(false);
  const { t } = useAppContext();

  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "error" }[]>([]);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setTopic(q);
  }, [searchParams]);

  // Test yaratish
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setTests(null);
    setUserAnswers({});
    setIsSubmitted(false);
    setAnalysis(null);
    setResourceId(null);
    setIsShared(false);
    try {
      const resp = await generateEducationalTests(topic, difficulty, testCount);
      setTests(resp);
      
      const id = await saveResource({
        type: "test",
        title: topic,
        prompt: topic,
        content: JSON.stringify(resp)
      });
      setResourceId(id);
    } catch (e: any) {
      showToast(e.message || t.errorOccurred || "Xatolik yuz berdi.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Hamjamiyatga ulashish
  const handleShare = async () => {
    if (!resourceId) return;
    try {
      await togglePublic(resourceId, true);
      setIsShared(true);
      showToast("Test hamjamiyatga ulashildi!");
    } catch (err) {
      showToast("Ulashishda xatolik yuz berdi.", "error");
    }
  };

  const handleOptionClick = (questionIndex: number, option: string) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [questionIndex]: option }));
  };

  const submitTest = async () => {
    if (!tests) return;
    setIsSubmitted(true);
    setAnalyzing(true);
    try {
      const resp = await analyzeTestResults(topic, difficulty, tests, userAnswers);
      setAnalysis(resp);
    } catch {
      setAnalysis("Xatolik: Tahlil qilib bo'lmadi.");
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadPDF = () => {
    if (!tests) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("EDUGEN TEST TIZIMI", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Mavzu: ${topic}`, 20, 35);
    doc.text(`Daraja: ${difficulty}`, 20, 42);
    if (teacherName.trim()) doc.text(`Ustoz: ${teacherName}`, 20, 49);
    doc.text(`Sana: ${new Date().toLocaleDateString()}`, 150, 35);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);

    let yPos = 65;
    tests.forEach((test, index) => {
      if (yPos > 260) { doc.addPage(); yPos = 20; }
      doc.setFont("helvetica", "bold");
      const questionLines = doc.splitTextToSize(`${index + 1}. ${test.question}`, 170);
      doc.text(questionLines, 20, yPos);
      yPos += (questionLines.length * 6) + 2;
      doc.setFont("helvetica", "normal");
      test.options.forEach((opt, oIdx) => {
        const prefix = String.fromCharCode(65 + oIdx) + ") ";
        const optLines = doc.splitTextToSize(`${prefix}${opt}`, 160);
        doc.text(optLines, 30, yPos);
        yPos += optLines.length * 6;
      });
      yPos += 8;
    });
    doc.save(`${topic}_Testlar.pdf`);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto h-full flex flex-col">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-2xl shadow-lg border text-xs font-black flex items-center gap-2 pointer-events-auto ${
              toast.type === "success"
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-rose-600 text-white border-rose-500"
            }`}
          >
            {toast.type === "success" ? "✓" : "✕"}
            {toast.msg}
          </div>
        ))}
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <FileText className="text-blue-600 dark:text-blue-400" /> {t.testTitle}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">{t.testDesc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <label className="block text-sm font-semibold mb-2">Test mavzusi</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Masalan: Botanika"
              className="w-full px-4 py-3 mb-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500"
            />
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="number" value={testCount} onChange={e => setTestCount(parseInt(e.target.value))} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500" />
              <input type="text" placeholder="Ustoz ismi" value={teacherName} onChange={e => setTeacherName(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500" />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Search />} {loading ? "Yaratilmoqda..." : "Yaratish"}
            </button>
          </div>

          {tests && (
            <div className="flex flex-col gap-3">
              <button onClick={downloadPDF} className="w-full bg-slate-800 dark:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
                <Download size={18} /> PDF yuklash
              </button>
              
              {resourceId && !isShared && (
                <button onClick={handleShare} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors">
                  <Share2 size={18} /> Hamjamiyatga chiqarish
                </button>
              )}
              
              {isShared && (
                <div className="w-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle size={18} /> Hamjamiyatga qo'shildi
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white dark:bg-slate-800 flex-1 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-10 overflow-y-auto">
            {!tests ? (
              <div className="m-auto text-center py-20">
                <FileText size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Hali test yaratilmadi.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {tests.map((test, index) => (
                   <div key={index} className="p-6 border border-slate-100 dark:border-slate-700 rounded-2xl">
                     <h3 className="font-bold mb-4">{index + 1}. {test.question}</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {test.options.map(opt => (
                         <button 
                           key={opt} 
                           onClick={() => handleOptionClick(index, opt)} 
                           className={`p-4 text-left rounded-xl border transition-colors font-medium ${
                             userAnswers[index] === opt 
                               ? "bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-300" 
                               : "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                           }`}
                         >
                           {opt}
                         </button>
                       ))}
                     </div>
                   </div>
                ))}
                {!isSubmitted && (
                   <button onClick={submitTest} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white font-bold rounded-2xl">Yakunlash va Tahlil qilish</button>
                )}
                {analysis && (
                   <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                     <h3 className="font-bold mb-4 flex items-center gap-2 text-indigo-900 dark:text-indigo-300"><Award /> AI Tahlili</h3>
                     <div className="prose prose-indigo dark:prose-invert max-w-none text-indigo-900 dark:text-indigo-200">
                       <Markdown>{String(analysis)}</Markdown>
                     </div>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
