"use client";

import { Button } from "@/components/ui/button";
import { Building2, UserCircle, ArrowRight, Shield, Zap, Scale } from "lucide-react";
import Link from "next/link";

export function LaunchHero() {
    return (
        <section className="relative pt-44 pb-20 md:pt-56 md:pb-32 overflow-hidden bg-background">
            {/* Background elements */}
            <div className="absolute inset-0 -z-10 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 blur-[100px] rounded-full opacity-60"></div>
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[80px] rounded-full opacity-40"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8 animate-fade-in shadow-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    GAR - LCIA HACKATHON PROTOCOL
                </div>

                <h1 className="text-4xl md:text-7xl font-black tracking-tight text-foreground mb-6 leading-tight">
                    Procedo <span className="text-primary italic">
                        an AI intelligence tool built for the GAR - LCIA Hackathon
                    </span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-16 leading-relaxed font-medium">
                    Ensuring award integrity and procedural compliance through advanced AI analysis. Choose your entry point to the Procedo ecosystem.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Institution Card */}
                    <div className="group relative p-8 rounded-3xl border bg-card hover:bg-muted/50 transition-all hover:border-primary/50 overflow-hidden text-left shadow-xl shadow-primary/5">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Building2 className="w-24 h-24" />
                        </div>

                        <div className="w-14 h-14 bg-primary/10 flex items-center justify-center rounded-2xl text-primary mb-6 group-hover:scale-110 transition-transform">
                            <Building2 className="w-8 h-8" />
                        </div>

                        <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                            Institutions
                        </h3>
                        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                            Monitor case pipelines, manage institutional compliance, and mitigate annulment risks across your entire portfolio.
                        </p>

                        <Link href="/orgs" className="block">
                            <Button className="w-full h-12 font-bold group" size="lg">
                                Enter Portal
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>

                    {/* Arbitrator Card */}
                    <div className="group relative p-8 rounded-3xl border bg-card hover:bg-muted/50 transition-all hover:border-primary/50 overflow-hidden text-left shadow-xl shadow-primary/5">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <UserCircle className="w-24 h-24" />
                        </div>

                        <div className="w-14 h-14 bg-primary/10 flex items-center justify-center rounded-2xl text-primary mb-6 group-hover:scale-110 transition-transform">
                            <UserCircle className="w-8 h-8" />
                        </div>

                        <h3 className="text-2xl font-bold mb-3">
                            Users / Arbitrators
                        </h3>
                        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                            Analyze specific cases, generate procedural recommendations, and ensure every decision stands up to scrutiny.
                        </p>

                        <Link href="/orgs" className="block">
                            <Button variant="outline" className="w-full h-12 font-bold group bg-background/50 hover:bg-primary hover:text-primary-foreground transition-all" size="lg">
                                Launch Analysis
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Micro-Features */}
                <div className="mt-20 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Shield className="w-4 h-4 text-primary" />
                        COMPLIANCE ENGINE
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Zap className="w-4 h-4 text-primary" />
                        REAL-TIME ANALYSIS
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Scale className="w-4 h-4 text-primary" />
                        PROCEDURAL INTEGRITY
                    </div>
                </div>
            </div>
        </section>
    );
}
