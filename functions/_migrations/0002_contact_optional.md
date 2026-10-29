<!-- © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved. -->
# 0002: phone or email (no schema change)

Date: 2026-10-29 (Shingle gate Option B, revised).

The disclaimer gate now asks for a name and **either** a phone **or** an email (or both).
`/api/receipt` stores the unused contact field as an empty string `''`, so the existing
`phone TEXT NOT NULL` and `email TEXT NOT NULL` columns from `0001_receipts.sql` still hold.
**No ALTER TABLE is needed.**

- Phone path (phone given): phone is `+1XXXXXXXXXX`, OTP receipt token required, `phone_verified_at` set.
  `email` is `''` when the seller left it blank.
- Email-only path (no phone): `phone` is `''`, `email` is the address, no token, `phone_verified_at` is NULL.

Notes for exports and lookups:
- Treat `''` in `phone` or `email` as "not given". `phone_verified_at IS NULL AND phone = ''` means the email-only path.
- `UNIQUE (phone, disclaimer_version, accepted_at_utc)`: email-only rows all share `phone = ''`, so two different
  email-only sellers accepting the same version in the same millisecond would collide (the API returns 409 `conflict`;
  the app shows a retry message and a new tap gets a new timestamp). Accepted as negligible.
- 5K Realty keeps this row as its record copy. It does not contact the seller from it; 5K only reaches out if the seller asks.
