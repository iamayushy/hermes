"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { AlertCircle, Scale } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header className="fixed top-0 w-full z-50">
            {/* Hackathon Warning Banner */}
            <div className="w-full bg-amber-500/90 backdrop-blur-sm border-b border-amber-600 py-2.5 px-6 flex items-center justify-center gap-2 text-amber-950 font-semibold text-xs md:text-sm shadow-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>This Tools is currently based on ICSID rules</span>
            </div>

            <nav
                className={`w-full transition-all duration-300 border-b ${isScrolled
                    ? "bg-background/80 backdrop-blur-md border-border py-3 shadow-md"
                    : "bg-transparent border-transparent py-5"
                    }`}
            >
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-primary flex items-center justify-center rounded-lg shadow-lg shadow-primary/20">
                            <Scale className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            Procedo
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <Button variant="ghost" className="font-semibold">
                                    Sign In
                                </Button>
                            </SignInButton>
                            <SignInButton mode="modal">
                                <Button className="font-semibold px-6 shadow-lg shadow-primary/20">
                                    Launch App
                                </Button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <Link href="/orgs">
                                <Button variant="ghost" className="font-semibold">
                                    Dashboard
                                </Button>
                            </Link>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                    </div>
                </div>
            </nav>
        </header>
    );
}
