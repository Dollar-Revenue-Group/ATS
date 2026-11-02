# DRG ATS portal

Static front end for the DRG applicant tracking system. Data lives in Supabase; emails and automations run in n8n.

## Branches
- `staging`: every push deploys to https://staging--drg-ats.netlify.app for testing. It uses the live database and workflows, so test candidates and emails are real; use test email addresses.
- `main`: production at https://drg-ats.netlify.app. Merge `staging` into `main` only after testing passes.

## Workflow
1. Make changes on `staging` (or a feature branch merged into `staging`) and push.
2. Test on the staging URL (yellow "STAGING" label at the bottom).
3. Open a pull request from `staging` to `main`, review, merge. Netlify publishes production.

Database migrations and n8n workflow changes are not part of this repo; they apply to the live system immediately, so make them backward compatible before testing on staging.
Staging site: https://staging--drg-ats.netlify.app
