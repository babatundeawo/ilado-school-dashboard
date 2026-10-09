# Deployment guide

This guide is for the person who looks after the site. You do not need to install anything or type any commands. Everything happens on the GitHub and Firebase websites.

## How it works, in plain words

1. The website's files live in this GitHub repository.
2. Whenever a change is **merged into the `main` branch**, GitHub automatically builds the site and publishes it. This is the **Deploy** workflow.
3. The school's records are **not** in these files. They live in your Firebase database and appear only after someone signs in and is approved.

Your live address is `https://<your-github-username>.github.io/ilado-school-dashboard/`.

## One-time setup

1. Open the repository on GitHub, then **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Add the Firebase settings as secrets. Follow [FIREBASE_LOGIN_SETUP.md](FIREBASE_LOGIN_SETUP.md), step 8.
4. Turn on the free GitHub security features, in **Settings > Code security** (also called "Code security and analysis"):
   - **Dependabot alerts** and **Dependabot security updates**: **Enable**.
   - **Secret scanning** and **Push protection**: **Enable**. Push protection stops anyone accidentally saving a password or key.
   - **Private vulnerability reporting**: **Enable**.

## Making a change safely

Every change goes through a **pull request**, which is a proposal that can be checked before it goes live.

1. On GitHub, open the file you want to change and click the **pencil icon**.
2. Make the edit. At the bottom choose **Create a new branch for this commit and start a pull request**, then **Propose changes** and **Create pull request**.
3. Wait about two minutes. Near the bottom of the pull request, the **Checks** workflow shows a yellow dot (running), a green tick (passed) or a red cross (failed).
4. **Optional preview:** open the finished **Checks** run (click **Details**), scroll to **Artifacts** and download **site-build**. It is the complete built site as a zip.
5. When the tick is green, click **Merge pull request** then **Confirm merge**. The live site updates a minute or two later.

If you change your mind, click **Close pull request**. Nothing happens to the live site.

> GitHub Pages cannot host a separate preview website for each pull request, which is why the downloadable build is offered instead. The live site never changes until you merge.

## Updating the school's records

Records are not edited in GitHub. Sign in as an administrator and open **Import Data**:

- Drop an updated Excel workbook (student registry, marking sheet, E-results or staff roll). Re-importing the same file name replaces its earlier rows.
- The Overview totals refresh automatically.

## Checking that a deployment worked

1. Open the repository's **Actions** tab.
2. Click the latest **Deploy** run.
3. A **green tick** means the site is live. A **red cross** means it was not published and the previous version is still running.

### Reading an error

Click the red run, then the red step. The line starting `ERROR:` is the reason in plain English. Common ones:

| Message | What to do |
| --- | --- |
| `Missing Firebase settings: ...` | A secret is missing. Add it under **Settings > Secrets and variables > Actions** (see the Firebase guide, step 8). |
| `broken reference to ...` | A page or image link points at a file that doesn't exist. The file name in the message tells you which. |
| `Forbidden file in the build` | A private file such as `data.js` was added to the repository. Remove it from the repository. |
| `Get Pages site failed` or `404` on the Pages step | **Settings > Pages > Source** is not set to **GitHub Actions**. |

## Going back to an earlier version

If a change causes trouble:

1. Open **Pull requests**, then **Closed**, and click the pull request that caused it.
2. Click **Revert** near the top. GitHub prepares a new pull request that undoes it.
3. Merge that pull request. The earlier look returns in a couple of minutes. Nothing is lost, because every version stays in the history.

## Using your own web address (optional)

1. Buy a domain from any registrar.
2. In **Settings > Pages > Custom domain**, type your domain (for example `register.yourschool.org`) and **Save**.
3. At your registrar's DNS settings, add a **CNAME** record: name `register`, value `<your-github-username>.github.io`. (For a bare domain such as `yourschool.org`, GitHub lists four **A** record addresses on its [custom domain help page](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site).)
4. Wait up to an hour, then tick **Enforce HTTPS**.
5. Add the new domain in Firebase under **Authentication > Settings > Authorized domains**, otherwise sign-in will fail with `auth/unauthorized-domain`.
