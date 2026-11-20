# Builds the wave-3 data of «دليل» from the researched files in research/wave3 (21 Nov 2026), the same way as
# research/wave2/build.py:
#   - src/lib/data/wave3/jobs.ts: the real postings of tech-jobs.json, business-jobs.json and new-careers.json that fit
#     the app's rules (exactly five of the app's skills, a job city of the app, band entry/junior/mid, no senior title,
#     the demo's sample CV under 53%, not already in the app by id, link or company + title);
#   - src/lib/data/wave3/skills.ts, courses.ts, guides.ts, knowledge.ts from new-careers.json (the four new fields, 21
#     skills, their learning steps and guides, seven career families) and knowledge-plus.json (more entry routes, salary
#     rows, Saudization and labour-law facts, interview questions, stand-out tips and bot lines for the existing families);
#   - the new companies of the postings, between the «wave 3 BEGIN/END» lines of src/lib/data/companies.ts, and their logo
#     keys in src/lib/data/company-logos.ts (only names of a company whose logo file is already in public/logos);
#   - research/wave3/held.json: the real postings kept out, with why.
# Run: python -X utf8 research/wave3/build.py   (from the masari folder). Writes UTF-8 with LF line endings.
# Nothing is invented: every value comes from a research file; the script only reshapes, orders, caps stars at the
# skill's maximum (written in the job's source note) and joins. The hand-written parts are «دليل»'s own wording, each in
# its own file: courses_src.py (lesson titles), tasks_src.py (the business postings' task lines) and remap.json (a
# posting's own line read as one of the new skills).
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
W3 = ROOT / "research" / "wave3"
DATA = ROOT / "src" / "lib" / "data"
OUT = DATA / "wave3"
LOGOS_DIR = ROOT / "public" / "logos"
CHECKED = "2026-11-21"
sys.path.insert(0, str(Path(__file__).resolve().parent))
from courses_src import LESSONS  # noqa: E402
from tasks_src import TASKS  # noqa: E402


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def replace_block(path: Path, begin: str, end: str, body: str):
    src = path.read_text(encoding="utf-8")
    i = src.index(begin)
    j = src.index(end, i)
    line_end = src.index("\n", i) + 1
    write(path, src[:line_end] + body + src[src.rfind("\n", 0, j) + 1 :])


# ── TS emitter (the same as research/wave2/build.py) ──────────────────────────────────────────────────────────────────
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
    if isinstance(v, dict):
        return "{ " + ", ".join(f"{k if IDENT.match(k) else json.dumps(k)}: {one_line(x)}" for k, x in v.items()) + " }"
    if isinstance(v, list):
        return "[" + ", ".join(one_line(x) for x in v) + "]"
    return ts(v)


def pick(o, keys):
    return {k: o[k] for k in keys if k in o}


TECH = load(W3 / "tech-jobs.json")
BUSINESS = load(W3 / "business-jobs.json")
NC = load(W3 / "new-careers.json")
KP = load(W3 / "knowledge-plus.json")
REMAP = load(W3 / "remap.json")["remap"]

# ── skills: every skill already in the app, then the 21 of new-careers.json ──────────────────────────────────────────
SKILL_RE = re.compile(r'id: "([a-z0-9-]+)",\s*name: "([^"]+)",\s*field: "([a-z-]+)",\s*maxStars: (\d),\s*prereqs: \[([^\]]*)\]')


def parse_skills(path: Path):
    out = {}
    for m in SKILL_RE.finditer(path.read_text(encoding="utf-8")):
        sid, name, field, ms, pre = m.groups()
        out[sid] = {"id": sid, "name": name, "field": field, "maxStars": int(ms), "prereqs": re.findall(r'"([a-z0-9-]+)"', pre)}
    return out


OLD = {**parse_skills(DATA / "skills.ts"), **parse_skills(DATA / "expansion" / "skills.ts"), **parse_skills(DATA / "wave2" / "skills.ts")}
assert len(OLD) == 93, len(OLD)
NEW_FIELDS = NC["fields"]
# Alias guard (coordinator, 21 Nov 2026): a bare «Swift» also names SWIFT bank-payment messages, so a banking CV would
# read as an iOS developer; ios-swift keeps only spellings that are iOS's own. «RAN» is the English verb «ran» in a CV.
ALIAS_FIX = {
    "ios-swift": ["SwiftUI", "Swift (iOS)", "iOS", "Xcode", "UIKit", "iOS development", "تطوير تطبيقات iOS"],
}
ALIAS_DROP = {"mobile-networks": {"RAN"}}
SKILL_KEYS = ["id", "name", "field", "maxStars", "prereqs", "description", "aliases"]
skills_out = []
for s in NC["skills"]:
    assert s["id"] not in OLD, s["id"]
    rec = {k: s[k] for k in SKILL_KEYS}
    rec["aliases"] = ALIAS_FIX.get(s["id"], [a for a in rec["aliases"] if a not in ALIAS_DROP.get(s["id"], set())])
    skills_out.append(rec)
ALL = {**OLD, **{s["id"]: s for s in skills_out}}
NEW_SKILL_IDS = [s["id"] for s in skills_out]


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
MATCH_LIMIT = 53


def sample_match(reqs):
    return round(sum(20 * 6 * min(SAMPLE.get(r["skill"], 0), r["stars"]) / r["stars"] for r in reqs) / 6)


# ── jobs ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
EXISTING_JOB_FILES = [DATA / "jobs.ts", DATA / "expansion" / "jobs.ts", DATA / "wave2" / "jobs.ts"]
EXISTING_JOB_IDS, EXISTING_URLS, EXISTING_PAIRS = set(), set(), set()
for path in EXISTING_JOB_FILES:
    text = path.read_text(encoding="utf-8")
    EXISTING_JOB_IDS |= set(re.findall(r'^\s+id: "([a-z0-9-]+)",', text, re.M))
    EXISTING_URLS |= set(re.findall(r'url: "([^"]+)"', text))
    for m in re.finditer(r'titleEn: "([^"]*)"[\s\S]*?companyEn: "([^"]*)"', text):
        EXISTING_PAIRS.add((m.group(2).lower(), m.group(1).lower()))
CITY_IDS = {"riyadh", "jeddah", "dammam", "remote"}
OLD_FIELD_IDS = [
    "data", "software", "design", "marketing", "business", "hr", "product", "cyber-cloud", "sales-supply",
    "engineering", "project-controls", "tourism-hospitality", "health-admin", "education", "banking-risk", "legal", "media", "gaming",
]
FIELD_ORDER = OLD_FIELD_IDS + [f["id"] for f in NEW_FIELDS]

# A posting whose own line names one of the new skills (the research agents listed it under missingSkills, because the
# skill did not exist yet): the line is the evidence, verbatim, and the weakest-evidenced requirement goes so five stay.
# The field follows the posting's work where the new skill is its core (government relations, internal communications
# and PR belong to «العلاقات العامة والاتصال المؤسسي»). The table is research/wave3/remap.json (data.test reads it too).

ATS = [
    ("apply.workable.com", "Workable"), ("greenhouse", "Greenhouse"), ("lever.co", "Lever"), ("smartrecruiters", "SmartRecruiters"),
    ("oraclecloud", "Oracle"), ("recruitee", "Recruitee"), ("icims", "iCIMS"), ("lucidmotors.com", "Greenhouse"),
]
SUCCESS_FACTORS = ("jobs.almosafer.com", "careers.ey.com", "careers.acwapower.com")


def site_label(url, ar):
    if "jobs.workable.com" in url:
        return "Workable"
    for host, name in ATS:
        if host in url:
            return f"صفحة وظائف {ar} ({name})"
    if any(h in url for h in SUCCESS_FACTORS):
        return f"صفحة وظائف {ar} (SuccessFactors)"
    return f"صفحة وظائف {ar}"


def place_text(t):
    t = (t or "").strip()
    t = re.sub(r"(,\s*)+Saudi Arabia$", "", t)
    t = re.sub(r",\s*,", ",", t).strip(" ,")
    return t


# The app's job-text rules (data.test): a summary is one sentence of at most 25 words, a task line at most 10 words with
# no full stop, and no job text carries a digit. A research summary over a rule is shortened here, keeping its meaning.
TEXT_FIXES = {
    "tamara-builders-program-data-riyadh": {"tasks": {0: "دعم التحليلات والتقارير لفهم العملاء وقياس الأثر", 2: "تحويل البيانات الخام إلى رؤى موثوقة عبر خطوط البيانات"}},
    "arabicai-data-engineer-riyadh": {"tasks": {2: "فحص جودة البيانات وتتبع مصدرها وتعريف مؤشرات الأداء"}},
    # «100» written as a word (no job text carries a digit)
    "lucidya-10x-software-engineer-riyadh": {"summary": "تبني وتشغّل خطوط معالجة موزّعة لمنصة لوسيديا تعالج مليارات البيانات عبر أكثر من مئة خدمة."},
    # a summary is one sentence: «.NET» and «webook.com» carried a second full stop
    "masterworks-adree-outsystems-dotnet-developer-riyadh": {"summary": "يطوّر تطبيقات أعمال للويب والجوال على منصة OutSystems منخفضة الكود ويدمجها مع الأنظمة الأخرى باستخدام دوت نت وواجهات API."},
    "webook-product-manager-riyadh": {"summary": "تملك جزءاً من تجربة عملاء منصة التذاكر ويبوك وتقود فريقاً متعدد التخصصات من الاكتشاف إلى الإطلاق."},
    "lucid-purple-teaming-engineer-riyadh": {
        "summary": "ينفّذ تمارين محاكاة الهجمات (الفريق البنفسجي) على أنظمة السيارات المدمجة والمتصلة بالسحابة ويحسّن قدرات الرصد مع فريقي الهجوم ومركز العمليات الأمنية.",
        "tasks": {0: "تنفيذ تمارين الفريق البنفسجي على الأنظمة المدمجة والسحابية"},
    },
    "bosch-software-development-intern-riyadh": {"tasks": {2: "تعلّم ممارسات DevOps وأمن السحابة مع فرق متعددة التخصصات"}},
}

candidates = []
for j in TECH["postings"]:
    candidates.append({
        "id": j["id"], "title": j["titleAr"], "titleEn": j["title"], "company": j["company"]["ar"], "companyEn": j["company"]["en"],
        "url": j["url"], "postedAt": j.get("postedAt"), "note": j.get("note"), "summary": j["summary"], "tasks": j["tasks"],
        "city": j["city"], "place": place_text(j.get("cityText")), "band": j["band"], "field": j["field"], "reqs": j["requirements"],
        "from": "tech-jobs.json", "family": j.get("family"),
    })
for j in BUSINESS["postings"]:
    candidates.append({
        "id": j["id"], "title": j["title"], "titleEn": j["titleEn"], "company": j["company"], "companyEn": j["companyEn"],
        "url": j["url"], "postedAt": j.get("postedAt"), "note": j.get("notes"), "summary": j["summary"], "tasks": TASKS.get(j["id"]),
        "city": j["city"], "place": place_text(j.get("cityText")), "band": j["band"], "field": j["field"], "reqs": j["requirements"],
        "from": "business-jobs.json", "family": j.get("family"),
    })
for j in NC["jobs"]:
    s = j["source"]
    candidates.append({
        "id": j["id"], "title": j["title"], "titleEn": j["titleEn"], "company": j["company"], "companyEn": j["companyEn"],
        "url": s["url"], "postedAt": s.get("postedAt"), "note": s.get("note"), "summary": j["summary"], "tasks": j["tasks"],
        "city": j["city"], "place": j.get("place"), "band": j["band"], "field": j["field"], "reqs": j["requirements"],
        "from": "new-careers.json", "site": s.get("site"),
    })

held, jobs_out, text_problems = [], [], []
seen_urls = set()
for c in candidates:
    jid = c["id"]
    reqs_in = list(c["reqs"])
    field = c["field"]
    remap_note = None
    if jid in REMAP:
        rm = REMAP[jid]
        reqs_in = [r for r in reqs_in if r["skill"] != rm["drop"]] + [rm["add"]]
        field = rm.get("field", field)
        remap_note = rm["why"]
    why = None
    if jid in EXISTING_JOB_IDS:
        why = "Already in the app (same id)."
    elif c["url"] in EXISTING_URLS or c["url"] in seen_urls:
        why = "Already in the app (same posting link)."
    elif (c["companyEn"].lower(), c["titleEn"].lower()) in EXISTING_PAIRS:
        why = "Already in the app (same company and title)."
    elif len(reqs_in) != 5:
        why = f"The posting names {len(reqs_in)} of the app's skills; every job in «دليل» has exactly five."
    elif any(r["skill"] not in ALL for r in reqs_in):
        why = "Needs skills the app does not have: " + ", ".join(r["skill"] for r in reqs_in if r["skill"] not in ALL) + "."
    elif c["band"] not in ("entry", "junior", "mid"):
        why = f"A senior posting (band «{c['band']}»); the app's bands stop at mid."
    elif re.search(r"\bsenior\b", c["titleEn"], re.I):
        why = f"A senior title («{c['titleEn']}»); the app's bands stop at mid (coordinator's rule for wave 3)."
    elif c["city"] not in CITY_IDS:
        why = f"Its city ({c['place']}) is not one of the app's job cities (riyadh, jeddah, dammam, remote)."
    elif field not in FIELD_ORDER:
        why = f"Its field «{field}» is not in the app."
    elif not c["tasks"]:
        why = "No task lines written for it (tasks_src.py)."
    if why is None:
        m = sample_match(reqs_in)
        if m >= MATCH_LIMIT:
            why = f"The demo's sample CV would match it at {m}%, which changes the jobs list after the CV («مهندس بيانات أول» at 53% must stay third)."
    if why:
        held.append({"id": jid, "from": c["from"], "why": why})
        continue
    seen_urls.add(c["url"])
    capped, reqs = [], []
    for r in roadmap_order(reqs_in):
        mx = ALL[r["skill"]]["maxStars"]
        stars = min(r["stars"], mx)
        if stars != r["stars"]:
            capped.append(f"{r['skill']} {r['stars']}→{stars}")
        reqs.append({"skill": r["skill"], "stars": stars, "evidence": r["evidence"]})
    notes = [n for n in [c["note"], remap_note] if n]
    if capped:
        notes.append("Stars capped at the skill's maximum in Dalil: " + ", ".join(capped) + ".")
    src = {"site": c.get("site") or site_label(c["url"], c["company"]), "url": c["url"], "postedAt": c["postedAt"], "checkedAt": CHECKED}
    if notes:
        src["note"] = " ".join(notes)
    fix = TEXT_FIXES.get(jid, {})
    summary = fix.get("summary", c["summary"])
    tasks = [fix.get("tasks", {}).get(i, t).rstrip(".") for i, t in enumerate(c["tasks"])]
    for t in [c["title"], c["company"], summary, *tasks]:
        if re.search(r"[0-9٠-٩]", t):
            text_problems.append(f"{jid}: digit in «{t}»")
    if not summary.endswith(".") or summary.count(".") != 1 or len(summary.split()) > 25:
        text_problems.append(f"{jid}: summary «{summary}» ({len(summary.split())} words)")
    for t in tasks:
        if len(t.split()) > 10:
            text_problems.append(f"{jid}: task «{t}» ({len(t.split())} words)")
    if len(tasks) != 3:
        text_problems.append(f"{jid}: {len(tasks)} tasks")
    jobs_out.append({
        "id": jid, "title": c["title"], "titleEn": c["titleEn"], "field": field, "city": c["city"], "place": c["place"],
        "band": c["band"], "company": c["company"], "companyEn": c["companyEn"], "real": True, "source": src,
        "requirements": reqs, "summary": summary, "tasks": tasks, "_match": sample_match(reqs), "_from": c["from"],
        "_family": c.get("family"),
    })

jobs_out.sort(key=lambda j: FIELD_ORDER.index(j["field"]))
job_ids = [j["id"] for j in jobs_out]
held_doc = {"checkedAt": CHECKED, "note": "Real postings of research/wave3 kept out of the app by research/wave3/build.py, with why (the research files' own held lists are in each file).", "held": held}
write(W3 / "held.json", json.dumps(held_doc, ensure_ascii=False, indent=2) + "\n")
write(
    OUT / "jobs.ts",
    "\n".join([
        "// Owner: data (wave-3 integration, 21 Nov 2026). Merged into JOBS by ../jobs.ts. GENERATED by research/wave3/build.py",
        "// from research/wave3/tech-jobs.json, business-jobs.json and new-careers.json: do not edit by hand. Real postings from the",
        "// companies' own careers pages or ATS boards, open on the day they were checked (21 Nov 2026); never LinkedIn, Indeed or",
        "// Bayt. Same rules as ../wave2/jobs.ts: the Arabic title is a translation (the posting's own in `titleEn`), five",
        "// requirements in roadmap order with the posting's own sentence as `evidence`, verbatim (a line the research listed under",
        "// missingSkills becomes the evidence of one of the new skills, said in the source note); stars capped at the skill's",
        "// maximum. The business postings' task lines are «دليل»'s (research/wave3/tasks_src.py). Wave 3 sits after every older",
        "// job in JOB_IDS, so no tie of the demo's reveal moves. Held postings, with why: research/wave3/held.json. Pure module.",
        'import type { Job } from "@/lib/types";',
        "",
        "export const WAVE3_JOB_IDS = " + ts(job_ids) + " as const;",
        "export type Wave3JobId = (typeof WAVE3_JOB_IDS)[number];",
        "",
        "export const WAVE3_JOBS: readonly Job[] = " + ts([{k: v for k, v in j.items() if not k.startswith("_")} for j in jobs_out]) + ";",
        "",
    ]),
)

# ── courses ───────────────────────────────────────────────────────────────────────────────────────────────────────────
courses_out = []
for c in NC["courses"]:
    desc, lessons = LESSONS[c["id"]]
    courses_out.append({"id": c["id"], "skill": c["skill"], "star": c["star"], "title": c["title"], "hours": min(c["hours"], 16), "description": desc, "lessons": lessons})
expected_courses = [f"c-{s['id']}-{i + 1}" for s in skills_out for i in range(s["maxStars"])]
assert [c["id"] for c in courses_out] == expected_courses, "course ids out of skill order"

# ── guides (the same reshaping as wave 2) ────────────────────────────────────────────────────────────────────────────
GC_KEYS = ["title", "provider", "url", "lang", "price", "financialAid", "hours", "certificate", "star", "why", "recommendedBy", "checkedAt"]
GP_KEYS = ["name", "platform", "url", "why", "arab", "saudiBased", "recommendedBy", "checkedAt", "links", "members"]
GA_KEYS = ["title", "author", "site", "url", "lang", "why", "recommendedBy", "checkedAt"]
CERT_OFFICIAL = ["kind", "name", "short", "issuer", "code", "type", "url", "fee", "feeVaries", "prepUrl", "prepLabel", "level", "star", "why", "checkedAt"]
CERT_NONE = ["kind", "proof", "proofUrl", "why", "checkedAt"]


def guide_course(c):
    out = pick(c, GC_KEYS)
    if "coursera.org" in c["url"]:
        out["price"] = "paid"
    if out.get("financialAid") is not True:
        out.pop("financialAid", None)
    return out


guides_out = []
for g in NC["guides"]:
    cert = g.get("certification")
    if cert:
        cert = pick(cert, CERT_OFFICIAL if cert["kind"] == "official" else CERT_NONE)
        if cert.get("fee") and cert["fee"].get("qualifier") not in ("from", "about", None):
            cert["fee"] = {**cert["fee"], "qualifier": None, "note": (cert["fee"].get("note") or "") + f" (price for {cert['fee']['qualifier']})"}
        if cert["kind"] == "official":
            # the app's certificate types are a proctored exam or a vendor programme: a course with a certificate is a
            # programme, a licence is earned by its exams (the page's own words stay in `why`)
            cert["type"] = {"course": "program", "licence": "exam", "license": "exam"}.get(cert["type"], cert["type"])
            # the app shows fees in USD or SAR only: another currency is said in the Arabic line, with its page linked
            if cert.get("fee") and cert["fee"]["currency"] not in ("USD", "SAR"):
                sign = {"EUR": "يورو", "GBP": "جنيه إسترليني"}.get(cert["fee"]["currency"], cert["fee"]["currency"])
                cert["why"] = cert["why"].rstrip(".") + f". الرسوم على صفحة الجهة {cert['fee']['amount']} {sign}."
                cert["fee"] = None
            # no separate prep page: the issuer's own requirements page is the first step
            if not cert.get("prepUrl"):
                cert["prepUrl"] = cert["url"]
                cert["prepLabel"] = cert.get("prepLabel") or "اقرأ متطلبات الجهة"
    rec = {
        "skill": g["skill"],
        "depth": g["depth"] if g["depth"] in ("full", "basic") else "basic",
        "topPick": guide_course(g["topPick"]),
        "alternatives": [guide_course(c) for c in g["alternatives"]][:2],
        "people": [pick(p, GP_KEYS) for p in g["people"]],
        "articles": [{**pick(a, GA_KEYS), "author": a.get("author") or a["site"]} for a in g["articles"]],
        "proof": pick(g["proof"], ["task", "dataset", "checkedAt"]) if g.get("proof") else None,
        "recommendedBy": g.get("recommendedBy"),
        "checkedAt": g["checkedAt"],
    }
    if cert:
        rec["certification"] = cert
    guides_out.append(rec)
assert sorted(g["skill"] for g in guides_out) == sorted(NEW_SKILL_IDS), "one guide per new skill"
guides_out.sort(key=lambda g: NEW_SKILL_IDS.index(g["skill"]))

# ── knowledge: the seven new families (wave-2 shape) ─────────────────────────────────────────────────────────────────
ROUTE_KEYS = ["id", "nameAr", "nameEn", "owner", "url", "line", "eligibility", "benefit", "fits", "checkedAt", "note"]
FAMILY_KEYS = ["id", "title", "titleEn", "fields", "isNew", "what", "dayToDay", "path", "jobs", "employers", "entryRoutes",
               "certificates", "salary", "interviewQuestions", "first30Days", "writtenByDalil", "botLines", "sources"]
CERT_KEYS = ["name", "issuer", "url", "level", "priceText", "arabicAvailable", "why", "checkedAt"]
SALARY_KEYS = ["role", "minSAR", "maxSAR", "period", "level", "sourceName", "url", "page", "checkedAt", "note"]
LEVEL = {"beginner": "entry", "intermediate": "associate", "advanced": "professional"}
in_app_new = set(job_ids)
# a family's real jobs: its own list (when the posting is in the app) and the wave-3 postings of its skills
FAMILY_JOBS_EXTRA = {"mobile-dev": ["lamdax-mobile-flutter-intern-remote"], "pr-communications": [j for j in job_ids if next(x for x in jobs_out if x["id"] == j)["field"] == "communications"]}
families_out = []
for f in NC["knowledge"]["families"]:
    rec = pick(f, FAMILY_KEYS)
    rec["path"] = {
        **pick(f["path"], ["skills", "basedOnLine", "basedOnLinks", "orderNote"]),
        "guidelines": [pick(x, ["name", "provider", "url", "orderedTopics", "checkedAt"]) for x in f["path"]["guidelines"]],
    }
    rec["jobs"] = [j for j in f["jobs"] + FAMILY_JOBS_EXTRA.get(f["id"], []) if j in in_app_new]
    rec["jobs"] = list(dict.fromkeys(rec["jobs"]))
    # no day of collection in what «دليلك» may say (coordinator, 21 Nov 2026): «يوم 21 نوفمبر» in a note becomes «حين قُرئت»
    rec["employers"] = [{**pick(e, ["name", "nameEn", "careersUrl", "checkedAt"]), "note": re.sub(r"\s*يوم 21 نوفمبر", " حين قُرئت", e["note"]) if e.get("note") else None} for e in f["employers"]]
    rec["certificates"] = [{**pick(c, CERT_KEYS), "level": LEVEL.get(c["level"], c["level"])} for c in f["certificates"]]
    rec["salary"] = pick(f["salary"], SALARY_KEYS) if f.get("salary") else None
    families_out.append(rec)

# ── knowledge-plus: new entry routes, and additions to the existing families ─────────────────────────────────────────
GUIDES_BY_KEY = {g["key"]: g for g in KP["salarySources"]["guides"]}
plus_families = KP["families"]
route_families = {}
for fid, f in plus_families.items():
    for r in f.get("newEntryRoutes") or []:
        route_families.setdefault(r, []).append(fid)
ALL_PATHS = ("كل المسارات", "كل الخريجين", "كل الوظائف", "كل التخصصات")
routes_out, routes_skipped = [], []
for r in KP["entryRoutes"]:
    if not r.get("isNew"):
        continue
    if r.get("status") != "open":
        routes_skipped.append(f"{r['id']} (status {r.get('status')})")
        continue
    fits = route_families.get(r["id"])
    if not fits:
        fits = "all" if any(w in (r.get("fitsHint") or "") for w in ALL_PATHS) else None
    if fits is None:
        routes_skipped.append(f"{r['id']} (no family named it and its fit is not all paths: {r.get('fitsHint')})")
        continue
    rec = pick(r, ["id", "nameAr", "nameEn", "owner", "url", "line"])
    rec["eligibility"] = r.get("eligibility") or None
    rec["benefit"] = r.get("benefit") or None
    rec["fits"] = fits
    rec["checkedAt"] = r["checkedAt"]
    rec["note"] = r.get("note")
    routes_out.append(rec)
ROUTE_IDS = {r["id"] for r in routes_out}
DECISIONS = {d["id"]: d for d in KP["saudization"]["localisationDecisions"]}


def salary_row(x):
    """A knowledge-plus salary row in the app's FamilySalary shape, or None when it may not be quoted as SAR."""
    if x.get("currency") != "SAR" or str(x.get("quoteAdvice") or "").startswith("internal"):
        return None
    if not isinstance(x.get("min"), (int, float)) or not isinstance(x.get("max"), (int, float)) or x["min"] >= x["max"]:
        return None
    guide = GUIDES_BY_KEY[x["guide"]]
    page = x.get("page") or None
    url = guide["url"]
    if page and page.startswith("web page: "):
        url, page = page[len("web page: "):].strip(), None
    note = " ".join(n for n in [x.get("note"), f"Quote advice: {x['quoteAdvice']}." if x.get("quoteAdvice") else None] if n)
    return {
        "role": x["role"], "minSAR": x["min"], "maxSAR": x["max"], "period": x["period"], "level": x.get("level"),
        "sourceName": guide["name"], "url": url, "page": page, "checkedAt": x["checkedAt"], "note": note,
    }


def link(src):
    return {"label": src["label"], "url": src["url"], "checkedAt": src["checkedAt"]}


# The existing knowledge family a wave-3 posting belongs to: the research's own family tag (tech-jobs.json,
# business-jobs.json), read as the knowledge base's family; where one tag spans several families, the posting's title or
# its skills decide (an «AI / Machine Learning» title is ai-ml; an HSE requirement is hse-officer). A tag with no family
# (data engineering, IT support, health admin, media) links none.
def family_of(j):
    tag, title, skills = j.get("_family"), j["titleEn"].lower(), {r["skill"] for r in j["requirements"]}
    if tag == "data-science-ai":
        return "ai-ml" if ("ai " in title + " " or "machine learning" in title) else "data-science"
    if tag == "engineering-construction-hse":
        return "hse-officer" if "hse" in skills else "qa-qc-engineer" if "quality-control" in skills else "civil-site-engineer"
    if tag == "tourism-hospitality-events":
        return "events" if ("event" in title or "event-planning" in skills) else "guest-experience"
    if tag == "banking-compliance-audit":
        return "credit-risk" if "credit-analysis" in skills else "compliance-aml" if "aml-compliance" in skills else "audit"
    return {
        "data-analyst-bi": "data-analyst-bi", "frontend": "frontend-web", "backend": "backend", "fullstack": "backend", "qa": "qa",
        "product": "product", "ux-ui": "ui-ux-product-design", "digital-marketing": "digital-marketing", "cybersecurity": "cyber",
        "cloud-devops": "cloud-devops", "integration-support": "backend", "business-analysis-pm": "business-pm-finance",
        "finance-accounting": "business-pm-finance", "hr-recruitment": "hr-recruitment", "sales-cs-cx": "sales-cs",
        "procurement-supply-chain": "supply-procurement", "education-training": "learning-design", "legal-governance": "legal-paralegal-contracts",
    }.get(tag)


NEW_FAMILY_IDS = {f["id"] for f in families_out}
jobs_by_family = {}
for j in jobs_out:
    fam = family_of(j)
    if fam and j["field"] != "communications" and fam not in NEW_FAMILY_IDS:
        jobs_by_family.setdefault(fam, []).append(j["id"])
unknown_fams = sorted(set(jobs_by_family) - set(plus_families))
assert not unknown_fams, unknown_fams

plus_out, dropped_salary = [], 0
for fid, f in plus_families.items():
    salaries = []
    for x in f.get("salaryExtra") or []:
        row = salary_row(x)
        if row is None:
            dropped_salary += 1
        else:
            salaries.append(row)
    loc = []
    for d_id in f.get("localisation") or []:
        d = DECISIONS[d_id]
        loc.append({
            "id": d["id"], "groupAr": d["groupAr"], "rate": d["rate"], "appliesTo": d["appliesTo"],
            "minWageCounted": d.get("minWageCounted"), "effective": d.get("effective"), "botLine": d.get("botLine"),
            "sources": [link(s) for s in d["sources"]],
        })
    so = f.get("standOut")
    plus_out.append({
        "id": fid,
        "jobs": jobs_by_family.get(fid, []),
        "salaries": salaries,
        "noSalaryLine": f.get("salaryNoRow"),
        "localisation": loc,
        "entryRoutes": [r for r in f.get("newEntryRoutes") or [] if r in ROUTE_IDS],
        "interviewQuestions": [{"q": q["q"], "from": {"label": q["fromGuideline"]["name"], "url": q["fromGuideline"]["url"]}} for q in f.get("interviewQuestionsPlus") or []],
        "standOut": {"tip": so["tip"], "source": link(so["source"])} if so else None,
        "botLines": f.get("botLines") or [],
    })

sz = KP["saudization"]
saudization = {
    "nitaqat": [{"text": x["text"], "source": link(x["source"])} for x in sz["nitaqat"]["facts"]],
    "nitaqatBotLines": sz["nitaqat"].get("botLines") or [],
    "decisions": [
        {"id": d["id"], "groupAr": d["groupAr"], "rate": d["rate"], "appliesTo": d["appliesTo"], "minWageCounted": d.get("minWageCounted"),
         "effective": d.get("effective"), "professionsExamples": d.get("professionsExamples") or [], "botLine": d.get("botLine"),
         "families": d.get("families") or [], "sources": [link(s) for s in d["sources"]]}
        for d in sz["localisationDecisions"]
    ],
    "labourLaw": [{"id": a["id"], "article": a["article"], "text": a["text"], "botLine": a.get("botLine"), "source": link(a["source"])} for a in sz["labourLaw"]],
    "saned": {"name": sz["gosiSaned"]["nameAr"], "facts": sz["gosiSaned"]["facts"], "source": link(sz["gosiSaned"]["source"])},
}
bootcamps = [
    {k: b.get(k) for k in ["name", "field", "length", "free", "url", "location", "requirements"]} | {"checkedAt": b["checkedAt"]}
    for b in KP["tuwaiqOpenBootcamps"] if b.get("status", "open").startswith("open")
]

# ── companies of the postings that the app does not know yet ─────────────────────────────────────────────────────────
# Names as the posting writes them; aliases are what people type; a name that is also an everyday word («سجادتي»,
# «بيوت», «روافد», «كلير», «فلو») counts only as the whole answer (`aliasesAlone`), like «مهارة». careersUrl is the
# company's own board where the posting sits on one (apply.workable.com/<company>, SmartRecruiters, Lever, Oracle,
# SuccessFactors); a posting on the shared jobs.workable.com index gives no board, so the company is known by name only.
NEW_COMPANIES = [
    # data, software, cyber-cloud, product
    ("arabic-ai", "أرابيك إيه آي", "أرابيك إيه آي", "Arabic.AI", ["أرابيك إيه آي", "arabic.ai", "arabicai"], None, "https://apply.workable.com/arabicai/"),
    ("innovationteam", "إنوفيشن تيم", "إنوفيشن تيم", "InnovationTeam", ["إنوفيشن تيم", "انوفيشن تيم", "innovationteam"], None, "https://apply.workable.com/innovationteam/"),
    ("squadio", "سكواديو", "سكواديو", "Squadio", ["سكواديو", "squadio"], None, "https://apply.workable.com/squadio23/"),
    ("tawantech", "تاوان تك", "تاوان تك", "TAWANTECH", ["تاوان تك", "tawantech", "tawan tech"], None, "https://apply.workable.com/tawantech/"),
    ("lamdax", "لمدا إكس", "لمدا إكس", "LamdaX", ["لمدا إكس", "لمدا اكس", "lamdax"], None, "https://apply.workable.com/lamdax/"),
    ("saudi-azm", "عزم السعودية", "عزم", "Saudi AZM", ["عزم السعودية", "شركة عزم", "saudi azm"], None, "https://azmtalent.recruitee.com/"),
    ("webook", "ويبوك", "ويبوك", "webook.com", ["ويبوك", "webook", "webook.com"], None, "https://apply.workable.com/webook/"),
    ("lucid-motors", "لوسد موتورز", "لوسد", "Lucid Motors", ["لوسد موتورز", "لوسيد موتورز", "lucid motors"], ["لوسد", "لوسيد", "lucid"], "https://lucidmotors.com/careers"),
    ("bosch", "بوش", "بوش", "Bosch", ["شركة بوش", "bosch"], ["بوش"], "https://jobs.smartrecruiters.com/BoschGroup"),
    ("deepsource", "ديب سورس تكنولوجيز", "ديب سورس", "DeepSource Technologies", ["ديب سورس", "deepsource", "deep source"], None, "https://apply.workable.com/deepsource/"),
    ("eram-talent", "إرم تالنت", "إرم تالنت", "Eram Talent", ["إرم تالنت", "ارم تالنت", "eram talent"], None, "https://apply.workable.com/eramtalent-1/"),
    ("gathern", "جاذر إن", "جاذر إن", "Gathern", ["جاذر إن", "جاذرن", "gathern"], None, "https://apply.workable.com/gathern/"),
    # business, hr, sales-supply, engineering, tourism, health, education, banking, legal, communications, real estate
    ("accor", "أكور", "أكور", "Accor", ["أكور", "اكور", "accor", "accor hotels"], None, "https://jobs.smartrecruiters.com/AccorHotel"),
    ("marriott", "ماريوت الدولية", "ماريوت", "Marriott International", ["ماريوت", "فنادق ماريوت", "marriott", "marriott international"], None, "https://ejwl.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/MI_CS_1"),
    ("aljomaih-energy-water", "الجميح للطاقة والمياه", "الجميح للطاقة", "Al Jomaih Energy and Water", ["الجميح للطاقة والمياه", "الجميح للطاقة", "al jomaih energy", "aljomaih"], None, None),
    ("clear", "كلير", "كلير", "CLEAR", ["شركة كلير"], ["كلير", "clear"], None),
    ("segadty", "سجادتي", "سجادتي", "Segadty", ["تطبيق سجادتي", "شركة سجادتي", "segadty"], ["سجادتي"], None),
    ("ey", "إرنست ويونغ (EY)", "EY", "EY", ["إرنست ويونغ", "ارنست ويونغ", "ernst & young", "ernst and young"], ["ey"], "https://careers.ey.com/"),
    ("moomoo", "مومو", "مومو", "moomoo", ["moomoo"], ["مومو"], None),
    ("rentokil", "رينتوكيل إنيشال", "رينتوكيل", "Rentokil Initial", ["رينتوكيل", "rentokil", "rentokil initial"], None, None),
    ("thechefz", "ذا شفز", "ذا شفز", "TheChefz", ["ذا شفز", "thechefz", "the chefz"], None, None),
    ("sgs", "إس جي إس", "إس جي إس", "SGS", ["إس جي إس", "اس جي اس", "sgs"], None, "https://jobs.smartrecruiters.com/SGS"),
    ("teef-najd", "مجموعة طيف نجد", "طيف نجد", "Teef Najd Group", ["طيف نجد", "مجموعة طيف نجد", "teef najd"], None, None),
    ("ultimate-peaks", "ألتيميت بيكس", "ألتيميت بيكس", "Ultimate Peaks", ["ألتيميت بيكس", "ultimate peaks"], None, None),
    ("alborg", "مختبرات البرج", "مختبرات البرج", "AlBorg Diagnostics", ["مختبرات البرج", "البرج للمختبرات", "alborg", "alborg diagnostics"], None, None),
    ("aanaab", "أناب", "أناب", "Aanaab", ["شركة أناب", "aanaab"], ["أناب"], None),
    ("abbvie", "آبفي", "آبفي", "AbbVie", ["آبفي", "ابفي", "abbvie"], None, "https://jobs.smartrecruiters.com/AbbVie"),
    ("bank-of-jordan", "بنك الأردن", "بنك الأردن", "Bank of Jordan", ["بنك الأردن", "bank of jordan"], None, None),
    ("bayut-dubizzle", "بيوت | دوبيزل", "بيوت", "Bayut | dubizzle", ["دوبيزل", "bayut", "dubizzle"], ["بيوت"], None),
    ("khayira", "شركة خيرة القابضة", "خيرة القابضة", "Khayira Holding Company", ["خيرة القابضة", "شركة خيرة", "khayira"], None, None),
    ("alkaffary", "مجموعة الكفاري", "الكفاري", "Alkaffary Group", ["مجموعة الكفاري", "الكفاري", "alkaffary"], None, None),
    ("rawafid", "روافد", "روافد", "Rawafid", ["شركة روافد", "rawafid"], ["روافد"], None),
    ("jodayn", "جودين", "جودين", "JODAYN", ["جودين", "jodayn"], None, None),
    ("flow", "فلو", "فلو", "Flow", ["flowlife", "flow living"], ["فلو", "flow"], "https://jobs.lever.co/flowlife"),
]


def nrm(t):
    t = re.sub(r"[ً-ٰـ]", "", t)
    t = re.sub("[أإآ]", "ا", t).replace("ى", "ي").replace("ة", "ه").lower().strip()
    t = re.sub(r"\s*\([^()]*\)$", "", t)
    return re.sub(r"^ال", "", t)


companies_src = (DATA / "companies.ts").read_text(encoding="utf-8")
head_companies = companies_src.split("// ── wave 3 BEGIN")[0] if "// ── wave 3 BEGIN" in companies_src else companies_src
known = {}
for m in re.finditer(r'\{ id: "([a-z0-9-]+)", name: "([^"]+)", short: "([^"]+)", en: "([^"]+)", aliases: \[([^\]]*)\](?:, aliasesAlone: \[([^\]]*)\])?', head_companies):
    cid = m.group(1)
    for n in [m.group(2), m.group(3), m.group(4), *re.findall(r'"([^"]+)"', m.group(5) + (m.group(6) or ""))]:
        known.setdefault(nrm(n), cid)
EXISTING_COMPANY_IDS = set(re.findall(r'\{ id: "([a-z0-9-]+)", name:', head_companies))
comp_lines = []
new_company_ids = []
for cid, name, short, en, aliases, alone, url in NEW_COMPANIES:
    assert cid not in EXISTING_COMPANY_IDS, cid
    jobs_of = [j for j in jobs_out if nrm(j["companyEn"]) == nrm(en) or nrm(j["company"]) == nrm(name) or any(nrm(j["companyEn"]).startswith(nrm(a)) for a in aliases + (alone or []) if re.match(r"[a-z]", nrm(a)))]
    rec = {"id": cid, "name": name, "short": short, "en": en, "aliases": aliases}
    if alone:
        rec["aliasesAlone"] = alone
    rec["careersUrl"] = url
    # the posting's own board opened that day (a careers page); a posting on the shared jobs.workable.com index gives none
    rec["source"] = "careers-page" if url else "posting"
    rec["checkedAt"] = "@CHECKED"
    board = "its own board" if url else "the shared jobs.workable.com index (no board of its own opened)"
    rec["note"] = f"wave 3 (research/wave3): the company of {len(jobs_of)} real posting(s) in the app, read on {board} on 21 Nov 2026."
    comp_lines.append("  " + one_line(rec).replace('"@CHECKED"', "CHECKED_WAVE3") + ",\n")
    new_company_ids.append(cid)
replace_block(DATA / "companies.ts", "// ── wave 3 BEGIN", "// ── wave 3 END", "".join(comp_lines))

# logos: the wave-3 postings' company names, for a company whose logo file is already in public/logos
logo_src = (DATA / "company-logos.ts").read_text(encoding="utf-8")
logo_head = logo_src.split("// ── wave 3 BEGIN")[0]
logo_by_key = dict(re.findall(r'^\s*"([^"]+)": "(/logos/[^"]+)",', logo_head, re.M))
logo_by_company = {}
for key, path in logo_by_key.items():
    cid = known.get(nrm(key))
    if cid:
        logo_by_company.setdefault(cid, path)
logo_lines, seen_keys = [], set(logo_by_key)
for j in jobs_out:
    cid = known.get(nrm(j["companyEn"])) or known.get(nrm(j["company"]))
    path = logo_by_company.get(cid) if cid else None
    if not path or not (LOGOS_DIR / Path(path).name).exists():
        continue
    keys = [k for k in (j["companyEn"], j["company"]) if k not in seen_keys]
    if keys:
        logo_lines.append(f"  // {cid} ({j['id']})\n")
        logo_lines += [f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(path)},\n" for k in keys]
        seen_keys |= set(keys)
replace_block(DATA / "company-logos.ts", "// ── wave 3 BEGIN", "// ── wave 3 END", "".join(logo_lines))

# ── write the generated modules ──────────────────────────────────────────────────────────────────────────────────────
HEAD = "// Owner: data (wave-3 integration, 21 Nov 2026). GENERATED by research/wave3/build.py from research/wave3/new-careers.json\n// and knowledge-plus.json: do not edit by hand. "
write(
    OUT / "skills.ts",
    HEAD + """The four new fields and 21 new skills of wave 3, wired in like ../wave2/skills.ts: their ids are in
// src/lib/ids.ts, ../fields.ts lists the fields and ../skills.ts merges WAVE3_SKILLS into SKILLS (SKILL_IDS order); the
// insurance skills sit in banking-risk, the mobile ones in software (after programming), the telecom ones in cyber-cloud
// (after networking), so every prerequisite stays inside its field and none leads to a data-field skill. Alias guard: no
// bare «Swift» (SWIFT bank payments) and no «RAN» (the English verb). Pure module.
import type { Field, Skill } from "@/lib/types";

"""
    + "export const WAVE3_FIELDS: readonly Field[] = " + ts([{"id": f["id"], "name": f["name"], "hasJobs": True} for f in NEW_FIELDS]) + ";\n\n"
    + "export const WAVE3_SKILL_IDS = " + ts(NEW_SKILL_IDS) + " as const;\n\n"
    + "export const WAVE3_SKILLS: readonly Skill[] = " + ts(skills_out) + ";\n",
)
write(
    OUT / "courses.ts",
    HEAD + """The learning steps of the new skills (merged into COURSES by ../courses.ts), one per star slot,
// with «دليل»'s own lesson titles (research/wave3/courses_src.py); a 20- or 30-hour step is shown as 16. Pure module.
import type { Course } from "@/lib/types";

"""
    + "export const WAVE3_COURSE_IDS = " + ts([c["id"] for c in courses_out]) + " as const;\n\n"
    + "export const WAVE3_COURSES: readonly Course[] = " + ts(courses_out) + ";\n",
)
write(
    OUT / "guides.ts",
    HEAD + """The learning guides of the new skills in the app's `Guide` shape (../all-guides.ts merges them),
// with their certification block and people links. Real items only; a Coursera course is «paid». Pure module.
import type { Guide } from "../guides";

"""
    + "export const WAVE3_GUIDES: readonly Guide[] = " + ts(guides_out) + ";\n",
)
write(
    OUT / "knowledge.ts",
    HEAD + """For «دليلك»: the seven new career families (shape of ../wave2/knowledge.ts), the new entry routes
// read on official pages (open ones only), and per existing family the additions of knowledge-plus.json (more salary rows
// that may be quoted as SAR — the Robert Walters rows print AED and are left out —, Saudization decisions, interview
// questions with the guideline they come from, a stand-out tip and bot lines), plus the Saudization and labour-law facts
// and the open Tuwaiq bootcamps. Every fact keeps its link. ../careers.ts merges all of it. Pure module.
import type { JobId } from "@/lib/types";

import type { CareerFamily, CareerFamilyId, EntryRoute, EntryRouteId, FamilySalary, KnowledgeLink } from "../expansion/knowledge";
import type { Wave2EntryRouteId, Wave2FamilyId } from "../wave2/knowledge";

"""
    + "export const WAVE3_FAMILY_IDS = " + ts([f["id"] for f in families_out]) + " as const;\n"
    + "export type Wave3FamilyId = (typeof WAVE3_FAMILY_IDS)[number];\n\n"
    + "export const WAVE3_ENTRY_ROUTE_IDS = " + ts([r["id"] for r in routes_out]) + " as const;\n"
    + "export type Wave3EntryRouteId = (typeof WAVE3_ENTRY_ROUTE_IDS)[number];\n\n"
    + """type AnyFamilyId = CareerFamilyId | Wave2FamilyId | Wave3FamilyId;
type AnyRouteId = EntryRouteId | Wave2EntryRouteId | Wave3EntryRouteId;

export interface Wave3EntryRoute extends Omit<EntryRoute, "id" | "fits"> {
  readonly id: Wave3EntryRouteId;
  readonly fits: readonly AnyFamilyId[] | "all";
}

export interface Wave3CareerFamily extends Omit<CareerFamily, "id" | "entryRoutes" | "jobs"> {
  readonly id: Wave3FamilyId;
  readonly entryRoutes: readonly AnyRouteId[];
  readonly jobs: readonly JobId[];
}

/** A Saudization decision of the Ministry of Human Resources (official page linked). */
export interface LocalisationDecision {
  readonly id: string;
  readonly groupAr: string;
  readonly rate: string;
  readonly appliesTo: string;
  readonly minWageCounted: string | null;
  readonly effective: string | null;
  readonly botLine: string | null;
  readonly sources: readonly KnowledgeLink[];
}

/** What knowledge-plus.json adds to an existing family (of the expansion or wave 2). */
export interface FamilyPlus {
  readonly id: AnyFamilyId;
  /** The wave-3 real postings of this family (the research's family tag), after the family's own list. */
  readonly jobs: readonly JobId[];
  /** More published pay rows, each with its guide, page or link (only rows that may be quoted as SAR). */
  readonly salaries: readonly FamilySalary[];
  /** When no published Saudi guide lists the role: what «دليلك» says instead of a number. */
  readonly noSalaryLine: string | null;
  readonly localisation: readonly LocalisationDecision[];
  readonly entryRoutes: readonly AnyRouteId[];
  /** Written by «دليلك» from the linked guideline. */
  readonly interviewQuestions: readonly { readonly q: string; readonly from: { readonly label: string; readonly url: string } }[];
  readonly standOut: { readonly tip: string; readonly source: KnowledgeLink } | null;
  readonly botLines: readonly string[];
}

"""
    + "export const WAVE3_ENTRY_ROUTES: readonly Wave3EntryRoute[] = " + ts(routes_out) + ";\n\n"
    + "export const WAVE3_CAREER_FAMILIES: readonly Wave3CareerFamily[] = " + ts(families_out) + ";\n\n"
    + "export const WAVE3_FAMILY_PLUS: readonly FamilyPlus[] = " + ts(plus_out) + ";\n\n"
    + "/** Saudization (Nitaqat counting rules, localisation decisions), labour-law articles and SANED, official pages only. */\n"
    + "export const WAVE3_SAUDIZATION = " + ts(saudization) + " as const;\n\n"
    + "/** Tuwaiq Academy bootcamps open for registration when read. */\n"
    + "export const WAVE3_TUWAIQ_BOOTCAMPS = " + ts(bootcamps) + " as const;\n",
)

# ── clash check: every new skill alias against every skill alias, every company spelling and the sample CV ──────────
alias_owner = {}
for path in [DATA / "skills.ts", DATA / "expansion" / "skills.ts", DATA / "wave2" / "skills.ts"]:
    for m in re.finditer(r'id: "([a-z0-9-]+)",[\s\S]*?aliases: \[([^\]]*)\]', path.read_text(encoding="utf-8")):
        for a in re.findall(r'"([^"]+)"', m.group(2)):
            alias_owner.setdefault(nrm(a), m.group(1))
company_spell = dict(known)
for cid, name, short, en, aliases, alone, url in NEW_COMPANIES:
    for a in aliases + (alone or []):
        company_spell.setdefault(nrm(a), cid)
sample_text = nrm((DATA / "sample-cv.ts").read_text(encoding="utf-8"))
clashes = []
for x in skills_out:
    for a in x["aliases"]:
        k = nrm(a)
        if k in alias_owner and alias_owner[k] != x["id"]:
            clashes.append(f"skill alias «{a}» of {x['id']} = an alias of {alias_owner[k]}")
        if k in company_spell:
            clashes.append(f"skill alias «{a}» of {x['id']} = a spelling of company {company_spell[k]}")
        if re.search(r"(?<![\w])" + re.escape(k) + r"(?![\w])", sample_text):
            clashes.append(f"skill alias «{a}» of {x['id']} occurs in the sample CV")
        alias_owner.setdefault(k, x["id"])
for cid, name, short, en, aliases, alone, url in NEW_COMPANIES:
    for a in aliases + (alone or []):
        if nrm(a) in alias_owner:
            clashes.append(f"company spelling «{a}» of {cid} = a skill alias of {alias_owner[nrm(a)]}")
        if nrm(a) in known:
            clashes.append(f"company spelling «{a}» of {cid} = a spelling of company {known[nrm(a)]}")

# ── report for the integrator ─────────────────────────────────────────────────────────────────────────────────────────
print("clashes:", clashes or "none")
print("text problems:", text_problems or "none")
print("skills:", len(skills_out), "stars:", sum(x["maxStars"] for x in skills_out), "courses:", len(courses_out), "hours:", sum(c["hours"] for c in courses_out))
print("guides:", len(guides_out), "families:", [f["id"] for f in families_out])
print("family jobs:", {f["id"]: f["jobs"] for f in families_out})
print("routes:", [r["id"] for r in routes_out], "skipped:", routes_skipped)
print("family jobs added:", {k: len(v) for k, v in jobs_by_family.items()})
print("plus families:", len(plus_out), "salary rows kept:", sum(len(p["salaries"]) for p in plus_out), "dropped (AED / internal / no range):", dropped_salary)
print("SKILL_IDS +=", json.dumps(NEW_SKILL_IDS))
print("COURSE_IDS +=", json.dumps([c["id"] for c in courses_out]))
print("COMPANY_IDS +=", json.dumps(new_company_ids))
print("logo keys:", sum(1 for l in logo_lines if not l.strip().startswith("//")))
print("jobs:", len(jobs_out))
by_field = {}
for j in jobs_out:
    by_field.setdefault(j["field"], []).append(j["id"])
for f, ids in by_field.items():
    print(f"  {f} ({len(ids)}):", ids)
print("held:", len(held))
for h in held:
    print("  ", h["id"], "|", h["why"][:110])
unknown_companies = sorted({j["companyEn"] for j in jobs_out if not (known.get(nrm(j["companyEn"])) or known.get(nrm(j["company"])) or any(nrm(j["companyEn"]) == nrm(en) or nrm(j["companyEn"]).startswith(nrm(en)) for _, _, _, en, _, _, _ in NEW_COMPANIES))})
print("job companies without a company record:", unknown_companies or "none")
write(W3 / "_build-report.json", json.dumps({
    "jobTable": {j["id"]: " ".join(f"{r['skill']}:{r['stars']}" for r in j["requirements"]) for j in jobs_out},
    "jobs": [{k: j[k] for k in ("id", "field", "city", "band", "_match", "_from")} for j in jobs_out],
}, ensure_ascii=False, indent=1) + "\n")
