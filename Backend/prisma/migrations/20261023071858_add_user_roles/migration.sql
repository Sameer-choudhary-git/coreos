/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('APPLICANT', 'KYC_OFFICER', 'COMPLIANCE_OFFICER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'EXTRACTING', 'AUTO_APPROVED', 'IN_REVIEW', 'RESUBMISSION_REQUESTED', 'PENDING_CHECKER', 'APPROVED', 'REJECTED', 'AUTO_REJECTED', 'CLOSED_EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PAN_CARD', 'AADHAAR_CARD', 'ELECTRICITY_BILL', 'BANK_STATEMENT', 'DRIVING_LICENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('APPROVE', 'REVIEW', 'REJECT');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ExtractionSource" AS ENUM ('MOCK', 'AI', 'OFFICER');

-- CreateEnum
CREATE TYPE "OfficerActionType" AS ENUM ('RECOMMENDATION', 'CHECKER_DECISION', 'FIELD_CORRECTION');

-- CreateEnum
CREATE TYPE "OfficerAction" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_RESUBMISSION', 'SEND_BACK');

-- CreateEnum
CREATE TYPE "WatchlistType" AS ENUM ('SANCTIONS', 'PEP');

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'APPLICANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "applicantId" UUID NOT NULL,
    "applicationDate" DATE NOT NULL,
    "fullName" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "gender" TEXT,
    "panNumber" TEXT NOT NULL,
    "aadhaarLast4" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "occupationCode" TEXT NOT NULL,
    "annualIncome" DECIMAL(14,2) NOT NULL,
    "consentToKyc" BOOLEAN NOT NULL DEFAULT false,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "decision" "Decision",
    "reasonCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nameMatchScore" DECIMAL(5,4),
    "riskCategory" "RiskCategory",
    "rekycDueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "documentNo" TEXT NOT NULL,
    "applicationId" UUID NOT NULL,
    "declaredDocType" "DocumentType" NOT NULL,
    "classifiedDocType" "DocumentType",
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "extractionSource" "ExtractionSource",
    "extractionVersion" TEXT,
    "extractionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_fields" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "fieldName" TEXT NOT NULL,
    "value" TEXT,
    "confidence" DECIMAL(4,3) NOT NULL,
    "source" "ExtractionSource" NOT NULL,
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extracted_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_decisions" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "decision" "Decision" NOT NULL,
    "reasonCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nameMatchScore" DECIMAL(5,4),
    "riskCategory" "RiskCategory",
    "rekycDueDate" DATE,
    "rulesVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officer_actions" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "officerId" UUID NOT NULL,
    "actionType" "OfficerActionType" NOT NULL,
    "action" "OfficerAction" NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "officer_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "actorId" UUID,
    "documentId" UUID,
    "eventType" TEXT NOT NULL,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_entries" (
    "id" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "type" "WatchlistType" NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "dob" DATE,
    "nationality" TEXT,
    "program" TEXT,
    "position" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "existing_customers" (
    "id" UUID NOT NULL,
    "customerId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "panNumber" TEXT NOT NULL,
    "dob" DATE NOT NULL,

    CONSTRAINT "existing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupations" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskLevel" "RiskCategory" NOT NULL,

    CONSTRAINT "occupations_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "rule_configurations" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_banking_accounts" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "customerId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_banking_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "applications_applicationNo_key" ON "applications"("applicationNo");

-- CreateIndex
CREATE INDEX "applications_applicantId_createdAt_idx" ON "applications"("applicantId", "createdAt");

-- CreateIndex
CREATE INDEX "applications_status_riskCategory_createdAt_idx" ON "applications"("status", "riskCategory", "createdAt");

-- CreateIndex
CREATE INDEX "applications_panNumber_idx" ON "applications"("panNumber");

-- CreateIndex
CREATE UNIQUE INDEX "documents_documentNo_key" ON "documents"("documentNo");

-- CreateIndex
CREATE INDEX "documents_applicationId_createdAt_idx" ON "documents"("applicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "documents_applicationId_sha256_key" ON "documents"("applicationId", "sha256");

-- CreateIndex
CREATE INDEX "extracted_fields_documentId_fieldName_createdAt_idx" ON "extracted_fields"("documentId", "fieldName", "createdAt");

-- CreateIndex
CREATE INDEX "kyc_decisions_applicationId_createdAt_idx" ON "kyc_decisions"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "officer_actions_applicationId_createdAt_idx" ON "officer_actions"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "officer_actions_officerId_createdAt_idx" ON "officer_actions"("officerId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_applicationId_createdAt_idx" ON "audit_logs"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_documentId_createdAt_idx" ON "audit_logs"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "watchlist_entries_type_name_idx" ON "watchlist_entries"("type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_entries_type_externalId_key" ON "watchlist_entries"("type", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "existing_customers_customerId_key" ON "existing_customers"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "existing_customers_panNumber_key" ON "existing_customers"("panNumber");

-- CreateIndex
CREATE UNIQUE INDEX "rule_configurations_key_key" ON "rule_configurations"("key");

-- CreateIndex
CREATE UNIQUE INDEX "core_banking_accounts_applicationId_key" ON "core_banking_accounts"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "core_banking_accounts_customerId_key" ON "core_banking_accounts"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "core_banking_accounts_accountNumber_key" ON "core_banking_accounts"("accountNumber");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_decisions" ADD CONSTRAINT "kyc_decisions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_actions" ADD CONSTRAINT "officer_actions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_actions" ADD CONSTRAINT "officer_actions_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
