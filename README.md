# TangGu

TangGu is a personal finance tracker built as a static React app with Google Sheets as the database. It is designed for single-user use across desktop and mobile, with Daily, Weekly, Monthly, and Yearly dashboards plus transaction CRUD.

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS
- Recharts
- Three.js background scene
- TanStack Query
- PWA support
- Google Apps Script + Google Sheets backend
- GitHub Pages deployment

## Features

- Income, expense, and transfer transactions
- Bank/account selector: MAKE, Dime, MyMo, Krungthai, Cash, TrueMoney
- Daily, Weekly, Monthly, and Yearly analytics
- Custom date and month pickers styled for the app theme
- Inline edit/delete from History
- Google Sheets storage through Apps Script
- PWA install support for mobile home screen

## Important Security Note

This app is a personal tool, not a hardened multi-user finance platform.

The deployed frontend is static JavaScript. Any `VITE_*` environment variable used at build time is bundled into the public site. The included token gate is useful for casual protection, but it is not the same as real user authentication.

Recommended precautions:

- Do not commit `.env`.
- Use a long random `TANGGU_ACCESS_TOKEN`.
- Do not make your Google Sheet public.
- Rotate the token if you think it was exposed.
- For stronger privacy, put the app behind an auth layer such as Cloudflare Access, Firebase Auth, or another login system.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`:

```env
VITE_GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_TANGGU_ACCESS_TOKEN=replace-with-a-long-private-token
```

Start local dev server:

```bash
npm run dev
```

For mobile testing on the same Wi-Fi:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

Without `.env`, the app falls back to localStorage demo data.

## Google Sheets Backend Setup

1. Create a new Google Sheet.
2. Copy the spreadsheet ID from the URL.
   - Example URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Open [apps-script/Code.gs](apps-script/Code.gs).
4. Replace `SPREADSHEET_ID` with your own spreadsheet ID.
5. In the Google Sheet, go to `Extensions > Apps Script`.
6. Paste the full contents of `apps-script/Code.gs`.
7. In Apps Script, go to `Project Settings > Script properties`.
8. Add:

```text
TANGGU_ACCESS_TOKEN = the-same-token-you-use-in-env
```

9. Deploy as a Web App:
   - `Deploy > New deployment`
   - Type: `Web app`
   - Execute as: `Me`
   - Who has access: `Anyone with the link`
10. Copy the Web App URL that ends with `/exec`.
11. Use that URL as `VITE_GAS_WEB_APP_URL`.

The sheet can start empty. The backend will create a `Transactions` sheet and headers automatically.

## Apps Script Updates

Every time you edit `apps-script/Code.gs` in Google Apps Script:

1. Save the script.
2. Go to `Deploy > Manage deployments`.
3. Edit the existing deployment.
4. Select `New version`.
5. Deploy again.

If you skip this, the `/exec` URL may still run old code.

## GitHub Pages Deployment

This repo includes a GitHub Actions workflow:

```text
.github/workflows/deploy-pages.yml
```

To deploy your fork:

1. Push the project to GitHub.
2. Go to `Settings > Secrets and variables > Actions`.
3. Add repository secrets:

```text
VITE_GAS_WEB_APP_URL
VITE_TANGGU_ACCESS_TOKEN
```

4. Go to `Settings > Pages`.
5. Set source to `GitHub Actions`.
6. Go to `Actions`.
7. Run `Deploy TangGu to GitHub Pages`.

The site URL will be:

```text
https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/
```

This project is configured for the repository name `TangGu`. If you rename the repo, update the `base` value in [vite.config.ts](vite.config.ts).

## Useful Commands

```bash
npm run lint
npm run build
npm run preview
```

## Data Schema

The `Transactions` sheet uses these columns:

```text
id, date, type, amount, account, to_account, category, note
```

Transaction types:

```text
income, expense, transfer
```

Accounts:

```text
MAKE, Dime, MyMo, Krungthai, Cash, TrueMoney
```

## License

This project is provided as a personal-use template. Add your preferred license before sharing or reusing it broadly.
