/*
  Warnings:

  - You are about to drop the column `role` on the `FamilyMember` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `FamilyMember` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `SpecialDay` table. All the data in the column will be lost.
  - You are about to drop the column `sourceId` on the `SpecialDay` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Family` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `FamilyMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `FamilyMember` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviterId" TEXT NOT NULL,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL DEFAULT (DATETIME('now', '+14 days'))
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Family" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Family" ("createdAt", "id", "name", "slug") SELECT "createdAt", "id", "name", "slug" FROM "Family";
DROP TABLE "Family";
ALTER TABLE "new_Family" RENAME TO "Family";
CREATE UNIQUE INDEX "Family_slug_key" ON "Family"("slug");
CREATE TABLE "new_FamilyMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "joinedUserId" TEXT,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "relation" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FamilyMember_joinedUserId_fkey" FOREIGN KEY ("joinedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FamilyMember" ("familyId", "id") SELECT "familyId", "id" FROM "FamilyMember";
DROP TABLE "FamilyMember";
ALTER TABLE "new_FamilyMember" RENAME TO "FamilyMember";
CREATE INDEX "FamilyMember_familyId_idx" ON "FamilyMember"("familyId");
CREATE UNIQUE INDEX "FamilyMember_familyId_joinedUserId_key" ON "FamilyMember"("familyId", "joinedUserId");
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
    CONSTRAINT "SpecialDay_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SpecialDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SpecialDay" ("createdAt", "date", "familyId", "id", "title", "type", "updatedAt", "userId") SELECT "createdAt", "date", "familyId", "id", "title", "type", "updatedAt", "userId" FROM "SpecialDay";
DROP TABLE "SpecialDay";
ALTER TABLE "new_SpecialDay" RENAME TO "SpecialDay";
CREATE INDEX "SpecialDay_familyId_idx" ON "SpecialDay"("familyId");
CREATE INDEX "SpecialDay_userId_idx" ON "SpecialDay"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
