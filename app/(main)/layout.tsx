import {
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton,
    OrganizationSwitcher,
} from "@clerk/nextjs";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <header className="flex justify-between items-center p-4 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-xl tracking-tight text-primary">Procedo</span>
                    <SignedIn>
                        <OrganizationSwitcher
                            hideSlug={false}
                            afterCreateOrganizationUrl="/orgs/:slug"
                            afterSelectOrganizationUrl="/orgs/:slug"
                            appearance={{
                                elements: {
                                    organizationSwitcherTrigger: "h-9 px-3 border border-input rounded-md hover:bg-accent hover:text-accent-foreground"
                                }
                            }}
                        />
                    </SignedIn>
                </div>
                <div className="flex items-center gap-4">
                    <SignedOut>
                        <SignInButton mode="modal" />
                        <SignUpButton mode="modal" />
                    </SignedOut>
                    <SignedIn>
                        <UserButton />
                    </SignedIn>
                </div>
            </header>
            {children}
        </>
    );
}
