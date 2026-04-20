-- Shop branch hierarchy
ALTER TABLE "shops"
  ADD COLUMN "parent_shop_id" TEXT,
  ADD COLUMN "branch_label" TEXT;

CREATE INDEX "shops_parent_shop_id_idx" ON "shops"("parent_shop_id");

ALTER TABLE "shops"
  ADD CONSTRAINT "shops_parent_shop_id_fkey"
  FOREIGN KEY ("parent_shop_id") REFERENCES "shops"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Product lineage: clones point back to HQ product
ALTER TABLE "products"
  ADD COLUMN "origin_product_id" TEXT;

CREATE INDEX "products_origin_product_id_idx" ON "products"("origin_product_id");

ALTER TABLE "products"
  ADD CONSTRAINT "products_origin_product_id_fkey"
  FOREIGN KEY ("origin_product_id") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Stock transfers between shops
CREATE TABLE "stock_transfers" (
  "id" TEXT NOT NULL,
  "from_shop_id" TEXT NOT NULL,
  "to_shop_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_transfers_from_shop_id_idx" ON "stock_transfers"("from_shop_id");
CREATE INDEX "stock_transfers_to_shop_id_idx" ON "stock_transfers"("to_shop_id");
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");

ALTER TABLE "stock_transfers"
  ADD CONSTRAINT "stock_transfers_from_shop_id_fkey"
  FOREIGN KEY ("from_shop_id") REFERENCES "shops"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_transfers"
  ADD CONSTRAINT "stock_transfers_to_shop_id_fkey"
  FOREIGN KEY ("to_shop_id") REFERENCES "shops"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "stock_transfer_items" (
  "id" TEXT NOT NULL,
  "transfer_id" TEXT NOT NULL,
  "from_product_id" TEXT NOT NULL,
  "to_product_id" TEXT,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_transfer_items_transfer_id_idx" ON "stock_transfer_items"("transfer_id");

ALTER TABLE "stock_transfer_items"
  ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey"
  FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
