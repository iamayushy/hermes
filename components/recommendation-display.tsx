"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Info, Calendar, Scale, FileText, Globe, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Recommendation {
    case_summary?: string;
    recommendations?: {
        language?: {
            recommendation: string;
            reasoning: string;
            rule_ref: string;
            confidence?: string;
        };
        timeline?: {
            phases?: Array<{
                name: string;
                suggested_days: number;
                reasoning: string;
                benchmark?: string;
            }>;
            rule_ref?: string;
        };
        bifurcation?: {
            recommendation: string;
            reasoning: string;
            historical_context?: string;
            rule_ref: string;
            discretionary?: boolean;
        };
        document_production?: {
            recommendation: string;
            reasoning: string;
            rule_ref: string;
        };
        hearing_format?: {
            recommendation: string;
            reasoning: string;
            rule_ref: string;
        };
        evidence_management?: {
            recommendations: string[];
            rule_ref: string;
        };
        mandatory_flags?: Array<{
            issue: string;
            severity: string;
            rule_ref: string;
            annulment_risk?: boolean;
        }>;
    };
}

export function RecommendationDisplay({ data }: { data: string }) {
    let parsed: Recommendation;

    // Clean up the data - remove markdown code blocks and extra whitespace
    let cleanedData = data.trim();

    // Remove markdown code block markers if present
    cleanedData = cleanedData.replace(/^```json\s*/i, '');
    cleanedData = cleanedData.replace(/^```\s*/i, '');
    cleanedData = cleanedData.replace(/\s*```$/i, '');
    cleanedData = cleanedData.trim();

    try {
        parsed = JSON.parse(cleanedData);
    } catch (e) {
        // If not valid JSON yet, show a loading state or the raw streaming text
        return (
            <div className="space-y-4">
                <Card className="border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            Generating Recommendations...
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="prose dark:prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap bg-muted/50 p-4 rounded text-xs font-mono">
                                {cleanedData || "Waiting for response..."}
                            </pre>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { case_summary, recommendations } = parsed;

    return (
        <div className="space-y-6">
            {/* Case Summary */}
            {case_summary && (
                <Card className="border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Case Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-base leading-relaxed text-foreground">{case_summary}</p>
                    </CardContent>
                </Card>
            )}

            {/* Mandatory Compliance Flags */}
            {recommendations?.mandatory_flags && recommendations.mandatory_flags.length > 0 && (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Mandatory Compliance Requirements
                        </CardTitle>
                        <CardDescription>Critical procedural requirements requiring immediate attention</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {recommendations.mandatory_flags.map((flag, i) => (
                            <div key={i} className="bg-background p-4 rounded-lg border border-destructive/20">
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-semibold text-foreground">{flag.issue}</h4>
                                    {flag.annulment_risk && (
                                        <Badge variant="destructive" className="text-xs">Annulment Risk</Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                    <span className="font-medium">Rule:</span> {flag.rule_ref}
                                </p>
                                <Badge variant="outline" className="text-xs">Severity: {flag.severity}</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Procedural Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Language */}
                {recommendations?.language && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Globe className="h-5 w-5 text-primary" />
                                Procedural Language
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Badge className="mb-2">{recommendations.language.recommendation}</Badge>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {recommendations.language.reasoning}
                                </p>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{recommendations.language.rule_ref}</span>
                                {recommendations.language.confidence && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {recommendations.language.confidence} confidence
                                    </Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Bifurcation */}
                {recommendations?.bifurcation && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Scale className="h-5 w-5 text-primary" />
                                Bifurcation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className="capitalize">{recommendations.bifurcation.recommendation}</Badge>
                                    {recommendations.bifurcation.discretionary && (
                                        <Badge variant="secondary" className="text-xs">Discretionary</Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                    {recommendations.bifurcation.reasoning}
                                </p>
                                {recommendations.bifurcation.historical_context && (
                                    <p className="text-xs text-primary/80 bg-primary/5 p-2 rounded">
                                        <Info className="h-3 w-3 inline mr-1" />
                                        {recommendations.bifurcation.historical_context}
                                    </p>
                                )}
                            </div>
                            <Separator />
                            <span className="text-xs text-muted-foreground">{recommendations.bifurcation.rule_ref}</span>
                        </CardContent>
                    </Card>
                )}

                {/* Hearing Format */}
                {recommendations?.hearing_format && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Scale className="h-5 w-5 text-primary" />
                                Hearing Format
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Badge className="mb-2 capitalize">{recommendations.hearing_format.recommendation}</Badge>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {recommendations.hearing_format.reasoning}
                                </p>
                            </div>
                            <Separator />
                            <span className="text-xs text-muted-foreground">{recommendations.hearing_format.rule_ref}</span>
                        </CardContent>
                    </Card>
                )}

                {/* Document Production */}
                {recommendations?.document_production && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="h-5 w-5 text-primary" />
                                Document Production
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm font-medium mb-2">{recommendations.document_production.recommendation}</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {recommendations.document_production.reasoning}
                                </p>
                            </div>
                            <Separator />
                            <span className="text-xs text-muted-foreground">{recommendations.document_production.rule_ref}</span>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Timeline */}
            {recommendations?.timeline?.phases && recommendations.timeline.phases.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Procedural Timeline
                        </CardTitle>
                        <CardDescription>Suggested deadlines based on historical benchmarks</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recommendations.timeline.phases.map((phase, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                                    <div className="shrink-0 w-16 text-center">
                                        <div className="text-2xl font-bold text-primary">{phase.suggested_days}</div>
                                        <div className="text-xs text-muted-foreground">days</div>
                                    </div>
                                    <Separator orientation="vertical" className="h-auto" />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-foreground mb-1">{phase.name}</h4>
                                        <p className="text-sm text-muted-foreground mb-1">{phase.reasoning}</p>
                                        {phase.benchmark && (
                                            <p className="text-xs text-primary/70">
                                                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                                {phase.benchmark}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {recommendations.timeline.rule_ref && (
                            <>
                                <Separator className="my-4" />
                                <span className="text-xs text-muted-foreground">{recommendations.timeline.rule_ref}</span>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Evidence Management */}
            {recommendations?.evidence_management && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Evidence Management
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <ul className="space-y-2">
                            {recommendations.evidence_management.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                    <span className="text-sm text-foreground">{rec}</span>
                                </li>
                            ))}
                        </ul>
                        <Separator />
                        <span className="text-xs text-muted-foreground">{recommendations.evidence_management.rule_ref}</span>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
