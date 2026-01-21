"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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

            // Set styles to ensure full capture
            clone.style.position = "absolute";
            clone.style.top = "-9999px";
            clone.style.left = "-9999px";
            clone.style.width = "1200px"; // Fixed width for consistent layout
            clone.style.height = "auto";
            clone.style.overflow = "visible";
            clone.style.backgroundColor = "#ffffff";

            // Ensure all icons and text are visible
            document.body.appendChild(clone);

            // Wait a moment for images/icons to render in the clone
            await new Promise(resolve => setTimeout(resolve, 100));

            // POLYFILL: Robust Color Conversion using Browser DOM
            // html2canvas doesn't support 'oklch'/'lab'. We use the browser's own computed style engine
            // to convert these to 'rgb()' which html2canvas understands.

            const colorResolver = document.createElement('div');
            colorResolver.style.display = 'none'; // Keep it hidden but attached
            document.body.appendChild(colorResolver);

            const resolveColor = (color: string): string => {
                if (!color || (!color.includes('oklch') && !color.includes('lab') && !color.includes('var'))) {
                    return color;
                }
                // Browser natively converts any valid CSS color to rgb/rgba when computing styles
                colorResolver.style.backgroundColor = color;
                const computed = window.getComputedStyle(colorResolver).backgroundColor;
                // If the browser couldn't parse it (empty/transparent), return original to be safe
                return (computed && computed !== 'rgba(0, 0, 0, 0)') ? computed : color;
            };

            const convertToRgb = (element: HTMLElement) => {
                const style = window.getComputedStyle(element);

                // 1. Handle solid colors
                const colorProps = [
                    'color', 'backgroundColor', 'borderColor',
                    'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor',
                    'textDecorationColor'
                ];

                colorProps.forEach(prop => {
                    const val = style.getPropertyValue(prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`));
                    // Check if the computed value ITSELF is still oklch (some browsers might, though rare for getComputedStyle)
                    // OR if we just want to be safe and force it to what the resolver says.
                    // Usually getComputedStyle(element) *already* returns RGB for colors in most browsers.
                    // The issue is likely that html2canvas reads the INLINE style or the stylesheet rule if it can't parse the computed one.
                    // We explicitly force the *resolved RGB* as an inline style.

                    if (val) {
                        // Even if it's already RGB, setting it inline helps html2canvas avoid re-parsing variability
                        // But specifically targeting oklch/lab is key.
                        if (val.includes('oklch') || val.includes('lab')) {
                            (element.style as any)[prop] = resolveColor(val);
                        } else if (val.startsWith('var')) {
                            // Variables might resolve to oklch
                            (element.style as any)[prop] = resolveColor(val);
                        } else {
                            // Ensure we lock in the computed value
                            (element.style as any)[prop] = val;
                        }
                    }
                });

                // 2. Handle gradients (backgroundImage)
                const bgImage = style.getPropertyValue('background-image');
                if (bgImage && bgImage !== 'none') {
                    // If gradient contains oklch/lab, replace them
                    if (bgImage.includes('oklch') || bgImage.includes('lab')) {
                        const newBg = bgImage.replace(/(oklch|lab)\([^)]+\)/g, (match) => {
                            return resolveColor(match);
                        });
                        element.style.backgroundImage = newBg;
                    }
                }

                Array.from(element.children).forEach(child => convertToRgb(child as HTMLElement));
            };

            try {
                convertToRgb(clone);
            } finally {
                document.body.removeChild(colorResolver);
            }

            // 3. Capture
            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                windowWidth: 1200
            });

            // Cleanup
            document.body.removeChild(clone);

            // 4. Initialize PDF
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            // 4. Add image to PDF (handling page breaks)
            // For simple long scrolling content, slicing an image often cuts text in half.
            // A smarter approach involves adding page by page.
            // However, a standard "long image slice" is a good V1 if the content isn't too broken up.
            // Let's implement the standard slicing first.

            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // 5. Save
            const timestamp = new Date().toISOString().split('T')[0];
            const saneTitle = report.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
            pdf.save(`${saneTitle}_${report.type}_analysis_${timestamp}.pdf`);

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
