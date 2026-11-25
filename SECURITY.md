# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.4.x   | ✅        |
| < 1.4   | ❌        |

Only the latest release of this independent fork receives security fixes.

## Reporting a vulnerability (private disclosure)

Please **do not** file a public GitHub issue for a security vulnerability, and do not include
exploit details in pull requests or commit messages.

Use GitHub's **private vulnerability reporting**:

1. Go to <https://github.com/soroushse7o/persian-calorie-tracker-improved/security/advisories/new>.
2. Click **Report a vulnerability** and fill in the private form.
3. Include: affected version/commit, impact, reproduction steps, and any suggested fix.

If private reporting is unavailable for this repository, contact the maintainer privately
through GitHub (<https://github.com/soroushse7o>) rather than opening a public issue.

You should receive an acknowledgement within 7 days and an update on remediation within
30 days. Please allow the fix to ship before disclosing publicly.

## Scope notes

- This is a fully client-side PWA with **no backend and no user accounts**: all nutrition data
  stays in the browser (`IndexedDB` + `localStorage`). Reports about server-side data exposure
  are generally out of scope unless they concern the deployed static hosting configuration.
- The health disclaimer in the README is not a security issue: the app provides approximate
  estimates and is not a medical device.
- Please report missing or over-permissive security headers (`CSP`, `HSTS`, `Permissions-Policy`)
  in `vercel.json`, `Caddyfile` or `public/_headers` privately, since header details can help an
  attacker.
- `public/.well-known/assetlinks.json` is intentionally an empty array. The previous placeholder
  contained an all-zero SHA-256 fingerprint and a package name that did not match the Capacitor
  `appId`. Do not re-add unverified fingerprints.
