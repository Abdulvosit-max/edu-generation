import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
          <AlertTriangle size={48} className="text-red-400" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Xatolik yuz berdi</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} /> Qayta urinish
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
