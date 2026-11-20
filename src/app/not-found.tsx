// Owner: shell. The app's own 404 (an unknown URL outside every route of spec 2.1). Unknown /jobs/[id] and /learn/[id]
// are answered inside the shell by their pages with the same NotFoundBlock (spec 2.2). The tab title is the root
// layout's default, «دليل» (spec 2.2). Its button «رجوع لمساري» opens /path, whose Guard sends a signed-out visitor to
// the sign-in page.
import { Logo } from "@/components/brand";
import { PageTransition } from "@/components/motion";
import { NotFoundBlock } from "@/features/shared";

export default function NotFound() {
  return (
    <PageTransition className="@container/content flex min-h-dvh flex-col bg-bg">
      <header className="flex h-16 items-center px-gutter lg:h-22 lg:px-8">
        <Logo size={28} />
      </header>
      <div className="flex flex-1 flex-col justify-center pb-16">
        <NotFoundBlock />
      </div>
    </PageTransition>
  );
}
