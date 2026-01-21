import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                const { userId, orgId } = await auth();

                if (!userId || !orgId) {
                    throw new Error('Unauthorized');
                }

                const expectedPrefix = `cases/${orgId}/`;
                if (!pathname.startsWith(expectedPrefix)) {
                    throw new Error(`Invalid upload path. Must be in ${expectedPrefix}`);
                }

                return {
                    allowedContentTypes: ['application/pdf'],
                    tokenPayload: JSON.stringify({ orgId, userId }),
                };
            },
            onUploadCompleted: async () => { },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 }
        );
    }
}
