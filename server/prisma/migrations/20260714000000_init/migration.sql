-- CreateTable
CREATE TABLE "Day" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "parsedDate" TIMESTAMP(3),
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "hasGap" BOOLEAN NOT NULL DEFAULT false,
    "tasklistMissing" BOOLEAN NOT NULL DEFAULT false,
    "reportMissing" BOOLEAN NOT NULL DEFAULT false,
    "dayStart" TEXT,
    "dayEnd" TEXT,
    "plannedCompleted" INTEGER,
    "plannedTotal" INTEGER,
    "slippedCount" INTEGER,
    "unplannedPercent" TEXT,
    "unplannedMinutes" INTEGER,
    "carryForwardCount" INTEGER,
    "incidentCount" INTEGER,
    "tasklistData" JSONB,
    "reportData" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Day_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Day_date_key" ON "Day"("date");

