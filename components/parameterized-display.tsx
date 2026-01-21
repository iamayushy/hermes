"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Info, XCircle, Loader2, TrendingUp, Shield, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ParameterizedRecommendation {
    case_summary?: string;
    document_type?: string;
    compliance_score?: {
        overall: string;
        score_percentage: number;
        summary: string;
    };
    mandatory_compliance?: Array<{
        provision_ref: string;
        provision_name: string;
        status: string;
        finding: string;
        action_required?: string;
        annulment_risk?: boolean;
    }>;
    optimization_opportunities?: Array<{
        provision_ref: string;
        provision_name: string;
        current_approach: string;
        suggested_optimization: string;
        potential_impact: string;
        estimated_savings?: string;
        ai_role?: string;
    }>;
    recommendations?: any;
    efficiency_suggestions?: Array<{
        type: string;
        suggestion: string;
        rationale: string;
        potential_impact: string;
        estimated_savings?: string;
    }>;
    critical_flags?: Array<{
        issue: string;
        severity: string;
        rule_ref: string;
        annulment_risk?: boolean;
        action_required?: string;
        immediate_action?: string;
    }>;
    raw_response?: string;
}

export function ParameterizedDisplay({ data }: { data: string }) {
    let parsed: ParameterizedRecommendation;
    let cleanedData = data.trim();
    cleanedData = cleanedData.replace(/^```json\s*/i, '');
    cleanedData = cleanedData.replace(/^```\s*/i, '');
    cleanedData = cleanedData.replace(/\s*```$/i, '');
    cleanedData = cleanedData.trim();

    try {
        parsed = JSON.parse(cleanedData);

        // Check for invalid document
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
                    </CardContent>
                </Card>
            );
        }
    } catch (e) {
        // Loading state
        const loadingMessages = [
            "📄 Extracting document content...",
            "🔍 Analyzing against mandatory provisions...",
            "⚖️ Checking compliance requirements...",
            "📊 Identifying optimization opportunities...",
            "🎯 Calculating compliance score...",
            "✨ Generating recommendations..."
        ];

        const progressIndex = Math.min(
            Math.floor(cleanedData.length / 150),
            loadingMessages.length - 1
        );

        return (
            <div className="space-y-4">
                <Card className="border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            Parameterized Analysis
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

    const getComplianceColor = (score: string) => {
        switch (score) {
            case "fully_compliant": return "text-green-600 bg-green-50 dark:bg-green-950";
            case "partially_compliant": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950";
            case "non_compliant": return "text-red-600 bg-red-50 dark:bg-red-950";
            default: return "text-muted-foreground bg-muted";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "compliant": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case "non_compliant": return <XCircle className="h-4 w-4 text-red-600" />;
            default: return <Info className="h-4 w-4 text-muted-foreground" />;
        }
    };

    if (parsed.raw_response) {
        return (
            <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                        <AlertTriangle className="h-5 w-5" />
                        Analysis Formatting Issue
                    </CardTitle>
                    <CardDescription>
                        The AI analysis completed but the response was not in the expected format.
                        Below is the raw output.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-background p-4 rounded-md overflow-auto max-h-[500px] text-xs font-mono whitespace-pre-wrap border">
                        {parsed.raw_response}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Compliance Score Card */}
            {parsed.compliance_score && (
                <Card className={getComplianceColor(parsed.compliance_score.overall)}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Compliance Score
                            </div>
                            <div className="text-3xl font-bold">
                                {parsed.compliance_score.score_percentage}%
                            </div>
                        </CardTitle>
                        <CardDescription className="text-current/70">
                            {parsed.document_type && <Badge variant="outline" className="mr-2">{parsed.document_type}</Badge>}
                            {parsed.compliance_score.overall.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{parsed.compliance_score.summary}</p>
                    </CardContent>
                </Card>
            )}

            {/* Case Summary */}
            {parsed.case_summary && (
                <Card className="border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Case Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-base leading-relaxed">{parsed.case_summary}</p>
                    </CardContent>
                </Card>
            )}

            {/* Critical Flags */}
            {parsed.critical_flags && parsed.critical_flags.length > 0 && (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Critical Flags
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {parsed.critical_flags.map((flag, i) => (
                            <div key={i} className="bg-background p-4 rounded-lg border border-destructive/20">
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-semibold">{flag.issue}</h4>
                                    {flag.annulment_risk && (
                                        <Badge variant="destructive" className="text-xs">Annulment Risk</Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{flag.rule_ref}</p>
                                {flag.immediate_action && (
                                    <p className="text-sm text-destructive font-medium">
                                        Action: {flag.immediate_action}
                                    </p>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Mandatory Compliance */}
            {parsed.mandatory_compliance && parsed.mandatory_compliance.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Mandatory Provisions Compliance
                        </CardTitle>
                        <CardDescription>
                            Provisions that require strict compliance - AI monitors and flags only
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {parsed.mandatory_compliance.map((item, i) => (
                            <div key={i} className="bg-muted/50 p-4 rounded-lg">
                                <div className="flex items-start gap-3">
                                    {getStatusIcon(item.status)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs">{item.provision_ref}</Badge>
                                            <span className="font-medium text-sm">{item.provision_name}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">{item.finding}</p>
                                        {item.action_required && item.status === "non_compliant" && (
                                            <p className="text-sm text-red-600 font-medium">
                                                ⚠️ {item.action_required}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Optimization Opportunities */}
            {parsed.optimization_opportunities && parsed.optimization_opportunities.length > 0 && (
                <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <TrendingUp className="h-5 w-5" />
                            Optimization Opportunities
                        </CardTitle>
                        <CardDescription className="flex items-start gap-2">
                            <Info className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="text-xs">
                                AI-suggested improvements for optimizable provisions. Verify independently.
                            </span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {parsed.optimization_opportunities.map((opt, i) => (
                            <div key={i} className="bg-background p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                                <div className="flex items-start justify-between mb-2">
                                    <Badge variant="outline" className="text-xs">{opt.provision_ref}</Badge>
                                    <Badge
                                        variant="secondary"
                                        className={`text-xs ${opt.potential_impact === 'high'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : opt.potential_impact === 'medium'
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                            }`}
                                    >
                                        {opt.potential_impact} impact
                                    </Badge>
                                </div>
                                <h4 className="font-semibold text-sm mb-2">{opt.provision_name}</h4>
                                <div className="space-y-2 text-sm">
                                    <p className="text-muted-foreground">
                                        <span className="font-medium">Current:</span> {opt.current_approach}
                                    </p>
                                    <p className="text-blue-700 dark:text-blue-400">
                                        <span className="font-medium">Suggested:</span> {opt.suggested_optimization}
                                    </p>
                                    {opt.estimated_savings && (
                                        <p className="text-xs bg-blue-100 dark:bg-blue-950 p-2 rounded">
                                            💡 Estimated savings: {opt.estimated_savings}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Efficiency Suggestions */}
            {parsed.efficiency_suggestions && parsed.efficiency_suggestions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Efficiency Suggestions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {parsed.efficiency_suggestions.map((suggestion, i) => (
                            <div key={i} className="bg-muted/50 p-4 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {suggestion.type.replace(/_/g, ' ')}
                                    </Badge>
                                    <Badge
                                        variant="secondary"
                                        className={`text-xs ${suggestion.potential_impact === 'high'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                            }`}
                                    >
                                        {suggestion.potential_impact}
                                    </Badge>
                                </div>
                                <h4 className="font-semibold text-sm mb-1">{suggestion.suggestion}</h4>
                                <p className="text-sm text-muted-foreground">{suggestion.rationale}</p>
                                {suggestion.estimated_savings && (
                                    <p className="text-xs text-primary mt-2">
                                        💡 {suggestion.estimated_savings}
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
