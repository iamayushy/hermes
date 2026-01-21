"use client";
import { Scale, Loader2 } from "lucide-react";

export default function GlobalError() {
    return (
        <html>
            <body>
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="p-4 bg-slate-200 rounded-full">
                                <Scale className="h-12 w-12 text-slate-600" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-slate-900">
                                Critical Error
                            </h1>
                            <p className="text-slate-600">
                                A critical error has occurred. Please refresh the page or contact support.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <Loader2 className="mr-2 h-4 w-4" />
                            Refresh Page
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
