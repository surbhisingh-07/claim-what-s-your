# Claim What’s Yours

A mobile-friendly prototype that helps students in Karnataka explore possible education-support schemes, understand sample eligibility rules, prepare documents, and keep personal application notes.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## Prototype features

- Conversational profile starter with a small on-device text parser and editable profile details
- Explainable rule matching with matched and missing information shown separately
- Scheme details, document checklist, generic application guidance, and in-app reminder labels
- Application tracker and local demo scheme management
- Browser-local profile, checklist, reminder, and tracker state

## Important limitations

- This is a frontend-only prototype. It has no backend, database, account system, real AI integration, or official application submission.
- Scheme records and deadlines are illustrative sample data, not verified government benefits. No official URLs or verification dates are claimed.
- The admin screen is not authenticated or secure. Changes are saved only in the current browser.
- Do not enter Aadhaar, PAN, bank account details, OTPs, passwords, or other sensitive identifiers.
- Check current eligibility, documents, deadlines, and application links with an official government source before acting.

The project is configured as a Render Static Site through `render.yaml`.
