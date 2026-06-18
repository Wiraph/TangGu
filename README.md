# TangGu

Serverless personal finance tracker built with React, Vite, TypeScript, Tailwind CSS, Recharts, TanStack Query, PWA support, Google Apps Script, and Google Sheets.

## Frontend

```bash
npm install
npm run dev
```

Set `VITE_GAS_WEB_APP_URL` from `.env.example` after deploying `apps-script/Code.gs` as a Google Apps Script Web App. Add the same private value to `VITE_TANGGU_ACCESS_TOKEN` and to the Apps Script property `TANGGU_ACCESS_TOKEN`. Without the env var, the app uses localStorage demo data.

## Backend

1. Use the TangGu Google Sheet: `1OFmXrxDUZpGLFxSIfKMkxwuWmRgUlDxCS5QGpGoiXKw`.
2. Open Extensions > Apps Script.
3. Paste `apps-script/Code.gs`.
4. In Project Settings > Script properties, add `TANGGU_ACCESS_TOKEN` with a long private token.
5. Deploy as Web App. For single-user use, set **Execute as: Me** and **Who has access: Only myself** if the frontend is served inside the same signed-in Google browser session. If cross-origin browser fetches cannot reach that deployment, set access to **Anyone with the link** and rely on `TANGGU_ACCESS_TOKEN` as the app-level gate.
6. Use the deployment `/exec` URL as `VITE_GAS_WEB_APP_URL`.
