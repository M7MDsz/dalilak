// Generates src/lib/data/guides.ts. Run: node research/guides/gen-guides.mjs <project root>
// Sources, in order of precedence for each skill:
//   1. research/guides/quality/g*.json  (the 20 Nov 2026 quality pass: every link re-opened, a certificate block per
//      skill, Arabic and Saudi courses where their pages opened). A skill found here replaces its base entry entirely.
//   2. research/guides/guides-demo.json (5 "full" skills) and guides-rest.json (33 "basic" skills): the first pass.
//   3. research/guides/people-links.json (optional, may be partial): each person's other profiles, by exact name.
// The editorial calls made on top of the research are listed below (EDITS) so they are visible and reversible.
// Output: UTF-8, LF.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("usage: node gen-guides.mjs <project root>");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const demo = readJson(join(root, "research/guides/guides-demo.json"));
const rest = readJson(join(root, "research/guides/guides-rest.json"));

const qualityDir = join(root, "research/guides/quality");
const quality = {};
if (existsSync(qualityDir)) {
  for (const f of readdirSync(qualityDir).filter((n) => /^g\d+\.json$/.test(n)).sort()) {
    const q = readJson(join(qualityDir, f));
    for (const [skill, entry] of Object.entries(q.skills)) {
      if (quality[skill]) throw new Error(`skill ${skill} in two quality files`);
      quality[skill] = { ...entry, _checkedAt: q.checkedAt, _file: f };
    }
  }
}

const linksPath = join(root, "research/guides/people-links.json");
const peopleLinks = existsSync(linksPath) ? (readJson(linksPath).people ?? {}) : {};

const SKILL_ORDER = [...readFileSync(join(root, "src/lib/data/skills.ts"), "utf8").matchAll(/^\s{4}id: "([a-z-]+)",$/gm)].map((m) => m[1]);
if (SKILL_ORDER.length !== 38) throw new Error(`expected 38 skills, got ${SKILL_ORDER.length}`);

// ── editorial calls on top of the research (each one checked against the item's own opened page) ──────────────────
const EDITS = {
  // Arabic edition first: the same course, same provider, in Arabic, for a Saudi beginner. The English one stays as an
  // alternative. (url of the alternative to promote)
  arabicFirst: {
    "ux-research": "https://www.coursera.org/learn/conduct-ux-research-and-test-early-concepts-arabic",
    prototyping: "https://www.coursera.org/learn/build-wireframes-and-low-fidelity-prototypes-arabic",
    "project-management": "https://www.coursera.org/learn/foundations-of-project-management-arabic",
    "hr-basics": "https://www.coursera.org/learn/managing-human-resources-ar",
    teamwork: "https://www.coursera.org/learn/teamwork-skills-effective-communication-ar",
  },
  // Fee shown only when the issuer's own page states it. aPHRi's price came from a partner store: dropped.
  dropFee: new Set(["hr-basics"]),
  // The official page says the price depends on the country where the exam is taken (no single number).
  feeVaries: new Set(["excel", "powerbi", "git"]),
  // How the amount reads: "from" = the lowest price on the page, "about" = the page says "typically".
  feeQualifier: { "python-data": "from", "financial-analysis": "from", "design-basics": "about", english: "from" },
  // A shorter issuer line where the research kept a delivery note in it (the note stays in the research file).
  issuer: { "design-basics": "Adobe", english: "IELTS" },
  // CFA Level I asks ~300 hours of study: advanced for a Dalil learner, whatever its name says.
  level: { "financial-analysis": "advanced" },
  // The short label of the list chip «شهادة: …» (the exam code when there is one).
  short: {
    excel: "MO-211",
    sql: "Databricks SQL",
    powerbi: "PL-300",
    dataviz: "Tableau",
    "python-data": "PCED",
    ml: "AIF-C01",
    programming: "PCEP",
    git: "GH-900",
    javascript: "JSA",
    react: "Meta Front-End",
    "design-basics": "Adobe Photoshop",
    "ux-research": "Google UX",
    "ui-design": "Google UX",
    prototyping: "Google UX",
    "marketing-basics": "Google Digital Marketing",
    content: "HubSpot",
    "social-media": "HubSpot",
    ads: "Google Ads",
    english: "IELTS",
    "project-management": "Google PM",
    accounting: "SOCPA",
    agile: "PSM I",
    "business-analysis": "ECBA",
    "financial-analysis": "CFA Level I",
    "hr-basics": "aPHRi",
    recruitment: "SHRM",
  },
};

const price = (p) => {
  if (p === null || p === undefined) return null;
  if (p === "free") return "free";
  if (p === "paid") return "paid";
  if (p === "free_to_audit" || p === "free to audit") return "free_to_audit";
  throw new Error(`price ${p}`);
};
const cert = (c) => {
  if (c === true || c === "yes") return true;
  if (c === false || c === "no") return false;
  if (c === null || c === undefined) return null;
  throw new Error(`certificate ${c}`);
};
const lang = (l) => {
  if (l === "ar" || l === "en") return l;
  throw new Error(`lang ${l}`);
};
const sources = (list) => {
  if (list === null || list === undefined || list.length === 0) return null;
  return list.map((s) => ({ label: s.label ?? s.source, url: s.url, note: s.note ?? null }));
};
const req = (v, what) => {
  if (typeof v !== "string" || v.length === 0) throw new Error(`missing ${what}`);
  return v;
};
const url = (v, what) => {
  const u = req(v, what);
  if (!/^https?:\/\//.test(u)) throw new Error(`bad url ${what}: ${u}`);
  return u;
};

function course(c, checkedAt, inheritedSources) {
  return {
    title: req(c.title, "title"),
    provider: req(c.provider, "provider"),
    url: url(c.url, "url"),
    lang: lang(c.lang ?? c.language),
    price: price(c.price),
    financialAid: c.financialAid === true ? true : null,
    hours: typeof c.hours === "number" ? c.hours : null,
    certificate: cert(c.certificate),
    star: typeof c.star === "number" ? c.star : null,
    why: req(c.why, "why"),
    recommendedBy: inheritedSources === undefined ? sources(c.recommendedBy) : inheritedSources,
    checkedAt: c.checkedAt ?? checkedAt,
  };
}

const LINK_KINDS = ["linkedin", "x", "youtube", "website", "github"];
const strip = (u) => u.replace(/\/+$/, "").toLowerCase();
/** The person's other profiles (people-links.json), minus the one the row already links to. */
function linksOf(entry, mainUrl) {
  if (!entry) return null;
  const out = {};
  for (const k of LINK_KINDS) {
    const u = entry[k]?.url;
    if (typeof u === "string" && /^https:\/\//.test(u) && (mainUrl === null || strip(u) !== strip(mainUrl))) out[k] = u;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function person(p, checkedAt) {
  const base = {
    name: req(p.name, "name"),
    platform: req(p.platform, "platform"),
    url: url(p.url, "url"),
    why: req(p.why, "why"),
    arab: typeof p.arab === "boolean" ? p.arab : null,
    saudiBased: typeof p.saudiBased === "boolean" ? p.saudiBased : null,
    recommendedBy: sources(p.recommendedBy),
    checkedAt: p.checkedAt ?? checkedAt,
  };
  const entry = peopleLinks[base.name];
  const links = linksOf(entry, base.url);
  const members = entry?.members
    ? Object.entries(entry.members)
        .map(([name, m]) => ({ name, links: linksOf(m, null) }))
        .filter((m) => m.links !== null)
    : [];
  return { ...base, ...(links ? { links } : {}), ...(members.length > 0 ? { members } : {}) };
}
function article(a, checkedAt) {
  return {
    title: req(a.title, "title"),
    author: req(a.author, "author"),
    site: req(a.site, "site"),
    url: url(a.url, "url"),
    lang: lang(a.lang),
    why: req(a.why, "why"),
    recommendedBy: sources(a.recommendedBy),
    checkedAt: a.checkedAt ?? checkedAt,
  };
}

const LEVELS = new Set(["beginner", "intermediate", "advanced"]);
function certification(skill, c, checkedAt) {
  if (!c) return null;
  if (c.kind === "none") {
    return {
      kind: "none",
      proof: req(c.proof, "proof"),
      proofUrl: c.proofUrl ? url(c.proofUrl, "proofUrl") : null,
      why: req(c.why, "why"),
      checkedAt: c.checkedAt ?? checkedAt,
    };
  }
  if (c.kind !== "official") throw new Error(`${skill}: certification kind ${c.kind}`);
  const level = EDITS.level[skill] ?? c.level;
  if (!LEVELS.has(level)) throw new Error(`${skill}: level ${level}`);
  if (c.type !== "exam" && c.type !== "program") throw new Error(`${skill}: type ${c.type}`);
  let fee = null;
  if (c.fee && !EDITS.dropFee.has(skill)) {
    if (typeof c.fee.amount !== "number") throw new Error(`${skill}: fee amount`);
    if (c.fee.currency !== "USD" && c.fee.currency !== "SAR") throw new Error(`${skill}: currency ${c.fee.currency}`);
    fee = {
      amount: c.fee.amount,
      currency: c.fee.currency,
      qualifier: EDITS.feeQualifier[skill] ?? null,
      per: /per month|a month|subscription/i.test(c.fee.note ?? "") ? "month" : null,
      note: req(c.fee.note, `${skill} fee note`),
    };
  }
  const short = EDITS.short[skill];
  if (!short) throw new Error(`${skill}: no short label`);
  return {
    kind: "official",
    name: req(c.name, "cert name"),
    short,
    issuer: EDITS.issuer[skill] ?? req(c.issuer, "issuer"),
    code: c.code ?? null,
    type: c.type,
    url: url(c.url, "cert url"),
    fee,
    feeVaries: EDITS.feeVaries.has(skill),
    prepUrl: url(c.prepUrl, "prepUrl"),
    prepLabel: req(c.prepLabel, "prepLabel"),
    level,
    star: typeof c.star === "number" ? c.star : 1,
    why: req(c.why, "cert why"),
    checkedAt: c.checkedAt ?? checkedAt,
  };
}

function arabicFirst(skill, top, alternatives) {
  const promote = EDITS.arabicFirst[skill];
  if (!promote) return { top, alternatives };
  const i = alternatives.findIndex((a) => a.url === promote);
  if (i < 0) throw new Error(`${skill}: arabicFirst url not among alternatives`);
  const ar = alternatives[i];
  if (ar.lang !== "ar") throw new Error(`${skill}: promoted course is not Arabic`);
  return { top: ar, alternatives: [top, ...alternatives.filter((_, j) => j !== i)] };
}

const guides = [];
const counts = { quality: 0, base: 0 };
for (const skill of SKILL_ORDER) {
  const d = demo.skills[skill];
  const r = rest.skills[skill];
  const q = quality[skill];
  if (d && r) throw new Error(`skill ${skill} in both files`);
  if (!d && !r) throw new Error(`no guide for ${skill}`);
  const full = Boolean(d);
  const src = q ?? d ?? r;
  const at = q ? q._checkedAt : full ? demo.checkedAt : rest.checkedAt;
  if (q) counts.quality++;
  else counts.base++;

  const topRaw = course(src.topPick, at, full ? undefined : null);
  const altsRaw = src.alternatives.map((c) => course(c, at, full ? undefined : null));
  if (!full && q) {
    // the quality pass kept the per-course sources of the basic skills: keep them
    topRaw.recommendedBy = sources(src.topPick.recommendedBy);
    altsRaw.forEach((a, i) => (a.recommendedBy = sources(src.alternatives[i].recommendedBy)));
  }
  const { top, alternatives } = arabicFirst(skill, topRaw, altsRaw);
  if (alternatives.length > 2) console.warn(`${skill}: ${alternatives.length} alternatives, kept 2`);
  const proofTask = full ? src.proofTask : null;
  const guide = {
    skill,
    depth: full ? "full" : "basic",
    topPick: top,
    alternatives: alternatives.slice(0, 2),
    people: (src.people ?? []).map((p) => person(p, at)),
    articles: full ? (src.articles ?? []).map((a) => article(a, at)) : [],
    proof: proofTask
      ? {
          task: req(proofTask.task, "task"),
          dataset: proofTask.dataset ? { name: proofTask.dataset.name, provider: proofTask.dataset.provider, url: url(proofTask.dataset.url, "dataset url") } : null,
          checkedAt: at,
        }
      : null,
    recommendedBy: full ? null : sources(src.recommendedBy),
    checkedAt: at,
  };
  const c = certification(skill, src.certification, at);
  if (c) guide.certification = c;
  guides.push(guide);
}

const lit = (v, indent = "") => {
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    const inner = indent + "  ";
    return "[\n" + v.map((x) => inner + lit(x, inner)).join(",\n") + ",\n" + indent + "]";
  }
  const inner = indent + "  ";
  const entries = Object.entries(v);
  return "{\n" + entries.map(([k, x]) => `${inner}${/^[a-zA-Z_]\w*$/.test(k) ? k : JSON.stringify(k)}: ${lit(x, inner)}`).join(",\n") + ",\n" + indent + "}";
};

const header = `// Owner: data. The learning guides: for each of the 38 skills, where to learn it (one top pick «ابدأ بهذا» and at most two
// alternatives), who to follow (with their other profiles), what to read, how to know you have it (a proof task), and
// the certificate that proves it («الشهادة اللي تثبت مهارتك»), or an honest «no recognised certificate» with the best
// practical proof instead. Real items only: every link was opened on ${demo.checkedAt} (the quality pass re-opened all of
// them); each item keeps its url, the source where it was found recommended (null when none could be opened) and the
// date it was checked. Certificate fees are shown only as the issuer's own page states them. Generated by
// research/guides/gen-guides.mjs from research/guides/quality/*.json (over guides-demo.json / guides-rest.json) and
// research/guides/people-links.json; the editorial calls are listed in the generator. Do not edit by hand. Unknown
// hours, price or certificate stay null and are not shown. Shipped with the app, so the guides work offline. Pure module.
import type { SkillId } from "@/lib/types";

export type GuideLang = "ar" | "en";
/** «free_to_audit»: free to attend, the certificate is paid. */
export type GuidePrice = "free" | "paid" | "free_to_audit";

/** Where an item was found recommended (an opened page). */
export interface GuideSource {
  readonly label: string;
  readonly url: string;
  readonly note: string | null;
}

export interface GuideCourse {
  readonly title: string;
  readonly provider: string;
  readonly url: string;
  readonly lang: GuideLang;
  readonly price: GuidePrice | null;
  /** True when the course page says «Financial aid available»; null when it does not say. */
  readonly financialAid?: true | null;
  /** Only when the course page states it. */
  readonly hours: number | null;
  readonly certificate: boolean | null;
  /** The Dalil star (1-3) the item fits, when the research gave one. */
  readonly star: number | null;
  /** One line, Arabic. */
  readonly why: string;
  readonly recommendedBy: readonly GuideSource[] | null;
  /** ISO date the link was opened. */
  readonly checkedAt: string;
}

/** A person's other profiles, each only as published by a page the person runs. */
export interface GuidePersonLinks {
  readonly linkedin?: string;
  readonly x?: string;
  readonly youtube?: string;
  readonly website?: string;
  readonly github?: string;
}

export interface GuidePerson {
  readonly name: string;
  readonly platform: string;
  readonly url: string;
  /** One line, Arabic. */
  readonly why: string;
  /** Null when the research did not say. */
  readonly arab: boolean | null;
  readonly saudiBased: boolean | null;
  readonly recommendedBy: readonly GuideSource[] | null;
  readonly checkedAt: string;
  /** Other profiles (the row's own url left out). For a two-person entry these are the shared brand's. */
  readonly links?: GuidePersonLinks;
  /** A two-person entry («Marco Russo & Alberto Ferrari (SQLBI)»): each member's own profiles. */
  readonly members?: readonly { readonly name: string; readonly links: GuidePersonLinks }[];
}

export interface GuideArticle {
  readonly title: string;
  readonly author: string;
  readonly site: string;
  readonly url: string;
  readonly lang: GuideLang;
  /** One line, Arabic: what you get from it. */
  readonly why: string;
  readonly recommendedBy: readonly GuideSource[] | null;
  readonly checkedAt: string;
}

export interface GuideProof {
  readonly task: string;
  readonly dataset: { readonly name: string; readonly provider: string; readonly url: string } | null;
  readonly checkedAt: string;
}

export type GuideCertLevel = "beginner" | "intermediate" | "advanced";

/** A fee exactly as the issuer's page states it. amount 0 = free. */
export interface GuideCertFee {
  readonly amount: number;
  readonly currency: "USD" | "SAR";
  /** "from": the lowest price on the page; "about": the page says "typically". */
  readonly qualifier: "from" | "about" | null;
  /** "month": a monthly subscription (Coursera programmes). */
  readonly per: "month" | null;
  /** Where the number comes from, in English (not shown). */
  readonly note: string;
}

/** A recognised certificate for the skill, from its issuer's own page. */
export interface GuideCertOfficial {
  readonly kind: "official";
  readonly name: string;
  /** The list chip «شهادة: PL-300»: the exam code, or a short name. */
  readonly short: string;
  readonly issuer: string;
  readonly code: string | null;
  /** "exam": a proctored exam; "program": a vendor's professional certificate earned by finishing its courses. */
  readonly type: "exam" | "program";
  readonly url: string;
  readonly fee: GuideCertFee | null;
  /** The page says the price depends on the country (shown instead of a number). */
  readonly feeVaries: boolean;
  readonly prepUrl: string;
  /** Arabic, short. */
  readonly prepLabel: string;
  readonly level: GuideCertLevel;
  /** The skill star it proves. */
  readonly star: number;
  /** One line, Arabic: what it proves and who asks for it. */
  readonly why: string;
  readonly checkedAt: string;
}

/** No recognised certificate for the skill: said honestly, with the best practical proof instead. */
export interface GuideCertNone {
  readonly kind: "none";
  /** Arabic, one line: what to build or record instead. */
  readonly proof: string;
  /** A course whose completion certificate is a fair stand-in, or null. */
  readonly proofUrl: string | null;
  /** Arabic, one line: why there is none. */
  readonly why: string;
  readonly checkedAt: string;
}

export type GuideCertification = GuideCertOfficial | GuideCertNone;

export interface Guide {
  readonly skill: SkillId;
  /** "full": the 5 demo skills (people, articles, a proof task); "basic": a top pick, alternatives and people. */
  readonly depth: "full" | "basic";
  readonly topPick: GuideCourse;
  /** At most two, quieter than the top pick. */
  readonly alternatives: readonly GuideCourse[];
  readonly people: readonly GuidePerson[];
  readonly articles: readonly GuideArticle[];
  readonly proof: GuideProof | null;
  /** Sources found for the skill as a whole (the basic guides), or null. */
  readonly recommendedBy: readonly GuideSource[] | null;
  readonly checkedAt: string;
  /** «الشهادة اللي تثبت مهارتك» (every one of the 38 has one; optional so other guide sets may omit it). */
  readonly certification?: GuideCertification;
}

`;

const body = `export const GUIDES: readonly Guide[] = ${lit(guides)};

const BY_SKILL = new Map<SkillId, Guide>(GUIDES.map((g) => [g.skill, g]));

/** The guide of a skill (every one of the 38 skills has one). */
export function getGuide(skill: SkillId): Guide {
  const guide = BY_SKILL.get(skill);
  if (!guide) throw new Error(\`No guide for skill \${skill}\`);
  return guide;
}

/** Free to learn: free, or free to attend with a paid certificate. */
export function isFreeCourse(course: GuideCourse): boolean {
  return course.price === "free" || course.price === "free_to_audit";
}

/** The recognised certificate of a skill's guide, or null (none recognised, or the guide has no block). */
export function officialCertOf(guide: Guide): GuideCertOfficial | null {
  return guide.certification?.kind === "official" ? guide.certification : null;
}
`;

const out = header + body;
writeFileSync(join(root, "src/lib/data/guides.ts"), Buffer.from(out.replace(/\r\n/g, "\n"), "utf8"));
const withLinks = guides.flatMap((g) => g.people).filter((p) => p.links || p.members).length;
const allPeople = guides.flatMap((g) => g.people);
const missing = allPeople.filter((p) => !peopleLinks[p.name]).map((p) => p.name);
console.log(`wrote ${guides.length} guides (${counts.quality} from the quality pass, ${counts.base} from the base), ${out.length} chars`);
console.log(`certificates: ${guides.filter((g) => g.certification?.kind === "official").length} official, ${guides.filter((g) => g.certification?.kind === "none").length} none`);
console.log(`people: ${allPeople.length}, with other profiles: ${withLinks}; not in people-links.json: ${missing.length ? missing.join(", ") : "none"}`);
