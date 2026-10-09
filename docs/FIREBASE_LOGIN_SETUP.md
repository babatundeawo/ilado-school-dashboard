# Firebase login setup: a step-by-step guide for beginners

You do not need any technical background. You will only use two websites: the **Firebase Console** (console.firebase.google.com) and **GitHub**. Nothing needs to be installed or typed into a terminal.

## What is this, and what are you about to do?

**Firebase** is a free service from Google. Two of its parts protect your school's records:

- **Authentication** is the "front door". It lets people create accounts, proves who they are with an email and password (or a Google account), and sends the verification emails.
- **Firestore** is the "locked filing cabinet". It stores the school's records. A set of **security rules** decides who may open each drawer.

By the end of this guide, the website will have a working sign-in, the filing cabinet will be locked so that only people you approve can read it, and you will be the first administrator.

You will need: your Google account that owns the Firebase project, your GitHub account that owns this repository, and about 40 minutes.

> **Never share or commit:** passwords, "service account" files (`*.json` files that mention `private_key`), or the real `data.js` file. See [What NOT to share or commit](#what-not-to-share-or-commit).

---

## Step 1: Open your Firebase project

1. Go to **console.firebase.google.com** and sign in with the Google account that owns your project.
2. Click your project's name (a card on the home page).

**You should see:** the project overview page with your project name at the top left and a menu on the left (Build, Run, Analytics...).

## Step 2: Register the website and copy its settings

A "web app" in Firebase is just a label that tells Firebase which website is allowed to talk to it.

1. Click the **gear icon** next to *Project Overview* (top left), then **Project settings**.
2. On the **General** tab, scroll to **Your apps**.
3. If there is no web app yet, click the **`</>` (Web)** icon, type a nickname such as `ISCGS Register`, leave *Firebase Hosting* **unticked**, and click **Register app**.
4. You will see a block of code that starts with `const firebaseConfig = {`. Keep this page open. You will copy five values from it in step 8: `apiKey`, `authDomain`, `projectId`, `appId` and `messagingSenderId`.

   If you closed it: **Project settings > General > Your apps**, pick the web app and look under **SDK setup and configuration > Config**.

**You should see:** a code block containing your `apiKey`, `authDomain` (ends in `.firebaseapp.com`), `projectId`, `appId`, and so on.

> **Is the `apiKey` a secret password?** No. Firebase web settings are *identifiers* that tell the browser which project to talk to; every visitor's browser downloads them. What protects your data is the **security rules** (step 6) and **sign-in**, not hiding these values. We still keep them out of the code so they are easy to change.

## Step 3: Enable the sign-in methods

1. In the left menu click **Build > Authentication**.
2. If you see a **Get started** button, click it.
3. Open the **Sign-in method** tab.
4. Click **Email/Password**, switch **Enable** on (leave *Email link* off), and click **Save**.
5. *(Optional)* To allow "Continue with Google": click **Add new provider > Google**, switch **Enable** on, choose a **Project support email**, and click **Save**. Then later, in GitHub, you will add the variable `ENABLE_GOOGLE_SIGNIN` (step 8).

**You should see:** *Email/Password* (and Google, if you added it) listed with the status **Enabled**.

## Step 4: Add your website address to "Authorized domains"

An **authorized domain** is a website address that Firebase allows to use sign-in. Any other address is refused, which stops copycat sites.

1. Still in **Authentication**, open the **Settings** tab, then **Authorized domains**.
2. Click **Add domain**.
3. Type your GitHub Pages address **without** `https://` and without anything after `.io`. For a GitHub user named `babatundeawo`, that is `babatundeawo.github.io`. Click **Add**.
4. If you will use your own domain later (for example `register.yourschool.org`), add that too.

**You should see:** the list now includes `localhost`, your `.firebaseapp.com` address and your `.github.io` address.

## Step 5: Create the database (Firestore)

1. In the left menu click **Build > Firestore Database**, then **Create database**.
2. If asked for an *edition*, choose **Standard**.
3. **Location:** choose the closest to Nigeria that is offered (for example **africa-south1 (Johannesburg)** or **europe-west1 (Belgium)**). *You cannot change this later.*
4. Choose **Start in production mode** (this starts locked). Click **Create**.

**You should see:** an empty **Data** tab with the message that there are no collections yet.

## Step 6: Publish the security rules

The rules are the lock on the filing cabinet. They are already written for you in this repository.

1. On GitHub, open the file **`firebase/firestore.rules`** and click the **Copy raw file** button (two squares icon, top right of the file).
2. In Firebase, go to **Firestore Database > Rules** tab.
3. Select everything in the editor (**Ctrl+A** on Windows, **Cmd+A** on Mac), delete it, and paste (**Ctrl+V** / **Cmd+V**).
4. Click **Publish**.

**You should see:** a green "Rules published" message and the new text with the date and time above the editor. The rules say, in short: nobody can read anything unless they are signed in, have a verified email, *and* an administrator has approved them. Only administrators may write. Bank account details can only be read by administrators.

> Optional check: in the **Rules** tab, click **Rules Playground**, choose **get**, enter the path `/data/students_p0`, leave **Authenticated** off and click **Run**. It should say **Simulated read denied**.

## Step 7 (recommended): Switch on App Check

**App Check** is a bouncer that makes sure requests come from your real website and not from someone's script. It is free and protects you from abuse that could use up your free quota.

1. Go to **google.com/recaptcha/admin** and click **+** to create a site. Choose **reCAPTCHA v3**, add your domains (`babatundeawo.github.io`, and any custom domain), and **Submit**. Copy the **Site key** and the **Secret key**.
2. In Firebase: **Build > App Check > Apps**, click your web app, choose **reCAPTCHA**, paste the **Secret key**, and **Save**.
3. Add the **Site key** to GitHub as the secret `FIREBASE_APPCHECK_SITE_KEY` in step 8.
4. After the site has been redeployed and you have signed in successfully, go to **App Check > APIs**, click **Cloud Firestore** and **Authentication** and choose **Enforce**. *(Enforce only after you have confirmed sign-in still works. If it breaks, click **Unenforce**.)*

## Step 8: Add the settings to GitHub

1. On GitHub, open your repository, then **Settings > Secrets and variables > Actions**.
2. On the **Secrets** tab click **New repository secret** and add each of these. The **Name** must match exactly. The **Secret** is the value from the `firebaseConfig` block of step 2, **without** the quotation marks or comma:

   | Name | Value from Firebase |
   | --- | --- |
   | `FIREBASE_API_KEY` | `apiKey` |
   | `FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `FIREBASE_PROJECT_ID` | `projectId` |
   | `FIREBASE_APP_ID` | `appId` |
   | `FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `FIREBASE_APPCHECK_SITE_KEY` | *(only if you did step 7)* |

3. *(Only if you enabled Google sign-in)* Open the **Variables** tab, click **New repository variable**, name `ENABLE_GOOGLE_SIGNIN`, value `true`.
4. Make sure **Settings > Pages > Source** is set to **GitHub Actions**.

**You should see:** the secrets listed by name (GitHub never shows their values again; that is normal).

## Step 9: Deploy the site

1. Open the **Actions** tab, click **Deploy** in the left list, then **Run workflow > Run workflow**.
2. Wait about two minutes and refresh. A **green tick** means it is live.
3. Click the finished run; under **deploy** you will see the link to your site.

**You should see:** your site's address opens a sign-in page with the green "The school's records, kept safe." panel. If you see "This site hasn't been connected to Firebase yet", a secret is missing or misspelt; recheck step 8 and run the workflow again.

## Step 10: Create your own account

1. On your site click **Create account**, enter your name, email and a password of 8 or more characters.
2. Open the email titled something like "Verify your email for ISCGS" (check spam), click the link, then go back to the site and click **I've verified my email**.
3. You will see **Waiting for approval**. That is expected: nobody has been approved yet, including you.

## Step 11: Make yourself the first administrator

Normally an administrator approves new people. For the very first one you do it by hand in Firebase.

1. In Firebase go to **Build > Authentication > Users** and find your email. Copy the value in the **User UID** column (a long mix of letters and numbers).
2. Go to **Build > Firestore Database > Data**, click **Start collection**, and type `members` as the **Collection ID**. Click **Next**.
3. For **Document ID**, paste your **User UID**. Add these three fields (all type **string**):

   | Field | Value |
   | --- | --- |
   | `role` | `admin` |
   | `email` | your email address |
   | `displayName` | your name |

4. Click **Save**.
5. Back on your site, click **Check again** (or reload).

**You should see:** the register opens, with an "Administration" section in the sidebar containing **Import Data** and **Access**.

## Step 12: Load the school's records

1. On your computer, find the original `data.js` file (it was in the project's `js` folder). *Do not upload it to GitHub.*
2. On the site, open **Import Data**, click the file chooser under **1. Load the school data file**, select `data.js`, click **Load into database**, and confirm.
3. Wait for each line to turn green.

**You should see:** every step listed as saved. Open **Overview**; the totals and charts now show your real records.

## Step 13: Approve other people

When someone creates an account and verifies their email, their request appears under **Access**. Click **Approve as viewer** (can read everything except bank details), **Approve as admin** (can also import data and approve people) or **Decline**.

---

## How to test that login works

1. Open the site in a private/incognito window. You should be sent to the sign-in page and **cannot** see any record.
2. Create a second test account with another email. After verifying, you should see **Waiting for approval**, and still no records.
3. Approve it as **viewer** from **Access**. The test account should now see records but **not** see *Import Data*, and the *Retirement & Handover* page should say account details are restricted.
4. Sign out. Sign-in with a wrong password should say "That email and password don't match".
5. Remove the test account from **Access** (**Remove access**), and delete it in Firebase **Authentication > Users** (three dots menu > **Delete account**).

## Common errors and fixes

| What you see | What it means | Fix |
| --- | --- | --- |
| `auth/unauthorized-domain` / "address isn't approved" | Your site address isn't in the authorized list | Step 4. Add `yourname.github.io` exactly, with no `https://`. |
| "settings are wrong or missing" / `auth/invalid-api-key` | A secret is wrong, missing or has stray quotes or spaces | Re-enter the secrets in step 8 (no quotes), then run **Deploy** again. |
| "Sign-in isn't set up yet" gate | No Firebase settings were built into the site | Step 8, then step 9. |
| `permission-denied` / "Permission denied" | The rules block you: not approved, not verified, or rules not published | Check you verified your email; check your `members` document exists with your exact UID (step 11); republish rules (step 6). |
| "Waiting for approval" forever | No `members` document for you | Step 11 (first admin) or ask an administrator to approve you. |
| "The Google window was blocked" / popup blocked | Your browser blocked the Google pop-up | Click the pop-up-blocked icon in the address bar and **Always allow** for the site. |
| "Verify your email" even after clicking the link | The page hasn't noticed yet | Click **I've verified my email**. If it persists, sign out and back in. |
| `auth/operation-not-allowed` | That sign-in method isn't enabled | Step 3. |
| `auth/too-many-requests` | Too many wrong attempts | Wait a few minutes or reset the password. |
| Verification email never arrives | Spam folder, or typo in the email address | Check spam; click **Send the link again**; in Firebase **Authentication > Templates** you can see and customise the email. |
| Import says "Permission denied" | Your account is not an administrator | Step 11: your `members` document must have `role` = `admin`. |
| Pages are blank after App Check enforcement | The site key/secret don't match | In **App Check > APIs**, click **Unenforce**, then recheck step 7. |

## Free usage limits

On Firebase's free plan Firestore allows about **50,000 reads per day**. Each page view reads only a handful of documents (the school data is stored in a few large chunks), so a school office will stay well inside the limit. You can watch usage at **Firestore Database > Usage**. If you ever add the billing plan, set a budget alert in the Google Cloud console.

## Glossary

- **API key:** a public label that tells the browser which Firebase project to talk to. Not a password.
- **Authorized domain:** a website address Firebase allows to use sign-in.
- **Security rules:** the rulebook, stored in Firebase, that decides who can read or change each piece of data. It is what truly protects the records.
- **Secret (GitHub):** a stored value that GitHub keeps hidden and gives to the build process. Used here to inject the Firebase settings without placing them in the code.
- **Custom claim:** a hidden label attached to a user's sign-in token, often used to mark administrators. This project does *not* use them, because setting them needs a server or terminal. Instead, an administrator's role is a document in the `members` collection that only administrators can edit.
- **UID:** the unique ID Firebase gives each user.
- **App Check:** a Firebase feature that blocks requests that did not come from your real website.

## What NOT to share or commit

- Never put **passwords**, **service account** files (JSON files containing `private_key`), or the real **`data.js`** or Excel workbooks into GitHub, an email or a chat message.
- Never paste screenshots of the register into public places: they contain student and staff information.
- The `firebaseConfig` values (step 2) are public identifiers and are fine in GitHub *secrets*, but you never need to type them into any file.
- If a private file does get committed by mistake, tell the person who maintains the repository immediately. Deleting it later does not remove it from history.
