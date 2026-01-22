"use server";

import { db } from "@/db";
import { proceduralOrders, proceduralEvents, proceduralTimelines } from "@/db/schema/procedural";
import Anthropic from "@anthropic-ai/sdk";
// @ts-ignore
import PDFParser from "pdf2json";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function processProceduralOrder(formData: FormData, orgId: string) {
    try {
        const file = formData.get("file") as File;
        if (!file) {
            throw new Error("No file provided");
        }

        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const textContent = await new Promise<string>((resolve, reject) => {
            const parser = new PDFParser(null, true);
            parser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
            parser.on("pdfParser_dataReady", () => {
                resolve(parser.getRawTextContent());
            });
            parser.parseBuffer(buffer);
        });



        if (!textContent || textContent.trim().length === 0) {
            throw new Error("Could not extract text from PDF");
        }


        const systemPrompt = `
      You are an expert legal assistant specializing in International Arbitration procedural orders.
      Your task is to extract structured data from a Procedural Order (PO) text.
      
      Output strictly valid JSON obeying the following schema mapping:
      
      {
        "order_meta": {
          "number": "string (e.g., 'Procedural Order No. 1')",
          "date": "YYYY-MM-DD", 
          "rules_context": ["string (e.g., 'ICSID Arbitration Rules 2022')"]
        },
        "events": [
          {
            "type": "string (e.g., 'Bifurcation', 'Security for Costs', 'Document Production')",
            "decision": "string (e.g., 'Granted', 'Denied', 'Deferred', 'Rules Established')",
            "discretionary": boolean,
            "rule_ref": "string (e.g., 'Rule 42(1)')"
          }
        ],
        "timelines": [
          {
            "phase": "string (e.g., 'Memorial on the Merits')",
            "party": "string (e.g., 'Claimant', 'Respondent', 'Tribunal')",
            "days": number (total days allowed or relative offset),
            "relative_to": "string (e.g., 'First Session', 'Counter-Memorial')"
          }
        ]
      }

      If you cannot find specific data, omit the field or use null. Do not hallucinate.
    `;

        const message = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: `Here is the text of a Procedural Order. Extract the data as JSON:\n\n${textContent.slice(0, 100000)}`
                }
            ]
        });

        const responseContent = message.content[0];
        if (responseContent.type !== "text") {
            throw new Error("Unexpected response from Claude");
        }


        const jsonString = responseContent.text.replace(/```json/g, "").replace(/```/g, "").trim();
        const structuredData = JSON.parse(jsonString);

        const [insertedOrder] = await db.insert(proceduralOrders).values({
            orgId: orgId,
            institution: "ICSID",
            proceduralOrderNumber: structuredData.order_meta?.number || "Unknown Order",
            orderDate: structuredData.order_meta?.date ? new Date(structuredData.order_meta.date) : new Date(),
            rulesContext: structuredData.order_meta?.rules_context || [],
            extractedJson: structuredData,
            caseType: "Arbitration"
        } as any).returning({ id: proceduralOrders.id });


        if (structuredData.events && structuredData.events.length > 0) {
            await db.insert(proceduralEvents).values(
                structuredData.events.map((e: any) => ({
                    proceduralOrderId: insertedOrder.id,
                    eventType: e.type,
                    decisionValue: e.decision,
                    discretionary: e.discretionary || false,
                    sourceRuleRef: e.rule_ref,
                    extraData: { raw: e }
                }))
            );
        }


        if (structuredData.timelines && structuredData.timelines.length > 0) {
            await db.insert(proceduralTimelines).values(
                structuredData.timelines.map((t: any) => ({
                    proceduralOrderId: insertedOrder.id,
                    phase: t.phase,
                    party: t.party,
                    days: typeof t.days === 'number' ? t.days : 0,
                    relativeTo: t.relative_to
                }))
            );
        }

        return { success: true, orderNumber: structuredData.order_meta?.number };

    } catch (error) {
        console.error("Error processing PO:", error);
        return { success: false, error: String(error) };
    }
}
