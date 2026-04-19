ALTER TABLE "shops"
  ADD COLUMN "loyalty_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "loyalty_points_per_naira" DECIMAL(10,4) NOT NULL DEFAULT 0.01,
  ADD COLUMN "loyalty_naira_per_point" DECIMAL(10,4) NOT NULL DEFAULT 1,
  ADD COLUMN "loyalty_silver_threshold" INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN "loyalty_gold_threshold" INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN "loyalty_platinum_threshold" INTEGER NOT NULL DEFAULT 10000;
