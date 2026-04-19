-- AlterTable
ALTER TABLE "products" ADD COLUMN "barcode" TEXT;

-- CreateIndex
CREATE INDEX "products_shop_id_barcode_idx" ON "products"("shop_id", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "products_shop_id_barcode_key" ON "products"("shop_id", "barcode");
