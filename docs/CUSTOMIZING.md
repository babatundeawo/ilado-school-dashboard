# Customizing

Every change below can be made on the GitHub website: open the file, click the **pencil icon**, edit, and follow [the safe-change steps](DEPLOYMENT.md#making-a-change-safely).

| I want to change... | Open this file | What to edit |
| --- | --- | --- |
| Colours (brand green, accent brass, backgrounds) | `src/assets/css/tokens.css` | The hex values at the top. `--brand` is the main colour; the `[data-theme="dark"]` block holds the dark theme. |
| School name, location, session label | `site.config.json` | `school`, `location`, `session`, `name` |
| Page titles, headings and descriptions | `site.config.json` | Each page's `title`, `heading`, `lede`, `description` |
| Navigation order or labels | `site.config.json` | The `pages` list and its `nav` and `group` values |
| Fonts | `src/layout.html` and `src/auth-layout.html` (the Google Fonts link), then `src/assets/css/tokens.css` (`--font-display`, `--font-sans`) | Change the family names in both places |
| The "IS" logo mark | `src/assets/img/favicon.svg`, plus the `brand-mark` letters in `src/layout.html` | Change the letters or colours. To replace the PNG icons, upload new files with the same names (`favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `og-image.png`) via **Add file > Upload files** in `src/assets/img`. |
| Sign-in text and the welcome panel | `src/pages/login.html` | The text inside the tags |
| The 404 message | `src/pages/404.html` | The text inside the tags |
| Idle sign-out time (default 30 minutes) | Repository variable | **Settings > Secrets and variables > Actions > Variables > New repository variable**: name `IDLE_TIMEOUT_MINUTES`, value e.g. `20` |
| Google sign-in on/off | Repository variable | Name `ENABLE_GOOGLE_SIGNIN`, value `true` (see the Firebase guide) |

## Changing the school's records

Names, staff details, the school profile, inventory and other records are **not** in the repository. Sign in as an administrator, open **Import Data**, and load new workbooks, or use the Firebase console (**Build > Firestore Database**) for small corrections.

## Colour rules of thumb

- Keep text and background pairs at a contrast ratio of at least 4.5 to 1. The current palette meets this in light and dark themes.
- Change only `tokens.css` for a re-colour. Other files read from it.

## Images

Photos or logos added to pages should be saved under `src/assets/img/`, be under 200 KB, and have meaningful alt text when used in a page.
