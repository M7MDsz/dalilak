# Builds the wave-4 jobs of «دليل» (21 Nov 2026, owner: «add a beginner role» in every specialisation that only had
# senior ones): the real ENTRY-level postings researched into research/wave4/*.json, the same rules as research/wave3/build.py
# (exactly five of the app's skills with the posting's own sentence as evidence, a job city of the app, no senior title,
# the demo's sample CV under 53%, not already in the app by id, link or company + title, the app's text rules).
#   - writes src/lib/data/wave4/jobs.ts (WAVE4_JOB_IDS, WAVE4_JOBS);
#   - puts the ids between the «wave 4 BEGIN/END» lines at the end of JOB_IDS in src/lib/ids.ts;
#   - research/wave4/held.json: the postings kept out, with why.
# Run: python -X utf8 research/wave4/build.py   (from the masari folder). Nothing is invented: every value comes from a
# research file; TEXT_FIXES only shortens a line to the app's text rules, keeping its meaning.
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
W4 = ROOT / "research" / "wave4"
DATA = ROOT / "src" / "lib" / "data"
CHECKED = "2026-11-21"

SKILL_RE = re.compile(r'id: "([a-z0-9-]+)",\s*name: "([^"]+)",\s*field: "([a-z-]+)",\s*maxStars: (\d),\s*prereqs: \[([^\]]*)\]')


def parse_skills(path: Path):
    out = {}
    for m in SKILL_RE.finditer(path.read_text(encoding="utf-8")):
        sid, name, field, ms, pre = m.groups()
        out[sid] = {"maxStars": int(ms), "prereqs": re.findall(r'"([a-z0-9-]+)"', pre)}
    return out


ALL = {}
for p in [DATA / "skills.ts", DATA / "expansion" / "skills.ts", DATA / "wave2" / "skills.ts", DATA / "wave3" / "skills.ts"]:
    ALL.update(parse_skills(p))
assert len(ALL) >= 114, len(ALL)


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


SAMPLE = {"excel": 2, "sql": 2, "statistics": 1, "programming": 1, "english": 2, "communication": 1, "presentation": 1, "teamwork": 1}


def sample_match(reqs):
    return round(sum(20 * 6 * min(SAMPLE.get(r["skill"], 0), r["stars"]) / r["stars"] for r in reqs) / 6)


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
        items = [(k if IDENT.match(k) else json.dumps(k), x) for k, x in v.items()]
        flat = "{ " + ", ".join(f"{k}: {ts(x, 0)}" for k, x in items) + " }"
        if len(flat) + len(pad) < 110 and "\n" not in flat:
            return flat
        return "{\n" + "".join(f"{pad}  {k}: {ts(x, ind + 1)},\n" for k, x in items) + f"{pad}}}"
    raise TypeError(type(v))


EXISTING_IDS, EXISTING_URLS, EXISTING_PAIRS = set(), set(), set()
for path in [DATA / "jobs.ts", DATA / "expansion" / "jobs.ts", DATA / "wave2" / "jobs.ts", DATA / "wave3" / "jobs.ts"]:
    text = path.read_text(encoding="utf-8")
    EXISTING_IDS |= set(re.findall(r'^\s+id: "([a-z0-9-]+)",', text, re.M))
    EXISTING_URLS |= set(re.findall(r'url: "([^"]+)"', text))
    for m in re.finditer(r'titleEn: "([^"]*)"[\s\S]*?companyEn: "([^"]*)"', text):
        EXISTING_PAIRS.add((m.group(2).lower(), m.group(1).lower()))
FIELD_IDS = set(re.findall(r'"([a-z-]+)"', (ROOT / "src" / "lib" / "ids.ts").read_text(encoding="utf-8").split("export const FIELD_IDS")[1].split("]")[0]))
CITY_IDS = {"riyadh", "jeddah", "dammam", "remote"}
ATS = [("workable", "Workable"), ("greenhouse", "Greenhouse"), ("lever.co", "Lever"), ("smartrecruiters", "SmartRecruiters"),
       ("oraclecloud", "Oracle"), ("recruitee", "Recruitee"), ("icims", "iCIMS"), ("myworkdayjobs", "Workday"),
       ("successfactors", "SuccessFactors"), ("zohorecruit", "Zoho Recruit"), ("taleo", "Taleo"), ("bamboohr", "BambooHR")]

# a research line shortened to the app's text rules (filled after a run reports text problems)
TEXT_FIXES: dict = {}


def site_label(url, ar):
    for host, name in ATS:
        if host in url:
            return f"صفحة وظائف {ar} ({name})"
    return f"صفحة وظائف {ar}"


def postings_of(doc):
    if isinstance(doc, list):
        return doc
    for key in ("postings", "jobs"):
        if isinstance(doc.get(key), list):
            return doc[key]
    return []


def norm(j):
    """The two research shapes (wave3 tech: titleAr/title/company{ar,en}; business: title/titleEn/company/companyEn)."""
    if "titleAr" in j:
        title, title_en = j["titleAr"], j["title"]
    else:
        title, title_en = j["title"], j.get("titleEn", "")
    comp = j.get("company")
    if isinstance(comp, dict):
        company, company_en = comp.get("ar", ""), comp.get("en", "")
    else:
        company, company_en = comp or "", j.get("companyEn", "")
    src = j.get("source") if isinstance(j.get("source"), dict) else {}
    return {
        "id": j["id"], "title": title, "titleEn": title_en, "company": company, "companyEn": company_en,
        "url": j.get("url") or src.get("url", ""), "postedAt": j.get("postedAt") or src.get("postedAt"),
        "note": j.get("note") or j.get("notes") or src.get("note"), "summary": j.get("summary", ""), "tasks": j.get("tasks") or [],
        "city": j.get("city"), "place": (j.get("cityText") or j.get("place") or "").replace(", Saudi Arabia", "").strip(" ,"),
        "band": j.get("band"), "field": j.get("field"), "reqs": j.get("requirements") or [], "track": j.get("track"),
        "site": src.get("site"),
    }


candidates = []
for f in sorted(W4.glob("*.json")):
    if f.name in ("held.json",):
        continue
    for j in postings_of(json.loads(f.read_text(encoding="utf-8"))):
        c = norm(j)
        c["from"] = f.name
        candidates.append(c)

held, out, problems, seen = [], [], [], set()
for c in candidates:
    jid, reqs_in = c["id"], c["reqs"]
    why = None
    if jid in EXISTING_IDS or jid in seen:
        why = "Already in the app (same id)."
    elif c["url"] in EXISTING_URLS:
        why = "Already in the app (same posting link)."
    elif (c["companyEn"].lower(), c["titleEn"].lower()) in EXISTING_PAIRS:
        why = "Already in the app (same company and title)."
    elif not c["url"].startswith("http") or re.search(r"linkedin\.|indeed\.|bayt\.|glassdoor\.", c["url"]):
        why = f"Source not allowed or missing: {c['url']}"
    elif len(reqs_in) != 5:
        why = f"{len(reqs_in)} skills; every job has exactly five."
    elif any(r.get("skill") not in ALL for r in reqs_in):
        why = "Unknown skills: " + ", ".join(str(r.get("skill")) for r in reqs_in if r.get("skill") not in ALL)
    elif any(not str(r.get("evidence", "")).strip() for r in reqs_in):
        why = "A requirement without the posting's own sentence."
    elif c["band"] not in ("entry", "junior"):
        why = f"Band «{c['band']}»: wave 4 is beginner roles only."
    elif re.search(r"\b(senior|lead|manager|head)\b", c["titleEn"], re.I) or re.search(r"أول\b|قائد|رئيس", c["title"]):
        why = f"A senior title («{c['titleEn']}»)."
    elif c["city"] not in CITY_IDS:
        why = f"City «{c['city']}» is not one of the app's job cities."
    elif c["field"] not in FIELD_IDS:
        why = f"Field «{c['field']}» is not in the app."
    if why is None and sample_match(reqs_in) >= 53:
        why = f"The demo's sample CV would match it at {sample_match(reqs_in)}% (must stay under 53%)."
    if why:
        held.append({"id": jid, "from": c["from"], "why": why})
        continue
    fix = TEXT_FIXES.get(jid, {})
    summary = fix.get("summary", c["summary"]).strip()
    if summary and not summary.endswith("."):
        summary += "."
    tasks = [fix.get("tasks", {}).get(i, t).strip().rstrip(".") for i, t in enumerate(c["tasks"])][:3]
    title = fix.get("title", c["title"]).strip()
    bad = []
    for t in [title, c["company"], summary, *tasks]:
        if re.search(r"[0-9٠-٩]", t):
            bad.append(f"digit in «{t}»")
    if summary.count(".") != 1 or len(summary.split()) > 25:
        bad.append(f"summary «{summary}» ({len(summary.split())} words)")
    for t in tasks:
        if len(t.split()) > 10:
            bad.append(f"task «{t}» ({len(t.split())} words)")
    if len(tasks) != 3:
        bad.append(f"{len(tasks)} tasks")
    if bad:
        problems.append(f"{jid}: " + " · ".join(bad))
        held.append({"id": jid, "from": c["from"], "why": "Text rules: " + " · ".join(bad)})
        continue
    seen.add(jid)
    capped, reqs = [], []
    for r in roadmap_order(reqs_in):
        stars = max(1, min(int(r["stars"]), ALL[r["skill"]]["maxStars"]))
        if stars != r["stars"]:
            capped.append(f"{r['skill']} {r['stars']}→{stars}")
        reqs.append({"skill": r["skill"], "stars": stars, "evidence": r["evidence"].strip()})
    notes = [n for n in [c["note"]] if n]
    if capped:
        notes.append("Stars capped at the skill's maximum in Dalil: " + ", ".join(capped) + ".")
    src = {"site": c["site"] or site_label(c["url"], c["company"]), "url": c["url"], "postedAt": c["postedAt"], "checkedAt": CHECKED}
    if notes:
        src["note"] = " ".join(notes)
    job = {"id": jid, "title": title, "titleEn": c["titleEn"], "field": c["field"], "city": c["city"]}
    if c["place"]:
        job["place"] = c["place"]
    job.update({"band": c["band"], "company": c["company"], "companyEn": c["companyEn"], "real": True, "source": src,
                "requirements": reqs, "summary": summary, "tasks": tasks})
    out.append((c["track"], job))

ids = [j["id"] for _, j in out]
(W4 / "held.json").write_text(json.dumps({"checkedAt": CHECKED, "held": held}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
(DATA / "wave4").mkdir(exist_ok=True)
with open(DATA / "wave4" / "jobs.ts", "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join([
        "// Owner: data (wave-4 integration, 21 Nov 2026: a beginner role in every specialisation). Merged into JOBS by ../jobs.ts.",
        "// GENERATED by research/wave4/build.py from research/wave4/*.json: do not edit by hand. Real ENTRY-level postings from",
        "// the companies' own careers pages or ATS boards (never LinkedIn, Indeed or Bayt), each requirement with the posting's",
        "// own sentence as `evidence`; stars capped at the skill's maximum. Held postings, with why: research/wave4/held.json.",
        'import type { Job } from "@/lib/types";',
        "",
        "export const WAVE4_JOB_IDS = " + ts(ids) + " as const;",
        "",
        "export const WAVE4_JOBS: readonly Job[] = " + ts([j for _, j in out]) + ";",
        "",
    ]))

ids_path = ROOT / "src" / "lib" / "ids.ts"
s = ids_path.read_text(encoding="utf-8")
s = re.sub(r"  // wave 4 BEGIN[\s\S]*?  // wave 4 END\n", "", s)
start = s.index("export const JOB_IDS")
end = s.index("] as const;", start)
block = "  // wave 4 BEGIN (src/lib/data/wave4/jobs.ts, GENERATED by research/wave4/build.py): beginner roles, after every older job\n"
block += "".join(f'  "{i}",\n' for i in ids) + "  // wave 4 END\n"
s = s[:end] + block + s[end:]
with open(ids_path, "w", encoding="utf-8", newline="\n") as f:
    f.write(s)

print(f"{len(candidates)} researched, {len(out)} in the app, {len(held)} held")
for track, j in out:
    print(f"  + {track or '?'} · {j['title']} · {j['companyEn']} · {j['band']} · match {sample_match(j['requirements'])}%")
for h in held:
    print(f"  - {h['id']} ({h['from']}): {h['why']}")
