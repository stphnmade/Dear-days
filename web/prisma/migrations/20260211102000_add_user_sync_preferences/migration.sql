-- Add connection/sync preferences to User for the Connections dashboard.
ALTER TABLE "User" ADD COLUMN "syncPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "conflictHandling" TEXT NOT NULL DEFAULT 'highlight';
ALTER TABLE "User" ADD COLUMN "defaultEventDestination" TEXT NOT NULL DEFAULT 'DEAR_DAYS_LOCAL';
ALTER TABLE "User" ADD COLUMN "syncBirthdays" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "syncGroupMeetings" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "syncReminders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "googlePullEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "googlePushEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "googleCalendarScopes" TEXT;
ALTER TABLE "User" ADD COLUMN "lastGlobalRefreshAt" DATETIME;
