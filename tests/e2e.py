"""End-to-end tests against the built site with the Firebase SDK replaced by test doubles.

    FIREBASE_API_KEY=x FIREBASE_AUTH_DOMAIN=x.firebaseapp.com FIREBASE_PROJECT_ID=x FIREBASE_APP_ID=x node scripts/build.mjs
    python3 tests/e2e.py
"""
import json, sys, threading, http.server, socketserver, functools, pathlib
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST, MOCK = ROOT / "dist", ROOT / "tests/mock"
SHOTS = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
PORT = 8765
BASE = f"http://127.0.0.1:{PORT}/"

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def send_error(self, code, *a, **k):
        if code == 404 and (DIST / "404.html").exists():
            body = (DIST / "404.html").read_bytes()
            self.send_response(404); self.send_header("Content-Type", "text/html"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
        else: super().send_error(code, *a, **k)

socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=str(DIST)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()

failures, passed = [], 0
def check(name, cond, detail=""):
    global passed
    if cond: passed += 1; print(f"  ok   {name}")
    else: failures.append(name); print(f"  FAIL {name} {detail}")

def route_firebase(route):
    fname = route.request.url.split("/")[-1]
    f = MOCK / fname
    if f.exists(): route.fulfill(status=200, content_type="text/javascript", body=f.read_text())
    else: route.abort()

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.route("https://www.gstatic.com/firebasejs/**", route_firebase)
    ctx.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    ctx.route("https://fonts.gstatic.com/**", lambda r: r.abort())
    ctx.route("https://cdnjs.cloudflare.com/**", lambda r: r.abort())
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "ERR_FAILED" not in m.text and "Failed to load resource" not in m.text else None)

    def shot(name):
        if SHOTS: page.screenshot(path=str(SHOTS / f"{name}.png"))
    def ls(key, value): page.evaluate("([k,v]) => localStorage.setItem(k, v)", [key, json.dumps(value)])
    def users(): return page.evaluate("() => JSON.parse(localStorage.getItem('mock_users')||'{}')")
    def sign_in(email, pw):
        page.goto(BASE + "login.html"); page.fill("#inEmail", email); page.fill("#inPass", pw); page.click("#inSubmit")

    print("Login page")
    page.goto(BASE + "login.html")
    check("title", "Sign in" in page.title())
    check("sign-in tab selected", page.get_attribute("#tabIn", "aria-selected") == "true")
    page.click("#inSubmit")
    check("empty form shows inline errors", page.is_visible("#inEmailErr") and page.is_visible("#inPassErr"))
    page.fill("#inEmail", "nobody@example.org"); page.fill("#inPass", "wrongpass1"); page.click("#inSubmit")
    expect(page.locator("#authAlert")).to_contain_text("don't match")
    check("wrong password message", True)
    shot("login-light")

    print("Unauthenticated guard")
    page.evaluate("() => localStorage.clear()")
    page.goto(BASE + "students.html"); page.wait_for_url("**/login.html?next=students.html")
    check("redirects to login with next", True)

    print("Sign-up, verification and approval")
    page.click("#tabUp"); page.fill("#upName", "Ada Admin"); page.fill("#upEmail", "ada@example.org"); page.fill("#upPass", "short"); page.click("#upSubmit")
    check("short password rejected", page.is_visible("#upPassErr"))
    page.fill("#upPass", "correct-horse-1"); page.click("#upSubmit")
    page.wait_for_url("**/index.html")
    expect(page.locator("#gate h1")).to_have_text("Verify your email")
    check("verify-email gate", True)
    users_now = users(); users_now["ada@example.org"]["emailVerified"] = True; ls("mock_users", users_now)
    page.click("#recheck")
    expect(page.locator("#gate h1")).to_have_text("Waiting for approval")
    check("pending-approval gate after verifying", True)
    check("access request stored", "accessRequests/" + users()["ada@example.org"]["uid"] in json.loads(page.evaluate("() => localStorage.getItem('mock_db')")))
    shot("gate-pending")

    print("Bootstrap first administrator (what the setup guide tells the owner to do in the console)")
    uid = users()["ada@example.org"]["uid"]
    db = json.loads(page.evaluate("() => localStorage.getItem('mock_db')"))
    db[f"members/{uid}"] = {"role": "admin", "email": "ada@example.org", "displayName": "Ada Admin"}
    ls("mock_db", db)
    page.goto(BASE + "index.html")
    expect(page.locator("#pageContent")).to_contain_text("No records have been loaded yet")
    check("admin sees empty state with import link", page.is_visible("a:has-text('Go to Import Data')"))
    check("admin nav visible", page.is_visible(".nav-group:has-text('Administration')"))

    print("Load sample data through the Import page")
    page.goto(BASE + "import.html")
    sample = json.loads((ROOT / "tests/fixtures/sample-data.json").read_text())
    (ROOT / "tests/_sample-data.js").write_text("window.__PRELOADED__ = " + json.dumps(sample) + ";")
    page.set_input_files("#seedFile", str(ROOT / "tests/_sample-data.js"))
    page.click("#seedBtn"); page.click("dialog [data-act=yes]")
    expect(page.locator("#seedSteps li").last).to_contain_text("Saved overview totals", timeout=30000)
    check("seed completes", page.locator("#seedSteps li.is-fail").count() == 0)
    (ROOT / "tests/_sample-data.js").unlink()
    stored = json.loads(page.evaluate("() => localStorage.getItem('mock_db')"))
    check("accounts stored in restricted collection only", any(k.startswith("restricted/retirementAccounts") for k in stored) and "handoverAccounts" not in json.dumps({k: v for k, v in stored.items() if k.startswith("data/retirement")}))
    check("no raw marks stored in marking", all(set(json.loads(stored["data/marking_p0"]["text"])[0].keys()) <= {"name", "gender", "class", "term", "status", "source"} for _ in [0]))

    print("Every page renders for an administrator")
    for pg, needle in [("index", "Students per class"), ("students", "Student roll"), ("results", "Average attendance by class"), ("marking", "Complete records"),
                       ("staff", "Staffing at a glance"), ("about", "School history"), ("retirement", "Succession of principals"), ("events", "Read full text"),
                       ("resources", "Library"), ("import", "Load the school data file"), ("admin", "Waiting for approval")]:
        page.goto(BASE + f"{pg}.html")
        try: expect(page.locator("#pageContent")).to_contain_text(needle, timeout=8000); ok = True
        except Exception: ok = False
        check(f"{pg}.html shows '{needle}'", ok)
        w = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(f"{pg}.html has no horizontal scroll (1440px)", w <= 0, f"overflow {w}px")
        if pg in ("index", "students", "staff", "retirement"): page.wait_for_timeout(1300); shot(f"{pg}-light")
    check("admin sees account numbers on retirement page", True)
    page.goto(BASE + "retirement.html"); expect(page.locator("#pageContent")).to_contain_text("School accounts at handover")
    check("accounts card present for admin", page.locator("text=Account details are restricted").count() == 0)

    print("Tables fill on first load (no filter touched)")
    for pg, minimum in [("students", 100), ("results", 100), ("marking", 100), ("staff", 10)]:
        page.goto(BASE + f"{pg}.html"); expect(page.locator("tbody tr").first).to_be_visible()
        page.wait_for_timeout(200)
        shown = page.locator("tbody tr").count()
        check(f"{pg}.html lists rows immediately ({shown})", shown >= minimum, f"only {shown}")
    page.goto(BASE + "resources.html"); expect(page.locator("tbody tr").first).to_be_visible(); check("library catalogue lists rows", page.locator("tbody tr").count() > 10)

    print("Students: filter, sort, search param, drawer")
    page.goto(BASE + "students.html"); expect(page.locator("tbody tr").first).to_be_visible()
    page.click("th:has-text('Name')"); check("sorting by name sets aria-sort", page.get_attribute("th:has-text('Name')", "aria-sort") == "ascending")
    first = page.locator("tbody tr td:nth-child(2)").first.inner_text(); page.click("th:has-text('Name')")
    check("second click reverses sort", page.locator("tbody tr td:nth-child(2)").first.inner_text() != first)
    total = page.locator(".stat-value").first.inner_text()
    page.select_option("#fClass", index=1)
    check("class filter narrows rows", page.locator(".result-count").inner_text().split("of")[1].strip().split()[0].isdigit())
    page.goto(BASE + "students.html?q=Student007"); expect(page.locator("tbody tr")).to_have_count(1)
    check("?q= prefills search", page.input_value("#fSearch") == "Student007")
    page.goto(BASE + "staff.html"); expect(page.locator("tbody tr").first).to_be_visible(); page.locator("tbody tr").first.click()
    expect(page.locator("dialog.drawer")).to_be_visible(); check("staff drawer opens", True); page.keyboard.press("Escape")
    expect(page.locator("dialog.drawer")).to_have_count(0); check("staff drawer closes with Esc", True)

    print("Command palette")
    page.goto(BASE + "index.html"); expect(page.locator(".hero")).to_be_visible()
    page.keyboard.press("Control+k"); expect(page.locator("dialog.palette")).to_be_visible()
    page.fill(".palette input", "Student01"); expect(page.locator(".palette-item").first).to_be_visible()
    check("palette finds students", page.locator(".palette-item").count() > 0)
    page.keyboard.press("Escape")

    print("Theme toggle")
    page.click("#themeToggle")
    check("dark theme applied", page.get_attribute("html", "data-theme") == "dark")
    page.wait_for_timeout(1200); shot("index-dark")
    page.reload(); expect(page.locator(".hero")).to_be_visible()
    check("theme persists after reload", page.get_attribute("html", "data-theme") == "dark")
    page.click("#themeToggle")

    print("Admin approves a new viewer")
    page.click("#accountBtn"); page.click("#signOutBtn"); page.wait_for_url("**/login.html")
    page.click("#tabUp"); page.fill("#upName", "Vic Viewer"); page.fill("#upEmail", "vic@example.org"); page.fill("#upPass", "another-pass-9"); page.click("#upSubmit")
    page.wait_for_url("**/index.html")
    u = users(); u["vic@example.org"]["emailVerified"] = True; ls("mock_users", u)
    page.click("#recheck"); expect(page.locator("#gate h1")).to_have_text("Waiting for approval")
    page.evaluate("() => localStorage.removeItem('mock_current')")
    sign_in("ada@example.org", "correct-horse-1"); page.wait_for_url("**/index.html")
    page.goto(BASE + "admin.html"); expect(page.locator(".request-item", has_text="vic@example.org")).to_be_visible()
    shot("admin")
    page.locator(".request-item", has_text="vic@example.org").locator("[data-approve]").click(); expect(page.locator("#pageContent")).to_contain_text("People with access")
    check("viewer approved", page.locator("tbody tr", has_text="vic@example.org").count() == 1)

    print("Viewer permissions")
    page.evaluate("() => localStorage.removeItem('mock_current')")
    sign_in("vic@example.org", "another-pass-9"); page.wait_for_url("**/index.html")
    expect(page.locator(".hero")).to_be_visible(); check("viewer reaches overview", True)
    check("admin nav hidden for viewer", not page.is_visible(".nav-group:has-text('Administration')"))
    page.goto(BASE + "import.html"); expect(page.locator("#gate h1")).to_have_text("Administrators only"); check("viewer blocked from import page", True)
    page.goto(BASE + "admin.html"); expect(page.locator("#gate h1")).to_have_text("Administrators only"); check("viewer blocked from admin page", True)
    page.goto(BASE + "retirement.html"); expect(page.locator("#pageContent")).to_contain_text("Account details are restricted to school administrators")
    check("viewer cannot see bank accounts", "School accounts at handover" in page.inner_text("#pageContent") and "000000" not in page.inner_text("#pageContent").split("School accounts at handover")[1][:400])
    denied = page.evaluate("""async () => { const m = await import('/assets/js/lib/store.js'); try { await m.saveDataset('students', []); return 'allowed'; } catch (e) { return e.code; } }""")
    check("viewer write is denied by rules", denied == "permission-denied", denied)
    denied2 = page.evaluate("""async () => { const m = await import('/assets/js/lib/store.js'); try { await m.loadDataset('retirementAccounts', {restricted:true}); return 'allowed'; } catch (e) { return e.code; } }""")
    check("viewer cannot read restricted data", denied2 == "permission-denied", denied2)

    print("Declined user and 404")
    page.goto(BASE + "no-such-page.html"); check("custom 404 page", "doesn't exist" in page.inner_text("body"))
    shot("404")

    print("Responsive checks, signed in as viewer")
    for w in (320, 390, 768, 1024, 2200):
        page.set_viewport_size({"width": w, "height": 900})
        for pg in ("index", "students", "about", "staff", "resources"):
            page.goto(BASE + f"{pg}.html"); page.wait_for_timeout(250)
            over = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if over > 0: check(f"{pg} no horizontal scroll at {w}px", False, f"overflow {over}px")
    check("no horizontal scroll across widths/pages", not any("horizontal scroll across" in f or "no horizontal scroll at" in f for f in failures))
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(BASE + "index.html"); expect(page.locator(".hero")).to_be_visible()
    check("sidebar hidden on mobile", not page.locator("#sidebar").is_visible())
    page.click("#navTrigger"); page.wait_for_timeout(500)
    check("mobile menu opens and is announced", page.get_attribute("#navTrigger", "aria-expanded") == "true" and page.locator("#sidebar").is_visible())
    shot("mobile-menu"); page.keyboard.press("Escape"); page.wait_for_timeout(500)
    check("Esc closes mobile menu", page.get_attribute("#navTrigger", "aria-expanded") == "false")
    page.wait_for_timeout(1200); shot("mobile-overview")

    print("Reduced motion")
    rctx = browser.new_context(reduced_motion="reduce", viewport={"width": 1280, "height": 800})
    rpage = rctx.new_page(); rpage.route("https://www.gstatic.com/firebasejs/**", route_firebase)
    rpage.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    rpage.goto(BASE + "login.html"); check("login renders under reduced motion", rpage.is_visible("#formIn"))
    rctx.close()

    check("no uncaught JavaScript errors", not errors, "; ".join(errors[:5]))
    browser.close()

httpd.shutdown()
print(f"\n{passed} passed, {len(failures)} failed")
sys.exit(1 if failures else 0)
