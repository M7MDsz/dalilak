# Builds the expansion data from the researched raw files (research/expansion/raw/*.json) and knowledge_src.py:
#   src/lib/data/expansion/jobs.ts, guides.ts, knowledge.ts, research/expansion/expansion.json and review.html.
# Run: python -X utf8 research/expansion/build.py   (from the masari folder). Writes UTF-8 with LF line endings.
# Nothing is invented here: every job, course, person, article, certificate, route and salary comes from a raw file with
# its link and checkedAt; the script only reshapes, orders and joins. skills.ts and courses.ts are hand-written.
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "research" / "expansion" / "raw"
OUT_TS = ROOT / "src" / "lib" / "data" / "expansion"
sys.path.insert(0, str(Path(__file__).resolve().parent))
import knowledge_src as K  # noqa: E402

CHECKED = "2026-11-20"


def load(name, default=None):
    p = RAW / name
    if not p.exists():
        return default
    return json.loads(p.read_text(encoding="utf-8"))


def write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


# ── skills (old from src/lib/data/skills.ts, new from expansion/skills.ts) ─────────────────────────────────────────────
def parse_skills(path: Path):
    src = path.read_text(encoding="utf-8")
    out = {}
    for m in re.finditer(
        r'id: "([a-z0-9-]+)",\s*name: "([^"]+)",\s*field: "([a-z-]+)",\s*maxStars: (\d),\s*prereqs: \[([^\]]*)\],\s*description:\s*"([^"]+)",\s*aliases: \[([^\]]*)\]',
        src,
    ):
        sid, name, field, ms, pre, desc, al = m.groups()
        out[sid] = {
            "id": sid,
            "name": name,
            "field": field,
            "maxStars": int(ms),
            "prereqs": re.findall(r'"([a-z0-9-]+)"', pre),
            "description": desc,
            "aliases": re.findall(r'"([^"]+)"', al),
        }
    return out


OLD = parse_skills(ROOT / "src" / "lib" / "data" / "skills.ts")
NEW = parse_skills(OUT_TS / "skills.ts")
ALL = {**OLD, **NEW}
assert len(OLD) == 38, len(OLD)
assert len(NEW) == 16, len(NEW)


def all_prereqs(sid, seen=None):
    seen = set() if seen is None else seen
    for p in ALL[sid]["prereqs"]:
        if p not in seen:
            seen.add(p)
            all_prereqs(p, seen)
    return seen


def roadmap_order(reqs):
    """Stable order where a listed prerequisite always comes before the skill that needs it."""
    ids = [r["skill"] for r in reqs]
    out = []
    placed = set()

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
    assert sorted(x["skill"] for x in out) == sorted(ids)
    return out


# ── TS emitter ─────────────────────────────────────────────────────────────────────────────────────────────────────────
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


# ── jobs ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
RAW_JOBS = load("jobs.json")
FAMILY_FIELD = {
    "product": "product",
    "cyber": "cyber-cloud",
    "cloud-devops": "cyber-cloud",
    "ai-ml": "data",
    "sales-cs": "sales-supply",
    "supply-procurement": "sales-supply",
}
JOB_FIELD_OVERRIDE = {"foodics-ai-engineer-riyadh": "software"}  # LLM agents: the software field's llm-apps


def site_label(job):
    url = job["url"]
    ar = job["company"]["ar"]
    if "apply.workable.com" in url:
        return f"صفحة وظائف {ar} (Workable)"
    if "jobs.workable.com" in url:
        return "Workable"
    if "greenhouse" in url:
        return f"صفحة وظائف {ar} (Greenhouse)"
    if "smartrecruiters" in url:
        return "صفحة وظائف ديليفري هيرو (SmartRecruiters)"
    return job["source"]


def place_text(job):
    t = job.get("cityText") or ""
    return re.sub(r",\s*Saudi Arabia$", "", t).strip() or t


# Real postings kept OUT of the app (still in research/expansion/raw/jobs.json and expansion.json "heldJobs"), with why.
HELD_JOBS = {
    "tamara-business-development-specialist-riyadh": "The demo's sample CV would match it at 80% (communication, teamwork, English ★★ and presentation), above the practice «محلل بيانات» at 70%; spec 9.8 check 5 keeps the practice job the only one at 70% or more. Held for the coordinator's decision.",
    "smart-technology-solutions-ai-data-trainee-jeddah": "The demo's sample CV would match it at 60% (programming, statistics, communication), which puts it third on the jobs list after the CV (demo step 6 shows «مهندس بيانات أول» 53% there). Held for the coordinator's decision.",
}

jobs_out = []
for j in RAW_JOBS["jobs"]:
    if j["id"] in HELD_JOBS:
        continue
    reqs = roadmap_order(j["requirements"])
    src = {"site": site_label(j), "url": j["url"], "postedAt": j.get("postedAt"), "checkedAt": j.get("checkedAt", CHECKED)}
    if j.get("note"):
        src["note"] = j["note"]
    jobs_out.append(
        {
            "id": j["id"],
            "title": j["titleAr"],
            "titleEn": j["title"],
            "field": JOB_FIELD_OVERRIDE.get(j["id"], FAMILY_FIELD[j["family"]]),
            "city": j["city"],
            "place": place_text(j),
            "band": j["band"],
            "company": j["company"]["ar"],
            "companyEn": j["company"]["en"],
            "real": True,
            "source": src,
            "requirements": [{"skill": r["skill"], "stars": r["stars"], "evidence": r["evidence"]} for r in reqs],
            "summary": j["summary"],
            "tasks": j["tasks"],
            "_family": j["family"],
        }
    )

JOB_IDS = [j["id"] for j in jobs_out]
jobs_ts = [
    "// Owner: data (expansion agent, 20 Nov 2026). Merged into JOBS by ../jobs.ts. GENERATED by research/expansion/build.py from",
    "// research/expansion/raw/jobs.json: do not edit by hand. Real postings for the new career families, open on the day they",
    "// were checked (20 Nov 2026), from the companies' own careers boards (Workable, Greenhouse, SmartRecruiters); never",
    "// LinkedIn, Indeed or Bayt. Same rules as src/lib/data/jobs.ts: the Arabic title is a translation (the posting's own in",
    "// `titleEn`), five requirements in roadmap order (a listed prerequisite before the skill that needs it), each with the",
    "// posting's own sentence as `evidence`, verbatim. No salary, no applicant count. Pure module.",
    "//",
    "// Two real postings are held out (research/expansion/expansion.json heldJobs): they would change the demo's job ranking.",
    'import type { Job, JobFieldId, Requirement } from "@/lib/types";',
    "",
    'import type { AnySkillId, ExpansionFieldId } from "./skills";',
    "",
    "export const EXPANSION_JOB_IDS = [",
]
for fam in ["product", "cyber", "cloud-devops", "ai-ml", "sales-cs", "supply-procurement"]:
    jobs_ts.append(f"  // {fam}")
    for j in jobs_out:
        if j["_family"] == fam:
            jobs_ts.append(f'  "{j["id"]}",')
jobs_ts += [
    "] as const;",
    "export type ExpansionJobId = (typeof EXPANSION_JOB_IDS)[number];",
    "",
    "/** `Requirement` with the new skill ids. */",
    'export interface ExpansionRequirement extends Omit<Requirement, "skill"> {',
    "  readonly skill: AnySkillId;",
    "}",
    "",
    "/** `Job` with the new ids (until JobId / JobFieldId / SkillId have them). */",
    'export interface ExpansionJob extends Omit<Job, "id" | "field" | "requirements"> {',
    "  readonly id: ExpansionJobId;",
    "  readonly field: JobFieldId | ExpansionFieldId;",
    "  readonly requirements: readonly [",
    "    ExpansionRequirement,",
    "    ExpansionRequirement,",
    "    ExpansionRequirement,",
    "    ExpansionRequirement,",
    "    ExpansionRequirement,",
    "  ];",
    "}",
    "",
    "export const EXPANSION_JOBS: readonly ExpansionJob[] = [",
]
for j in jobs_out:
    obj = {k: v for k, v in j.items() if not k.startswith("_")}
    jobs_ts.append("  " + ts(obj, 1) + ",")
jobs_ts += ["];", ""]
write(OUT_TS / "jobs.ts", "\n".join(jobs_ts))

# ── guides ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
gb = load("guides-b.json", {"skills": {}})
gc = load("guides-c.json", {"skills": {}})
RAW_GUIDES = {**gb["skills"], **gc["skills"]}
missing = [s for s in NEW if s not in RAW_GUIDES]
assert not missing, missing


def src_list(v):
    if not v:
        return None
    return [{"label": x.get("label", ""), "url": x["url"], "note": x.get("note")} for x in v]


def course(c):
    price = c.get("price")
    if price not in ("free", "paid", "free_to_audit"):
        price = None
    cert = c.get("certificate")
    if cert not in (True, False):
        cert = None
    return {
        "title": c["title"],
        "provider": c["provider"],
        "url": c["url"],
        "lang": c.get("lang") or c.get("language"),
        "price": price,
        "hours": c.get("hours") if isinstance(c.get("hours"), (int, float)) else None,
        "certificate": cert,
        "star": c.get("star") if isinstance(c.get("star"), int) else None,
        "why": c["why"],
        "recommendedBy": src_list(c.get("recommendedBy")),
        "checkedAt": c.get("checkedAt", CHECKED),
    }


LINK_KEYS = ["linkedin", "x", "youtube", "website", "github"]


def person(p):
    out = {
        "name": p["name"],
        "platform": p["platform"],
        "url": p["url"],
        "why": p["why"],
        "arab": p.get("arab") if p.get("arab") in (True, False) else None,
        "saudiBased": p.get("saudiBased") if p.get("saudiBased") in (True, False) else None,
        "recommendedBy": src_list(p.get("recommendedBy")),
        "checkedAt": p.get("checkedAt", CHECKED),
    }
    links = {
        k: re.sub(r"^http://", "https://", p["links"][k]) for k in LINK_KEYS if isinstance(p.get("links"), dict) and p["links"].get(k)
    }
    out["links"] = links
    out["linkedinSource"] = p.get("linkedinSource") if links.get("linkedin") else None
    return out


def article(a):
    return {
        "title": a["title"],
        "author": a["author"],
        "site": a["site"],
        "url": a["url"],
        "lang": a.get("lang") or "en",
        "why": a["why"],
        "recommendedBy": src_list(a.get("recommendedBy")),
        "checkedAt": a.get("checkedAt", CHECKED),
    }


def proof(pr):
    if not pr:
        return None
    ds = pr.get("dataset")
    return {
        "task": pr["task"],
        "dataset": {"name": ds["name"], "provider": ds["provider"], "url": ds["url"]} if ds else None,
        "checkedAt": pr.get("checkedAt", CHECKED),
    }



# The recognised certificate of each new skill (the `certification` block of src/lib/data/guides.ts), from the issuer pages
# opened on 20 Nov 2026 (research/expansion/raw/tech-families.json, business-families.json, and three pages opened by the
# expansion agent: CompTIA Network+, LPI Linux Essentials, Microsoft SC-200). A fee only where the issuer's page states it.
def usd(amount, note):
    return {"amount": amount, "currency": "USD", "qualifier": None, "per": None, "note": note}


def official(name, short, issuer, code, kind, url, fee, fee_varies, level, star, why, prep_skill):
    return {
        "kind": "official", "name": name, "short": short, "issuer": issuer, "code": code, "type": kind, "url": url,
        "fee": fee, "feeVaries": fee_varies, "prepUrl": None, "prepLabel": "ابدأ بالدورة المقترحة في هذا الدليل",
        "level": level, "star": star, "why": why, "checkedAt": CHECKED, "_prep": prep_skill,
    }


def none(proof, why, proof_skill):
    return {"kind": "none", "proof": proof, "proofUrl": None, "why": why, "checkedAt": CHECKED, "_prep": proof_skill}


CERT_BY_SKILL = {
    "product-discovery": official(
        "Product Management Certification", "Pragmatic PMC", "Pragmatic Institute", None, "program",
        "https://www.pragmaticinstitute.com/product/product-management-certification/", None, False, "beginner", 1,
        "ثلاث دورات قصيرة على إطار Pragmatic تبدأ باكتشاف مشكلات السوق، ولا تشترط خبرة سابقة.", "product-discovery"),
    "product-roadmap": official(
        "Certified Product Manager (CPM)", "AIPMM CPM", "AIPMM", "CPM", "exam", "https://aipmm.com/cpm",
        usd(500, "aipmm.com/cpm: «Certification Exam Only: Price: $500»"), False, "intermediate", 2,
        "شهادة عالمية تغطي عمل مدير المنتج من الاستراتيجية وخارطة الطريق حتى الإطلاق.", "product-roadmap"),
    "product-specs": official(
        "Professional Scrum Product Owner I (PSPO I)", "PSPO I", "Scrum.org", "PSPO I", "exam",
        "https://www.scrum.org/assessments/professional-scrum-product-owner-i-certification",
        usd(200, "scrum.org: «$200 USD per attempt»"), False, "beginner", 1,
        "يثبت أنك تعرف مسؤوليات مالك المنتج: هدف المنتج وقائمة العمل وكتابة بنودها بوضوح.", "product-specs"),
    "product-analytics": none(
        "لوحة مؤشرات لمنتج حقيقي أو تجريبي مع خطة تجربة A/B ونتيجتها، منشورة في ملف أعمالك.",
        "ما لقينا شهادة معترفاً بها من جهة مستقلة لتحليلات المنتج؛ الأدوات تمنح شهادات إتمام لدوراتها فقط.",
        "product-analytics"),
    "linux": official(
        "LPI Linux Essentials", "Linux Essentials", "Linux Professional Institute", "010-200", "exam",
        "https://www.lpi.org/our-certifications/linux-essentials-overview/", None, True, "beginner", 1,
        "أساسيات Linux وسطر الأوامر والصلاحيات من معهد LPI؛ السعر حسب الدولة والاختبار بالإنجليزية.", "linux"),
    "networking": official(
        "CompTIA Network+", "Network+", "CompTIA", "N10-009", "exam",
        "https://www.comptia.org/en-us/certifications/network/", None, False, "beginner", 1,
        "الشهادة المعروفة لأساسيات الشبكات وأدواتها؛ الاختبار بالإنجليزية ولغات أخرى ليس منها العربية.", "networking"),
    "security-fundamentals": official(
        "CompTIA Security+", "Security+", "CompTIA", "SY0-801", "exam",
        "https://www.comptia.org/en-us/certifications/security/v8/", None, False, "intermediate", 2,
        "أشهر شهادة أمن للمبتدئين: التهديدات والمعمارية وعمليات الأمن والحوكمة، وتطلبها وظائف كثيرة.", "security-fundamentals"),
    "soc-analysis": official(
        "Microsoft Certified: Security Operations Analyst Associate", "SC-200", "Microsoft", "SC-200", "exam",
        "https://learn.microsoft.com/en-us/credentials/certifications/security-operations-analyst/", None, True,
        "intermediate", 1,
        "يثبت فرز التنبيهات والاستجابة للحوادث والبحث عن التهديدات بـ KQL في Microsoft Sentinel.", "soc-analysis"),
    "cloud": official(
        "AWS Certified Cloud Practitioner", "CLF-C02", "Amazon Web Services", "CLF-C02", "exam",
        "https://aws.amazon.com/certification/certified-cloud-practitioner/",
        usd(100, "aws.amazon.com: «100 USD (additional costs such as foreign exchange rates may apply)»"), False,
        "beginner", 1, "أول شهادة سحابية من AWS، واختبارها متاح بالعربي: المفاهيم والأمان والخدمات والفوترة.", "cloud"),
    "devops": official(
        "Certified Kubernetes Administrator (CKA)", "CKA", "The Linux Foundation / CNCF", "CKA", "exam",
        "https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/",
        usd(445, "training.linuxfoundation.org: «Exam only: $445»"), False, "intermediate", 1,
        "اختبار عملي من سطر الأوامر لإدارة Kubernetes، مطلوب كثيراً في وظائف DevOps.", "devops"),
    "deep-learning": none(
        "نموذج يصنّف صوراً أو نصوصاً بدقة تقيسها، منشور على GitHub أو Kaggle مع شرح مختصر.",
        "أغلقت Google اختبار شهادة TensorFlow للمطوّرين، وما فيه بديل مستقل معترف به للتعلّم العميق اليوم.",
        "deep-learning"),
    "llm-apps": official(
        "AWS Certified AI Practitioner", "AIF-C01", "Amazon Web Services", "AIF-C01", "exam",
        "https://aws.amazon.com/certification/certified-ai-practitioner/",
        usd(100, "aws.amazon.com: «100 USD (additional costs such as foreign exchange rates may apply)»"), False,
        "beginner", 1, "شهادة تأسيسية في الذكاء الاصطناعي التوليدي من AWS، واختبارها متاح بالعربي.", "llm-apps"),
    "sales": official(
        "Inbound Sales Certification", "HubSpot Sales", "HubSpot Academy", None, "program",
        "https://academy.hubspot.com/courses/inbound-sales", {"amount": 0, "currency": "USD", "qualifier": None, "per": None, "note": "academy.hubspot.com: «FREE Certification Course»"},
        False, "beginner", 1, "دورة وشهادة مجانية من HubSpot في مراحل البيع للمشتري الحديث.", "sales"),
    "customer-success": none(
        "خطة تهيئة عميل لأول 90 يوماً ولوحة صحة حسابات بمؤشرات الانسحاب، تعرضها في المقابلة.",
        "ما لقينا منهجاً أو شهادة من جهة رسمية مستقلة لنجاح العملاء؛ المتاح دورات من شركات تدريب.",
        "customer-success"),
    "procurement": official(
        "CIPS Level 2 Certificate in Procurement and Supply Operations", "CIPS L2", "CIPS", None, "program",
        "https://www.cips.org/qualifications/procurement-certificate", None, False, "beginner", 1,
        "أول مستوى في مؤهلات CIPS المعروفة عالمياً: من مدخل المشتريات إلى العمليات والعقود.", "procurement"),
    "supply-chain": official(
        "CIPS Level 3 Advanced Certificate in Procurement and Supply Operations", "CIPS L3", "CIPS", None, "program",
        "https://www.cips.org/qualifications/procurement-certificate-advanced", None, False, "intermediate", 2,
        "المستوى الثالث من CIPS: عمليات التوريد والعقود وإدارة الموردين بعمق أكبر.", "supply-chain"),
}


guides_out = []
for sid in NEW:
    g = RAW_GUIDES[sid]
    guides_out.append(
        {
            "skill": sid,
            "depth": "full",
            "topPick": course(g["topPick"]),
            "alternatives": [course(c) for c in g.get("alternatives", [])][:2],
            "people": [person(p) for p in g.get("people", [])],
            "articles": [article(a) for a in g.get("articles", [])],
            "proof": proof(g.get("proof") or g.get("proofTask")),
            "recommendedBy": src_list(g.get("recommendedBy")),
            "checkedAt": g.get("checkedAt", CHECKED),
            "certification": None,
        }
    )
    cert = dict(CERT_BY_SKILL[sid])
    prep = cert.pop("_prep")
    if cert["kind"] == "official":
        cert["prepUrl"] = guides_out[-1]["topPick"]["url"]
    else:
        cert["proofUrl"] = guides_out[-1]["topPick"]["url"] if guides_out[-1]["topPick"].get("certificate") else None
    assert prep == sid
    guides_out[-1]["certification"] = cert
    for person_ in guides_out[-1]["people"]:
        if person_["links"].get("linkedin"):
            assert person_["linkedinSource"] and "linkedin.com" not in person_["linkedinSource"], person_["name"]


def ts_guide(g):
    out = dict(g)
    out["people"] = []
    for p_ in g["people"]:
        q = {k: v for k, v in p_.items() if k not in ("links", "linkedinSource")}
        if p_["links"]:
            q["links"] = p_["links"]
        out["people"].append(q)
    return out


guides_ts = [
    "// Owner: data (expansion agent, 20 Nov 2026). GENERATED by research/expansion/build.py from research/expansion/raw/",
    "// guides-b.json and guides-c.json: do not edit by hand. The learning guides of the 16 skills of the expansion, in the",
    "// app's `Guide` shape (depth \"full\": a top pick, at most two alternatives, people, articles, a proof task and the",
    "// recognised certificate). Real items only: every link was opened on 2026-11-20; hours, price and certificate are null",
    "// when the page did not state them; `recommendedBy` is null when no opened page recommended the item. A person's",
    "// `links` are their own profiles; a LinkedIn link was taken only from a page the person controls (kept as",
    "// `linkedinSource` in research/expansion/expansion.json; linkedin.com is never fetched, no URL is guessed from a name).",
    "// The certificate comes from its issuer's page, with a fee only where that page states one. ../all-guides.ts merges",
    "// these with ../guides.ts (which research/guides/gen-guides.mjs rewrites), so neither generator touches the other.",
    "// Pure module.",
    'import type { Guide } from "../guides";',
    "",
    "export const EXPANSION_GUIDES: readonly Guide[] = [",
]
for g in guides_out:
    guides_ts.append("  " + ts(ts_guide(g), 1) + ",")
guides_ts += ["];", ""]
write(OUT_TS / "guides.ts", "\n".join(guides_ts))

# ── knowledge ──────────────────────────────────────────────────────────────────────────────────────────────────────────
PATHS = json.loads((ROOT / "research" / "paths" / "paths-guidelines.json").read_text(encoding="utf-8"))
SNAP = json.loads((ROOT / "research" / "jobs" / "jobs-snapshot.json").read_text(encoding="utf-8"))
MAHARAH = json.loads((ROOT / "research" / "jobs" / "maharah.json").read_text(encoding="utf-8"))
salary = load("salary.json", {})
routes_raw = load("entry-routes.json", {"routes": []})
tech = load("tech-families.json", {"guidelines": {}, "certificates": []})
biz = load("business-families.json", {"guidelines": {}, "certificates": []})
IDS_TS = (ROOT / "src" / "lib" / "ids.ts").read_text(encoding="utf-8")
LIVE_JOB_IDS = set(re.findall(r'"([a-z0-9-]+)"', IDS_TS.split("export const JOB_IDS")[1].split("] as const")[0]))

NEW_FAMILIES = ["product", "cyber", "cloud-devops", "ai-ml", "sales-cs", "supply-procurement"]


def guideline_block(fid):
    if fid in PATHS["families"]:
        f = PATHS["families"][fid]
        gl = [
            {"name": g["name"], "provider": g["provider"], "url": g["url"], "orderedTopics": g.get("orderedTopics", []), "checkedAt": g.get("checkedAt", CHECKED)}
            for g in f["guidelines"]
        ]
        return f["basedOnLine"], f["basedOnLinks"], gl, None
    src = tech["guidelines"].get(fid) or biz["guidelines"].get(fid)
    if not src:
        return None, [], [], None
    gl = [
        {"name": g["name"], "provider": g["provider"], "url": g["url"], "orderedTopics": g.get("orderedTopics", []), "checkedAt": g.get("checkedAt", CHECKED)}
        for g in src.get("guidelines", [])
    ]
    note = src.get("orderNote")
    if isinstance(note, dict):
        note = " ".join(x for x in [note.get("why"), note.get("caveat")] if x)
    return src.get("basedOnLine"), src.get("basedOnLinks", []), gl, note


def salary_for(fid):
    entry = (salary.get("families") or {}).get(fid)
    if entry is None:
        entry = (salary.get("familiesExisting") or {}).get(fid)
    if not entry:
        return None
    if isinstance(entry, list):
        entry = entry[0] if entry else None
        if not entry:
            return None
    if entry.get("minSAR") is None:
        return None
    return {
        "role": entry["role"],
        "minSAR": entry["minSAR"],
        "maxSAR": entry["maxSAR"],
        "period": entry.get("period", "monthly"),
        "level": entry.get("level"),
        "sourceName": entry["sourceName"],
        "url": entry["url"],
        "page": entry.get("pageOrTable"),
        "checkedAt": entry.get("checkedAt", CHECKED),
        "note": "الراتب الشهري الثابت الإجمالي بالريال حسب دليل Hays للرواتب في السعودية 2026 (الربع الأخير من 2025)، بلا تقسيم حسب الخبرة، وأغلب المسميات فيه متوسطة أو عليا.",
    }


def certs_for(fid):
    out = []
    for c in (tech.get("certificates") or []) + (biz.get("certificates") or []):
        if c.get("family") == fid:
            out.append(
                {
                    "name": c["name"],
                    "issuer": c["issuer"],
                    "url": c["url"],
                    "level": c.get("level") if c.get("level") in ("entry", "associate", "professional") else "entry",
                    "priceText": c.get("priceText"),
                    "arabicAvailable": c.get("arabicAvailable") if c.get("arabicAvailable") in (True, False) else None,
                    "why": c["why"],
                    "checkedAt": c.get("checkedAt", CHECKED),
                }
            )
    return out


def as_lines(v):
    if v is None or v == "" or v == []:
        return None
    if isinstance(v, list):
        return [str(x) for x in v]
    return [str(v)]


ROUTES = []
for r in routes_raw.get("routes", []):
    ROUTES.append(
        {
            "id": r["id"],
            "nameAr": r["nameAr"],
            "nameEn": r.get("nameEn") or r["nameAr"],
            "owner": r.get("owner") or "",
            "url": r["url"],
            "line": r.get("whatItIs") or r.get("line") or "",
            "eligibility": as_lines(r.get("eligibility")),
            "benefit": as_lines(r.get("duration/benefit") or r.get("benefit") or r.get("duration")),
            "fits": r.get("fitsFamilies") if r.get("fitsFamilies") else "all",
            "checkedAt": r.get("checkedAt", CHECKED),
            "note": r.get("note") or None,
        }
    )


def routes_for(fid):
    return [r["id"] for r in ROUTES if r["fits"] == "all" or (isinstance(r["fits"], list) and fid in r["fits"])]


def board_url(url):
    m = re.match(r"(https://apply\.workable\.com/[^/]+/)", url)
    if m:
        return m.group(1)
    m = re.match(r"(https://job-boards\.eu\.greenhouse\.io/[^/]+)", url)
    if m:
        return m.group(1)
    if "smartrecruiters.com/DeliveryHero" in url:
        return "https://careers.deliveryhero.com/"
    return url


COMPANY_AR = {}
for fld in SNAP["companiesByField"].values():
    for c in fld:
        COMPANY_AR[c["en"]] = c["ar"]


def employers_for(fid, job_records):
    seen = {}
    if fid in K.EXISTING_FAMILY_FIELD:
        for c in SNAP["companiesByField"].get(K.EXISTING_FAMILY_FIELD[fid], []):
            seen[c["en"]] = {"name": c["ar"], "nameEn": c["en"], "careersUrl": c["careersUrl"], "checkedAt": SNAP["checkedAt"], "note": c.get("note")}
    for j in job_records:
        en, ar, url = j["companyEn"], j["company"], j["url"]
        if "staffing" in (j.get("note") or "").lower() or "recruitment" in (j.get("note") or "").lower():
            continue
        if en not in seen:
            note = None if "jobs.workable.com" not in url else "رابط وظيفته المفتوحة على Workable"
            seen[en] = {"name": ar, "nameEn": en, "careersUrl": board_url(url), "checkedAt": CHECKED, "note": note}
    return list(seen.values())


# every real job known (live app snapshot + new) with company and url
snap_by_id = {j["id"]: j for j in SNAP["jobs"]}
maharah_jobs = {j["id"]: j for j in MAHARAH.get("jobs", [])} if isinstance(MAHARAH, dict) else {}


def job_record(jid):
    for j in jobs_out:
        if j["id"] == jid:
            return {"id": jid, "company": j["company"], "companyEn": j["companyEn"], "url": j["source"]["url"], "note": j["source"].get("note")}
    s = snap_by_id.get(jid) or maharah_jobs.get(jid)
    if s:
        comp = s.get("company")
        if isinstance(comp, dict):
            return {"id": jid, "company": comp["ar"], "companyEn": comp["en"], "url": s.get("url", ""), "note": s.get("note")}
    if jid.startswith("maharah-"):
        return {"id": jid, "company": "مهارة", "companyEn": "Maharah", "url": "https://apply.workable.com/maharah/", "note": None}
    return None


families_out = []
for f in K.FAMILIES:
    fid = f["id"]
    if fid in PATHS["families"]:
        jids = [j["jobId"] for j in PATHS["families"][fid]["jobs"]]
    else:
        jids = []
    jids += K.EXTRA_EXISTING_JOBS.get(fid, [])
    jids += [j["id"] for j in jobs_out if j["_family"] == fid]
    jids = [j for j in dict.fromkeys(jids) if j in LIVE_JOB_IDS or j in JOB_IDS]
    recs = [r for r in (job_record(j) for j in jids if j != "data-analyst-riyadh") if r]
    based, links, gl, order_note = guideline_block(fid)
    for s in f["path"]:
        assert s in ALL, (fid, s)
    sources = []
    for g in gl:
        sources.append({"label": f'{g["provider"]}: {g["name"]}', "url": g["url"], "checkedAt": g["checkedAt"]})
    sal = salary_for(fid)
    if sal:
        sources.append({"label": sal["sourceName"], "url": sal["url"], "checkedAt": sal["checkedAt"]})
    for r in recs:
        sources.append({"label": f'{r["companyEn"]}: وظيفة {r["id"]}', "url": r["url"], "checkedAt": CHECKED})
    families_out.append(
        {
            "id": fid,
            "title": f["title"],
            "titleEn": f["titleEn"],
            "fields": f["fields"],
            "isNew": fid in NEW_FAMILIES,
            "what": f["what"],
            "dayToDay": f["dayToDay"],
            "path": {"skills": f["path"], "basedOnLine": based, "basedOnLinks": links, "orderNote": order_note, "guidelines": gl},
            "jobs": jids,
            "employers": employers_for(fid, recs),
            "entryRoutes": routes_for(fid),
            "certificates": certs_for(fid),
            "salary": sal,
            "interviewQuestions": f["interviewQuestions"],
            "first30Days": f["first30Days"],
            "writtenByDalil": "أسئلة المقابلة وخطة أول 30 يوم كتبها «دليل» من مواضيع المسار المنشور؛ ليست من شركة بعينها.",
            "botLines": f["botLines"],
            "sources": sources,
        }
    )

ROUTE_IDS = [r["id"] for r in ROUTES]
know_ts = [
    "// Owner: data (expansion agent, 20 Nov 2026). GENERATED by research/expansion/build.py from",
    "// research/expansion/knowledge_src.py (the hand-written lines) and research/expansion/raw/*.json (the researched facts):",
    "// do not edit by hand. The career knowledge base of «دليل»: one entry per career family (the 10 existing families of",
    "// research/paths/paths-guidelines.json and the 6 new ones), with what the job is, the day-to-day, the path and the",
    "// published guideline it follows, the real jobs in the app, typical Saudi employers (their careers pages), entry routes",
    "// for Saudis (official programme pages), recognised certificates (issuer pages), a salary range ONLY from a published",
    "// Saudi source (Hays Saudi Arabia Salary Guide 2026, with page), common interview questions and a 30-day starter plan",
    "// (both written by «دليل» from the guideline topics, labelled so), and short Najdi lines the chatbot «دليلك» can quote.",
    "// Every fact keeps its link and checkedAt. knowledgeForModel() renders it as compact text for the chatbot's prompt.",
    "// Pure module.",
    "//",
    "// The chatbot uses careersIndexForModel() in its prompt and knowledgeForModel([id]) for one family (src/lib/brain),",
    "// and CAREER_FAMILIES (what / path / botLines) to answer «وش يسوي …؟» and «كيف أصير …؟» offline.",
    'import type { JobId } from "@/lib/types";',
    "",
    'import type { ExpansionJobId } from "./jobs";',
    'import type { AnyFieldId, AnySkillId } from "./skills";',
    "",
    "export const CAREER_FAMILY_IDS = [",
    "  " + ", ".join(json.dumps(f["id"]) for f in families_out[:5]) + ",",
    "  " + ", ".join(json.dumps(f["id"]) for f in families_out[5:10]) + ",",
    "  " + ", ".join(json.dumps(f["id"]) for f in families_out[10:]) + ",",
    "] as const;",
    "export type CareerFamilyId = (typeof CAREER_FAMILY_IDS)[number];",
    "",
    "export const ENTRY_ROUTE_IDS = " + (ts(ROUTE_IDS) if ROUTE_IDS else "[]") + " as const;",
    "export type EntryRouteId = (typeof ENTRY_ROUTE_IDS)[number];",
    "",
    "export interface KnowledgeLink {",
    "  readonly label: string;",
    "  readonly url: string;",
    "  readonly checkedAt: string;",
    "}",
    "",
    "/** A programme for Saudi graduates and career-changers, read from its official page. */",
    "export interface EntryRoute {",
    "  readonly id: EntryRouteId;",
    "  readonly nameAr: string;",
    "  readonly nameEn: string;",
    "  readonly owner: string;",
    "  readonly url: string;",
    "  /** One plain line: what it is. */",
    "  readonly line: string;",
    "  /** As stated on the official page (one item per condition), or null. */",
    "  readonly eligibility: readonly string[] | null;",
    "  readonly benefit: readonly string[] | null;",
    '  readonly fits: readonly CareerFamilyId[] | "all";',
    "  readonly checkedAt: string;",
    "  /** What the research found that limits the route (closed applications, an old cohort, a script-only page), or null. */",
    "  readonly note: string | null;",
    "}",
    "",
    "export interface FamilyGuideline {",
    "  readonly name: string;",
    "  readonly provider: string;",
    "  readonly url: string;",
    "  readonly orderedTopics: readonly string[];",
    "  readonly checkedAt: string;",
    "}",
    "",
    "export interface FamilyEmployer {",
    "  readonly name: string;",
    "  readonly nameEn: string;",
    "  readonly careersUrl: string;",
    "  readonly checkedAt: string;",
    "  readonly note: string | null;",
    "}",
    "",
    "export interface FamilyCertificate {",
    "  readonly name: string;",
    "  readonly issuer: string;",
    "  /** The issuer's own page. */",
    "  readonly url: string;",
    '  readonly level: "entry" | "associate" | "professional";',
    "  /** As stated on the issuer's page, or null. */",
    "  readonly priceText: string | null;",
    "  readonly arabicAvailable: boolean | null;",
    "  readonly why: string;",
    "  readonly checkedAt: string;",
    "}",
    "",
    "/** Only from a published Saudi source, with its page. */",
    "export interface FamilySalary {",
    "  /** The role as the source writes it. */",
    "  readonly role: string;",
    "  readonly minSAR: number;",
    "  readonly maxSAR: number;",
    '  readonly period: "monthly" | "annual";',
    "  readonly level: string | null;",
    "  readonly sourceName: string;",
    "  readonly url: string;",
    "  readonly page: string | null;",
    "  readonly checkedAt: string;",
    "  readonly note: string;",
    "}",
    "",
    "export interface CareerFamily {",
    "  readonly id: CareerFamilyId;",
    "  /** «مدير منتج» … */",
    "  readonly title: string;",
    "  readonly titleEn: string;",
    "  readonly fields: readonly AnyFieldId[];",
    "  /** True for the 6 families added by the expansion. */",
    "  readonly isNew: boolean;",
    "  /** What the job is, one or two plain lines. */",
    "  readonly what: string;",
    "  readonly dayToDay: readonly string[];",
    "  readonly path: {",
    "    /** The skills in learning order. */",
    "    readonly skills: readonly AnySkillId[];",
    "    /** «المسار مبني على: …», or null when no guideline could be opened. */",
    "    readonly basedOnLine: string | null;",
    "    readonly basedOnLinks: readonly string[];",
    "    readonly orderNote: string | null;",
    "    readonly guidelines: readonly FamilyGuideline[];",
    "  };",
    "  /** Real jobs in the app for this family (the practice job only for data-analyst-bi). */",
    "  readonly jobs: readonly (JobId | ExpansionJobId)[];",
    "  readonly employers: readonly FamilyEmployer[];",
    "  readonly entryRoutes: readonly EntryRouteId[];",
    "  readonly certificates: readonly FamilyCertificate[];",
    "  readonly salary: FamilySalary | null;",
    "  /** Written by «دليل» from the guideline topics (see writtenByDalil). */",
    "  readonly interviewQuestions: readonly string[];",
    "  readonly first30Days: readonly string[];",
    "  readonly writtenByDalil: string;",
    "  /** Short Najdi lines «دليلك» can quote. */",
    "  readonly botLines: readonly string[];",
    "  readonly sources: readonly KnowledgeLink[];",
    "}",
    "",
    "export const ENTRY_ROUTES: readonly EntryRoute[] = [",
]
for r in ROUTES:
    know_ts.append("  " + ts(r, 1) + ",")
know_ts += ["];", "", "export const CAREER_FAMILIES: readonly CareerFamily[] = ["]
for f in families_out:
    know_ts.append("  " + ts(f, 1) + ",")
know_ts += [
    "];",
    "",
    "export function getCareerFamily(id: CareerFamilyId): CareerFamily {",
    "  const family = CAREER_FAMILIES.find((f) => f.id === id);",
    "  if (!family) throw new Error(`data: unknown career family ${id}`);",
    "  return family;",
    "}",
    "",
    "function money(n: number): string {",
    '  return n.toLocaleString("en-US");',
    "}",
    "",
    "/** One line per family (id, title, what): small enough for every prompt; the full block comes from knowledgeForModel. */",
    "export function careersIndexForModel(): string {",
    '  return CAREER_FAMILIES.map((f) => `${f.id} «${f.title}» (${f.titleEn}): ${f.what}`).join("\\n");',
    "}",
    "",
    "/**",
    " * The knowledge base as compact text for the chatbot (one block per family, then the entry routes), for the families",
    " * asked (all when none are given: about 40k characters, so prefer passing the target's and the asked family's ids,",
    " * or serving it from a get_career tool). Every number in it comes with its source, so «دليلك» may quote it; nothing",
    " * else about pay or demand may be said.",
    " */",
    "export function knowledgeForModel(ids?: readonly CareerFamilyId[]): string {",
    "  const families = ids ? CAREER_FAMILIES.filter((f) => ids.includes(f.id)) : CAREER_FAMILIES;",
    "  const blocks = families.map((f) => {",
    "    const lines = [",
    "      `CAREER ${f.id} «${f.title}» (${f.titleEn}): ${f.what}`,",
    '      `- day to day: ${f.dayToDay.join("؛ ")}`,',
    '      `- path (skill ids in order): ${f.path.skills.join(" → ")}${f.path.basedOnLine ? `. ${f.path.basedOnLine}` : ""}`,',
    '      `- say it like this: ${f.botLines.join(" ")}`,',
    "    ];",
    '    if (f.jobs.length > 0) lines.push(`- jobs in the app: ${f.jobs.join(", ")}`);',
    '    if (f.employers.length > 0) lines.push(`- employers: ${f.employers.map((e) => `${e.name} (${e.careersUrl})`).join("، ")}`);',
    "    if (f.certificates.length > 0)",
    '      lines.push(`- certificates: ${f.certificates.map((c) => `${c.name} from ${c.issuer} (${c.url})`).join("؛ ")}`);',
    "    if (f.salary)",
    "      lines.push(",
    "        `- pay (only this source): ${f.salary.role} ${money(f.salary.minSAR)} to ${money(f.salary.maxSAR)} SAR ${f.salary.period}, ${f.salary.sourceName}${f.salary.page ? `, ${f.salary.page}` : \"\"} (${f.salary.url})`,",
    "      );",
    '    if (f.entryRoutes.length > 0) lines.push(`- entry routes: ${f.entryRoutes.join(", ")}`);',
    '    lines.push(`- interview questions (written by Dalil): ${f.interviewQuestions.join(" | ")}`);',
    '    lines.push(`- first 30 days (written by Dalil): ${f.first30Days.join(" | ")}`);',
    '    return lines.join("\\n");',
    "  });",
    "  const routeIds = new Set(families.flatMap((f) => f.entryRoutes));",
    "  const routes = ENTRY_ROUTES.filter((r) => routeIds.has(r.id)).map(",
    '    (r) =>',
    '      `ROUTE ${r.id} «${r.nameAr}» (${r.owner}): ${r.line}${r.eligibility ? ` Eligibility: ${r.eligibility.join(" ")}` : ""}${r.benefit ? ` Benefit: ${r.benefit.join(" ")}` : ""}${r.note ? ` Note: ${r.note}` : ""} (${r.url})`,',
    "  );",
    '  return [...blocks, ...routes].join("\\n\\n");',
    "}",
    "",
]
write(OUT_TS / "knowledge.ts", "\n".join(know_ts))

# ── expansion.json + review.html ───────────────────────────────────────────────────────────────────────────────────────
courses_src = (OUT_TS / "courses.ts").read_text(encoding="utf-8")
courses = []
for m in re.finditer(r'id: "(c-[a-z0-9-]+)",\s*skill: "([a-z0-9-]+)",\s*star: (\d),\s*title: "([^"]+)",\s*hours: (\d+)', courses_src):
    courses.append({"id": m.group(1), "skill": m.group(2), "star": int(m.group(3)), "title": m.group(4), "hours": int(m.group(5))})

expansion = {
    "checkedAt": CHECKED,
    "note": "Phase 1 of the expansion: ready-to-merge data, not wired into the app. App «دليل», chatbot «دليلك».",
    "fields": [
        {"id": "product", "name": "إدارة المنتجات"},
        {"id": "cyber-cloud", "name": "الأمن السيبراني والسحابة"},
        {"id": "sales-supply", "name": "المبيعات وسلاسل الإمداد"},
    ],
    "skills": list(NEW.values()),
    "courses": courses,
    "jobs": [{**{k: v for k, v in j.items() if not k.startswith("_")}, "family": j["_family"]} for j in jobs_out],
    "guides": guides_out,
    "knowledge": {"entryRoutes": ROUTES, "families": families_out},
    "demandEvidence": RAW_JOBS.get("demandEvidence"),
    "heldJobs": [{"id": k, "why": v} for k, v in HELD_JOBS.items()],
    "rawFiles": sorted(p.name for p in RAW.glob("*.json")),
}
write(ROOT / "research" / "expansion" / "expansion.json", json.dumps(expansion, ensure_ascii=False, indent=1) + "\n")


def e(s):
    return html.escape(str(s if s is not None else ""))


def a(url, text=None):
    return f'<a href="{e(url)}" target="_blank" rel="noopener">{e(text or url)}</a>'


STARS = lambda n: "★" * n  # noqa: E731
parts = [
    "<!DOCTYPE html>",
    '<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>دليل: توسعة المسارات والوظائف وقاعدة المعرفة</title>",
    "<style>",
    "body{font-family:'Segoe UI',Tahoma,sans-serif;margin:0;background:#f7f7f5;color:#1d1d1b;line-height:1.7}",
    "main{max-width:1100px;margin:0 auto;padding:24px}h1{font-size:26px;margin:0 0 4px}h2{margin-top:40px;border-bottom:2px solid #ddd;padding-bottom:6px}",
    "h3{margin:22px 0 6px}table{border-collapse:collapse;width:100%;background:#fff;margin:8px 0 16px;font-size:14px}",
    "th,td{border:1px solid #e1e1dc;padding:6px 8px;text-align:right;vertical-align:top}th{background:#efefea}",
    ".card{background:#fff;border:1px solid #e1e1dc;border-radius:8px;padding:14px 18px;margin:12px 0}",
    ".muted{color:#6b6b66;font-size:13px}.tag{display:inline-block;border:1px solid #c9c9c2;border-radius:4px;padding:0 6px;font-size:12px;margin-left:4px}",
    "a{color:#1f5fa8}ul{margin:4px 0 8px}code{background:#efefea;padding:0 4px;border-radius:3px;direction:ltr;unicode-bidi:embed}",
    ".ltr{direction:ltr;unicode-bidi:embed;text-align:left}",
    "</style></head><body><main>",
    "<h1>توسعة «دليل»: إدارة المنتجات ومسارات جديدة وقاعدة معرفة أكبر</h1>",
    f'<p class="muted">جُمعت في 20 نوفمبر 2026. المرحلة الأولى: بيانات جاهزة للدمج، غير موصولة بالتطبيق بعد. {len(NEW)} مهارة جديدة، {len(courses)} خطوة تعلّم، {len(jobs_out)} وظيفة حقيقية، {len(families_out)} مساراً في قاعدة المعرفة، {len(ROUTES)} طريق دخول.</p>',
    "<h2>المسارات الجديدة والمهارات</h2>",
    "<table><tr><th>المجال</th><th>المهارة</th><th>النجوم</th><th>المتطلب السابق</th><th>الوصف</th><th>كلمات السيرة</th></tr>",
]
for s in NEW.values():
    pre = "، ".join(ALL[p]["name"] for p in s["prereqs"]) or "لا شيء"
    parts.append(
        f"<tr><td>{e(s['field'])}</td><td><b>{e(s['name'])}</b><br><code>{e(s['id'])}</code></td><td>{STARS(s['maxStars'])}</td><td>{e(pre)}</td><td>{e(s['description'])}</td><td class='muted'>{e(' · '.join(s['aliases']))}</td></tr>"
    )
parts.append("</table>")

parts.append("<h2>الوظائف الحقيقية الجديدة</h2>")
for fam in NEW_FAMILIES:
    parts.append(f"<h3>{e(next(f['title'] for f in families_out if f['id'] == fam))}</h3>")
    parts.append("<table><tr><th>الوظيفة</th><th>الشركة</th><th>المدينة</th><th>المستوى</th><th>المهارات الخمس والدليل من الإعلان</th></tr>")
    for j in jobs_out:
        if j["_family"] != fam:
            continue
        reqs = "".join(
            f"<li><b>{e(ALL[r['skill']]['name'])} {STARS(r['stars'])}</b> <span class='muted ltr'>«{e(r['evidence'])}»</span></li>" for r in j["requirements"]
        )
        note = f"<div class='muted'>{e(j['source'].get('note'))}</div>" if j["source"].get("note") else ""
        parts.append(
            f"<tr><td><b>{e(j['title'])}</b><br><span class='muted ltr'>{e(j['titleEn'])}</span><br>{a(j['source']['url'], 'الإعلان الأصلي')}<br><span class='muted'>نُشر {e(j['source']['postedAt'])} · فُتح {e(j['source']['checkedAt'])}</span></td>"
            f"<td>{e(j['company'])}<br><span class='muted ltr'>{e(j['companyEn'])}</span></td><td>{e(j['place'])}</td><td>{e(j['band'])}</td><td><ul>{reqs}</ul>{note}</td></tr>"
        )
    parts.append("</table>")
    ev = (RAW_JOBS.get("demandEvidence") or {}).get(fam) or []
    if ev:
        parts.append("<details><summary class='muted'>دليل الطلب (وظائف مفتوحة رأيناها)</summary><ul class='ltr muted'>" + "".join(f"<li>{e(x)}</li>" for x in ev) + "</ul></details>")

parts.append("<h2>أدلة التعلّم للمهارات الجديدة</h2>")
for g in guides_out:
    s = NEW[g["skill"]]
    tp = g["topPick"]
    alts = "".join(f"<li>{a(c['url'], c['title'])} <span class='muted'>({e(c['provider'])}، {e(c['lang'])}، {e(c['price'])}{'، ' + str(c['hours']) + ' ساعة' if c['hours'] else ''})</span> {e(c['why'])}</li>" for c in g["alternatives"])
    ppl = "".join(
        f"<li>{a(p['url'], p['name'])} <span class='muted'>({e(p['platform'])})</span> {e(p['why'])}"
        + ("".join(f" <span class='tag'>{a(v, k)}</span>" for k, v in p["links"].items()))
        + (f" <span class='muted'>(LinkedIn من {a(p['linkedinSource'], 'صفحته')})</span>" if p.get("linkedinSource") else "")
        + "</li>"
        for p in g["people"]
    )
    arts = "".join(f"<li>{a(x['url'], x['title'])} <span class='muted'>({e(x['author'])}، {e(x['site'])})</span> {e(x['why'])}</li>" for x in g["articles"])
    pr = g["proof"]
    proof_html = f"<p><b>أثبتها:</b> {e(pr['task'])}" + (f" · {a(pr['dataset']['url'], pr['dataset']['name'])}" if pr and pr.get("dataset") else "") + "</p>" if pr else ""
    parts.append(
        f"<div class='card'><h3>{e(s['name'])} <code>{e(s['id'])}</code></h3>"
        f"<p><b>ابدأ بهذا:</b> {a(tp['url'], tp['title'])} <span class='muted'>({e(tp['provider'])}، {e(tp['lang'])}، {e(tp['price'])}{'، ' + str(tp['hours']) + ' ساعة' if tp['hours'] else ''})</span> {e(tp['why'])}</p>"
        f"<p><b>بدائل:</b></p><ul>{alts}</ul><p><b>تابع:</b></p><ul>{ppl}</ul><p><b>اقرأ:</b></p><ul>{arts}</ul>{proof_html}</div>"
    )

parts.append("<h2>قاعدة المعرفة: كل المسارات</h2>")
for f in families_out:
    gl = "".join(f"<li>{a(g['url'], g['provider'] + ': ' + g['name'])}</li>" for g in f["path"]["guidelines"])
    certs = "".join(f"<li>{a(c['url'], c['name'])} <span class='muted'>({e(c['issuer'])}، {e(c['level'])}{'، ' + e(c['priceText']) if c['priceText'] else ''})</span> {e(c['why'])}</li>" for c in f["certificates"])
    emps = "، ".join(a(x["careersUrl"], x["name"]) for x in f["employers"])
    sal = f["salary"]
    sal_html = (
        f"<p><b>الراتب:</b> {sal['minSAR']:,} إلى {sal['maxSAR']:,} ريال شهرياً ({e(sal['role'])}) · {a(sal['url'], sal['sourceName'])} {e(sal['page'] or '')}<br><span class='muted'>{e(sal['note'])}</span></p>"
        if sal
        else "<p class='muted'>الراتب: لا يوجد مصدر سعودي منشور فتحناه لهذا المسار.</p>"
    )
    routes = "، ".join(e(next((r["nameAr"] for r in ROUTES if r["id"] == rid), rid)) for rid in f["entryRoutes"])
    jobs_html = "، ".join(f"<code>{e(j)}</code>" for j in f["jobs"])
    parts.append(
        f"<div class='card'><h3>{e(f['title'])} <span class='muted ltr'>{e(f['titleEn'])}</span> {'<span class=tag>جديد</span>' if f['isNew'] else ''}</h3>"
        f"<p>{e(f['what'])}</p><p><b>يومه:</b> {e('؛ '.join(f['dayToDay']))}</p>"
        f"<p><b>المسار:</b> {e(' ← '.join(ALL[s]['name'] for s in f['path']['skills']))}</p>"
        f"<p class='muted'>{e(f['path']['basedOnLine'] or 'لم يُفتح دليل منشور بعد')}</p>"
        + (f"<p class='muted'>{e(f['path']['orderNote'])}</p>" if f["path"]["orderNote"] else "")
        + f"<ul>{gl}</ul>"
        + (f"<p><b>الشهادات المعترف بها:</b></p><ul>{certs}</ul>" if certs else "")
        + sal_html
        + (f"<p><b>طرق الدخول:</b> {routes}</p>" if routes else "")
        + (f"<p><b>جهات توظّف:</b> {emps}</p>" if emps else "")
        + (f"<p><b>وظائف في التطبيق:</b> {jobs_html}</p>" if jobs_html else "")
        + f"<p><b>أسئلة مقابلة شائعة:</b></p><ul>{''.join(f'<li>{e(q)}</li>' for q in f['interviewQuestions'])}</ul>"
        + f"<p><b>أول 30 يوم:</b></p><ul>{''.join(f'<li>{e(q)}</li>' for q in f['first30Days'])}</ul>"
        + f"<p class='muted'>{e(f['writtenByDalil'])}</p>"
        + f"<p><b>بلسان «دليلك»:</b></p><ul>{''.join(f'<li>{e(q)}</li>' for q in f['botLines'])}</ul></div>"
    )

if ROUTES:
    parts.append("<h2>طرق الدخول للسعوديين</h2><table><tr><th>البرنامج</th><th>ما هو</th><th>الأهلية كما في الصفحة الرسمية</th><th>الفائدة / المدة</th></tr>")
    for r in ROUTES:
        el = "".join(f"<li>{e(x)}</li>" for x in (r["eligibility"] or []))
        bn = "".join(f"<li>{e(x)}</li>" for x in (r["benefit"] or []))
        parts.append(f"<tr><td>{a(r['url'], r['nameAr'])}<br><span class='muted'>{e(r['owner'])}</span></td><td>{e(r['line'])}</td><td><ul>{el}</ul></td><td><ul>{bn}</ul></td></tr>")
    parts.append("</table>")

parts.append("<p class='muted'>المصادر الخام: " + "، ".join(f"<code>research/expansion/raw/{e(n)}</code>" for n in expansion["rawFiles"]) + "</p>")
parts.append("</main></body></html>\n")
write(ROOT / "research" / "expansion" / "review.html", "\n".join(parts))

print(f"skills {len(NEW)} courses {len(courses)} jobs {len(jobs_out)} guides {len(guides_out)} families {len(families_out)} routes {len(ROUTES)}")
for f in families_out:
    print(f"  {f['id']}: jobs {len(f['jobs'])} employers {len(f['employers'])} certs {len(f['certificates'])} salary {'yes' if f['salary'] else 'no'} routes {len(f['entryRoutes'])} guideline {'yes' if f['path']['basedOnLine'] else 'no'}")
