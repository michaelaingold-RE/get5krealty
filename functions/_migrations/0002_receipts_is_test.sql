-- © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
-- Owner test mode: mark receipts from the owner's own phone (OWNER_TEST_PHONES) so they are not counted as leads.
-- Additive and safe for code that names its columns (receipt.js, export.csv, owner page, summary all do).
-- Apply once per database, BEFORE deploying code that reads is_test:
--   D1 query API (or wrangler d1 execute <db> --remote --file functions/_migrations/0002_receipts_is_test.sql)
--   on shingle-receipts-preview and shingle-receipts. Running it twice fails with "duplicate column name: is_test" (harmless).
-- is_test: 1 = owner test, 0 = real seller
ALTER TABLE receipts ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0;
