-- CreateTable
CREATE TABLE "offline_sale_syncs" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "client_temp_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offline_sale_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offline_sale_syncs_sale_id_key" ON "offline_sale_syncs"("sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "offline_sale_syncs_shop_id_client_temp_id_key" ON "offline_sale_syncs"("shop_id", "client_temp_id");

-- AddForeignKey
ALTER TABLE "offline_sale_syncs" ADD CONSTRAINT "offline_sale_syncs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_sale_syncs" ADD CONSTRAINT "offline_sale_syncs_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
