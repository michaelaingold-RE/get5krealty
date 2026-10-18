-- © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
-- Shingle disclaimer receipts (D1 binding RECEIPTS_DB). One row per acceptance.
-- Apply: wrangler d1 execute shingle-receipts-preview --remote --file functions/_migrations/0001_receipts.sql (and shingle-receipts for production)
CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  accepted_at_utc TEXT NOT NULL,       -- ISO 8601 from the device, when the seller tapped Accept
  owner_names TEXT NOT NULL,           -- JSON array of the names typed by each owner
  property_address TEXT NOT NULL,
  city_zip TEXT NOT NULL,
  state TEXT NOT NULL,                 -- NC or SC
  phone TEXT NOT NULL,                 -- E.164, +1XXXXXXXXXX
  email TEXT NOT NULL,
  disclaimer_version TEXT NOT NULL,
  disclaimer_effective TEXT NOT NULL,
  phone_verified_at TEXT,              -- when the server confirmed the phone code; NULL means not checked
  created_at TEXT NOT NULL,            -- ISO 8601, server time of insert
  UNIQUE (phone, disclaimer_version, accepted_at_utc)
);
CREATE INDEX IF NOT EXISTS receipts_created_at ON receipts (created_at);
