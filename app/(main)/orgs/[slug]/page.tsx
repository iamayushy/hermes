import { auth } from "@clerk/nextjs/server";
import { OrganizationList } from "@clerk/nextjs";
import { DashboardView } from "@/components/dashboard-view";
import { db } from "@/db";
import { cases } from "@/db/schema/cases";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { orgSlug, orgId } = await auth();
    const { slug } = await params;

    if (slug !== orgSlug) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
                <div className="text-center space-y-4">
                    <p className="text-lg font-medium text-foreground">
                        Sorry, Organization {slug} is not valid or you do not have access.
                    </p>
                    <div className="flex justify-center">
                        <OrganizationList
                            hideSlug={false}
                            afterCreateOrganizationUrl="/orgs/:slug"
                            afterSelectOrganizationUrl="/orgs/:slug"
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Calculate date for "this week" filter
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch all stats in parallel
    const [recentCases, totalCases, analyzedCases, thisWeekCases, casesWithParamAnalysis] = await Promise.all([
        // Recent cases (up to 5)
        orgId
            ? db
                .select()
                .from(cases)
                .where(eq(cases.orgId, orgId))
                .orderBy(desc(cases.createdAt))
                .limit(5)
            : Promise.resolve([]),

        // Total case count
        orgId
            ? db
                .select({ count: sql<number>`count(*)::int` })
                .from(cases)
                .where(eq(cases.orgId, orgId))
            : Promise.resolve([{ count: 0 }]),

        // Analyzed case count
        orgId
            ? db
                .select({ count: sql<number>`count(*)::int` })
                .from(cases)
                .where(and(eq(cases.orgId, orgId), eq(cases.status, 'analyzed')))
            : Promise.resolve([{ count: 0 }]),

        // Cases this week
        orgId
            ? db
                .select({ count: sql<number>`count(*)::int` })
                .from(cases)
                .where(and(eq(cases.orgId, orgId), gte(cases.createdAt, oneWeekAgo)))
            : Promise.resolve([{ count: 0 }]),

        // Cases with parameterized analysis
        orgId
            ? db
                .select({ count: sql<number>`count(*)::int` })
                .from(cases)
                .where(and(
                    eq(cases.orgId, orgId),
                    sql`${cases.parameterizedRecommendations} IS NOT NULL`
                ))
            : Promise.resolve([{ count: 0 }]),
    ]);

    const stats = {
        totalCases: totalCases[0]?.count ?? 0,
        analyzedCases: analyzedCases[0]?.count ?? 0,
        thisWeekCases: thisWeekCases[0]?.count ?? 0,
        parameterizedCases: casesWithParamAnalysis[0]?.count ?? 0,
    };

    return (
        <DashboardView
            organizationName={slug}
            recentCases={recentCases}
            stats={stats}
        />
    );
}
