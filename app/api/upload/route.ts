import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                const { userId, orgId } = await auth();

                if (!userId || !orgId) {
                    throw new Error('Unauthorized');
                }

                // Enforce folder structure: cases/orgId/filename
                const expectedPrefix = `cases/${orgId}/`;
                if (!pathname.startsWith(expectedPrefix)) {
                    throw new Error(`Invalid upload path. Must be in ${expectedPrefix}`);
                }

                return {
                    allowedContentTypes: ['application/pdf'],
                    tokenPayload: JSON.stringify({
                        orgId,
                        userId,
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // Optional: Could log upload completion or trigger other actions here
                // The main processing happens when the client calls /api/analyze-case
                try {
                    // const { orgId, userId } = JSON.parse(tokenPayload!);
                    // console.log(`Upload completed: ${blob.url} by user ${userId} in org ${orgId}`);
                } catch (error) {
                    console.error('Error parsing token payload:', error);
                }
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 }, // The webhook will retry 5 times automatically
        );
    }
}
