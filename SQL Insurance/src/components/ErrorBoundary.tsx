import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "משהו השתבש באפליקציה.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            isFirestoreError = true;
            errorMessage = `שגיאת מסד נתונים: ${parsed.error}`;
          }
        }
      } catch (e) {
        // Not a JSON error message
      }

      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-200 space-y-6">
            <div className="flex justify-center">
              <div className="bg-red-100 p-4 rounded-2xl">
                <ShieldAlert className="w-12 h-12 text-red-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">אופס! משהו השתבש</h2>
              <p className="text-slate-600">
                {isFirestoreError ? errorMessage : "נתקלנו בשגיאה לא צפויה. נסה לרענן את העמוד."}
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold"
            >
              <RefreshCcw className="w-4 h-4" />
              רענן עמוד
            </button>
            
            {!isFirestoreError && this.state.error && (
              <div className="pt-4 text-[10px] text-slate-400 font-mono break-all opacity-50">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
