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
        <div className="h-[calc(100vh-4rem)] bg-background">
            <CaseAnalyzer />
        </div>
    );
}
