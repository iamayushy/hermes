"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Settings2, Scale } from "lucide-react";
import { RecommendationDisplay } from "./recommendation-display";
import { ParameterizedDisplay } from "./parameterized-display";
import { DownloadPdfButton } from "./download-pdf-button";

interface CaseAnalysisTabsProps {
    caseTitle: string;
    defaultRecommendations: any | null;
    parameterizedRecommendations: any | null;
}

export function CaseAnalysisTabs({
    caseTitle,
    defaultRecommendations,
    parameterizedRecommendations
}: CaseAnalysisTabsProps) {
    const hasDefault = defaultRecommendations !== null;
    const hasParameterized = parameterizedRecommendations !== null;

    // Default to parameterized if available, otherwise default
    const [activeTab, setActiveTab] = useState<"default" | "parameterized">(
        hasParameterized ? "parameterized" : "default"
    );

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
                                data: defaultRecommendations
                            }}
                        />
                    )}
                    {hasParameterized && (
                        <DownloadPdfButton
                            report={{
                                title: caseTitle,
                                type: "parameterized",
                                data: parameterizedRecommendations
                            }}
                        />
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto min-h-0">
                {activeTab === "default" && hasDefault && (
                    <RecommendationDisplay data={JSON.stringify(defaultRecommendations)} />
                )}

                {activeTab === "parameterized" && hasParameterized && (
                    <ParameterizedDisplay data={JSON.stringify(parameterizedRecommendations)} />
                )}
            </CardContent>
        </Card>
    );
}
