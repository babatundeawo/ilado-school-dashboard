"""Builds a fictional copy of the school dataset for tests and README screenshots.

It keeps the exact SHAPE of the real data (so every page can be exercised) but replaces
every personal or school-specific value with obvious placeholder text. Run it with the
real data.js to regenerate; the real file is NEVER committed.

usage: python3 make_sample_data.py path/to/data.js > sample-data.json
"""
import json, sys, re, itertools

KEEP_KEYS = {"class", "term", "gender", "status", "subjects", "source", "label", "fileName", "importedAt", "block"}
counter = itertools.count(1)

def fake_string(key, path):
    n = next(counter)
    k = key.lower()
    if "email" in k: return f"sample{n}@example.org"
    if "date" in k or k in {"year", "period"} and False: return f"20{30 + n % 5}-{1 + n % 12:02d}-{1 + n % 27:02d}"
    if k in {"name", "full_name", "full_name_of_staff", "surname", "firstname", "othername"}: return f"Sample Person {n:03d}"
    if "account" in k or "number" in k or "gsm" in k: return f"000000{n:04d}"
    return f"Sample {key.replace('_', ' ')} {n}"

def scrub(v, key="", path=()):
    if isinstance(v, dict):
        return {k: scrub(x, k, path + (k,)) for k, x in v.items()}
    if isinstance(v, list):
        if key in KEEP_KEYS: return v
        return [scrub(x, key, path + ("[]",)) for x in v]
    if isinstance(v, str):
        if key in KEEP_KEYS or v == "": return v
        return fake_string(key, path)
    if isinstance(v, bool) or v is None: return v
    if isinstance(v, (int, float)):
        if any(t in key.lower() for t in ("gsm", "phone", "file_no", "ref_id")): return 8000000000 + next(counter)
        return v
    return v

raw = open(sys.argv[1], encoding="utf-8").read()
data = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
out = scrub(data)

# Readable people, so screenshots look natural but are clearly fictional.
for i, s in enumerate(out["students"], 1):
    s["surname"] = "Sample"; s["firstname"] = f"Student{i:03d}"; s["othername"] = None; s["name"] = f"Sample Student{i:03d}"; s["comment"] = None
for i, r in enumerate(out["results"], 1):
    r["name"] = f"Sample Student{(i % len(out['students'])) + 1:03d}"; r["admissionNo"] = f"S{i:05d}"
for i, m in enumerate(out["marking"], 1):
    m["name"] = f"Sample Student{(i % len(out['students'])) + 1:03d}"
out["school"].update({"name": "Sample Community Grammar School", "shortName": "SCGS"})
out["retirement"]["outgoingPrincipal"] = "Sample Outgoing Principal"; out["retirement"]["incomingPrincipal"] = "Sample Incoming Principal"
out["meta"]["dataPolicy"] = "Fictional sample data for tests and documentation."
# Keep the fixture small enough to live in the repository.
out["students"] = out["students"][:150]
out["results"] = out["results"][:240]
out["marking"] = out["marking"][:240]
for imp in out["meta"].get("imports", []):
    imp["fileName"] = "sample-" + imp["label"] + ".xlsx"
print(json.dumps(out, ensure_ascii=False))
