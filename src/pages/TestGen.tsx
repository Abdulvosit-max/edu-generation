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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-auto ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
            {toast.type === "success" ? "✓" : "✕"} {toast.msg}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.testTitle}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.testDesc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol panel */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Sozlamalar</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Test mavzusi</label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Masalan: Botanika"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Testlar soni</label>
                  <input
                    type="number"
                    value={testCount}
                    onChange={e => setTestCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Daraja</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="easy">Oson</option>
                    <option value="medium">O'rtacha</option>
                    <option value="hard">Qiyin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ustoz ismi (PDF uchun)</label>
                <input
                  type="text"
                  placeholder="Ustoz ismi"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                {loading ? "Yaratilmoqda..." : "Test yaratish"}
              </button>
            </div>
          </div>

          {tests && (
            <div className="space-y-2">
              <button
                onClick={downloadPDF}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Download size={16} /> PDF yuklash
              </button>
              {resourceId && !isShared && (
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Share2 size={16} /> Ulashish
                </button>
              )}
              {isShared && (
                <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle size={16} /> Ulashildi
                </div>
              )}
            </div>
          )}
        </div>

        {/* O'ng panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 min-h-[500px]">
            {!tests ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <FileText size={24} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hali test yaratilmadi</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Chap paneldan mavzu kiriting</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {tests.map((test, index) => (
                  <div key={index} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">{index + 1}. {test.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {test.options.map(opt => {
                        const isSelected = userAnswers[index] === opt;
                        const isCorrect = isSubmitted && opt === test.correctAnswer;
                        const isWrong = isSubmitted && isSelected && opt !== test.correctAnswer;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleOptionClick(index, opt)}
                            className={`p-3 text-left rounded-lg border text-sm transition-colors ${
                              isCorrect
                                ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                                : isWrong
                                ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                                : isSelected
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300"
                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            {isCorrect && <CheckCircle size={12} className="inline mr-1 text-green-500" />}
                            {isWrong && <XCircle size={12} className="inline mr-1 text-red-500" />}
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {!isSubmitted && (
                  <button
                    onClick={submitTest}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Yakunlash va tahlil qilish
                  </button>
                )}

                {analyzing && (
                  <div className="flex items-center gap-2 py-4 text-gray-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Tahlil qilinmoqda...</span>
                  </div>
                )}

                {analysis && (
                  <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                      <Award size={16} /> AI Tahlili
                    </p>
                    <div className="prose prose-sm prose-blue dark:prose-invert max-w-none text-blue-900 dark:text-blue-200">
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
