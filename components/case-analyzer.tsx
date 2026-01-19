"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, AlertCircle, FileText, Scale } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { RecommendationDisplay } from "./recommendation-display";

export function CaseAnalyzer() {
    const { orgId } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [recommendations, setRecommendations] = useState<string>("");
    const [error, setError] = useState<string>("");

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
            setRecommendations("");
        }
    };

    const handleAnalyze = async () => {
        if (!file || !orgId) return;

        setAnalyzing(true);
        setError("");
        setRecommendations("");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/analyze-case", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Analysis failed");
            }

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
        } catch (err) {
            setError(String(err));
        } finally {
            setAnalyzing(false);
        }
    };

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
                                disabled={analyzing}
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

                        {file && !analyzing && !recommendations && (
                            <Button onClick={handleAnalyze} className="w-full" size="lg">
                                <FileText className="mr-2 h-4 w-4" />
                                Analyze with AI
                            </Button>
                        )}

                        {analyzing && (
                            <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Analyzing with Claude Opus 4.5...</span>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/10 p-3 rounded">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Document Preview Info */}
                        {file && (
                            <div className="mt-auto pt-4 border-t">
                                <h4 className="text-xs font-medium text-muted-foreground mb-2">Document Info</h4>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                    <p>• Type: {file.type || "application/pdf"}</p>
                                    <p>• Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <p>• Status: {recommendations ? "Analyzed" : analyzing ? "Analyzing..." : "Ready"}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Panel - Recommendations */}
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
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto min-h-0">
                        {!recommendations && !analyzing && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <FileText className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-sm">Upload and analyze a document to see recommendations</p>
                            </div>
                        )}

                        {recommendations && <RecommendationDisplay data={recommendations} />}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
