"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, Loader2, AlertCircle, FileText, Scale, Settings2, CheckCircle } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
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
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)]">
            {/* Left Panel - Document Upload */}
            <div className="w-full md:w-2/5 flex flex-col">
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Document Upload
                        </CardTitle>
                        <CardDescription>Upload a case document for AI analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                        {/* Upload Zone */}
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors relative min-h-[200px]">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isProcessing || isStarting}
                            />
                            <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                            {file ? (
                                <>
                                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-medium">Click to upload case document</p>
                                    <p className="text-xs text-muted-foreground mt-1">PDF • Max 10MB</p>
                                </>
                            )}
                        </div>

                        {/* Analyze Button */}
                        {file && !isProcessing && !defaultComplete && !paramComplete && (
                            <Button
                                onClick={handleAnalyzeBoth}
                                className="w-full"
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
                                        Analyze Document
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Re-analyze Button */}
                        {file && (defaultComplete || paramComplete) && !isProcessing && (
                            <Button
                                onClick={handleAnalyzeBoth}
                                className="w-full"
                                size="lg"
                                variant="outline"
                                disabled={isStarting}
                            >
                                <Scale className="mr-2 h-4 w-4" />
                                Re-analyze Document
                            </Button>
                        )}

                        {/* Progress Indicators */}
                        {(isProcessing || defaultStatus || paramStatus) && (
                            <div className="space-y-4 py-4">
                                {/* Default Analysis Progress */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            <span>Default Analysis</span>
                                        </div>
                                        {defaultComplete ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : defaultStatus?.status === 'error' ? (
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {defaultStatus?.currentStep || 'Waiting...'}
                                            </span>
                                        )}
                                    </div>
                                    <Progress value={defaultStatus?.analysisProgress || 0} className="h-2" />
                                </div>

                                {/* Parameterized Analysis Progress */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <Settings2 className="h-4 w-4" />
                                            <span>Parameterized Analysis</span>
                                        </div>
                                        {paramComplete ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : paramStatus?.status === 'error' ? (
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {paramStatus?.currentStep || 'Waiting...'}
                                            </span>
                                        )}
                                    </div>
                                    <Progress value={paramStatus?.analysisProgress || 0} className="h-2" />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/10 p-3 rounded">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Panel - Results */}
            <div className="w-full md:w-3/5 flex flex-col">
                <Card className="flex-1 flex flex-col max-h-[calc(100vh-12rem)]">
                    <CardHeader className="shrink-0">
                        <CardTitle className="flex items-center gap-2">
                            <Scale className="h-5 w-5 text-primary" />
                            AI Recommendations
                        </CardTitle>
                        <CardDescription>
                            Procedural guidance based on ICSID rules
                        </CardDescription>

                        {/* Tab Buttons */}
                        {(!!defaultData || !!paramData) && (
                            <div className="flex gap-2 mt-4">
                                <Button
                                    variant={activeTab === "default" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveTab("default")}
                                    disabled={!defaultData}
                                    className="flex-1"
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Default
                                    {!defaultComplete && defaultStatus?.status === 'processing' && (
                                        <Loader2 className="ml-2 h-3 w-3 animate-spin" />
                                    )}
                                </Button>
                                <Button
                                    variant={activeTab === "with_parameters" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveTab("with_parameters")}
                                    disabled={!paramData}
                                    className="flex-1"
                                >
                                    <Settings2 className="mr-2 h-4 w-4" />
                                    Parameterized
                                    {!paramComplete && paramStatus?.status === 'processing' && (
                                        <Loader2 className="ml-2 h-3 w-3 animate-spin" />
                                    )}
                                </Button>
                            </div>
                        )}

                        {/* Download Buttons */}
                        {(!!defaultData || !!paramData) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {!!defaultData && (
                                    <DownloadPdfButton
                                        report={{
                                            title: file?.name?.replace('.pdf', '') || "Case Analysis",
                                            type: "default",
                                            data: defaultData
                                        }}
                                    />
                                )}
                                {!!paramData && (
                                    <DownloadPdfButton
                                        report={{
                                            title: file?.name?.replace('.pdf', '') || "Case Analysis",
                                            type: "parameterized",
                                            data: paramData
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto min-h-0">
                        {!defaultData && !paramData && !isProcessing && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <FileText className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-sm">Upload a document to start analysis</p>
                                <p className="text-xs mt-2">
                                    Both analyses run in background - no timeout issues
                                </p>
                            </div>
                        )}

                        {isProcessing && !defaultData && !paramData && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-40" />
                                <p className="text-sm">Processing your document...</p>
                                <p className="text-xs mt-2">
                                    This may take 1-2 minutes
                                </p>
                            </div>
                        )}

                        {activeTab === "default" && !!defaultData && (
                            <RecommendationDisplay data={JSON.stringify(defaultData)} />
                        )}

                        {activeTab === "with_parameters" && !!paramData && (
                            <ParameterizedDisplay data={JSON.stringify(paramData)} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
