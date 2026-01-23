"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Settings2, Scale, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { RecommendationDisplay } from "./recommendation-display";
import { ParameterizedDisplay } from "./parameterized-display";
import { DownloadPdfButton } from "./download-pdf-button";

interface CaseAnalysisTabsProps {
    caseId: string;
    initialStatus: string;
    caseTitle: string;
    defaultRecommendations: any | null;
    parameterizedRecommendations: any | null;
}

export function CaseAnalysisTabs({
    caseId,
    initialStatus,
    caseTitle,
    defaultRecommendations,
    parameterizedRecommendations
}: CaseAnalysisTabsProps) {
    const [status, setStatus] = useState(initialStatus);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState("");
    const [defaultData, setDefaultData] = useState(defaultRecommendations);
    const [paramData, setParamData] = useState(parameterizedRecommendations);
    const [error, setError] = useState<string | null>(null);

    const hasDefault = defaultData !== null;
    const hasParameterized = paramData !== null;

    // Default to fully loaded view if data exists, otherwise default view
    const [activeTab, setActiveTab] = useState<"default" | "parameterized">("default");

    // Switch tab once data comes in if it was the reason we were waiting
    useEffect(() => {
        if (!hasDefault && hasParameterized && activeTab === 'default') {
            setActiveTab('parameterized');
        }
    }, [hasDefault, hasParameterized, activeTab]);

    const pollStatus = useCallback(async () => {
        try {
            const res = await fetch(`/api/cases/${caseId}/status`);
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    }, [caseId]);

    useEffect(() => {
        if (status !== 'processing') return;

        const interval = setInterval(async () => {
            const currentStatus = await pollStatus();
            if (currentStatus) {
                setStatus(currentStatus.status);
                setProgress(currentStatus.analysisProgress || 0);
                setCurrentStep(currentStatus.currentStep || "");
                if (currentStatus.defaultRecommendations) setDefaultData(currentStatus.defaultRecommendations);
                if (currentStatus.parameterizedRecommendations) setParamData(currentStatus.parameterizedRecommendations);
                if (currentStatus.errorMessage) setError(currentStatus.errorMessage);

                if (currentStatus.status === 'analyzed' || currentStatus.status === 'error') {
                    clearInterval(interval);
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [status, pollStatus]);

    if (status === 'processing') {
        return (
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            Analysis in Progress
                        </CardTitle>
                        <CardDescription>
                            AI is currently analyzing the document. This may take a few minutes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-primary">Current Step</span>
                                <span className="text-muted-foreground">{currentStep}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                                {hasDefault ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                )}
                                <div>
                                    <p className="font-medium text-sm">Default Analysis</p>
                                    <p className="text-xs text-muted-foreground">
                                        {hasDefault ? "Completed" : "Processing..."}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                                {hasParameterized ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                )}
                                <div>
                                    <p className="font-medium text-sm">Parameterized Analysis</p>
                                    <p className="text-xs text-muted-foreground">
                                        {hasParameterized ? "Completed" : "Processing..."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Show partial results if available */}
                {(hasDefault || hasParameterized) && (
                    <Card className="flex-1 flex flex-col min-h-[500px]">
                        <CardHeader className="shrink-0">
                            <CardTitle className="flex items-center gap-2">
                                <Scale className="h-5 w-5 text-primary" />
                                Preliminary Results
                            </CardTitle>
                            <div className="flex gap-2 mt-4">
                                <Button
                                    variant={activeTab === "default" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveTab("default")}
                                    disabled={!hasDefault}
                                    className="flex-1"
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Default
                                </Button>
                                <Button
                                    variant={activeTab === "parameterized" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveTab("parameterized")}
                                    disabled={!hasParameterized}
                                    className="flex-1"
                                >
                                    <Settings2 className="mr-2 h-4 w-4" />
                                    Parameterized
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto">
                            <div id="analysis-results-container">
                                {activeTab === "default" && hasDefault && (
                                    <RecommendationDisplay data={JSON.stringify(defaultData)} />
                                )}
                                {activeTab === "parameterized" && hasParameterized && (
                                    <ParameterizedDisplay data={JSON.stringify(paramData)} />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    if (status === 'error') {
        return (
            <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        Analysis Error
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-foreground">{error || "Something went wrong during analysis."}</p>
                </CardContent>
            </Card>
        );
    }

    if (!hasDefault && !hasParameterized) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center">
                        No analysis has been run yet for this case.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex-1 flex flex-col">
            <CardHeader className="shrink-0">
                <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    AI Analysis Results
                </CardTitle>
                <CardDescription>
                    View and download analysis reports
                </CardDescription>

                {/* Tab Buttons */}
                <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                        variant={activeTab === "default" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveTab("default")}
                        disabled={!hasDefault}
                        className="flex-1 min-w-[150px]"
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Default Analysis
                        {!hasDefault && " (Not run)"}
                    </Button>
                    <Button
                        variant={activeTab === "parameterized" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveTab("parameterized")}
                        disabled={!hasParameterized}
                        className="flex-1 min-w-[150px]"
                    >
                        <Settings2 className="mr-2 h-4 w-4" />
                        Parameterized Analysis
                        {!hasParameterized && " (Not run)"}
                    </Button>
                </div>

                {/* Download Buttons */}
                <div className="flex flex-wrap gap-2 mt-4">
                    {hasDefault && (
                        <DownloadPdfButton
                            report={{
                                title: caseTitle,
                                type: "default",
                                data: defaultData
                            }}
                        />
                    )}
                    {hasParameterized && (
                        <DownloadPdfButton
                            report={{
                                title: caseTitle,
                                type: "parameterized",
                                data: paramData
                            }}
                        />
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto min-h-0">
                <div id="analysis-results-container">
                    {activeTab === "default" && hasDefault && (
                        <RecommendationDisplay data={JSON.stringify(defaultData)} />
                    )}

                    {activeTab === "parameterized" && hasParameterized && (
                        <ParameterizedDisplay data={JSON.stringify(paramData)} />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
