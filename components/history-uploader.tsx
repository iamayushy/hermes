"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone"; // Note: might need to install this if not present, otherwise standard input
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadCloud, CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react";
import { processProceduralOrder } from "@/actions/ingest-history";
import { useAuth } from "@clerk/nextjs";

// We'll use a simple file input if dropzone isn't available, but let's try to assume we can implement flexible drag/drop logic or standard input
// For now, standard input to avoid dev dependency hell if react-dropzone missing. But wait, I can use a standard hidden input styled as dropzone.

export function HistoryUploader() {
    const { orgId } = useAuth();
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<{ name: string; status: "success" | "error"; msg?: string }[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const fileArray = Array.from(e.target.files);
            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

            // Filter out files that are too large
            const validFiles = fileArray.filter(f => f.size <= MAX_FILE_SIZE);
            const invalidFiles = fileArray.filter(f => f.size > MAX_FILE_SIZE);

            if (invalidFiles.length > 0) {
                alert(`${invalidFiles.length} file(s) exceed 5MB limit and were skipped`);
            }

            setFiles(validFiles);
            setResults([]);
        }
    };

    const handleUpload = async () => {
        if (!orgId || files.length === 0) return;

        setUploading(true);
        const newResults = [];

        for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);

            try {
                const res = await processProceduralOrder(formData, orgId);
                if (res.success) {
                    newResults.push({ name: file.name, status: "success" as const, msg: res.orderNumber });
                } else {
                    newResults.push({ name: file.name, status: "error" as const, msg: res.error });
                }
            } catch (err) {
                newResults.push({ name: file.name, status: "error" as const, msg: "Upload failed" });
            }
        }

        setResults(newResults);
        setFiles([]); // Clear queue
        setUploading(false);
    };

    return (
        <Card className="w-full max-w-3xl mx-auto">
            <CardHeader>
                <CardTitle>Upload Historical Procedural Orders</CardTitle>
                <CardDescription>
                    Upload previous POs (PDF) to train the recommendation engine on your organization&apos;s precedents.
                    <br />
                    <span className="text-xs text-muted-foreground mt-1 block">Max 5MB per file. Files are processed sequentially to avoid server overload.</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

                {/* Drop Zone Visual */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors relative">
                    <input
                        type="file"
                        multiple
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                    />
                    <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">Click or drag PDF files here</p>
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB per file • Sequential AI processing</p>
                </div>

                {/* File Queue */}
                {files.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Selected Files ({files.length})</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                                    <FileText className="h-4 w-4" />
                                    <span className="truncate flex-1">{f.name}</span>
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleUpload} disabled={uploading} className="w-full">
                            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing with AI...</> : "Start Ingestion"}
                        </Button>
                    </div>
                )}

                {/* Results */}
                {results.length > 0 && (
                    <div className="space-y-2 mt-4">
                        <h4 className="text-sm font-medium">Results</h4>
                        <div className="space-y-2">
                            {results.map((r, i) => (
                                <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded border ${r.status === 'success' ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10' : 'bg-red-50/50 border-red-200 dark:bg-red-900/10'}`}>
                                    {r.status === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                                    <span className="font-medium flex-1">{r.name}</span>
                                    <span className="text-muted-foreground">{r.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
