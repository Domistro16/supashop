-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "password" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "cost_price" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "customer_note" TEXT,
ADD COLUMN     "is_online_order" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order_status" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN     "proof_of_payment" TEXT;

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "hero_subtitle" TEXT,
ADD COLUMN     "hero_title" TEXT,
ADD COLUMN     "is_storefront_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "primary_color" TEXT DEFAULT 'blue';

-- CreateTable
CREATE TABLE "installments" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "bank_name" TEXT,
    "account_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
