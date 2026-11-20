// Owner: shared (20 Nov 2026, owner's part 2). A company's small mark: its logo shipped in public/logos (data
// `companyLogo`, each file from the company's own site, research/jobs/logos.json), else a monogram of its everyday name.
// Used on the onboarding company tiles and «ملفي»'s company row and picker. Decorative: the name is always beside it.
import type { ReactNode } from "react";

import { cn } from "@/components/ui";
import type { Company } from "@/lib/data";
import { companyLogo } from "@/lib/data/company-logos";

/** The logo path of a company, by any of its names or its id («Maharah», «stc»), or null. */
export function companyLogoOf(company: Company): string | null {
  return companyLogo(company.en) ?? companyLogo(company.name) ?? companyLogo(company.short) ?? companyLogo(company.id);
}

export function CompanyMark({ company, size = 20, className }: { readonly company: Company; readonly size?: number; readonly className?: string }): ReactNode {
  const src = companyLogoOf(company);
  const box = { width: size, height: size };
  if (src) {
    return (
      // a plain img: a local file of a few KB, no optimisation needed, and it works offline on stage
      // eslint-disable-next-line @next/next/no-img-element
      <img alt="" aria-hidden className={cn("shrink-0 rounded-[0.3rem] bg-white object-contain p-px", className)} src={src} style={box} />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-[0.3rem] border border-border-strong bg-surface-2 font-bold leading-none text-fg", className)}
      style={{ ...box, fontSize: Math.round(size * 0.55) }}
    >
      {company.short.replace(/^ال(?=\S{2})/u, "").charAt(0)}
    </span>
  );
}
