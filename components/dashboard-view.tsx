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
import {
    FileText,
    Scale,
    Clock,
    CheckCircle2,
    ChevronRight,
    Settings,
    Loader2,
    Plus,
    FolderOpen,
    BarChart3,
    Shield,
    ArrowRight,
    TrendingUp,
    Settings2
} from "lucide-react";
import { seedRules, checkRulesStatus } from "@/actions/seed-rules";
import Link from "next/link";

interface DashboardStats {
    totalCases: number;
    analyzedCases: number;
    thisWeekCases: number;
    parameterizedCases: number;
}

export function DashboardView({
    organizationName,
    recentCases,
    stats
}: {
    organizationName?: string;
    recentCases?: Array<{
        id: string;
        caseTitle: string;
        status: string;
        createdAt: Date;
        defaultRecommendations?: unknown;
        parameterizedRecommendations?: unknown;
    }>;
    stats?: DashboardStats;
}) {
    const { isLoaded, userId, orgId } = useAuth();

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

    const cases = recentCases || [];
    const dashboardStats = stats || {
        totalCases: 0,
        analyzedCases: 0,
        thisWeekCases: 0,
        parameterizedCases: 0
    };

    if (!isLoaded || !userId) return null;

    return (
        <main className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

                {/* Header */}
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                            {organizationName || "Procedo"} Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            AI-powered procedural compliance for ICSID arbitration
                        </p>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur border shadow-sm">
                        <Switch
                            id="role-mode"
                            checked={role === "institution_admin"}
                            onCheckedChange={(checked) => setRole(checked ? "institution_admin" : "arbitrator")}
                        />
                        <Label htmlFor="role-mode" className="text-sm font-medium pr-2">
                            {role === "arbitrator" ? "Arbitrator" : "Institution"}
                        </Label>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Cases</p>
                                    <p className="text-3xl font-bold mt-1">{dashboardStats.totalCases}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted">
                                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Analyzed</p>
                                    <p className="text-3xl font-bold mt-1">{dashboardStats.analyzedCases}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted">
                                    <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">With Parameters</p>
                                    <p className="text-3xl font-bold mt-1">{dashboardStats.parameterizedCases}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted">
                                    <Settings2 className="h-6 w-6 text-muted-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">This Week</p>
                                    <p className="text-3xl font-bold mt-1">{dashboardStats.thisWeekCases}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted">
                                    <TrendingUp className="h-6 w-6 text-muted-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Primary Action Card */}
                    <Card className="lg:col-span-2 bg-linear-to-br from-primary/5 via-primary/10 to-blue-500/5 border-primary/20 hover:border-primary/40 transition-colors overflow-hidden relative">
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl" />
                        <CardHeader className="relative z-10">
                            <Badge variant="secondary" className="w-fit mb-3 bg-primary/10 text-primary border-0">
                                {role === "arbitrator" ? "Quick Action" : "Administration"}
                            </Badge>
                            <CardTitle className="text-2xl lg:text-3xl">
                                {role === "arbitrator" ? "Analyze New Case" : "Institution Settings"}
                            </CardTitle>
                            <CardDescription className="text-base max-w-lg">
                                {role === "arbitrator"
                                    ? "Upload a procedural order to receive AI-powered compliance analysis with both default and parameterized review modes."
                                    : "Configure ICSID rules, manage team access, and view organization-wide analytics."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <Button size="lg" className="shadow-lg hover:shadow-xl transition-shadow group" asChild>
                                {role === "arbitrator" ? (
                                    <Link href={`/orgs/${organizationName || 'demo'}/cases/new`}>
                                        <Plus className="mr-2 h-5 w-5" />
                                        Start New Analysis
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                ) : (
                                    <Link href={`/orgs/${organizationName || 'demo'}/settings/history`}>
                                        <Settings className="mr-2 h-5 w-5" />
                                        Open Settings
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Recent Cases */}
                    <Card className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                Recent Cases
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-2">
                            {cases.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">No cases yet</p>
                                    <p className="text-xs text-muted-foreground mt-1">Create your first analysis</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {cases.slice(0, 5).map((c) => (
                                        <Link
                                            key={c.id}
                                            href={`/orgs/${organizationName || 'demo'}/cases/${c.id}`}
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="flex-1 min-w-0 mr-3">
                                                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                    {c.caseTitle}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(c.createdAt).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                    {Boolean(c.parameterizedRecommendations) && (
                                                        <Badge variant="outline" className="text-[9px] py-0 h-4">
                                                            <Settings2 className="h-2 w-2 mr-0.5" />
                                                            Param
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge
                                                variant={c.status === 'analyzed' ? 'default' : c.status === 'error' ? 'destructive' : 'secondary'}
                                                className="text-[10px] shrink-0"
                                            >
                                                {c.status}
                                            </Badge>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        {cases.length > 0 && (
                            <CardFooter className="pt-2">
                                <Button variant="ghost" size="sm" className="w-full" asChild>
                                    <Link href={`/orgs/${organizationName || 'demo'}/cases`}>
                                        View All {dashboardStats.totalCases} Cases
                                        <ChevronRight className="ml-1 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>

                {/* Institution Admin Section */}
                {role === "institution_admin" && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    Rules Configuration
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">ICSID Rules Database</p>
                                        <p className="text-sm text-muted-foreground">Core procedural rules for analysis</p>
                                    </div>
                                    {isLoadingRules ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    ) : hasRules ? (
                                        <Badge variant="default" className="bg-green-600">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Active
                                        </Badge>
                                    ) : (
                                        <Button size="sm" onClick={handleInitializeRules} disabled={isSeeding}>
                                            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Initialize Rules"}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                    Analytics Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-2xl font-bold">{dashboardStats.analyzedCases}</p>
                                        <p className="text-sm text-muted-foreground">Cases Analyzed</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{dashboardStats.parameterizedCases}</p>
                                        <p className="text-sm text-muted-foreground">Compliance Scored</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Footer */}
                <footer className="mt-12 text-center">
                    <p className="text-xs text-muted-foreground">
                        Procedo provides structured, non-binding procedural insights. All decisions remain with the arbitral tribunal.
                    </p>
                </footer>
            </div>
        </main>
    );
}
