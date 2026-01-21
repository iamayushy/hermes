import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scale, Home, ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
                        <div className="relative p-6 bg-muted rounded-full">
                            <FileQuestion className="h-16 w-16 text-muted-foreground" />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                    <h1 className="text-6xl font-bold text-foreground">404</h1>
                    <h2 className="text-xl font-semibold text-foreground">
                        Case Not Found
                    </h2>
                    <p className="text-muted-foreground">
                        The proceeding you&apos;re looking for doesn&apos;t exist or has been archived.
                        Please verify the case reference and try again.
                    </p>
                </div>

                {/* Legal Notice */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 py-2 px-4 rounded-lg">
                    <Scale className="h-3 w-3" />
                    <span>Procedo Arbitration Platform</span>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" asChild>
                        <Link href="javascript:history.back()">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Go Back
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Return Home
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
