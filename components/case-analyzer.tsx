"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, Loader2, AlertCircle, FileText, Scale, Settings2, CheckCircle, ChevronLeft } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RecommendationDisplay } from "./recommendation-display";
import { ParameterizedDisplay } from "./parameterized-display";
import { DownloadPdfButton } from "./download-pdf-button";

interface AnalysisStatus {
    id: string;
    status: string;
    analysisProgress: number | null;
    currentStep: string | null;
    defaultRecommendations: unknown | null;
    parameterizedRecommendations: unknown | null;
    errorMessage: string | null;
    analyzedAt?: string | null;
    parameterizedAnalyzedAt?: string | null;
}

export function CaseAnalyzer() {
    const { orgId } = useAuth();
    const params = useParams();
    const [file, setFile] = useState<File | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [activeTab, setActiveTab] = useState<"default" | "with_parameters">("default");

    // Analysis state management
    const [defaultJobId, setDefaultJobId] = useState<string | null>(null);
    const [paramJobId, setParamJobId] = useState<string | null>(null);
    const [defaultStatus, setDefaultStatus] = useState<AnalysisStatus | null>(null);
    const [paramStatus, setParamStatus] = useState<AnalysisStatus | null>(null);

    const [error, setError] = useState<string>("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const MAX_SIZE = 10 * 1024 * 1024;
            if (selectedFile.size > MAX_SIZE) {
                setError("File too large. Max 10MB.");
                return;
            }
            setFile(selectedFile);
            setError("");
            setDefaultJobId(null);
            setParamJobId(null);
            setDefaultStatus(null);
            setParamStatus(null);
        }
    };

    const pollStatus = useCallback(async (caseId: string): Promise<AnalysisStatus | null> => {
        try {
            const res = await fetch(`/api/cases/${caseId}/status`);
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        if (!defaultJobId || defaultStatus?.defaultRecommendations || defaultStatus?.status === 'error') {
            return;
        }

        const interval = setInterval(async () => {
            const status = await pollStatus(defaultJobId);
            if (status) {
                setDefaultStatus(status);
                if (status.defaultRecommendations || status.status === 'error') {
                    clearInterval(interval);
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [defaultJobId, defaultStatus?.status, pollStatus]);

    useEffect(() => {
        if (!paramJobId || paramStatus?.parameterizedRecommendations || paramStatus?.status === 'error') {
            return;
        }

        const interval = setInterval(async () => {
            const status = await pollStatus(paramJobId);
            if (status) {
                setParamStatus(status);
                if (status.parameterizedRecommendations || status.status === 'error') {
                    clearInterval(interval);
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [paramJobId, paramStatus?.status, pollStatus]);

    const handleAnalyzeBoth = async () => {
        if (!file || !orgId) return;

        setIsStarting(true);
        setError("");
        setDefaultStatus(null);
        setParamStatus(null);

        try {
            // Step 1: Upload file directly to Vercel Blob (bypasses 4.5MB limit)
            const { upload } = await import("@vercel/blob/client");
            const timestamp = Date.now();
            const blob = await upload(`cases/${orgId}/${timestamp}-${file.name}`, file, {
                access: 'public',
                handleUploadUrl: '/api/upload',
            });

            // Step 2: Call combined analysis API with file URL
            const response = await fetch("/api/analyze-case", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileUrl: blob.url,
                    fileName: file.name,
                    fileSize: file.size,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Analysis failed");
            }

            const result = await response.json();
            const caseId = result.caseId;

            // Set initial status for both analyses
            setDefaultJobId(caseId);
            setParamJobId(caseId);
            setDefaultStatus({
                id: caseId,
                status: 'processing',
                analysisProgress: 5,
                currentStep: 'Starting combined analysis...',
                defaultRecommendations: null,
                parameterizedRecommendations: null,
                errorMessage: null
            });
            setParamStatus({
                id: caseId,
                status: 'processing',
                analysisProgress: 5,
                currentStep: 'Waiting...',
                defaultRecommendations: null,
                parameterizedRecommendations: null,
                errorMessage: null
            });

        } catch (err) {
            let errorMessage = String(err);
            if (errorMessage.startsWith("Error: ")) {
                errorMessage = errorMessage.substring(7);
            }
            setError(errorMessage);
        } finally {
            setIsStarting(false);
        }
    };

    const defaultComplete = !!defaultStatus?.defaultRecommendations;
    const paramComplete = !!paramStatus?.parameterizedRecommendations;

    const isProcessing =
        (!!defaultJobId && !defaultComplete && defaultStatus?.status !== 'error') ||
        (!!paramJobId && !paramComplete && paramStatus?.status !== 'error');

    const defaultData = defaultStatus?.defaultRecommendations;
    const paramData = paramStatus?.parameterizedRecommendations;

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-background">
            {/* Left Panel - Sidebar Upload & Status */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col border-r bg-muted/30 p-4 lg:p-6 gap-4 overflow-y-auto">
                <Link
                    href={`/orgs/${params.slug}`}
                    className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors px-1"
                >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Back to Dashboard
                </Link>

                <div className="flex items-center gap-2 px-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm">Case Document</h2>
                        <p className="text-xs text-muted-foreground">Upload & Status</p>
                    </div>
                </div>

                {/* Upload Zone */}
                <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors relative bg-card/50">
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isProcessing || isStarting}
                    />
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                        <UploadCloud className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {file ? (
                        <>
                            <p className="text-sm font-medium text-foreground truncate max-w-full px-2">{file.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-medium">Click to upload</p>
                            <p className="text-xs text-muted-foreground mt-1">PDF • Max 10MB</p>
                        </>
                    )}
                </div>

                {/* Main Action Button */}
                {file && !isProcessing && !defaultComplete && !paramComplete && (
                    <Button
                        onClick={handleAnalyzeBoth}
                        className="w-full shadow-sm"
                        size="lg"
                        disabled={isStarting}
                    >
                        {isStarting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Starting...
                            </>
                        ) : (
                            <>
                                <Scale className="mr-2 h-4 w-4" />
                                Start Analysis
                            </>
                        )}
                    </Button>
                )}

                {/* Re-analyze Button */}
                {file && (defaultComplete || paramComplete) && !isProcessing && (
                    <Button
                        onClick={handleAnalyzeBoth}
                        className="w-full"
                        size="sm"
                        variant="ghost"
                        disabled={isStarting}
                    >
                        <Scale className="mr-2 h-4 w-4" />
                        Start New Analysis
                    </Button>
                )}

                {/* Progress & Status List */}
                {(isProcessing || defaultStatus || paramStatus) && (
                    <div className="flex-1 space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-muted-foreground">Analysis Status</span>
                                {(defaultComplete && paramComplete) && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">Completed</span>
                                )}
                            </div>

                            {/* Default Analysis Item */}
                            <div className="bg-card rounded-lg p-3 border shadow-sm">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${defaultComplete ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
                                        <span className="font-medium">Default Analysis</span>
                                    </div>
                                    {defaultComplete && <CheckCircle className="h-4 w-4 text-green-500" />}
                                </div>
                                <Progress value={defaultComplete ? 100 : (defaultStatus?.analysisProgress || 0)} className="h-1.5" />
                                <p className="text-xs text-muted-foreground mt-2 truncate">
                                    {defaultComplete ? 'Analysis complete' : (defaultStatus?.currentStep || 'Waiting...')}
                                </p>
                            </div>

                            {/* Parameterized Analysis Item */}
                            <div className="bg-card rounded-lg p-3 border shadow-sm">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${paramComplete ? 'bg-green-500' : 'bg-purple-500 animate-pulse'}`} />
                                        <span className="font-medium">Parameterized</span>
                                    </div>
                                    {paramComplete && <CheckCircle className="h-4 w-4 text-green-500" />}
                                </div>
                                <Progress value={paramComplete ? 100 : (paramStatus?.analysisProgress || 0)} className="h-1.5" />
                                <p className="text-xs text-muted-foreground mt-2 truncate">
                                    {paramComplete ? 'Analysis complete' : (paramStatus?.currentStep || 'Waiting...')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-auto bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600 font-medium">{error}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel - Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Header / Actions Bar */}
                <div className="h-16 shrink-0 border-b flex items-center justify-between px-6 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
                    <div className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold text-lg">Analysis Results</h2>
                    </div>

                    {(defaultComplete || paramComplete) && (
                        <div className="flex items-center gap-3">
                            {/* View Toggles */}
                            <div className="flex bg-muted p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab("default")}
                                    disabled={!defaultData}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "default"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100"
                                        }`}
                                >
                                    Default View
                                </button>
                                <button
                                    onClick={() => setActiveTab("with_parameters")}
                                    disabled={!paramData}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "with_parameters"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100"
                                        }`}
                                >
                                    Parameterized
                                </button>
                            </div>

                            <div className="h-4 w-px bg-border mx-1" />

                            {/* Downloads */}
                            {activeTab === "default" && !!defaultStatus?.defaultRecommendations && (
                                <DownloadPdfButton
                                    report={{
                                        title: file?.name?.replace('.pdf', '') || "Case Analysis",
                                        type: "default",
                                        data: defaultStatus.defaultRecommendations as any
                                    }}
                                />
                            )}
                            {activeTab === "with_parameters" && !!paramStatus?.parameterizedRecommendations && (
                                <DownloadPdfButton
                                    report={{
                                        title: file?.name?.replace('.pdf', '') || "Case Analysis",
                                        type: "parameterized",
                                        data: paramStatus.parameterizedRecommendations as any
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 xl:p-10 scroll-smooth">
                    <div id="analysis-results-container" className="max-w-5xl mx-auto">
                        {!defaultData && !paramData && !isProcessing && (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                                <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                                    <Scale className="h-10 w-10 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Analyze</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    Upload a procedural order, memorial, or award in the sidebar to generate comprehensive AI recommendations.
                                </p>
                            </div>
                        )}

                        {isProcessing && !defaultData && !paramData && (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                                <div className="h-16 w-16 relative mb-6">
                                    <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                                </div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">Processing Document</h3>
                                <p className="text-muted-foreground">
                                    Our AI is analyzing the document against ICSID rules...
                                </p>
                            </div>
                        )}

                        {activeTab === "default" && !!defaultData && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <RecommendationDisplay data={JSON.stringify(defaultData)} />
                            </div>
                        )}

                        {activeTab === "with_parameters" && !!paramData && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ParameterizedDisplay data={JSON.stringify(paramData)} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
