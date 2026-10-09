// Test double for Firestore. It also mirrors the logic of firebase/firestore.rules so the
// app's behaviour under "permission-denied" can be exercised. (The real rules are verified
// separately in the Firebase console; see docs/FIREBASE_LOGIN_SETUP.md.)
const DB = "mock_db";
const read = () => { try { return JSON.parse(localStorage.getItem(DB)) || {}; } catch { return {}; } };
const write = (d) => localStorage.setItem(DB, JSON.stringify(d));
const perm = () => Object.assign(new Error("permission-denied"), { code: "permission-denied" });
const currentAuth = () => {
  const email = JSON.parse(localStorage.getItem("mock_current") || "null");
  const rec = email && JSON.parse(localStorage.getItem("mock_users") || "{}")[email];
  return rec ? { uid: rec.uid, email: rec.email, verified: !!rec.emailVerified } : null;
};

function allowed(op, col, id, data, db) {
  const a = currentAuth();
  if (!a || !a.verified) return false;
  const member = db[`members/${a.uid}`];
  const isMember = !!member, isAdmin = isMember && member.role === "admin";
  const kind = op === "get" || op === "list" ? "read" : "write";
  if (col === "members") {
    if (op === "get") return a.uid === id;
    if (op === "list") return isAdmin;
    if (op === "delete") return isAdmin && id !== a.uid;
    return isAdmin && ["viewer", "admin"].includes(data?.role) && (id !== a.uid || data.role === "admin");
  }
  if (col === "accessRequests") {
    if (op === "get") return a.uid === id || isAdmin;
    if (op === "list") return isAdmin;
    if (op === "create") return a.uid === id && data.email === a.email && data.status === "pending";
    return isAdmin;
  }
  if (col === "data") return kind === "read" ? isMember : isAdmin;
  if (col === "restricted") return isAdmin;
  return false;
}

const stamp = () => ({ __ts: true, seconds: Math.floor(Date.now() / 1000) });
const revive = (v) => (v && v.__ts ? { ...v, toDate: () => new Date(v.seconds * 1000) } : v);
const reviveAll = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, revive(v)]));

export const getFirestore = () => ({});
export const serverTimestamp = () => ({ __sentinel: true });
export const doc = (_db, col, id) => ({ col, id, path: `${col}/${id}` });
export const collection = (_db, col) => ({ col });
const snap = (id, data) => ({ id, exists: () => data !== undefined, data: () => (data === undefined ? undefined : reviveAll(data)) });

export async function getDoc(ref) {
  const db = read();
  if (!allowed("get", ref.col, ref.id, null, db)) throw perm();
  return snap(ref.id, db[ref.path]);
}
export async function getDocs(c) {
  const db = read();
  if (!allowed("list", c.col, null, null, db)) throw perm();
  const docs = Object.entries(db).filter(([p]) => p.startsWith(c.col + "/")).map(([p, d]) => snap(p.split("/")[1], d));
  return { docs, size: docs.length };
}
export function writeBatch() {
  const ops = [];
  const clean = (d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v && v.__sentinel ? stamp() : v]));
  return {
    set(ref, data) { ops.push(["set", ref, data]); },
    update(ref, data) { ops.push(["update", ref, data]); },
    delete(ref) { ops.push(["delete", ref]); },
    async commit() {
      const db = read();
      for (const [op, ref, data] of ops) {
        const exists = ref.path in db;
        const kind = op === "delete" ? "delete" : exists ? "update" : "create";
        const merged = op === "update" ? { ...db[ref.path], ...data } : data;
        if (!allowed(kind, ref.col, ref.id, merged && clean(merged), db)) throw perm();
      }
      for (const [op, ref, data] of ops) {
        if (op === "delete") delete db[ref.path];
        else if (op === "update") db[ref.path] = { ...db[ref.path], ...clean(data) };
        else db[ref.path] = clean(data);
      }
      write(db);
    }
  };
}
