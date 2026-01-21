"use client";

import { useState } from "react";
import html2pdf from "jspdf-html2canvas";
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
            // 1. Target the source
            const sourceElement = document.getElementById("analysis-results-container");
            if (!sourceElement) {
                throw new Error("Analysis content not found");
            }

            // 2. Clone for capture
            // We clone to ensure we capture the full scroll height without messing with the user's view
            const clone = sourceElement.cloneNode(true) as HTMLElement;

            // Set styles for consistent capture
            clone.style.position = "absolute";
            clone.style.top = "-9999px";
            clone.style.left = "-9999px";
            clone.style.width = "1000px"; // Adjusted for A4
            clone.style.height = "auto";
            clone.style.overflow = "visible";
            clone.style.backgroundColor = "#ffffff";
            clone.style.padding = "40px";

            // Ensure all icons and text are visible
            document.body.appendChild(clone);

            // Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 200));

            // POLYFILL: Robust Color Conversion using Browser DOM
            // html2canvas doesn't support 'oklch'/'lab'. We use the browser's own computed style engine
            // to convert these to 'rgb()' which html2canvas understands.

            const colorResolver = document.createElement('div');
            colorResolver.style.display = 'none';
            document.body.appendChild(colorResolver);

            const resolveColor = (color: string): string => {
                if (!color || (!color.includes('oklch') && !color.includes('lab') && !color.includes('var'))) {
                    return color;
                }
                colorResolver.style.backgroundColor = '';
                colorResolver.style.backgroundColor = color;
                const computed = window.getComputedStyle(colorResolver).backgroundColor;
                return (computed && computed !== 'rgba(0, 0, 0, 0)') ? computed : color;
            };

            const processStyleValue = (value: string): string => {
                if (!value || value === 'none') return value;

                // Replace any oklch() or lab() functions with their resolved RGB values
                // This handles gradients, shadows, and multiple colors in one property
                return value.replace(/(oklch|lab)\([^)]+\)/g, (match) => {
                    return resolveColor(match);
                });
            };

            const convertToRgb = (element: HTMLElement) => {
                const style = window.getComputedStyle(element);

                // Properties that often contain colors
                const colorProps = [
                    'color', 'background-color', 'border-color',
                    'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
                    'outline-color', 'fill', 'stroke', 'box-shadow', 'text-shadow'
                ];

                colorProps.forEach(prop => {
                    const val = style.getPropertyValue(prop);
                    if (val && (val.includes('oklch') || val.includes('lab') || val.includes('var'))) {
                        const resolved = processStyleValue(val);
                        // Use camelCase for style object access
                        const camelProp = prop.replace(/-([a-z])/g, g => g[1].toUpperCase());
                        (element.style as any)[camelProp] = resolved;
                    }
                });

                // Handle background-image separately for gradients
                const bgImage = style.getPropertyValue('background-image');
                if (bgImage && bgImage !== 'none' && (bgImage.includes('oklch') || bgImage.includes('lab'))) {
                    element.style.backgroundImage = processStyleValue(bgImage);
                }

                Array.from(element.children).forEach(child => convertToRgb(child as HTMLElement));
            };

            try {
                convertToRgb(clone);
            } finally {
                document.body.removeChild(colorResolver);
            }

            // 3. Use jspdf-html2canvas for multi-page PDF
            const timestamp = new Date().toISOString().split('T')[0];
            const saneTitle = report.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);

            await html2pdf(clone, {
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: "#ffffff",
                },
                imageType: "image/png",
                output: `${saneTitle}_${report.type}_analysis_${timestamp}.pdf`,
                margin: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10,
                }
            });

            // Cleanup
            document.body.removeChild(clone);

        } catch (error) {
            console.error("PDF generation detailed error:", error);
            if (error instanceof Error) {
                alert(`Failed to generate PDF: ${error.message}`);
            } else {
                alert("Failed to generate PDF. Check console for details.");
            }
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
