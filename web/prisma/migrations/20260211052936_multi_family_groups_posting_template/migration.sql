-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Family" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "googleSyncToken" TEXT,
    "googleCalendarId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "description" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'EST',
    "allowMemberPosting" BOOLEAN NOT NULL DEFAULT true,
    "calendarLabel" TEXT,
    "eventNameTemplate" TEXT DEFAULT '{{title}}',
    CONSTRAINT "Family_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Family" ("createdAt", "description", "googleCalendarId", "googleSyncToken", "id", "name", "ownerId", "slug", "timezone", "updatedAt") SELECT "createdAt", "description", "googleCalendarId", "googleSyncToken", "id", "name", "ownerId", "slug", "timezone", "updatedAt" FROM "Family";
DROP TABLE "Family";
ALTER TABLE "new_Family" RENAME TO "Family";
CREATE UNIQUE INDEX "Family_slug_key" ON "Family"("slug");
CREATE INDEX "Family_ownerId_idx" ON "Family"("ownerId");
CREATE TABLE "new_Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviterId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL DEFAULT (DATETIME('now', '+14 days')),
    CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invitation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invitation" ("createdAt", "email", "expiresAt", "familyId", "id", "inviterId", "status", "token") SELECT "createdAt", "email", "expiresAt", "familyId", "id", "inviterId", "status", "token" FROM "Invitation";
DROP TABLE "Invitation";
ALTER TABLE "new_Invitation" RENAME TO "Invitation";
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FamilyMember_joinedUserId_idx" ON "FamilyMember"("joinedUserId");

-- CreateIndex
CREATE INDEX "SpecialDay_date_idx" ON "SpecialDay"("date");

-- CreateIndex
CREATE INDEX "SpecialDay_familyId_date_idx" ON "SpecialDay"("familyId", "date");

-- CreateIndex
CREATE INDEX "SpecialDay_userId_date_idx" ON "SpecialDay"("userId", "date");
