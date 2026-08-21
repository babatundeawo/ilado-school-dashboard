/* =========================================================
   lock-config.js — passcode gate configuration.

   This file stores a SALT and a SHA-256 HASH of your passcode —
   never the passcode itself. To set or change your passcode:

     1. Open assets/set-passcode.html in your browser (double-click it).
     2. Type your new passcode, click "Generate config".
     3. Copy the two lines it gives you and paste them below,
        replacing LOCK_SALT and LOCK_HASH.
     4. Save this file. Your new passcode is active immediately.

   Nothing here ever leaves your computer — this is plain text
   in a local file, checked entirely inside your own browser.
   ========================================================= */
const LOCK_SALT = "5c158a778c9e0a909b0357b5";
const LOCK_HASH = "45473ff757d9d5c5aa6280a2a1716624bbf17a0ea1193be98ffe7819403b849d";
