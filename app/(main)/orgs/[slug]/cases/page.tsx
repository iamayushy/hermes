import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases } from "@/db/schema/cases";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ChevronLeft, Plus, ExternalLink, CheckCircle, XCircle, Clock, Settings2 } from "lucide-react";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default async function CasesPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { orgSlug, orgId } = await auth();
    const { slug } = await params;

    if (orgSlug !== slug || !orgId) {
        redirect("/");
    }

    // Fetch all cases for this organization
    const orgCases = await db
        .select()
        .from(cases)
        .where(eq(cases.orgId, orgId))
        .orderBy(desc(cases.createdAt));

    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <Link
                            href={`/orgs/${slug}`}
                            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Case History</h1>
                        <p className="text-muted-foreground">
                            {orgCases.length} case{orgCases.length !== 1 ? 's' : ''} analyzed
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={`/orgs/${slug}/cases/new`}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Analysis
                        </Link>
                    </Button>
                </div>

                {orgCases.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <FileText className="h-16 w-16 text-muted-foreground/20 mb-4" />
                            <p className="text-muted-foreground mb-4">No cases analyzed yet</p>
                            <Button asChild>
                                <Link href={`/orgs/${slug}/cases/new`}>Analyze First Case</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">Case Title</TableHead>
                                    <TableHead>File</TableHead>
                                    <TableHead className="text-center">Default</TableHead>
                                    <TableHead className="text-center">Parameterized</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orgCases.map((caseItem) => {
                                    const hasDefault = caseItem.defaultRecommendations !== null;
                                    const hasParameterized = caseItem.parameterizedRecommendations !== null;

                                    return (
                                        <TableRow key={caseItem.id} className="group">
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={`/orgs/${slug}/cases/${caseItem.id}`}
                                                    className="hover:text-primary transition-colors flex items-center gap-2"
                                                >
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    {caseItem.caseTitle}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                <div className="truncate max-w-[200px]" title={caseItem.fileName}>
                                                    {caseItem.fileName}
                                                </div>
                                                <div className="text-xs">
                                                    {(caseItem.fileSize / 1024 / 1024).toFixed(2)} MB
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {hasDefault ? (
                                                    <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {hasParameterized ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Settings2 className="h-4 w-4 text-blue-600" />
                                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                                    </div>
                                                ) : (
                                                    <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        caseItem.status === "analyzed"
                                                            ? "default"
                                                            : caseItem.status === "error"
                                                                ? "destructive"
                                                                : "secondary"
                                                    }
                                                    className="capitalize"
                                                >
                                                    {caseItem.status === "analyzed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                                    {caseItem.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                                    {caseItem.status === "error" && <XCircle className="h-3 w-3 mr-1" />}
                                                    {caseItem.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {new Date(caseItem.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild size="sm" variant="ghost">
                                                    <Link href={`/orgs/${slug}/cases/${caseItem.id}`}>
                                                        View
                                                        <ExternalLink className="h-3 w-3 ml-1" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>
        </div>
    );
}
