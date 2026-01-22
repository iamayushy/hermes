import { HistoryUploader } from "@/components/history-uploader";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HistoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { orgSlug } = await auth();
    const { slug } = await params;

    if (orgSlug !== slug) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <Link href={`/orgs/${slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">Historical Data Management</h1>
                    <p className="text-muted-foreground">
                        Ingest past procedural orders to personalize the engine's recommendations for {slug}.
                    </p>
                </div>

                <HistoryUploader />
            </div>
        </div>
    );
}
