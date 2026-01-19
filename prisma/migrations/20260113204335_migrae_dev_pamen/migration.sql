-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "account_number" TEXT,
ADD COLUMN     "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "outstanding_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "payment_status" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN     "payment_type" TEXT NOT NULL DEFAULT 'full';
