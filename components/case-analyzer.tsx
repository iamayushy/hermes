"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, AlertCircle, FileText, Scale, Settings2, Download } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { RecommendationDisplay } from "./recommendation-display";
import { ParameterizedDisplay } from "./parameterized-display";
import { DownloadPdfButton } from "./download-pdf-button";

export function CaseAnalyzer() {
    const { orgId } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [analyzingDefault, setAnalyzingDefault] = useState(false);
    const [analyzingParameterized, setAnalyzingParameterized] = useState(false);
    const [activeTab, setActiveTab] = useState<"default" | "with_parameters">("default");
    const [defaultRecommendations, setDefaultRecommendations] = useState<string>("");
    const [parameterizedRecommendations, setParameterizedRecommendations] = useState<string>("");
    const [error, setError] = useState<string>("");

    const isAnalyzing = analyzingDefault || analyzingParameterized;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const MAX_SIZE = 10 * 1024 * 1024; // 10MB
            if (selectedFile.size > MAX_SIZE) {
                setError("File too large. Max 10MB.");
                return;
            }
            setFile(selectedFile);
            setError("");
            setDefaultRecommendations("");
            setParameterizedRecommendations("");
        }
    };

    const runAnalysis = async (
        mode: "default" | "with_parameters",
        fileToAnalyze: File,
        caseId?: string
    ): Promise<string | undefined> => {
        const setAnalyzing = mode === "default" ? setAnalyzingDefault : setAnalyzingParameterized;
        const setRecommendations = mode === "default" ? setDefaultRecommendations : setParameterizedRecommendations;

        try {
            setAnalyzing(true);
            const formData = new FormData();
            formData.append("file", fileToAnalyze);
            formData.append("analysisMode", mode);
            if (caseId) {
                formData.append("caseId", caseId);
            }

            const response = await fetch("/api/analyze-case", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Analysis failed");
            }

            // Get case ID from response header
            const returnedCaseId = response.headers.get("X-Case-Id");

            // Stream the response
            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body");

            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                accumulated += chunk;
                setRecommendations(accumulated);
            }

            return returnedCaseId || undefined;
        } finally {
            setAnalyzing(false);
        }
    };

    // Run BOTH analyses - sequentially so second uses same case ID
    const handleAnalyzeBoth = async () => {
        if (!file || !orgId) return;

        setError("");
        setDefaultRecommendations("");
        setParameterizedRecommendations("");
        setActiveTab("default");

        try {
            // Run default analysis first to get case ID
            const caseId = await runAnalysis("default", file);

            // Run parameterized analysis using same case ID
            if (caseId) {
                await runAnalysis("with_parameters", file, caseId);
            } else {
                // Fallback: run separately if no caseId returned
                await runAnalysis("with_parameters", file);
            }
        } catch (err) {
            let errorMessage = String(err);
            if (errorMessage.startsWith("Error: ")) {
                errorMessage = errorMessage.substring(7);
            }
            setError(errorMessage);
        }
    };

    // Parse recommendations for download
    const parseRecommendations = (data: string) => {
        try {
            let cleanedData = data.trim()
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();
            return JSON.parse(cleanedData);
        } catch {
            return null;
        }
    };

    const currentRecommendations = activeTab === "default"
        ? defaultRecommendations
        : parameterizedRecommendations;

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
                                disabled={isAnalyzing}
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

                        {/* Single Analyze Button - Runs Both */}
                        {file && !isAnalyzing && !defaultRecommendations && !parameterizedRecommendations && (
                            <Button
                                onClick={handleAnalyzeBoth}
                                className="w-full"
                                size="lg"
                            >
                                <Scale className="mr-2 h-4 w-4" />
                                Analyze Document (Both Modes)
                            </Button>
                        )}

                        {/* Re-analyze Button */}
                        {file && !isAnalyzing && (defaultRecommendations || parameterizedRecommendations) && (
                            <Button
                                onClick={handleAnalyzeBoth}
                                className="w-full"
                                size="lg"
                                variant="outline"
                            >
                                <Scale className="mr-2 h-4 w-4" />
                                Re-analyze Document
                            </Button>
                        )}

                        {/* Analysis Progress */}
                        {isAnalyzing && (
                            <div className="space-y-3 py-4">
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${analyzingDefault ? 'bg-primary/10' : defaultRecommendations ? 'bg-green-50 dark:bg-green-950' : 'bg-muted/50'}`}>
                                    {analyzingDefault ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) : defaultRecommendations ? (
                                        <FileText className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-sm">
                                        Default Analysis {analyzingDefault ? "(Running...)" : defaultRecommendations ? "✓ Complete" : "(Pending)"}
                                    </span>
                                </div>
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${analyzingParameterized ? 'bg-primary/10' : parameterizedRecommendations ? 'bg-green-50 dark:bg-green-950' : 'bg-muted/50'}`}>
                                    {analyzingParameterized ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) : parameterizedRecommendations ? (
                                        <Settings2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-sm">
                                        Parameterized Analysis {analyzingParameterized ? "(Running...)" : parameterizedRecommendations ? "✓ Complete" : "(Pending)"}
                                    </span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/10 p-3 rounded">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Document Info */}
                        {file && (
                            <div className="mt-auto pt-4 border-t">
                                <h4 className="text-xs font-medium text-muted-foreground mb-2">Analysis Status</h4>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                    <p>• Default: {defaultRecommendations ? "✓ Complete" : analyzingDefault ? "Running..." : "Not run"}</p>
                                    <p>• Parameterized: {parameterizedRecommendations ? "✓ Complete" : analyzingParameterized ? "Running..." : "Not run"}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Panel - Recommendations with Tabs */}
            <div className="w-full md:w-3/5 flex flex-col">
                <Card className="flex-1 flex flex-col max-h-[calc(100vh-12rem)]">
                    <CardHeader className="shrink-0">
                        <CardTitle className="flex items-center gap-2">
                            <Scale className="h-5 w-5 text-primary" />
                            AI Recommendations
                        </CardTitle>
                        <CardDescription>
                            Procedural guidance based on ICSID rules and historical precedents
                        </CardDescription>

                        {/* Tab Buttons */}
                        {(defaultRecommendations || parameterizedRecommendations) && (
                            <div className="flex gap-2 mt-4">
                                <Button
                                    variant={activeTab === "default" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveTab("default")}
                                    disabled={!defaultRecommendations && !analyzingDefault}
                                    className="flex-1"
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Default Analysis
                                    {analyzingDefault && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
                                </Button>
                                <Button
                                    variant={activeTab === "with_parameters" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveTab("with_parameters")}
                                    disabled={!parameterizedRecommendations && !analyzingParameterized}
                                    className="flex-1"
                                >
                                    <Settings2 className="mr-2 h-4 w-4" />
                                    With Parameters
                                    {analyzingParameterized && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
                                </Button>
                            </div>
                        )}

                        {/* Download Buttons */}
                        {(defaultRecommendations || parameterizedRecommendations) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {defaultRecommendations && parseRecommendations(defaultRecommendations) && (
                                    <DownloadPdfButton
                                        report={{
                                            title: file?.name?.replace('.pdf', '') || "Case Analysis",
                                            type: "default",
                                            data: parseRecommendations(defaultRecommendations)
                                        }}
                                    />
                                )}
                                {parameterizedRecommendations && parseRecommendations(parameterizedRecommendations) && (
                                    <DownloadPdfButton
                                        report={{
                                            title: file?.name?.replace('.pdf', '') || "Case Analysis",
                                            type: "parameterized",
                                            data: parseRecommendations(parameterizedRecommendations)
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto min-h-0">
                        {!currentRecommendations && !isAnalyzing && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <FileText className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-sm">Upload and analyze a document to see recommendations</p>
                                <p className="text-xs mt-2">
                                    Both Default and Parameterized analyses will run automatically
                                </p>
                            </div>
                        )}

                        {activeTab === "default" && defaultRecommendations && (
                            <RecommendationDisplay data={defaultRecommendations} />
                        )}

                        {activeTab === "with_parameters" && parameterizedRecommendations && (
                            <ParameterizedDisplay data={parameterizedRecommendations} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
