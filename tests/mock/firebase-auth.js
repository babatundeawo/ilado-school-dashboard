// Test double for the Firebase Auth SDK. State lives in localStorage so it survives page loads.
const U = "mock_users", C = "mock_current";
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const listeners = new Set();
let uidSeq = () => "uid_" + Math.random().toString(36).slice(2, 9);
const err = (code) => Object.assign(new Error(code), { code });

function userObj(rec) {
  if (!rec) return null;
  return {
    uid: rec.uid, email: rec.email, displayName: rec.displayName || "",
    get emailVerified() { return Boolean(read(U, {})[rec.email]?.emailVerified); },
    async reload() {}, async getIdToken() { return "tok_" + rec.uid; },
    _rec: rec
  };
}
const auth = { get currentUser() { const e = read(C, null); const rec = e && read(U, {})[e]; return userObj(rec); } };
const notify = () => listeners.forEach((cb) => cb(auth.currentUser));

export const browserLocalPersistence = {}, browserSessionPersistence = {};
export const setPersistence = async () => {};
export const getAuth = () => auth;
export class GoogleAuthProvider {}
export function onAuthStateChanged(_a, cb) { listeners.add(cb); queueMicrotask(() => cb(auth.currentUser)); return () => listeners.delete(cb); }
export async function signInWithEmailAndPassword(_a, email, password) {
  const rec = read(U, {})[email.toLowerCase()];
  if (!rec || rec.password !== password) throw err("auth/invalid-credential");
  write(C, rec.email); notify(); return { user: auth.currentUser };
}
export async function createUserWithEmailAndPassword(_a, email, password) {
  const users = read(U, {}); email = email.toLowerCase();
  if (users[email]) throw err("auth/email-already-in-use");
  if (password.length < 6) throw err("auth/weak-password");
  users[email] = { uid: uidSeq(), email, password, displayName: "", emailVerified: false }; write(U, users); write(C, email); notify();
  return { user: auth.currentUser };
}
export async function updateProfile(user, { displayName }) { const users = read(U, {}); users[user.email].displayName = displayName; write(U, users); }
export async function sendEmailVerification(user) { const log = read("mock_mail", []); log.push({ type: "verify", to: user.email }); write("mock_mail", log); }
export async function sendPasswordResetEmail(_a, email) { const log = read("mock_mail", []); log.push({ type: "reset", to: email }); write("mock_mail", log); }
export async function signInWithPopup() {
  const email = "google.user@example.org", users = read(U, {});
  users[email] ||= { uid: uidSeq(), email, password: null, displayName: "Google User", emailVerified: true };
  write(U, users); write(C, email); notify(); return { user: auth.currentUser };
}
export async function signOut() { localStorage.removeItem(C); notify(); }
