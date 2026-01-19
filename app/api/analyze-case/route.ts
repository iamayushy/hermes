import { NextRequest } from "next/server";
// @ts-ignore
import PDFParser from "pdf2json";
import { generateRecommendations } from "@/lib/recommendation-engine";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for complex analysis

async function extractPDFText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise<string>((resolve, reject) => {
        const parser = new PDFParser(null, true);
        parser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
        parser.on("pdfParser_dataReady", () => {
            resolve(parser.getRawTextContent());
        });
        parser.parseBuffer(buffer);
    });
}

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate and get org context
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        // 2. Parse form data
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
        }

        // 3. File size validation (max 10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            return new Response(
                JSON.stringify({ error: `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB` }),
                { status: 400 }
            );
        }

        // 4. Extract text from PDF
        const text = await extractPDFText(file);

        if (!text || text.trim().length === 0) {
            return new Response(JSON.stringify({ error: "Could not extract text from PDF" }), {
                status: 400,
            });
        }

        // 5. Generate recommendations (streaming)
        const stream = await generateRecommendations({
            text,
            orgId,
        });

        // 6. Convert Claude stream to HTTP stream
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
                            controller.enqueue(encoder.encode(chunk.delta.text));
                        }
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        console.error("Error analyzing case:", error);
        return new Response(
            JSON.stringify({ error: "Analysis failed", details: String(error) }),
            { status: 500 }
        );
    }
}
