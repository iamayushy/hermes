"use client";

import { useAuth } from "@clerk/nextjs";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileText, Gavel, Scale, Clock, CheckCircle2, ChevronRight, Settings, Loader2 } from "lucide-react";
import { seedRules, checkRulesStatus } from "@/actions/seed-rules";

export function DashboardView({
    organizationName,
}: {
    organizationName?: string;
}) {
    const { isLoaded, userId, orgId } = useAuth();

    // Demo state for role switching
    const [role, setRole] = useState<"arbitrator" | "institution_admin">("arbitrator");
    const [hasRules, setHasRules] = useState<boolean>(false);
    const [isLoadingRules, setIsLoadingRules] = useState<boolean>(true);
    const [isSeeding, setIsSeeding] = useState<boolean>(false);

    useEffect(() => {
        if (orgId) {
            checkRulesStatus(orgId).then((exists) => {
                setHasRules(exists);
                setIsLoadingRules(false);
            });
        } else {
            // For demo without actual org context, we simulate 'false' or just finish loading
            setIsLoadingRules(false);
        }
    }, [orgId]);

    const handleInitializeRules = async () => {
        if (!orgId) return;
        setIsSeeding(true);
        try {
            const res = await seedRules(orgId);
            if (res.status === "initialized" || res.status === "already_initialized") {
                setHasRules(true);
            }
        } catch (error) {
            console.error("Failed to seed rules", error);
        } finally {
            setIsSeeding(false);
        }
    };

    // Mock data
    const arbitratorsCount = 12;
    const recentCases = [
        { title: "Case ARB-2023-001", status: "Drafting", date: "2 days ago" },
        { title: "Case ARB-2023-004", status: "Pending Review", date: "5 days ago" },
        { title: "Case ARB-2023-007", status: "Completed", date: "1 week ago" },
    ];

    if (!isLoaded || !userId) return null;

    return (
        <main className="flex min-h-screen flex-col items-center py-10 px-4 bg-zinc-50/50 dark:bg-zinc-950/50 relative overflow-hidden">

            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-linear-to-b from-primary/5 via-primary/0 to-transparent pointer-events-none" />

            <div className="w-full max-w-5xl space-y-8 relative z-10">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            {organizationName ? `${organizationName} Workspace` : "Procedural Guidance Workspace"}
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Review arbitral procedure against institutional rules.
                        </p>
                    </div>

                    {/* Demo Role Switcher */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card border shadow-sm">
                        <Switch
                            id="role-mode"
                            checked={role === "institution_admin"}
                            onCheckedChange={(checked) => setRole(checked ? "institution_admin" : "arbitrator")}
                        />
                        <Label htmlFor="role-mode" className="text-xs font-medium text-muted-foreground">
                            {role === "arbitrator" ? "View as Arbitrator" : "View as Institution"}
                        </Label>
                    </div>
                </div>

                {/* Primary Action Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">

                    {/* Main Action Card */}
                    <Card className="md:col-span-2 glass-panel border-primary/10 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Gavel className="w-48 h-48 text-primary" />
                        </div>

                        <CardHeader className="md:pb-10">
                            <Badge variant="outline" className="w-fit mb-2 border-primary/20 text-primary bg-primary/5">
                                {role === "arbitrator" ? "New Proceeding" : "Institution Control"}
                            </Badge>
                            <CardTitle className="text-3xl font-semibold text-gradient">
                                {role === "arbitrator" ? "Start a New Case" : "Manage Institution"}
                            </CardTitle>
                            <CardDescription className="text-lg max-w-lg">
                                {role === "arbitrator"
                                    ? "Upload a procedural order to receive structured guidance based on institutional rules."
                                    : "Configure institutional rules, manage arbitrator access, and review analytics."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button size="lg" className="shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-shadow" asChild>
                                {role === "arbitrator" ? (
                                    <a href={`/orgs/${organizationName || 'demo'}/cases/new`}>
                                        <FileText className="mr-2 h-4 w-4" /> Create Case
                                    </a>
                                ) : (
                                    <a href={`/orgs/${organizationName || 'demo'}/settings/history`}>
                                        <Settings className="mr-2 h-4 w-4" /> Global Settings
                                    </a>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Stats / Quick Info */}
                    <div className="space-y-6">
                        {role === "arbitrator" && (
                            <Card className="h-full bg-linear-to-br from-card to-secondary/30 border-secondary">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                        Recent Activity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {recentCases.map((c, i) => (
                                        <div key={i} className="flex justify-between items-center group cursor-pointer hover:bg-secondary/50 p-2 rounded-md transition-colors">
                                            <div>
                                                <div className="font-medium text-sm group-hover:text-primary transition-colors">{c.title}</div>
                                                <div className="text-xs text-muted-foreground">{c.date}</div>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px]">{c.status}</Badge>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter>
                                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
                                        View All History <ChevronRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {role === "institution_admin" && (
                            <Card className="h-full bg-linear-to-br from-card to-secondary/30 border-secondary">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Scale className="h-5 w-5 text-muted-foreground" />
                                        Overview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Rules Active</span>
                                        <div className="flex items-center gap-2 text-foreground font-medium">
                                            {isLoadingRules ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            ) : hasRules ? (
                                                <>
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    Yes
                                                </>
                                            ) : (
                                                <Button size="sm" variant="outline" onClick={handleInitializeRules} disabled={isSeeding}>
                                                    {isSeeding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Initialize ICSID Rules"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Arbitrators</span>
                                        <span className="text-2xl font-bold">{arbitratorsCount}</span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="outline" className="w-full" asChild>
                                        <a href={`/orgs/${organizationName || 'demo'}/settings/history`}>
                                            <FileText className="mr-2 h-4 w-4" />
                                            Upload Historical Data
                                        </a>
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Footer Guardrail */}
                <footer className="pt-20 pb-6 text-center animate-in fade-in duration-1000 delay-300">
                    <p className="text-xs text-muted-foreground max-w-lg mx-auto opacity-70">
                        Procedo provides structured, non-binding procedural insights. All
                        procedural decisions remain with the arbitral tribunal.
                    </p>
                </footer>

            </div>
        </main>
    );
}
