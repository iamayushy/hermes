"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Scale, RefreshCw, Home, AlertTriangle, FileWarning } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-destructive/10 rounded-full blur-2xl scale-150" />
                        <div className="relative p-6 bg-destructive/10 rounded-full border border-destructive/20">
                            <FileWarning className="h-16 w-16 text-destructive" />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                    <h1 className="text-3xl font-bold text-foreground">
                        Proceeding Interrupted
                    </h1>
                    <p className="text-muted-foreground">
                        An unexpected error occurred while processing your request.
                        The tribunal has been notified and will review this matter.
                    </p>
                </div>

                {/* Error Details */}
                {error.digest && (
                    <div className="bg-muted/50 rounded-lg p-4 text-left">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="font-medium">Error Reference</span>
                        </div>
                        <code className="text-xs text-muted-foreground font-mono">
                            {error.digest}
                        </code>
                    </div>
                )}

                {/* Legal Notice */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 py-2 px-4 rounded-lg">
                    <Scale className="h-3 w-3" />
                    <span>Procedo Arbitration Platform</span>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" onClick={reset}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                    <Button asChild>
                        <a href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Return Home
                        </a>
                    </Button>
                </div>

                {/* Help Text */}
                <p className="text-xs text-muted-foreground">
                    If this issue persists, please contact support with the error reference above.
                </p>
            </div>
        </div>
    );
}
