-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "ocrStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "ocrText" TEXT,
ADD COLUMN     "ocrVersion" TEXT;
