ALTER TABLE "shops" ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

-- Treat all shops that already exist as onboarded; the wizard is only for new signups.
UPDATE "shops" SET "onboarding_completed" = true;
