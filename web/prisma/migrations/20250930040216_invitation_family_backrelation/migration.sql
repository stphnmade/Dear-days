/*
  Warnings:

  - Added the required column `familyId` to the `Invitation` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviterId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL DEFAULT (DATETIME('now', '+14 days')),
    CONSTRAINT "Invitation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invitation" ("createdAt", "email", "expiresAt", "id", "inviterId", "status", "token") SELECT "createdAt", "email", "expiresAt", "id", "inviterId", "status", "token" FROM "Invitation";
DROP TABLE "Invitation";
ALTER TABLE "new_Invitation" RENAME TO "Invitation";
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
