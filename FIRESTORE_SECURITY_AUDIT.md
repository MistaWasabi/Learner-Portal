# Firestore Role Access Audit

## Scope

This audit covers the Custom Claim change restricting `learnerProgress/{userId}` reads to `admin` and `teacher` roles. The Firestore database is the existing Standard edition `(default)` database for `learner-portal-b7224`.

## Authority source

The `role` value is read only from `request.auth.token.role`. The React app does not write roles to Firestore. The role-assignment Cloud Function and the local role script use the Firebase Admin SDK, which bypasses client rules and runs outside the learner browser.

## Adversarial checks

- **Unauthenticated query:** denied by `isProgressStaff()` because no authentication token exists.
- **Student query:** denied because `student` does not match `admin` or `teacher`.
- **Forged Firestore role field:** cannot grant access because the rule never reads Firestore role data.
- **Student direct URL:** React redirects to Home, and a modified client still cannot read Firestore because the rule denies the query.
- **Teacher/admin query:** allowed only for the existing non-sensitive progress summaries; private user documents, tasks, documents, course selections, and lesson completions remain owner-only.
- **Role escalation:** denied to browser users because role changes happen only through the Firebase Admin SDK. The callable role-change Function separately requires the caller's token role to be `admin`.
- **Create/update bypass:** learner progress writes retain their existing owner checks and full schema validator.

## Result

The previous authenticated-user-wide learner-progress read was over-permissive for the requested role model. The revised prototype rule applies least privilege while preserving owner-only access to private records.
