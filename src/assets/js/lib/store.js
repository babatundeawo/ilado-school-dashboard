/* Secure data layer.
   Every dataset is stored in Firestore as JSON text split into chunks, under
   data/{key}_p{n}. Firestore security rules only let approved members read it
   and only administrators write it, so none of this is ever in the repository
   or the public website. A few sensitive items live under restricted/ which
   only administrators can read. */
import { doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { getServices } from "./firebase.js";

const CHUNK_CHARS = 200_000; // up to ~800 KB per document even for non-ASCII text (limit is 1 MiB)
const cache = new Map();

const docId = (key, part) => `${key}_p${part}`;

/** Reads one dataset. Returns null when it has not been loaded yet. */
export function loadDataset(key, { restricted = false } = {}) {
  const ck = `${restricted ? "r:" : "d:"}${key}`;
  if (!cache.has(ck)) {
    const p = readDataset(key, restricted).catch((e) => { cache.delete(ck); throw e; });
    cache.set(ck, p);
  }
  return cache.get(ck);
}

async function readDataset(key, restricted) {
  const { db } = await getServices();
  const col = restricted ? "restricted" : "data";
  const first = await getDoc(doc(db, col, docId(key, 0)));
  if (!first.exists()) return null;
  const { parts = 1, text = "" } = first.data();
  const rest = await Promise.all(Array.from({ length: parts - 1 }, (_, i) => getDoc(doc(db, col, docId(key, i + 1)))));
  const full = text + rest.map((s) => (s.exists() ? s.data().text : "")).join("");
  return JSON.parse(full);
}

/** Replaces one dataset atomically (all chunks in a single batch). Administrators only. */
export async function saveDataset(key, value, { restricted = false } = {}) {
  const { db } = await getServices();
  const col = restricted ? "restricted" : "data";
  const json = JSON.stringify(value);
  const chunks = [];
  for (let i = 0; i < json.length; i += CHUNK_CHARS) chunks.push(json.slice(i, i + CHUNK_CHARS));
  if (!chunks.length) chunks.push("null");

  const old = await getDoc(doc(db, col, docId(key, 0)));
  const oldParts = old.exists() ? old.data().parts || 1 : 0;

  const batch = writeBatch(db);
  chunks.forEach((text, i) => batch.set(doc(db, col, docId(key, i)), { key, part: i, parts: chunks.length, text, updatedAt: serverTimestamp() }));
  for (let i = chunks.length; i < oldParts; i++) batch.delete(doc(db, col, docId(key, i)));
  await batch.commit();
  cache.set(`${restricted ? "r:" : "d:"}${key}`, Promise.resolve(value));
}

/* ---------- Summary: small precomputed totals so the Overview loads fast ---------- */
export function computeSummary({ students = [], results = [], marking = [], staff = {}, imports = [], dataPolicy = "" }) {
  const classMap = new Map();
  students.forEach((s) => classMap.set(s.class, (classMap.get(s.class) || 0) + 1));
  const sw = (s, ch) => (s.gender || "").toUpperCase().startsWith(ch);
  return {
    students: {
      total: students.length,
      male: students.filter((s) => sw(s, "M")).length,
      female: students.filter((s) => sw(s, "F")).length,
      classes: [...classMap].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    },
    staff: {
      teaching: (staff.teaching || []).length,
      nonTeaching: (staff.nonTeaching || []).length,
      corps: (staff.corps || []).length,
      ptaAppointed: (staff.ptaAppointed || []).length
    },
    results: { records: results.length, terms: new Set(results.map((r) => r.term).filter(Boolean)).size },
    marking: { records: marking.length },
    imports: imports.slice(0, 30),
    dataPolicy
  };
}

export async function refreshSummary(extra = {}) {
  const [students, results, marking, staff, prev] = await Promise.all([
    loadDataset("students"), loadDataset("results"), loadDataset("marking"), loadDataset("staff"), loadDataset("summary")
  ]);
  const summary = computeSummary({
    students: students || [], results: results || [], marking: marking || [], staff: staff || {},
    imports: extra.imports ?? prev?.imports ?? [], dataPolicy: extra.dataPolicy ?? prev?.dataPolicy ?? ""
  });
  await saveDataset("summary", summary);
  return summary;
}

/* ---------- Members and access requests ---------- */
export async function fetchMember(uid) {
  const { db } = await getServices();
  const s = await getDoc(doc(db, "members", uid));
  return s.exists() ? s.data() : null;
}
export async function fetchAccessRequest(uid) {
  const { db } = await getServices();
  const s = await getDoc(doc(db, "accessRequests", uid));
  return s.exists() ? s.data() : null;
}
export async function createAccessRequest(user) {
  const { db } = await getServices();
  const batch = writeBatch(db);
  batch.set(doc(db, "accessRequests", user.uid), {
    email: user.email, displayName: (user.displayName || "").slice(0, 100), requestedAt: serverTimestamp(), status: "pending"
  });
  await batch.commit();
}
