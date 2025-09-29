-- AlterTable
ALTER TABLE "Family" ADD COLUMN "googleCalendarId" TEXT;
ALTER TABLE "Family" ADD COLUMN "googleSyncToken" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviterId" TEXT NOT NULL,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL DEFAULT (DATETIME('now', '+14 days'))
);
INSERT INTO "new_Invitation" ("createdAt", "email", "expiresAt", "id", "inviterId", "status", "token") SELECT "createdAt", "email", "expiresAt", "id", "inviterId", "status", "token" FROM "Invitation";
DROP TABLE "Invitation";
ALTER TABLE "new_Invitation" RENAME TO "Invitation";
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE TABLE "new_SpecialDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "person" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "calendarId" TEXT,
    CONSTRAINT "SpecialDay_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SpecialDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SpecialDay" ("createdAt", "date", "familyId", "id", "notes", "person", "title", "type", "updatedAt", "userId") SELECT "createdAt", "date", "familyId", "id", "notes", "person", "title", "type", "updatedAt", "userId" FROM "SpecialDay";
DROP TABLE "SpecialDay";
ALTER TABLE "new_SpecialDay" RENAME TO "SpecialDay";
CREATE INDEX "SpecialDay_familyId_idx" ON "SpecialDay"("familyId");
CREATE INDEX "SpecialDay_userId_idx" ON "SpecialDay"("userId");
CREATE UNIQUE INDEX "SpecialDay_familyId_externalId_calendarId_key" ON "SpecialDay"("familyId", "externalId", "calendarId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
