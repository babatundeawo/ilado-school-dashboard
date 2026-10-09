# Moving to a clean repository (do this first)

**Why this matters.** The original project kept the real student, staff and account records in a file (`js/data.js`) and in Git history (which also holds a former passcode file). Git remembers every old version of every file. If that repository is public, or ever was, anyone could read those records, even after the file is deleted. This guide moves the new, safe version into a **fresh repository that has never contained the data**.

Nothing here needs a terminal. Allow about 30 minutes.

## 1. Lock the old repository right now

1. Open the old repository on GitHub, then **Settings**.
2. Scroll to **Danger Zone**, click **Change repository visibility**, choose **Make private**, and confirm.
3. Still in **Settings**, open **Pages**. If a site is published, set **Source** to **None** or unpublish it, so the old files are not served.
4. In **Settings > Collaborators**, check that only people who should see the school's records are listed.

If the repository was ever public, treat the records in it as having been exposed. Nigeria's data protection law (the Nigeria Data Protection Act, 2023) can attach duties when personal data is exposed, so consider asking a qualified adviser what applies to a school.

## 2. Keep your own copy of the data

Keep the original `data.js` and your Excel workbooks on your computer (they are already in your downloaded project zip). They will be loaded into Firebase later (see [step 12 of the Firebase guide](FIREBASE_LOGIN_SETUP.md#step-12-load-the-schools-records)).

## 3. Park the old repository under a new name

1. In the old repository: **Settings > General > Repository name**.
2. Rename it to `ilado-school-dashboard-old-private` and click **Rename**.

## 4. Create the new, empty repository

1. Click **+ (top right) > New repository**.
2. Name it `ilado-school-dashboard`. Choose **Public** (GitHub Pages is free for public repositories; the repository holds no school data). Tick **Add a README file**, then **Create repository**.

> The new site's address will be `https://<your-username>.github.io/ilado-school-dashboard/`.

## 5. Upload the new project as a pull request

1. Unzip the delivered project on your computer.
2. In the new repository click **Add file > Upload files**.
3. Drag the **contents** of the unzipped folder into the page (not the folder itself). Make sure the hidden `.github` folder is included: on Windows hidden folders are shown by default; on a Mac press **Cmd + Shift + .** in the Finder to reveal them.
4. Wait for every file to finish uploading. At the bottom, choose **Create a new branch for this commit**, name it `rebrand/premium-redesign`, and click **Propose changes**, then **Create pull request**.
5. Wait for the **Checks** workflow to finish. It should show a green tick. The live site is untouched until you merge.
6. Click **Merge pull request**. This is the moment the site is built and published, so do it only after the Firebase settings are in GitHub (Firebase guide, steps 1 to 8).

## 6. Switch on the protections

Follow "One-time setup" in [DEPLOYMENT.md](DEPLOYMENT.md): **Pages > Source > GitHub Actions**, secret scanning and push protection, Dependabot alerts and private vulnerability reporting.

## 7. Retire the old repository

After you have signed in to the new site and loaded your records, **delete** the old repository (**Settings > Danger Zone > Delete this repository**) unless you need it as a private archive. Forks and local copies are not removed by this, so ask anyone who downloaded the old project to delete it.
