# Builds the wave-2 data of «دليل» from the researched files in research/wave2 (20 Nov 2026):
#   - the 69 new companies block of src/lib/data/companies.ts and their logo keys in src/lib/data/company-logos.ts
#     (between the «wave 2 BEGIN/END» marker lines; the rest of those files is hand-written);
#   - src/lib/data/wave2/jobs.ts: the open roles of companies-jobs.json that fit the app's rules, and the real jobs of the
#     career files (engineering.json, tourism-health-education.json, finance-legal-media-gaming.json) when they exist;
#   - src/lib/data/wave2/skills.ts, courses.ts, guides.ts, knowledge.ts from the career files (expansion.json shape);
#   - research/wave2/held.json: the real postings kept out, with why.
# Run: python -X utf8 research/wave2/build.py   (from the masari folder). Writes UTF-8 with LF line endings.
# Nothing is invented: every value comes from a research file; the script only reshapes, orders, caps stars at the
# skill's maximum (written in the job's source note) and joins.
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
W2 = ROOT / "research" / "wave2"
DATA = ROOT / "src" / "lib" / "data"
OUT = DATA / "wave2"
CHECKED = "2026-11-20"
CAREER_FILES = ["engineering.json", "tourism-health-education.json", "finance-legal-media-gaming.json"]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def replace_block(path: Path, begin: str, end: str, body: str):
    src = path.read_text(encoding="utf-8")
    i = src.index(begin)
    j = src.index(end, i)
    line_end = src.index("\n", i) + 1
    new = src[:line_end] + body + src[src.rfind("\n", 0, j) + 1 :]
    write(path, new)


# ── TS emitter (the same as research/expansion/build.py) ──────────────────────────────────────────────────────────────
IDENT = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*$")


def ts(v, ind=0):
    pad = "  " * ind
    if v is None:
        return "null"
    if v is True:
        return "true"
    if v is False:
        return "false"
    if isinstance(v, (int, float)):
        return json.dumps(v)
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, list):
        if not v:
            return "[]"
        flat = "[" + ", ".join(ts(x, 0) for x in v) + "]"
        if len(flat) + len(pad) < 110 and "\n" not in flat:
            return flat
        return "[\n" + "".join(f"{pad}  {ts(x, ind + 1)},\n" for x in v) + f"{pad}]"
    if isinstance(v, dict):
        if not v:
            return "{}"
        items = [(k if IDENT.match(k) else json.dumps(k), x) for k, x in v.items()]
        flat = "{ " + ", ".join(f"{k}: {ts(x, 0)}" for k, x in items) + " }"
        if len(flat) + len(pad) < 110 and "\n" not in flat:
            return flat
        return "{\n" + "".join(f"{pad}  {k}: {ts(x, ind + 1)},\n" for k, x in items) + f"{pad}}}"
    raise TypeError(type(v))


def one_line(v):
    """A record on one line (companies.ts style)."""
    if isinstance(v, dict):
        return "{ " + ", ".join(f"{k if IDENT.match(k) else json.dumps(k)}: {one_line(x)}" for k, x in v.items()) + " }"
    if isinstance(v, list):
        return "[" + ", ".join(one_line(x) for x in v) + "]"
    return ts(v)


# ── career files (expansion.json shape) ───────────────────────────────────────────────────────────────────────────────
CAREERS = [(name, load(W2 / name)) for name in CAREER_FILES]
CAREERS = [(n, d) for n, d in CAREERS if d is not None]

# ── skills: old (skills.ts), expansion (expansion/skills.ts) and the career files' new ones ──────────────────────────
SKILL_RE = re.compile(
    r'id: "([a-z0-9-]+)",\s*name: "([^"]+)",\s*field: "([a-z-]+)",\s*maxStars: (\d),\s*prereqs: \[([^\]]*)\]'
)


def parse_skills(path: Path):
    out = {}
    for m in SKILL_RE.finditer(path.read_text(encoding="utf-8")):
        sid, name, field, ms, pre = m.groups()
        out[sid] = {"id": sid, "name": name, "field": field, "maxStars": int(ms), "prereqs": re.findall(r'"([a-z0-9-]+)"', pre)}
    return out


OLD = {**parse_skills(DATA / "skills.ts"), **parse_skills(DATA / "expansion" / "skills.ts")}
assert len(OLD) == 54, len(OLD)
NEW_FIELDS = []
NEW_SKILLS = []
NEW_COURSES = []
NEW_GUIDES = []
for name, d in CAREERS:
    NEW_FIELDS += d.get("fields", [])
    NEW_SKILLS += [s for s in d.get("skills", []) if s["id"] not in OLD]
    NEW_COURSES += d.get("courses", [])
    NEW_GUIDES += d.get("guides", [])
ALL = {**OLD, **{s["id"]: s for s in NEW_SKILLS}}


def all_prereqs(sid, seen=None):
    seen = set() if seen is None else seen
    for p in ALL[sid]["prereqs"]:
        if p not in seen:
            seen.add(p)
            all_prereqs(p, seen)
    return seen


def roadmap_order(reqs):
    out, placed = [], set()

    def place(r):
        if r["skill"] in placed:
            return
        for other in reqs:
            if other["skill"] in all_prereqs(r["skill"]) and other["skill"] not in placed:
                place(other)
        out.append(r)
        placed.add(r["skill"])

    for r in reqs:
        place(r)
    return out


# ── the sample CV (src/lib/engine/test-fixtures.ts SAMPLE_CV_SKILLS) and the match formula (spec 7.2) ───────────────
SAMPLE = {"excel": 2, "sql": 2, "statistics": 1, "programming": 1, "english": 2, "communication": 1, "presentation": 1, "teamwork": 1}


def sample_match(reqs):
    sixths = sum(20 * 6 * min(SAMPLE.get(r["skill"], 0), r["stars"]) / r["stars"] for r in reqs)
    return round(sixths / 6)


# «مهندس بيانات أول» is the third job after the sample CV at 53%; a new job at 53% or more would move the demo's list
MATCH_LIMIT = 53

# ── companies ─────────────────────────────────────────────────────────────────────────────────────────────────────────
COMP = load(W2 / "companies.json")
CJOBS = load(W2 / "companies-jobs.json")
LOGOS = load(W2 / "companies-logos.json")
job_companies = {j["companyId"] for j in CJOBS["jobs"]}


def company_record(c):
    verified = c["verified"]
    url = c["careersUrl"] if verified else None
    if url:
        source = "careers-page"
    elif verified and c["id"] in job_companies:
        source = "posting"
    else:
        source = "not-opened"
    rec = {
        "id": c["id"],
        "name": c["name"] or c["short"],
        "short": c["short"],
        "en": c["en"],
        "aliases": c["aliases"],
    }
    if c.get("aliasesAlone"):
        rec["aliasesAlone"] = c["aliasesAlone"]
    rec["careersUrl"] = url
    rec["source"] = source
    rec["checkedAt"] = "@CHECKED"
    notes = []
    if not verified:
        notes.append("not verified: its own site answered a bot check on 20 Nov 2026, so it is known by name only")
    elif not url:
        notes.append(f"no careers page opened ({c.get('careersStatus') or 'none found'})")
    if c.get("note"):
        notes.append(c["note"])
    if notes:
        rec["note"] = "; ".join(notes)
    return rec


SECTOR_ORDER = list(COMP["sectors"].keys())
comp_lines = []
by_sector = {}
for c in COMP["companies"]:
    by_sector.setdefault(c["sector"], []).append(c)
for sector in SECTOR_ORDER:
    if sector not in by_sector:
        continue
    comp_lines.append(f"  // {COMP['sectors'][sector]} ({sector})\n")
    for c in by_sector[sector]:
        comp_lines.append("  " + one_line(company_record(c)).replace('"@CHECKED"', "CHECKED") + ",\n")
replace_block(DATA / "companies.ts", "// ── wave 2 BEGIN", "// ── wave 2 END", "".join(comp_lines))
NEW_COMPANY_IDS = [c["id"] for s in SECTOR_ORDER for c in by_sector.get(s, [])]

# ── logos: every name the app writes for the company (English, Arabic, short) and the job postings' names ───────────
existing_logo_src = (DATA / "company-logos.ts").read_text(encoding="utf-8")
head = existing_logo_src.split("// ── wave 2 BEGIN")[0]
existing_keys = set(re.findall(r'^\s*"([^"]+)":', head, re.M))
names_by_id = {c["id"]: c for c in COMP["companies"]}
existing_companies = (DATA / "companies.ts").read_text(encoding="utf-8").split("// ── wave 2 BEGIN")[0]
for m in re.finditer(r'\{ id: "([a-z0-9-]+)", name: "([^"]+)", short: "([^"]+)", en: "([^"]+)"', existing_companies):
    cid, n, s, e = m.groups()
    names_by_id.setdefault(cid, {"id": cid, "name": n, "short": s, "en": e})
logo_lines = []
seen = set(existing_keys)
for cid, logo in LOGOS["logos"].items():
    c = names_by_id.get(cid, {})
    keys = [c.get("en"), c.get("name"), c.get("short"), logo.get("nameEn"), logo.get("nameAr")]
    keys += [n for j in CJOBS["jobs"] if j["companyId"] == cid for n in (j["company"]["en"], j["company"]["ar"])]
    out = []
    for k in keys:
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(k)
    if out:
        logo_lines.append(f"  // {cid}\n")
        logo_lines += [f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(logo['file'])},\n" for k in out]
replace_block(DATA / "company-logos.ts", "// ── wave 2 BEGIN", "// ── wave 2 END", "".join(logo_lines))

# ── jobs ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
# the jobs already in the app before wave 2 (the first collection and the expansion), read from their data files
EXISTING_JOB_IDS = {
    m for path in [DATA / "jobs.ts", DATA / "expansion" / "jobs.ts"] for m in re.findall(r'^\s+id: "([a-z0-9-]+)",', path.read_text(encoding="utf-8"), re.M)
}
CITY_IDS = {"riyadh", "jeddah", "dammam", "remote"}
FIELD_IDS_KNOWN = {"data", "software", "design", "marketing", "business", "hr", "product", "cyber-cloud", "sales-supply"} | {
    f["id"] for f in NEW_FIELDS
}


def site_label(url, ar, fallback):
    if "apply.workable.com" in url:
        return f"صفحة وظائف {ar} (Workable)"
    if "jobs.workable.com" in url:
        return "Workable"
    if "greenhouse" in url:
        return f"صفحة وظائف {ar} (Greenhouse)"
    return fallback


def place_text(t):
    t = t or ""
    return re.sub(r",\s*Saudi Arabia$", "", t).strip() or t


held = []
jobs_out = []
# The app's job-text rules (src/lib/data/data.test.ts): a task line has at most 10 words and no full stop, and no job text
# carries a digit. The Arabic summaries and task lines are the research agents' own paraphrases (never the posting's
# words), so a line over the limit is shortened here, keeping its meaning; the posting's evidence is never touched.
TEXT_FIXES = {
    "كتابة وتحرير النصوص التسويقية للموقع والبريد ووسائل التواصل والإعلانات ونصوص الفيديو": "كتابة النصوص التسويقية للموقع والبريد ووسائل التواصل والإعلانات والفيديو",
    "صياغة العقود التجارية ومراجعتها والتفاوض عليها مثل اتفاقيات SaaS واتفاقيات عدم الإفصاح": "صياغة العقود التجارية واتفاقيات عدم الإفصاح ومراجعتها والتفاوض عليها",
    "مراجعة المنتجات الجديدة قبل إطلاقها والتأكد من توافقها مع متطلبات ساما": "مراجعة المنتجات الجديدة قبل إطلاقها وفق متطلبات ساما",
    "بناء دروس تفاعلية بـ Articulate 360 و Captivate": "بناء دروس تفاعلية بأدوات Articulate و Captivate",
    "يبني جداول المشاريع (المستوى 1-4) ويتابع تقدم التصنيع والموارد ويرفع تقارير التأخير وخطط الاستدراك.": "يبني جداول المشاريع ويتابع تقدم التصنيع والموارد ويرفع تقارير التأخير وخطط الاستدراك.",
}


def fix_text(t):
    t = t.rstrip(".") if not t.endswith("..") else t
    return TEXT_FIXES.get(t, TEXT_FIXES.get(t + ".", t))
# the career files' own held postings stay out (their `jobs` may still list them); their why is listed below
RESEARCH_HELD = {h["id"] for _, d in CAREERS for h in d.get("heldJobs", [])}


def take_job(j, reqs_in, field, title, title_en, company_ar, company_en, url, site, posted, note, summary, tasks, city, place, band, origin):
    why = None
    if j["id"] in RESEARCH_HELD:
        return
    if j["id"] in EXISTING_JOB_IDS:
        why = "Already in the app (the 20 Nov expansion added the same posting)."
    elif len(reqs_in) != 5:
        why = f"The posting names {len(reqs_in)} of the app's skills; every job in «دليل» has exactly five (spec 9.3, the Job type) and none may be invented."
    elif any(r["skill"] not in ALL for r in reqs_in):
        missing = [r["skill"] for r in reqs_in if r["skill"] not in ALL]
        why = f"Needs skills the app does not have yet: {', '.join(missing)}."
    elif re.search(r"[0-9٠-٩]", f"{title} {company_ar}"):
        why = f"The company's or the title's own name carries digits («{company_ar}», «{title}»), and no job text in «دليل» may carry a number (data.test); held for the coordinator's decision."
    elif band not in ("entry", "junior", "mid"):
        why = f"A senior posting (band «{band}»); the app's bands stop at mid (entry, junior, mid)."
    elif city not in CITY_IDS:
        why = f"Its city ({place}) is not one of the app's job cities (riyadh, jeddah, dammam, remote)."
    elif field not in FIELD_IDS_KNOWN:
        why = f"Its field «{field}» is not in the app yet."
    if why:
        held.append({"id": j["id"], "from": origin, "why": why})
        return
    capped = []
    reqs = []
    for r in roadmap_order(reqs_in):
        mx = ALL[r["skill"]]["maxStars"]
        stars = min(r["stars"], mx)
        if stars != r["stars"]:
            capped.append(f"{r['skill']} {r['stars']}→{stars}")
        reqs.append({"skill": r["skill"], "stars": stars, "evidence": r["evidence"]})
    m = sample_match(reqs)
    if m >= MATCH_LIMIT:
        held.append({"id": j["id"], "from": origin, "why": f"The demo's sample CV would match it at {m}%, which changes the jobs list after the CV (only the practice job may reach 70%, and «مهندس بيانات أول» at 53% must stay third)."})
        return
    notes = [note] if note else []
    if capped:
        notes.append("Stars capped at the skill's maximum in Dalil: " + ", ".join(capped) + ".")
    src = {"site": site, "url": url, "postedAt": posted, "checkedAt": CHECKED}
    if notes:
        src["note"] = " ".join(notes)
    jobs_out.append(
        {
            "id": j["id"],
            "title": title,
            "titleEn": title_en,
            "field": field,
            "city": city,
            "place": place,
            "band": band,
            "company": company_ar,
            "companyEn": company_en,
            "real": True,
            "source": src,
            "requirements": reqs,
            "summary": TEXT_FIXES.get(summary, summary),
            "tasks": [fix_text(t) for t in tasks],
            "_match": m,
        }
    )


# the companies' open roles (snapshot shape); customer care and revenue operations are the sales-supply field's skills
JOB_FIELD_OVERRIDE = {}
for j in CJOBS["jobs"]:
    field = JOB_FIELD_OVERRIDE.get(j["id"], j["field"])
    take_job(
        j, j["requirements"], field, j["titleAr"], j["title"], j["company"]["ar"], j["company"]["en"], j["url"],
        site_label(j["url"], j["company"]["ar"], j["source"]), j.get("postedAt"), j.get("note"), j["summary"], j["tasks"],
        j["city"], place_text(j.get("cityText")), j["band"], "companies-jobs.json",
    )
# the career files' real jobs (app shape)
for name, d in CAREERS:
    for j in d.get("jobs", []):
        s = j.get("source") or {}
        take_job(
            j, j["requirements"], j["field"], j["title"], j.get("titleEn"), j["company"], j.get("companyEn"), s.get("url"),
            s.get("site"), s.get("postedAt"), s.get("note"), j["summary"], j["tasks"], j["city"], j.get("place"), j["band"], name,
        )
    for h in d.get("heldJobs", []):
        held.append({"id": h["id"], "from": name, "why": h["why"]})

held = [h for h in held if h["id"] not in {j["id"] for j in jobs_out}]  # held in one file, taken from another
write(W2 / "held.json", json.dumps({"checkedAt": CHECKED, "note": "Real postings kept out of the app by research/wave2/build.py, with why.", "held": held}, ensure_ascii=False, indent=2) + "\n")

FIELD_ORDER = ["data", "software", "design", "marketing", "business", "hr", "product", "cyber-cloud", "sales-supply"] + [f["id"] for f in NEW_FIELDS]
jobs_out.sort(key=lambda j: FIELD_ORDER.index(j["field"]))
job_ids = [j["id"] for j in jobs_out]
jobs_ts = [
    "// Owner: data (wave-2 integration, 20 Nov 2026). Merged into JOBS by ../jobs.ts. GENERATED by research/wave2/build.py",
    "// from research/wave2/companies-jobs.json and the wave-2 career files: do not edit by hand. Real postings from the",
    "// companies' own careers pages or ATS boards, open on the day they were checked (20 Nov 2026); never LinkedIn, Indeed or",
    "// Bayt. Same rules as src/lib/data/jobs.ts: the Arabic title is a translation (the posting's own in `titleEn`), five",
    "// requirements in roadmap order, each with the posting's own sentence as `evidence`, verbatim; a star level above the",
    "// skill's maximum in Dalil is capped (written in the source note). No salary, no applicant count. Postings that break a",
    "// rule (fewer than five of the app's skills, a city outside the app's, the demo's sample CV at 53% or more) are held",
    "// out with why in research/wave2/held.json. Pure module.",
    'import type { Job } from "@/lib/types";',
    "",
    "export const WAVE2_JOB_IDS = " + ts(job_ids) + " as const;",
    "export type Wave2JobId = (typeof WAVE2_JOB_IDS)[number];",
    "",
    "export const WAVE2_JOBS: readonly Job[] = " + ts([{k: v for k, v in j.items() if not k.startswith("_")} for j in jobs_out]) + ";",
    "",
]
write(OUT / "jobs.ts", "\n".join(jobs_ts))

# ── skills, courses, guides, knowledge of the career files ────────────────────────────────────────────────────────────
# Aliases dropped by the rules at the top of src/lib/data/skills.ts (a single word that is everyday Arabic).
REJECTED_ALIASES = {"نفيس": "(an everyday word, «precious»; NPHIES keeps its Latin name)"}
SKILL_KEYS = ["id", "name", "field", "maxStars", "prereqs", "description", "aliases"]
skills_out = []
for s_ in NEW_SKILLS:
    rec = {k: s_[k] for k in SKILL_KEYS}
    rec["aliases"] = [a for a in rec["aliases"] if a not in REJECTED_ALIASES]
    skills_out.append(rec)
WAVE2_FIELD_ORDER = [f["id"] for f in NEW_FIELDS]
COURSE_KEYS = ["id", "skill", "star", "title", "hours", "description", "lessons"]
import sys  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
from courses_src import LESSONS  # noqa: E402

courses_out = []
for c in NEW_COURSES:
    desc, lessons = LESSONS[c["id"]]
    courses_out.append({"id": c["id"], "skill": c["skill"], "star": c["star"], "title": c["title"], "hours": min(c["hours"], 16), "description": desc, "lessons": lessons})

GC_KEYS = ["title", "provider", "url", "lang", "price", "financialAid", "hours", "certificate", "star", "why", "recommendedBy", "checkedAt"]
GP_KEYS = ["name", "platform", "url", "why", "arab", "saudiBased", "recommendedBy", "checkedAt", "links", "members"]
GA_KEYS = ["title", "author", "site", "url", "lang", "why", "recommendedBy", "checkedAt"]
CERT_OFFICIAL = ["kind", "name", "short", "issuer", "code", "type", "url", "fee", "feeVaries", "prepUrl", "prepLabel", "level", "star", "why", "checkedAt"]
CERT_NONE = ["kind", "proof", "proofUrl", "why", "checkedAt"]
# The page's own location caveat for CCP-KSA (research editsToGuideParts), so the app never promises it can be booked
# from Saudi Arabia.
CERT_CAVEATS = {
    "medical-coding": " لكن صفحة AAPC نفسها تقول إن الاختبار «only available to take online at home with a live remote proctor» و«Only available in the U.S., U.S. Territories, Bahamas, and Jamaica»، فتأكّد من AAPC قبل الحجز من السعودية.",
}


def pick(o, keys):
    return {k: o[k] for k in keys if k in o}


def guide_course(c):
    out = pick(c, GC_KEYS)
    # the guides-quality rule of src/lib/data/guides.ts: Coursera pages offer no free audit, so «paid», with financialAid
    # only where the page says so
    if "coursera.org" in c["url"]:
        out["price"] = "paid"
    if out.get("financialAid") is not True:
        out.pop("financialAid", None)
    return out


guides_out = []
for g in NEW_GUIDES:
    cert = g.get("certification")
    if cert:
        cert = pick(cert, CERT_OFFICIAL if cert["kind"] == "official" else CERT_NONE)
        # the app's fee qualifiers are "from" / "about"; another word (e.g. «non-members») stays in the fee's note
        if cert.get("fee") and cert["fee"].get("qualifier") not in ("from", "about", None):
            cert["fee"] = {**cert["fee"], "qualifier": None, "note": cert["fee"]["note"] + f" (price for {cert['fee']['qualifier']})"}
        if g["skill"] in CERT_CAVEATS:
            cert["why"] = cert["why"] + CERT_CAVEATS[g["skill"]]
    rec = {
        "skill": g["skill"],
        "depth": g["depth"] if g["depth"] in ("full", "basic") else "basic",
        "topPick": guide_course(g["topPick"]),
        "alternatives": [guide_course(c) for c in g["alternatives"]],
        "people": [pick(p, GP_KEYS) for p in g["people"]],
        # an article without a named author shows its site there (no person is guessed)
        "articles": [{**pick(a, GA_KEYS), "author": a.get("author") or a["site"]} for a in g["articles"]],
        "proof": pick(g["proof"], ["task", "dataset", "checkedAt"]) if g.get("proof") else None,
        "recommendedBy": g.get("recommendedBy"),
        "checkedAt": g["checkedAt"],
    }
    if cert:
        rec["certification"] = cert
    guides_out.append(rec)

ROUTE_KEYS = ["id", "nameAr", "nameEn", "owner", "url", "line", "eligibility", "benefit", "fits", "checkedAt", "note"]
FAMILY_KEYS = ["id", "title", "titleEn", "fields", "isNew", "what", "dayToDay", "path", "jobs", "employers", "entryRoutes",
               "certificates", "salary", "interviewQuestions", "first30Days", "writtenByDalil", "botLines", "sources"]
CERT_KEYS = ["name", "issuer", "url", "level", "priceText", "arabicAvailable", "why", "checkedAt"]
SALARY_KEYS = ["role", "minSAR", "maxSAR", "period", "level", "sourceName", "url", "page", "checkedAt", "note"]
in_app = set(job_ids) | EXISTING_JOB_IDS
routes_out, families_out = [], []
for name, d in CAREERS:
    k = d["knowledge"]
    routes_out += [pick(r, ROUTE_KEYS) for r in k.get("entryRoutes", [])]
    for f in k["families"]:
        rec = pick(f, FAMILY_KEYS)
        rec["path"] = {
            **pick(f["path"], ["skills", "basedOnLine", "basedOnLinks", "orderNote"]),
            "guidelines": [pick(x, ["name", "provider", "url", "orderedTopics", "checkedAt"]) for x in f["path"]["guidelines"]],
        }
        rec["jobs"] = [j for j in f["jobs"] if j in in_app]
        rec["employers"] = [{**pick(e, ["name", "nameEn", "careersUrl", "checkedAt"]), "note": e.get("note")} for e in f["employers"]]
        # the knowledge base's levels are entry / associate / professional
        LEVEL = {"beginner": "entry", "intermediate": "associate", "advanced": "professional"}
        rec["certificates"] = [{**pick(c, CERT_KEYS), "level": LEVEL.get(c["level"], c["level"])} for c in f["certificates"]]
        rec["salary"] = pick(f["salary"], SALARY_KEYS) if f.get("salary") else None
        families_out.append(rec)
FAMILY_IDS_NOW = {f["id"] for f in families_out}
for r in routes_out:
    r.setdefault("note", None)
    # `fits` is "all" or family ids; a field id or a comma list from the research is read as the families it names
    if isinstance(r["fits"], str) and r["fits"] != "all":
        parts = [x.strip() for x in r["fits"].split(",")]
        r["fits"] = [x for x in parts if x in FAMILY_IDS_NOW] + [f["id"] for f in families_out for x in parts if x in f["fields"]]
    for key in ("eligibility", "benefit"):
        if isinstance(r.get(key), str):
            r[key] = [r[key]]

HEAD = (
    "// Owner: data (wave-2 integration, 20 Nov 2026). GENERATED by research/wave2/build.py from the wave-2 career files\n// (research/wave2/"
    + ", ".join(n for n, _ in CAREERS)
    + "): do not edit by hand. "
)
SKILLS_DOC = """The new fields and skills of wave 2, wired in like ../expansion/skills.ts: their ids are in src/lib/ids.ts,
// ../fields.ts lists the fields and ../skills.ts merges WAVE2_SKILLS into SKILLS (SKILL_IDS order); ./wave2.test.ts checks
// them. Same rules as src/lib/data/skills.ts: prerequisites inside the field, no new skill leads to a data-field skill,
// distinctive aliases only (none in two skills, none in the sample CV, no level word); a single everyday Arabic word is
// dropped: """ + "; ".join(f"«{a}» {why}" for a, why in REJECTED_ALIASES.items()) + """. Pure module.
import type { Field, Skill } from "@/lib/types";

"""
write(
    OUT / "skills.ts",
    HEAD + SKILLS_DOC
    + "export const WAVE2_FIELDS: readonly Field[] = " + ts([{"id": f["id"], "name": f["name"], "hasJobs": True} for f in NEW_FIELDS]) + ";\n\n"
    + "export const WAVE2_SKILL_IDS = " + ts([x["id"] for x in skills_out]) + " as const;\n\n"
    + "export const WAVE2_SKILLS: readonly Skill[] = " + ts(skills_out) + ";\n",
)
write(
    OUT / "courses.ts",
    HEAD + """The learning steps of the new skills (merged into COURSES by ../courses.ts), one per star slot
// (`c-{skill}-{star}`), written by the research agents to the rules of src/lib/data/courses.ts (Dalil's own course names,
// the hours and lesson counts of spec 8.2). The real courses, people and articles for each skill are in ./guides.ts.
// Pure module.
import type { Course } from "@/lib/types";

"""
    + "export const WAVE2_COURSE_IDS = " + ts([c["id"] for c in courses_out]) + " as const;\n\n"
    + "export const WAVE2_COURSES: readonly Course[] = " + ts(courses_out) + ";\n",
)
write(
    OUT / "guides.ts",
    HEAD + """The learning guides of the new skills in the app's `Guide` shape (../all-guides.ts merges them). Real
// items only, every link opened on 2026-11-20; a Coursera course is «paid» (its pages offer no free audit) with
// financialAid only where the page says so; the CCP-KSA certificate keeps its page's own location caveat. Pure module.
import type { Guide } from "../guides";

"""
    + "export const WAVE2_GUIDES: readonly Guide[] = " + ts(guides_out) + ";\n",
)
write(
    OUT / "knowledge.ts",
    HEAD + """The career families of wave 2 for «دليلك» (what the job is, the path and its published guideline, the
// real jobs in the app, employers, entry routes, certificates, pay only from a published source, interview questions and a
// 30-day plan written by «دليل», Najdi bot lines), in the shape of ../expansion/knowledge.ts; ../careers.ts merges them with
// the expansion's families. A family's `jobs` lists only postings that are in the app (held ones: research/wave2/held.json).
// Pure module.
import type { JobId } from "@/lib/types";

import type { CareerFamily, CareerFamilyId, EntryRoute, EntryRouteId } from "../expansion/knowledge";

"""
    + "export const WAVE2_FAMILY_IDS = " + ts([f["id"] for f in families_out]) + " as const;\n"
    + "export type Wave2FamilyId = (typeof WAVE2_FAMILY_IDS)[number];\n\n"
    + "export const WAVE2_ENTRY_ROUTE_IDS = " + ts([r["id"] for r in routes_out]) + " as const;\n"
    + "export type Wave2EntryRouteId = (typeof WAVE2_ENTRY_ROUTE_IDS)[number];\n\n"
    + """export interface Wave2EntryRoute extends Omit<EntryRoute, "id" | "fits"> {
  readonly id: Wave2EntryRouteId;
  readonly fits: readonly (CareerFamilyId | Wave2FamilyId)[] | "all";
}

export interface Wave2CareerFamily extends Omit<CareerFamily, "id" | "entryRoutes" | "jobs"> {
  readonly id: Wave2FamilyId;
  readonly entryRoutes: readonly (EntryRouteId | Wave2EntryRouteId)[];
  readonly jobs: readonly JobId[];
}

"""
    + "export const WAVE2_ENTRY_ROUTES: readonly Wave2EntryRoute[] = " + ts(routes_out) + ";\n\n"
    + "export const WAVE2_CAREER_FAMILIES: readonly Wave2CareerFamily[] = " + ts(families_out) + ";\n",
)


# ── clash check: every new skill alias against every skill alias and every company spelling (normalised) ──────────────
def nrm(t):
    t = re.sub(r"[ً-ٰـ]", "", t)
    t = re.sub("[أإآ]", "ا", t).replace("ى", "ي").replace("ة", "ه").lower().strip()
    return re.sub(r"^ال", "", t)


alias_owner = {}
for path in [DATA / "skills.ts", DATA / "expansion" / "skills.ts"]:
    for m in re.finditer(r'id: "([a-z0-9-]+)",[\s\S]*?aliases: \[([^\]]*)\]', path.read_text(encoding="utf-8")):
        for a in re.findall(r'"([^"]+)"', m.group(2)):
            alias_owner.setdefault(nrm(a), m.group(1))
company_spell = {}
for m in re.finditer(r'\{ id: "([a-z0-9-]+)",[^\n]*?aliases: \[([^\]]*)\](?:, aliasesAlone: \[([^\]]*)\])?', (DATA / "companies.ts").read_text(encoding="utf-8")):
    for a in re.findall(r'"([^"]+)"', m.group(2) + (m.group(3) or "")):
        company_spell.setdefault(nrm(a), m.group(1))
clashes = []
for x in skills_out:
    for a in x["aliases"]:
        k = nrm(a)
        if k in alias_owner and alias_owner[k] != x["id"]:
            clashes.append(f"skill alias «{a}» of {x['id']} = an alias of {alias_owner[k]}")
        if k in company_spell:
            clashes.append(f"skill alias «{a}» of {x['id']} = a spelling of company {company_spell[k]}")
        alias_owner.setdefault(k, x["id"])
print("clashes:", clashes or "none")
print("fields:", WAVE2_FIELD_ORDER)
print("skills:", len(skills_out), "stars:", sum(x["maxStars"] for x in skills_out), "courses:", len(courses_out), "hours:", sum(c["hours"] for c in courses_out))
print("guides:", len(guides_out), "families:", [f["id"] for f in families_out], "routes:", [r["id"] for r in routes_out])
print("SKILL_IDS +=", json.dumps([x["id"] for x in skills_out]))
print("COURSE_IDS +=", json.dumps([c["id"] for c in courses_out]))

# ── report for the integrator ─────────────────────────────────────────────────────────────────────────────────────────
print("companies:", len(NEW_COMPANY_IDS))
print("COMPANY_IDS +=", json.dumps(NEW_COMPANY_IDS))
print("logo keys:", sum(1 for l in logo_lines if not l.strip().startswith("//")))
print("jobs:", [(j["id"], j["field"], j["_match"]) for j in jobs_out])
print("held:", [(h["id"], h["why"][:70]) for h in held])
print("career files:", [n for n, _ in CAREERS])
