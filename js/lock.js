/* =========================================================
   lock.js — passcode gate for ISCGS Register.

   Loads before the page body is shown. Checks sessionStorage
   for a valid unlock flag; if absent, shows a full-screen
   passcode prompt and blocks the rest of the page until the
   correct passcode (hashed + salted, see js/lock-config.js)
   is entered. Includes basic attempt throttling.

   IMPORTANT: this is a UI gate for a local, single-user tool —
   it deters casual access, it is not encryption. The real
   protection is keeping this folder off any public host and
   the GitHub repo private, as the README says.
   ========================================================= */
(function () {
  var SESSION_KEY = "iscgs_unlocked_v1";
  var ATTEMPTS_KEY = "iscgs_lock_attempts_v1";
  var LOCKOUT_UNTIL_KEY = "iscgs_lock_until_v1";
  var MAX_ATTEMPTS = 5;
  var LOCKOUT_MS = 60000;

  function isUnlocked() {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  }

  function unlockSession() {
    sessionStorage.setItem(SESSION_KEY, "1");
  }

  function getAttempts() {
    return parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0", 10);
  }
  function setAttempts(n) {
    localStorage.setItem(ATTEMPTS_KEY, String(n));
  }
  function getLockoutUntil() {
    return parseInt(localStorage.getItem(LOCKOUT_UNTIL_KEY) || "0", 10);
  }
  function setLockoutUntil(ts) {
    localStorage.setItem(LOCKOUT_UNTIL_KEY, String(ts));
  }

  function sha256Hex(str) {
    var enc = new TextEncoder().encode(str);
    return crypto.subtle.digest("SHA-256", enc).then(function (buf) {
      var bytes = new Uint8Array(buf);
      var hex = "";
      for (var i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, "0");
      }
      return hex;
    });
  }

  function checkPasscode(passcode) {
    var salt = (typeof LOCK_SALT !== "undefined") ? LOCK_SALT : "";
    var expected = (typeof LOCK_HASH !== "undefined") ? LOCK_HASH : "";
    return sha256Hex(salt + passcode).then(function (hash) {
      return hash === expected;
    });
  }

  function reveal() {
    document.documentElement.classList.remove("iscgs-locking");
    var overlay = document.getElementById("iscgsLockOverlay");
    if (overlay) overlay.remove();
  }

  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.id = "iscgsLockOverlay";
    overlay.className = "lock-overlay";
    overlay.innerHTML =
      '<div class="lock-card" role="dialog" aria-modal="true" aria-labelledby="lockTitle">' +
      '  <div class="lock-mark" aria-hidden="true">IS</div>' +
      '  <h1 id="lockTitle">ISCGS Register</h1>' +
      '  <p class="lock-sub">Enter the passcode to open this dashboard.</p>' +
      '  <form id="lockForm" autocomplete="off">' +
      '    <input type="password" id="lockInput" placeholder="Passcode" autocomplete="off" autofocus>' +
      '    <button type="submit" class="btn btn-gold">Unlock</button>' +
      '  </form>' +
      '  <p class="lock-error" id="lockError" hidden>That passcode is not correct. Try again.</p>' +
      '  <p class="lock-foot">This device only — nothing is sent anywhere.</p>' +
      "</div>";
    document.body.appendChild(overlay);

    var form = overlay.querySelector("#lockForm");
    var input = overlay.querySelector("#lockInput");
    var error = overlay.querySelector("#lockError");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var now = Date.now();
      var lockoutUntil = getLockoutUntil();
      if (now < lockoutUntil) {
        error.textContent =
          "Too many attempts. Try again in " +
          Math.ceil((lockoutUntil - now) / 1000) +
          "s.";
        error.hidden = false;
        return;
      }
      checkPasscode(input.value).then(function (ok) {
        if (ok) {
          setAttempts(0);
          unlockSession();
          reveal();
        } else {
          var attempts = getAttempts() + 1;
          setAttempts(attempts);
          if (attempts >= MAX_ATTEMPTS) {
            setLockoutUntil(Date.now() + LOCKOUT_MS);
            setAttempts(0);
            error.textContent =
              "Too many attempts. Try again in " + LOCKOUT_MS / 1000 + "s.";
          } else {
            error.textContent =
              "That passcode is not correct. Try again.";
          }
          error.hidden = false;
          input.value = "";
          input.focus();
        }
      });
    });
  }

  document.documentElement.classList.add("iscgs-locking");

  function init() {
    if (isUnlocked()) {
      reveal();
      return;
    }
    buildOverlay();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
