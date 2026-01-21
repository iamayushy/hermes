"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Info, Calendar, Scale, FileText, Globe, Loader2, Lightbulb, ListChecks, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ProcedoRecommendation {
    title: string;
    recommendation: string;
    rationale: string;
    priority: string;
    rule_reference: string;
}

interface ChecklistItem {
    item: string;
    status: string;
    deadline_guidance: string;
}

interface Recommendation {
    case_summary?: string;
    document_type?: string;
    procedo_recommends?: {
        primary_recommendations?: ProcedoRecommendation[];
        procedural_checklist?: ChecklistItem[];
    };
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
        efficiency_suggestions?: Array<{
            type: string;
            suggestion: string;
            rationale: string;
            potential_impact: string;
            estimated_savings?: string;
        }>;
        mandatory_flags?: Array<{
            issue: string;
            severity: string;
            rule_ref: string;
            annulment_risk?: boolean;
            immediate_action?: string;
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

        // Check if Claude detected an invalid document
        if (parsed && typeof parsed === 'object' && 'error' in parsed && (parsed as any).error === 'invalid_document') {
            return (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Invalid Document
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-foreground">
                            {(parsed as any).message || "This does not appear to be a valid case document."}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Please upload an arbitration-related document such as a procedural order, memorial, or submission.
                        </p>
                    </CardContent>
                </Card>
            );
        }

        // Check for non-ICSID warning
        if (parsed && typeof parsed === 'object' && 'warning' in parsed && (parsed as any).warning === 'non_icsid_document') {
            return (
                <Card className="border-amber-500/50 bg-amber-500/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                            <AlertTriangle className="h-5 w-5" />
                            Non-ICSID Document Detected
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-foreground font-medium mb-2">
                            {(parsed as any).message || "This document appears to be from a non-ICSID proceeding."}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Analysis has been halted because Procedo is specifically calibrated for ICSID rules and investment treaty arbitration. Recommendations generated for other arbitral rules (e.g., ICC, LCIA) may be inaccurate or misleading.
                        </p>
                    </CardContent>
                </Card>
            );
        }
    } catch (e) {
        const loadingMessages = [
            "📄 Extracting document content...",
            "🔍 Analyzing case context...",
            "⚖️ Matching applicable ICSID rules...",
            "📊 Querying historical precedents...",
            "🤖 Generating AI recommendations...",
            "✨ Finalizing analysis..."
        ];

        const progressIndex = Math.min(
            Math.floor(cleanedData.length / 100),
            loadingMessages.length - 1
        );

        return (
            <div className="space-y-4">
                <Card className="border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            Generating Recommendations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {loadingMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center gap-2 p-3 rounded-lg transition-all ${idx <= progressIndex
                                        ? 'bg-primary/10 text-foreground'
                                        : 'bg-muted/30 text-muted-foreground'
                                        }`}
                                >
                                    {idx < progressIndex ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                    ) : idx === progressIndex ? (
                                        <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                                    ) : (
                                        <div className="h-4 w-4 shrink-0" />
                                    )}
                                    <span className="text-sm">{msg}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { case_summary, recommendations, procedo_recommends, document_type } = parsed;

    return (
        <div className="space-y-6">
            {/* Case Summary with Document Type */}
            {case_summary && (
                <Card className="border-primary/20 bg-linear-to-r from-primary/5 to-transparent">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Case Summary
                            </CardTitle>
                            {document_type && (
                                <Badge variant="outline" className="text-xs">
                                    {document_type}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-base leading-relaxed text-foreground">{case_summary}</p>
                    </CardContent>
                </Card>
            )}

            {/* PROCEDO RECOMMENDS - Primary Section */}
            {procedo_recommends?.primary_recommendations && procedo_recommends.primary_recommendations.length > 0 && (
                <Card className="border-2 border-primary/30 bg-linear-to-br from-primary/10 via-primary/5 to-transparent shadow-lg">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-xl text-primary">
                            <Lightbulb className="h-6 w-6" />
                            Procedo Recommends
                        </CardTitle>
                        <CardDescription>
                            Key procedural recommendations based on ICSID rules and case analysis
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {procedo_recommends.primary_recommendations.map((rec, i) => (
                            <div key={i} className="bg-background p-4 rounded-lg border border-primary/20 shadow-sm">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                                        <h4 className="font-semibold text-foreground">{rec.title}</h4>
                                    </div>
                                    <Badge
                                        variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                                        className="text-xs capitalize"
                                    >
                                        {rec.priority} priority
                                    </Badge>
                                </div>
                                <p className="text-sm text-foreground mb-2 pl-6">{rec.recommendation}</p>
                                <p className="text-xs text-muted-foreground pl-6 mb-2">{rec.rationale}</p>
                                <div className="pl-6">
                                    <Badge variant="outline" className="text-xs">
                                        {rec.rule_reference}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Procedural Checklist */}
            {procedo_recommends?.procedural_checklist && procedo_recommends.procedural_checklist.length > 0 && (
                <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <ListChecks className="h-5 w-5" />
                            Procedural Checklist
                        </CardTitle>
                        <CardDescription>
                            Action items to address in this proceeding
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {procedo_recommends.procedural_checklist.map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-background rounded-lg border border-green-200 dark:border-green-900">
                                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${item.status === 'required' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                        item.status === 'recommended' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                        }`}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-foreground">{item.item}</span>
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {item.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{item.deadline_guidance}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
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

            {/* Efficiency & Cost Optimization Suggestions */}
            {recommendations?.efficiency_suggestions && recommendations.efficiency_suggestions.length > 0 && (
                <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                <Info className="h-5 w-5" />
                                Efficiency & Cost Optimization
                            </CardTitle>
                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400">
                                AI Suggestions
                            </Badge>
                        </div>
                        <CardDescription className="flex items-start gap-2">
                            <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 shrink-0" />
                            <span className="text-xs">
                                These are AI-generated suggestions for potential time and cost savings. Please verify all recommendations independently.
                            </span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {recommendations.efficiency_suggestions.map((suggestion, i) => (
                            <div key={i} className="bg-background p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                                <div className="flex items-start justify-between mb-2">
                                    <Badge
                                        variant="secondary"
                                        className={`text-xs ${suggestion.potential_impact === 'high'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : suggestion.potential_impact === 'medium'
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                            }`}
                                    >
                                        {suggestion.potential_impact} impact
                                    </Badge>
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {suggestion.type.replace(/_/g, ' ')}
                                    </Badge>
                                </div>
                                <h4 className="font-semibold text-foreground mb-2">{suggestion.suggestion}</h4>
                                <p className="text-sm text-muted-foreground mb-2">{suggestion.rationale}</p>
                                {suggestion.estimated_savings && (
                                    <p className="text-xs text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 p-2 rounded">
                                        💡 Estimated savings: {suggestion.estimated_savings}
                                    </p>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
