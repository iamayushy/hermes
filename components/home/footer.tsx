"use client";

import { Scale } from "lucide-react";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="py-12 border-t bg-background">
            <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center space-y-4">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-lg">
                        <Scale className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-foreground">
                        Procedo
                    </span>
                </Link>
                <p className="text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Procedo. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
