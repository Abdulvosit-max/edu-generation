import { useState, useEffect } from "react";
import { FileText, Loader2, Share2, Download, Search, CheckCircle, XCircle, Award } from "lucide-react";
import { generateEducationalTests, analyzeTestResults, TestData } from "../lib/gemini";
import { auth } from "../lib/firebase";
// import { collection, addDoc, serverTimestamp } from "firebase/firestore"; // Removed
import { useAppContext } from "../lib/AppContext";
import jsPDF from "jspdf";
import { useSearchParams } from "react-router-dom";
import Markdown from "react-markdown";

export default function TestGen() {
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [analyzing, setAnalyzing] = useState(false);
  const [testCount, setTestCount] = useState(10);
  const [teacherName, setTeacherName] = useState("");
  const { t } = useAppContext();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setTopic(q);
    }
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setTests(null);
    setUserAnswers({});
    setIsSubmitted(false);
    setAnalysis(null);
    try {
      const resp = await generateEducationalTests(topic, difficulty, testCount);
      setTests(resp);
    } catch (e: any) {
      console.error(e);
      alert(`Xatolik: ${e.message || t.errorOccurred}`);
    } finally {
      setLoading(false);
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
    } catch (e) {
      console.error(e);
      setAnalysis("Xatolik: Tahlil qilib bo'lmadi.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleShare = () => {
    alert("Firebase o'chirilgan.");
  };

  const downloadPDF = () => {
    if (!tests) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("EDUGEN TEST TIZIMI", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Mavzu: ${topic}`, 20, 35);
    doc.text(`Daraja: ${difficulty === 'easy' ? 'Oson' : difficulty === 'medium' ? 'O\'rta' : 'Qiyin'}`, 20, 42);
    if (teacherName) doc.text(`Tuzuvchi ustoz: ${teacherName}`, 20, 49);
    doc.text(`Sana: ${new Date().toLocaleDateString()}`, 150, 35);
    
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);
    
    let yPos = 65;
    doc.setFontSize(12);
    
    // Savollar
    tests.forEach((test, index) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFont("helvetica", "bold");
      const questionLines = doc.splitTextToSize(`${index + 1}. ${test.question}`, 170);
      doc.text(questionLines, 20, yPos);
      yPos += (questionLines.length * 6) + 2;
      
      doc.setFont("helvetica", "normal");
      test.options.forEach((opt, oIdx) => {
        const prefix = String.fromCharCode(65 + oIdx) + ") "; // A), B), C), D)
        const optLines = doc.splitTextToSize(`${prefix}${opt}`, 160);
        doc.text(optLines, 30, yPos);
        yPos += (optLines.length * 6);
      });
      
      yPos += 8;
    });
    
    // Javoblar kaliti (Yangi sahifada)
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("JAVOBLAR KALITI", 105, 30, { align: "center" });
    
    doc.setFontSize(12);
    let kyPos = 50;
    let kxPos = 40;
    
    tests.forEach((test, index) => {
      if (kyPos > 270) {
        kyPos = 50;
        kxPos += 60;
      }
      doc.text(`${index + 1}. ${test.correctAnswer}`, kxPos, kyPos);
      kyPos += 10;
    });
    
    doc.save(`${topic}_Testlar.pdf`);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
             <FileText className="text-blue-600 dark:text-blue-400" /> {t.testTitle}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{t.testDesc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Settings Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">{t.whatTest}</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder={t.testPlaceholder}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              className="w-full px-4 py-3 mb-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 transition-shadow text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Testlar soni</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={testCount}
                  onChange={e => setTestCount(parseInt(e.target.value) || 10)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ustoz ismi</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  placeholder="Ism sharifingiz"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>
            
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-4">{t.testDifficulty}</label>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map(level => {
                let btnClass = 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';
                if (difficulty === level) {
                  if (level === 'easy') btnClass = 'bg-green-100 dark:bg-green-900/50 border-green-500 text-green-700 dark:text-green-300';
                  else if (level === 'medium') btnClass = 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500 text-yellow-700 dark:text-yellow-300';
                  else if (level === 'hard') btnClass = 'bg-red-100 dark:bg-red-900/50 border-red-500 text-red-700 dark:text-red-300';
                }
                return (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${btnClass}`}
                >
                  {t[level] || level}
                </button>
              )})}
            </div>

            <button 
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Search />}
              {loading ? t.generatingTest : t.generateTest}
            </button>
          </div>

          {tests && (
             <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/30 flex flex-col gap-4">
               <button 
                  onClick={downloadPDF}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 flex items-center justify-center gap-2 rounded-xl transition-colors shadow-sm"
               >
                 <Download size={16} /> 
                 {t.downloadPDF}
               </button>
               {/* Share button removed */}
             </div>
          )}
        </div>

        {/* Tests Area */}
        <div className="lg:col-span-8 flex flex-col min-h-[500px]">
          <div className="bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] bg-white dark:bg-slate-800 flex-1 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-10 flex flex-col relative overflow-y-auto shadow-sm">
            {loading ? (
              <div className="m-auto flex flex-col items-center gap-4 text-blue-600 dark:text-blue-400">
                 <Loader2 size={48} className="animate-spin" />
                 <p className="font-medium">{t.generatingTest}</p>
              </div>
            ) : tests ? (
              <div className="space-y-8 pb-8">
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{topic} - Testlar</h2>
                 {tests.map((test, index) => {
                    const isCorrect = isSubmitted && userAnswers[index] === test.correctAnswer;
                    const isWrong = isSubmitted && userAnswers[index] !== test.correctAnswer && userAnswers[index] !== undefined;
                    return (
                    <div key={index} className={`bg-white dark:bg-slate-900 border ${isSubmitted ? (isCorrect ? 'border-green-500 shadow-sm shadow-green-100 dark:shadow-green-900/20' : isWrong ? 'border-red-500 shadow-sm shadow-red-100 dark:shadow-red-900/20' : 'border-slate-200 dark:border-slate-700') : 'border-slate-200 dark:border-slate-700'} rounded-2xl p-6 shadow-sm transition-colors`}>
                       <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex gap-3">
                         <span className="text-slate-400">{index + 1}.</span> 
                         <span className="flex-1">{test.question}</span>
                         {isSubmitted && isCorrect && <CheckCircle className="text-green-500 shrink-0" />}
                         {isSubmitted && isWrong && <XCircle className="text-red-500 shrink-0" />}
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                         {test.options.map((opt, oIdx) => {
                           const isSelected = userAnswers[index] === opt;
                           const isActualCorrect = isSubmitted && test.correctAnswer === opt;
                           let btnClass = "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300";
                           if (isSelected && !isSubmitted) {
                             btnClass = "bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500";
                           } else if (isSubmitted) {
                             if (isActualCorrect) {
                               btnClass = "bg-green-50 dark:bg-green-900/40 border-green-500 text-green-700 dark:text-green-300 ring-1 ring-green-500 font-medium";
                             } else if (isSelected && !isActualCorrect) {
                               btnClass = "bg-red-50 dark:bg-red-900/40 border-red-500 text-red-700 dark:text-red-300";
                             } else {
                               btnClass = "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-60";
                             }
                           }
                           
                           return (
                             <button
                               key={oIdx}
                               disabled={isSubmitted}
                               onClick={() => handleOptionClick(index, opt)}
                               className={`text-left p-4 rounded-xl border transition-all ${btnClass}`}
                             >
                               {opt}
                             </button>
                           );
                         })}
                       </div>
                       {isSubmitted && (
                         <div className="text-sm border-t border-slate-100 dark:border-slate-700 pt-3 mt-4 text-slate-600 dark:text-slate-400">
                            Maslahat: Siz {userAnswers[index] ? <span className="font-semibold px-1 bg-slate-100 dark:bg-slate-800 rounded">{userAnswers[index]}</span> : "tanlamadingiz"}, to'g'ri javob esa <span className="font-bold text-emerald-600 dark:text-emerald-400">{test.correctAnswer}</span>.
                         </div>
                       )}
                    </div>
                 )})}
                                  {!isSubmitted ? (
                    <button 
                      onClick={submitTest}
                      disabled={Object.keys(userAnswers).length === 0}
                      className="w-full py-4 mt-8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-sm text-lg"
                    >
                      <CheckCircle /> {t.finishAndAnalyze}
                    </button>
                 ) : (
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/30 p-8 rounded-3xl mt-8 shadow-sm">
                       <h3 className="text-2xl font-bold flex items-center gap-3 text-indigo-900 dark:text-indigo-100 mb-6 pb-4 border-b border-indigo-200/50 dark:border-indigo-800/50">
                         <Award className="text-indigo-600 dark:text-indigo-400 w-8 h-8" /> {t.aiAnalysis}
                       </h3>
                       {analyzing ? (
                         <div className="flex flex-col items-center justify-center py-12 text-indigo-600 dark:text-indigo-400 text-center">
                           <Loader2 size={48} className="animate-spin mb-6" />
                           <p className="font-semibold text-lg animate-pulse">{t.analyzingResults}</p>
                         </div>
                       ) : analysis ? (
                         <div className="prose prose-lg prose-slate dark:prose-invert prose-headings:text-indigo-900 dark:prose-headings:text-indigo-100 prose-a:text-indigo-600 markdown-body max-w-none text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30">
                            <Markdown>{analysis}</Markdown>
                         </div>
                       ) : (
                         <p className="text-red-500 font-medium text-center py-8">{t.analysisNotFound}</p>
                       )}
                    </div>
                 )}
              </div>
            ) : (
              <div className="m-auto text-center max-w-sm">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex mx-auto items-center justify-center mb-6 shadow-inner ring-1 ring-slate-100 dark:ring-slate-800">
                   <FileText size={40} className="text-slate-300 dark:text-slate-600" />
                 </div>
                 <p className="font-medium text-lg text-slate-600 dark:text-slate-400">{t.noTest}</p>
                 <p className="text-sm mt-2 opacity-80 text-slate-500 dark:text-slate-400">{t.noTestDesc}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
