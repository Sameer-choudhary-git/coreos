import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import { prisma } from "../db/prisma.js";
import {
  KYC_BUCKET,
  supabaseStorage,
} from "../config/supabaseStorage.js";
import {
  detectDocumentMimeType,
  extractDocumentText,
} from "./ocr.service.js";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const QUEUE_NAME = "onboardiq_kyc_processing";

const DOCUMENT_TYPES = [
  "PAN_CARD",
  "AADHAAR_CARD",
  "ELECTRICITY_BILL",
  "BANK_STATEMENT",
  "DRIVING_LICENCE",
  "OTHER",
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];

type PreparedDocument = {
  file: Express.Multer.File;
  id: string;
  documentNo: string;
  sha256: string;
  mimeType: ReturnType<typeof detectDocumentMimeType>;
  extension: string;
  declaredDocType: DocumentType;
  ocrText: string;
  storagePath: string;
};

export class ApplicationSubmissionError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApplicationSubmissionError";
  }
}

function str(value: unknown): string {
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function todayIST(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((p) => [p.type, p.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function validateApplication(body: Record<string, unknown>) {
  const fullName = str(body.fullName);
  const dobText = str(body.dob);
  const gender = str(body.gender);
  const panNumber = str(body.panNumber).toUpperCase();
  const aadhaarLast4 = str(body.aadhaarLast4);
  const mobile = str(body.mobile);
  const email = str(body.email).toLowerCase();
  const address = str(body.address);
  const city = str(body.city);
  const state = str(body.state);
  const pincode = str(body.pincode);
  const occupationCode = str(body.occupationCode);
  const annualIncomeText = str(body.annualIncome);
  const annualIncome = Number(annualIncomeText);
  const dob = parseDate(dobText);

  const consent =
    body.consentToKyc === true ||
    body.consentToKyc === "true" ||
    body.consentToKyc === "on";

  const errors: Record<string, string> = {};

  if (!fullName || fullName.length > 200) {
    errors.fullName = "Full name is required (maximum 200 characters)";
  }

  if (!dob || dobText > todayIST()) {
    errors.dob = "Enter a valid date of birth in YYYY-MM-DD format";
  }

  if (gender.length > 50) {
    errors.gender = "Gender must not exceed 50 characters";
  }

  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
    errors.panNumber = "PAN must match the format ABCDE1234F";
  }

  if (/^\d{12}$/.test(aadhaarLast4)) {
    errors.aadhaarLast4 =
      "Full Aadhaar numbers are not accepted; enter the last four digits";
  } else if (!/^\d{4}$/.test(aadhaarLast4)) {
    errors.aadhaarLast4 = "Enter exactly four digits";
  }

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    errors.mobile = "Enter a valid 10-digit Indian mobile number";
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = "Enter a valid email address";
  }

  if (!address || address.length > 500) {
    errors.address = "Address is required (maximum 500 characters)";
  }

  if (!city || city.length > 100) errors.city = "City is required";
  if (!state || state.length > 100) errors.state = "State is required";

  if (!/^[1-9]\d{5}$/.test(pincode)) {
    errors.pincode = "Enter a valid six-digit pincode";
  }

  if (!occupationCode || occupationCode.length > 100) {
    errors.occupationCode = "Occupation code is required";
  }

  if (
    !annualIncomeText ||
    !Number.isFinite(annualIncome) ||
    annualIncome < 0
  ) {
    errors.annualIncome = "Annual income must be non-negative";
  }

  if (!consent) {
    errors.consentToKyc = "KYC consent is mandatory";
  }

  if (Object.keys(errors).length) {
    throw new ApplicationSubmissionError(
      422,
      "Application validation failed",
      errors,
    );
  }

  return {
    fullName,
    dob: dob!,
    gender: gender || null,
    panNumber,
    aadhaarLast4,
    mobile,
    email,
    address,
    city,
    state,
    pincode,
    occupationCode,
    annualIncome,
    consentToKyc: true,
  };
}

function parseDocumentTypes(
  value: unknown,
  fileCount: number,
): DocumentType[] {
  let parsed: unknown;

  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new ApplicationSubmissionError(
      422,
      "documentTypes must be a JSON array",
    );
  }

  if (!Array.isArray(parsed) || parsed.length !== fileCount) {
    throw new ApplicationSubmissionError(
      422,
      "Provide one declared document type per uploaded file",
    );
  }

  for (const type of parsed) {
    if (
      typeof type !== "string" ||
      !DOCUMENT_TYPES.includes(type as DocumentType)
    ) {
      throw new ApplicationSubmissionError(
        422,
        `Allowed document types: ${DOCUMENT_TYPES.join(", ")}`,
      );
    }
  }

  return parsed as DocumentType[];
}

function getExtension(file: Express.Multer.File): string {
  return path.extname(file.originalname).toLowerCase();
}

async function removeUploadedFiles(paths: string[]) {
  if (!paths.length) return;

  const { error } = await supabaseStorage.storage
    .from(KYC_BUCKET)
    .remove(paths);

  if (error) {
    console.error(
      "Storage cleanup failed; reconciliation is required",
      error.message,
    );
  }
}

export const applicationService = {
  async submit(
    applicantId: string,
    body: Record<string, unknown>,
    files: Express.Multer.File[],
  ) {
    const applicationData = validateApplication(body);

    if (files.length < 3 || files.length > 10) {
      throw new ApplicationSubmissionError(
        422,
        "Upload between 3 and 10 documents",
      );
    }

    for (const file of files) {
      if (!file.size || file.size > MAX_FILE_SIZE) {
        throw new ApplicationSubmissionError(
          413,
          "Every document must be non-empty and no larger than 2 MB",
        );
      }
    }

    const types = parseDocumentTypes(body.documentTypes, files.length);
    const applicationId = randomUUID();
    const applicationNo =
      `ONB-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const seenHashes = new Set<string>();
    const prepared: PreparedDocument[] = [];

    // Validate types, detect duplicates, and OCR before Storage upload.
    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      let mimeType: ReturnType<typeof detectDocumentMimeType>;
      let ocrText: string;

      try {
        mimeType = detectDocumentMimeType(file);
        ocrText = await extractDocumentText(file.buffer, mimeType);
      } catch (error) {
        const reason =
          error instanceof Error
            ? error.message
            : "Unable to read document";

        throw new ApplicationSubmissionError(
          422,
          `${path.basename(file.originalname)}: ${reason}`,
        );
      }

      const sha256 = createHash("sha256")
        .update(file.buffer)
        .digest("hex");

      if (seenHashes.has(sha256)) {
        throw new ApplicationSubmissionError(
          409,
          "Duplicate document contents detected",
        );
      }

      seenHashes.add(sha256);

      prepared.push({
        file,
        id: randomUUID(),
        documentNo: `DOC-${randomUUID()}`,
        sha256,
        mimeType,
        extension: getExtension(file).slice(1),
        declaredDocType: types[index],
        ocrText,
        storagePath: `${applicationId}/${randomUUID()}${getExtension(file).toLowerCase()}`,
      });
    }

    const uploadedPaths: string[] = [];

    try {
      const documentRows = [];

      // Store original binary documents privately.
      for (const document of prepared) {
        const { error } = await supabaseStorage.storage
          .from(KYC_BUCKET)
          .upload(document.storagePath, document.file.buffer, {
            contentType: document.mimeType,
            upsert: false,
            cacheControl: "0",
          });

        if (error) {
          throw new Error(`Supabase Storage upload failed: ${error.message}`);
        }

        uploadedPaths.push(document.storagePath);

        documentRows.push({
          id: document.id,
          documentNo: document.documentNo,
          applicationId,
          declaredDocType: document.declaredDocType,
          fileName: path.basename(document.file.originalname),
          storagePath: document.storagePath,
          sha256: document.sha256,
          mimeType: document.mimeType,
          sizeBytes: document.file.size,
          ocrText: document.ocrText,
          ocrStatus: "COMPLETED",
          ocrVersion: "scribe.js-ocr",
          extractionStatus: "PENDING",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const application = await tx.application.create({
          data: {
            id: applicationId,
            applicationNo,
            applicantId,
            ...applicationData,
            applicationDate: parseDate(todayIST())!,
            status: "SUBMITTED",
          },
          select: {
            id: true,
            applicationNo: true,
            status: true,
            createdAt: true,
          },
        });

        const savedDocuments = [];

        for (const document of documentRows) {
          const saved = await tx.document.create({
            data: document,
            select: {
              id: true,
              documentNo: true,
              fileName: true,
              declaredDocType: true,
              mimeType: true,
              sizeBytes: true,
              ocrStatus: true,
              extractionStatus: true,
              createdAt: true,
            },
          });

          savedDocuments.push(saved);

          await tx.auditLog.create({
            data: {
              applicationId,
              actorId: applicantId,
              documentId: saved.id,
              eventType: "DOCUMENT_OCR_COMPLETED",
              afterValue: {
                documentNo: saved.documentNo,
                declaredDocType: saved.declaredDocType,
                ocrStatus: "COMPLETED",
              },
            },
          });
        }

        await tx.auditLog.create({
          data: {
            applicationId,
            actorId: applicantId,
            eventType: "APPLICATION_SUBMITTED",
            afterValue: {
              applicationNo,
              status: "SUBMITTED",
              documentCount: savedDocuments.length,
            },
          },
        });

        // This message is inserted into the queue inside the same
        // transaction as the application and document metadata.
        await tx.$queryRaw`
          SELECT pgmq.send(
            ${QUEUE_NAME},
            ${JSON.stringify({
              applicationId,
              event: "APPLICATION_SUBMITTED",
              version: 1,
            })}::jsonb
          )
        `;

        return {
          application,
          documents: savedDocuments,
        };
      });

      return result;
    } catch (error) {
      await removeUploadedFiles(uploadedPaths);

      if (error instanceof ApplicationSubmissionError) {
        throw error;
      }

      console.error(
        "Application submission failed:",
        error instanceof Error ? error.message : "Unknown error",
      );

      throw new ApplicationSubmissionError(
        500,
        "Could not save the application, documents and queue message",
      );
    }
  },
};