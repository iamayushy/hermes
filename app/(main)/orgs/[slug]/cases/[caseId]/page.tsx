import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases } from "@/db/schema/cases";
import { eq, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronLeft, Calendar, Download } from "lucide-react";
import Link from "next/link";
import { CaseAnalysisTabs } from "@/components/case-analysis-tabs";
import { Button } from "@/components/ui/button";

export default async function CaseDetailPage({
    params,
}: {
    params: Promise<{ slug: string; caseId: string }>;
}) {
    const { orgSlug, orgId } = await auth();
    const { slug, caseId } = await params;

    if (orgSlug !== slug || !orgId) {
        redirect("/");
    }

    // Fetch case details
    const [caseItem] = await db
        .select()
        .from(cases)
        .where(and(eq(cases.id, caseId), eq(cases.orgId, orgId)));

    if (!caseItem) {
        redirect(`/orgs/${slug}/cases`);
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <Link
                        href={`/orgs/${slug}/cases`}
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Cases
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{caseItem.caseTitle}</h1>
                            <p className="text-muted-foreground flex items-center gap-2 mt-2">
                                <Calendar className="h-4 w-4" />
                                Created on{" "}
                                {new Date(caseItem.createdAt).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                        <Badge
                            variant={
                                caseItem.status === "analyzed"
                                    ? "default"
                                    : caseItem.status === "error"
                                        ? "destructive"
                                        : "secondary"
                            }
                        >
                            {caseItem.status}
                        </Badge>
                    </div>
                </div>

                {/* File Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Document Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">File Name</p>
                                <p className="text-sm text-muted-foreground">{caseItem.fileName}</p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <a href={caseItem.fileUrl} download target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                </a>
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                            <div>
                                <p className="text-sm font-medium">File Size</p>
                                <p className="text-sm text-muted-foreground">
                                    {(caseItem.fileSize / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Upload Date</p>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(caseItem.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Default Analysis</p>
                                <p className="text-sm text-muted-foreground">
                                    {caseItem.defaultRecommendations
                                        ? (caseItem.analyzedAt ? new Date(caseItem.analyzedAt).toLocaleDateString() : "Yes")
                                        : "Not run"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Parameterized Analysis</p>
                                <p className="text-sm text-muted-foreground">
                                    {caseItem.parameterizedRecommendations
                                        ? (caseItem.parameterizedAnalyzedAt ? new Date(caseItem.parameterizedAnalyzedAt).toLocaleDateString() : "Yes")
                                        : "Not run"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Error State */}
                {caseItem.status === "error" && (
                    <Card className="border-destructive/50 bg-destructive/5">
                        <CardContent className="pt-6">
                            <p className="text-destructive">{caseItem.errorMessage || "Analysis failed"}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Tabbed Analysis View */}
                {caseItem.status !== "error" && (
                    <CaseAnalysisTabs
                        caseId={caseItem.id}
                        initialStatus={caseItem.status}
                        caseTitle={caseItem.caseTitle}
                        defaultRecommendations={caseItem.defaultRecommendations}
                        parameterizedRecommendations={caseItem.parameterizedRecommendations}
                    />
                )}
            </div>
        </div>
    );
}
