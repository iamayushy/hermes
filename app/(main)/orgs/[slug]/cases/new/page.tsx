import { CaseAnalyzer } from "@/components/case-analyzer";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function NewCasePage({
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
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <Link
                        href={`/orgs/${slug}`}
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">Case Analysis</h1>
                    <p className="text-muted-foreground">
                        Upload your case document to receive AI-powered procedural recommendations
                    </p>
                </div>

                <CaseAnalyzer />
            </div>
        </div>
    );
}
