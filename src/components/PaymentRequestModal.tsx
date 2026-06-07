import { useState } from "react";
import { X, CheckCircle2, AlertCircle, Loader2, CreditCard } from "lucide-react";
import { auth } from "../lib/firebase";
import { createSubscriptionRequest } from "../lib/db";
import { useAppContext } from "../lib/AppContext";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: "PRO" | "MAX";
}

export default function PaymentRequestModal({ isOpen, onClose, initialPlan = "PRO" }: PaymentRequestModalProps) {
  const { t, refreshSubscription } = useAppContext();
  const user = auth.currentUser;

  const [plan, setPlan] = useState<"PRO" | "MAX">(initialPlan);
  const [paymentMethod, setPaymentMethod] = useState<"click" | "payme" | "card">("click");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [transactionDetails, setTransactionDetails] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Plan pricing
  const prices = {
    PRO: 29000,
    MAX: 59000
  };

  const paymentInstructions = {
    click: "Click ilovasi orqali telefon raqamimizga o'tkazing: +998 90 123 45 67 (Murodillo Z.)",
    payme: "Payme ilovasi orqali telefon raqamimizga o'tkazing: +998 90 123 45 67 (Murodillo Z.)",
    card: "Karta raqamimizga o'tkazma qiling: 8600 1234 5678 9012 (Murodillo Z.)"
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg("Iltimos, avval tizimga kiring.");
      return;
    }
    if (!phoneNumber) {
      setErrorMsg("Telefon raqamingizni kiriting.");
      return;
    }
    if (!transactionDetails) {
      setErrorMsg("To'lov tranzaksiyasi ID yoki chek ma'lumotlarini kiriting.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload = {
      user_uid: user.uid,
      user_email: user.email || `${user.displayName || "user"}@edu-generation.uz`,
      user_name: user.displayName || "Foydalanuvchi",
      phone_number: phoneNumber,
      plan: plan.toLowerCase() as "pro" | "max",
      payment_method: paymentMethod,
      amount: prices[plan],
      transaction_details: transactionDetails
    };

    try {
      const res = await createSubscriptionRequest(payload);
      if (res) {
        setSuccess(true);
        await refreshSubscription(); // update context immediately
      } else {
        setErrorMsg("Ariza jo'natishda xatolik yuz berdi. Server aloqasini tekshiring.");
      }
    } catch (err) {
      setErrorMsg("Tizimda kutilmagan xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">
              Tarifga to'lov qilish arizasi
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer">
            <X size={16} className="text-slate-400 hover:text-slate-650" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-4"
              >
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Ariza qabul qilindi!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
                  To'lov tekshiruvi boshlandi. Administratorlarimiz arizani tez orada tasdiqlashadi. Tarifingiz faollashgach, akkauntingizda status yangilanadi.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Yopish
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMsg && (
                  <div className="flex items-start gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Plan Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tarif Rejasi</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPlan("PRO")}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        plan === "PRO"
                          ? "border-blue-500 bg-blue-550/5 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-black shadow-inner"
                          : "border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                      }`}
                    >
                      <span className="text-xs font-black block">PRO</span>
                      <span className="text-[10px] font-medium block mt-1 opacity-70">29,000 UZS / oy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlan("MAX")}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        plan === "MAX"
                          ? "border-fuchsia-500 bg-fuchsia-550/5 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400 font-black shadow-inner"
                          : "border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                      }`}
                    >
                      <span className="text-xs font-black block">MAX</span>
                      <span className="text-[10px] font-medium block mt-1 opacity-70">59,000 UZS / oy</span>
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">To'lov Tizimi</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(["click", "payme", "card"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-3 rounded-2xl border text-[10px] font-black uppercase tracking-wider text-center cursor-pointer transition-all ${
                          paymentMethod === method
                            ? "border-slate-900 bg-slate-950 dark:border-white dark:bg-white text-white dark:text-slate-900"
                            : "border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                        }`}
                      >
                        {method === "click" && "Click"}
                        {method === "payme" && "Payme"}
                        {method === "card" && "UzCard/Humo"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest">To'lov Ko'rsatmasi:</span>
                  <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                    {paymentInstructions[paymentMethod]}
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-semibold">
                    * Pulni o'tkazgandan so'ng, quyidagi maydonlarni to'ldirib arizani tasdiqlang.
                  </p>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Telefon raqamingiz</label>
                    <input
                      type="text"
                      placeholder="+998 90 123 45 67"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Tranzaksiya tafsilotlari</label>
                    <textarea
                      placeholder="To'lov chekidagi tranzaksiya IDsi, vaqti yoki yuboruvchi karta ma'lumotlari..."
                      value={transactionDetails}
                      onChange={(e) => setTransactionDetails(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-semibold focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3.5 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10 active:scale-98 disabled:opacity-75"
                  >
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    Tasdiqlash
                  </button>
                </div>
              </form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
