# AERO COMMAND — Supabase-connected dashboard

Arabic RTL executive dashboard based on the supplied `EGYPTAIR_Dashboard.html`.

## Current scope

- Retains the original dashboard UI and navigation.
- Adds Supabase email/password authentication.
- Checks the signed-in user's `profiles.is_active` flag and role.
- Loads executive decisions from `public.decisions`.
- Persists newly-created decisions and workflow status changes to Supabase.
- Keeps the original sample operational metrics visibly illustrative; they are not actual company records.

## 1. Configure Supabase

1. Open the Supabase project dashboard.
2. Copy the Project URL and the **Publishable key** (or legacy anon key).
3. Edit `config.js` and replace the two placeholder values.
4. Never use the `service_role` key in browser code.
5. Run `supabase/migrations/20261110_decision_workflow_fields.sql` in the Supabase SQL Editor. The initial database schema has already been deployed separately.

## 2. Create the first user

1. In Supabase Dashboard → Authentication → Users, invite the intended administrator.
2. The database trigger creates a `profiles` row with the default `viewer` role.
3. In the SQL Editor, promote only the approved administrator:

```sql
update public.profiles
set role = 'admin', full_name = 'AERO COMMAND Administrator'
where id = '<AUTH_USER_UUID>';
```

Do not share credentials or assign admin to ordinary users. Users should be invited through Supabase Auth.

## 3. Run locally

A local web server is required because the app uses ES modules:

```bash
npm install
npm run dev
```

Open the URL printed by Vite.

## 4. Production build

```bash
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static hosting provider. Configure the correct `config.js` values before deployment.

## Security notes

- Browser code uses only the Supabase publishable/anon key; database RLS is the security boundary.
- No service-role key or private credentials belong in this repository.
- The initial RLS policies restrict decision writes to `admin` and `manager`.
- Review RLS policies and conduct role-based tests before production use.
- Do not enter real employee, customer, safety, or financial information until the data model, access controls, retention, and organizational approvals have been reviewed.

## Known limitations / next work

The dashboard's original department KPIs, workforce figures, work-order totals, risk examples, and finance values are still illustrative seed content. The first integration milestone connects authentication and the decisions workflow; it does not yet make every dashboard section live. Department, employee, risk, work-order, budget, expense, meeting CRUD and automated audit logging should be implemented and tested as subsequent milestones.
