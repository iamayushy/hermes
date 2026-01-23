export function AnalysisSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="space-y-3">
                <div className="h-8 bg-muted rounded-lg w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>

            {/* Primary Recommendations Skeleton */}
            <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-6 space-y-3 bg-card">
                        <div className="flex items-start justify-between">
                            <div className="h-5 bg-muted rounded w-2/3"></div>
                            <div className="h-6 bg-muted rounded-full w-20"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-full"></div>
                            <div className="h-4 bg-muted rounded w-5/6"></div>
                            <div className="h-4 bg-muted rounded w-4/6"></div>
                        </div>
                        <div className="h-4 bg-muted rounded w-1/4 mt-4"></div>
                    </div>
                ))}
            </div>

            {/* Checklist Skeleton */}
            <div className="space-y-4 mt-8">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="border rounded-lg p-6 space-y-3 bg-card">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-4 w-4 bg-muted rounded"></div>
                            <div className="h-4 bg-muted rounded flex-1"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Additional Sections Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {[1, 2].map((i) => (
                    <div key={i} className="border rounded-lg p-6 space-y-3 bg-card">
                        <div className="h-5 bg-muted rounded w-1/2"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-full"></div>
                            <div className="h-4 bg-muted rounded w-3/4"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
