'use strict';

/**
 * Initialises the database schema without Prisma's schema engine (migrate deploy).
 * Uses raw pg to run CREATE TABLE IF NOT EXISTS, so it's safe to run on every startup.
 */

const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS "Day" (
      "id"                SERIAL        NOT NULL,
      "date"              TEXT          NOT NULL,
      "parsedDate"        TIMESTAMP(3),
      "isComplete"        BOOLEAN       NOT NULL DEFAULT false,
      "hasGap"            BOOLEAN       NOT NULL DEFAULT false,
      "tasklistMissing"   BOOLEAN       NOT NULL DEFAULT false,
      "reportMissing"     BOOLEAN       NOT NULL DEFAULT false,
      "dayStart"          TEXT,
      "dayEnd"            TEXT,
      "plannedCompleted"  INTEGER,
      "plannedTotal"      INTEGER,
      "slippedCount"      INTEGER,
      "unplannedPercent"  TEXT,
      "unplannedMinutes"  INTEGER,
      "carryForwardCount" INTEGER,
      "incidentCount"     INTEGER,
      "tasklistData"      JSONB,
      "reportData"        JSONB,
      "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT now(),
      CONSTRAINT "Day_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Day_date_key" ON "Day"("date");
  `);

  await client.end();
  console.log('Database schema ready');
}

module.exports = main;
