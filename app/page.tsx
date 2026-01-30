"use client";

import { Navbar } from "@/components/home/navbar";
import { LaunchHero } from "@/components/home/launch-hero";
import { Footer } from "@/components/home/footer";
import { AlertCircle } from "lucide-react";

export default function RootPage() {
    return (
        <main className="min-h-screen bg-background text-foreground scroll-smooth">
            <Navbar />
            <LaunchHero />
            <Footer />
        </main>
    );
}
