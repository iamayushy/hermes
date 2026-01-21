"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface ReportData {
    title: string;
    type: "default" | "parameterized";
    data: any;
}

export function DownloadPdfButton({ report }: { report: ReportData }) {
    const [generating, setGenerating] = useState(false);

    const generatePdf = async () => {
        setGenerating(true);

        try {
            const doc = new jsPDF();
            const margin = 20;
            let y = margin;
            const pageWidth = doc.internal.pageSize.getWidth();
            const maxWidth = pageWidth - 2 * margin;

            // Helper to add text with word wrap
            const addText = (text: string, size: number = 10, isBold: boolean = false) => {
                doc.setFontSize(size);
                doc.setFont("helvetica", isBold ? "bold" : "normal");
                const lines = doc.splitTextToSize(text, maxWidth);

                // Check if we need a new page
                const lineHeight = size * 0.4;
                if (y + lines.length * lineHeight > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    y = margin;
                }

                doc.text(lines, margin, y);
                y += lines.length * lineHeight + 4;
            };

            const addSection = (title: string) => {
                if (y > doc.internal.pageSize.getHeight() - 40) {
                    doc.addPage();
                    y = margin;
                }
                y += 6;
                doc.setDrawColor(200);
                doc.line(margin, y - 2, pageWidth - margin, y - 2);
                addText(title, 14, true);
            };

            // Header
            doc.setFillColor(30, 58, 138);
            doc.rect(0, 0, pageWidth, 30, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("Procedo AI Analysis Report", margin, 18);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`${report.type === "parameterized" ? "Parameterized" : "Default"} Analysis`, margin, 25);
            doc.setTextColor(0, 0, 0);
            y = 45;

            // Title
            addText(report.title, 16, true);
            addText(`Generated: ${new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            })}`, 10);
            y += 4;

            const data = report.data;

            // Compliance Score (for parameterized)
            if (data.compliance_score) {
                addSection("Compliance Score");
                addText(`Overall: ${data.compliance_score.overall?.replace(/_/g, " ").toUpperCase() || "N/A"}`, 12, true);
                addText(`Score: ${data.compliance_score.score_percentage || 0}%`, 12);
                if (data.compliance_score.summary) {
                    addText(data.compliance_score.summary, 10);
                }
            }

            // Case Summary
            if (data.case_summary) {
                addSection("Case Summary");
                addText(data.case_summary, 10);
            }

            // Critical Flags
            if (data.critical_flags && data.critical_flags.length > 0) {
                addSection("Critical Flags");
                data.critical_flags.forEach((flag: any, i: number) => {
                    addText(`${i + 1}. ${flag.issue}`, 11, true);
                    addText(`   Severity: ${flag.severity} | Rule: ${flag.rule_ref}`, 9);
                    if (flag.annulment_risk) addText("   ⚠️ Annulment Risk", 9);
                    if (flag.immediate_action) addText(`   Action: ${flag.immediate_action}`, 9);
                });
            }

            // Mandatory Compliance
            if (data.mandatory_compliance && data.mandatory_compliance.length > 0) {
                addSection("Mandatory Compliance");
                data.mandatory_compliance.forEach((item: any, i: number) => {
                    const status = item.status === "compliant" ? "✓" : item.status === "non_compliant" ? "✗" : "○";
                    addText(`${status} ${item.provision_ref}: ${item.provision_name}`, 10, true);
                    addText(`   ${item.finding}`, 9);
                    if (item.action_required) addText(`   Action: ${item.action_required}`, 9);
                });
            }

            // Optimization Opportunities
            if (data.optimization_opportunities && data.optimization_opportunities.length > 0) {
                addSection("Optimization Opportunities");
                data.optimization_opportunities.forEach((opt: any, i: number) => {
                    addText(`${i + 1}. ${opt.provision_name} (${opt.provision_ref})`, 10, true);
                    addText(`   Impact: ${opt.potential_impact}`, 9);
                    addText(`   Current: ${opt.current_approach}`, 9);
                    addText(`   Suggested: ${opt.suggested_optimization}`, 9);
                    if (opt.estimated_savings) addText(`   Savings: ${opt.estimated_savings}`, 9);
                });
            }

            // Recommendations
            if (data.recommendations) {
                addSection("Recommendations");
                const recs = data.recommendations;

                if (recs.language) {
                    addText(`Language: ${recs.language.recommendation}`, 10, true);
                    addText(`   ${recs.language.reasoning}`, 9);
                }

                if (recs.bifurcation) {
                    addText(`Bifurcation: ${recs.bifurcation.recommendation}`, 10, true);
                    addText(`   ${recs.bifurcation.reasoning}`, 9);
                }

                if (recs.hearing_format) {
                    addText(`Hearing Format: ${recs.hearing_format.recommendation}`, 10, true);
                    addText(`   ${recs.hearing_format.reasoning}`, 9);
                }

                if (recs.timeline?.phases) {
                    addText("Timeline:", 10, true);
                    recs.timeline.phases.forEach((phase: any) => {
                        addText(`   • ${phase.name}: ${phase.suggested_days} days - ${phase.reasoning}`, 9);
                    });
                }
            }

            // Efficiency Suggestions
            if (data.efficiency_suggestions && data.efficiency_suggestions.length > 0) {
                addSection("Efficiency Suggestions");
                data.efficiency_suggestions.forEach((sug: any, i: number) => {
                    addText(`${i + 1}. ${sug.suggestion}`, 10, true);
                    addText(`   Type: ${sug.type?.replace(/_/g, " ")} | Impact: ${sug.potential_impact}`, 9);
                    addText(`   ${sug.rationale}`, 9);
                    if (sug.estimated_savings) addText(`   Savings: ${sug.estimated_savings}`, 9);
                });
            }

            // Mandatory Flags (for default analysis)
            if (data.recommendations?.mandatory_flags && data.recommendations.mandatory_flags.length > 0) {
                addSection("Mandatory Flags");
                data.recommendations.mandatory_flags.forEach((flag: any, i: number) => {
                    addText(`${i + 1}. ${flag.issue}`, 10, true);
                    addText(`   Severity: ${flag.severity} | Rule: ${flag.rule_ref}`, 9);
                    if (flag.annulment_risk) addText("   ⚠️ Annulment Risk", 9);
                });
            }

            // Footer
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128);
                doc.text(
                    `Generated by Procedo AI | Page ${i} of ${pageCount}`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: "center" }
                );
                doc.text(
                    "AI-generated analysis - Please verify independently",
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 6,
                    { align: "center" }
                );
            }

            // Save
            const fileName = `${report.title.replace(/[^a-z0-9]/gi, '_')}_${report.type}_analysis.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error("PDF generation error:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={generatePdf} disabled={generating}>
            {generating ? (
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <Download className="h-4 w-4 mr-2" />
                    Download {report.type === "parameterized" ? "Parameterized" : "Default"} PDF
                </>
            )}
        </Button>
    );
}
