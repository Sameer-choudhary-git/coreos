import { randomUUID, createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

import { prisma } from "../db/prisma.js";

const MAX_FILE_SIZE = 1_048_576;

const DOCUMENT_TYPES = [
  "PAN_CARD",
  "AADHAAR_CARD",
  "ELECTRICITY_BILL",
  "BANK_STATEMENT",
  "DRIVING_LICENCE",
  "OTHER",
] as const;

type DocumentTypeValue = (typeof DOCUMENT_TYPES)[number];

type ApplicationInput = {
  fullName: string;
  dob: Date;
  gender: string | null;
  panNumber: string;
  aadhaarLast4: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  occupationCode: string;
  annualIncome: number;
  consentToKyc: true;
};

type PreparedDocument = {
  id: string;
  documentNo: string;
  declaredDocType: DocumentTypeValue;
  fileName: string;
  buffer: Buffer;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
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

function getString(value: unknown): string {
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function getTodayIST(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function validateApplication(
  body: Record<string, unknown>,
): ApplicationInput {
  const fullName = getString(body.fullName);
  const dobString = getString(body.dob);
  const gender = getString(body.gender);
  const panNumber = getString(body.panNumber).toUpperCase();
  const aadhaarLast4 = getString(body.aadhaarLast4);
  const mobile = getString(body.mobile);
  const email = getString(body.email).toLowerCase();
  const address = getString(body.address);
  const city = getString(body.city);
  const state = getString(body.state);
  const pincode = getString(body.pincode);
  const occupationCode = getString(body.occupationCode);
  const annualIncomeString = getString(body.annualIncome);

  const consent = body.consentToKyc;
  const consentToKyc =
    consent === true || consent === "true" || consent === "on";

  const dob = parseDateOnly(dobString);
  const today = getTodayIST();
  const annualIncome = Number(annualIncomeString);

  const fields: Record<string, string> = {};

  if (!fullName || fullName.length > 200) {
    fields.fullName = "Full name is required and must be at most 200 characters";
  }

  if (!dob || dobString > today) {
    fields.dob = "Enter a valid date of birth that is not in the future (YYYY-MM-DD)";
  }

  if (gender.length > 50) {
    fields.gender = "Gender must be at most 50 characters";
  }

  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
    fields.panNumber = "PAN must match the format ABCDE1234F";
  }

  if (/^\d{12}$/.test(aadhaarLast4)) {
    fields.aadhaarLast4 = "Enter only the last 4 Aadhaar digits. Full Aadhaar numbers are not accepted";
  } else if (!/^\d{4}$/.test(aadhaarLast4)) {
    fields.aadhaarLast4 = "Aadhaar last 4 digits must contain exactly 4 numbers";
  }

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    fields.mobile = "Mobile must be a 10-digit Indian number starting from 6 to 9";
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    fields.email = "Enter a valid email address";
  }

  if (!address || address.length > 500) {
    fields.address = "Address is required and must be at most 500 characters";
  }

  if (!city || city.length > 100) {
    fields.city = "City is required";
  }

  if (!state || state.length > 100) {
    fields.state = "State is required";
  }

  if (!/^[1-9]\d{5}$/.test(pincode)) {
    fields.pincode = "Pincode must be a valid 6-digit number";
  }

  if (!occupationCode || occupationCode.length > 100) {
    fields.occupationCode = "Occupation code is required";
  }

  if (
    !annualIncomeString ||
    !Number.isFinite(annualIncome) ||
    annualIncome < 0
  ) {
    fields.annualIncome = "Annual income must be a valid non-negative number";
  }

  if (!consentToKyc) {
    fields.consentToKyc = "Consent to KYC checks is mandatory";
  }

  if (Object.keys(fields).length > 0) {
    throw new ApplicationSubmissionError(
      422,
      "Please correct the application fields",
      fields,
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

function prepareDocuments(
  body: Record<string, unknown>,
  files: Express.Multer.File[],
): PreparedDocument[] {
  if (files.length < 3) {
    throw new ApplicationSubmissionError(
      422,
      "Upload at least 3 documents",
      { documents: "At least 3 .txt documents are required" },
    );
  }

  let documentTypes: unknown;

  try {
    const raw = body.documentTypes;

    documentTypes =
      typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new ApplicationSubmissionError(
      422,
      "documentTypes must be a JSON array",
      { documentTypes: 'Example: ["PAN_CARD","AADHAAR_CARD","ELECTRICITY_BILL"]' },
    );
  }

  if (
    !Array.isArray(documentTypes) ||
    documentTypes.length !== files.length
  ) {
    throw new ApplicationSubmissionError(
      422,
      "Every document must have a declared document type",
      { documentTypes: "Provide one document type for each uploaded file, in the same order" },
    );
  }

  const prepared: PreparedDocument[] = [];
  const hashes = new Set<string>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const declaredType = documentTypes[i];

    if (
      typeof declaredType !== "string" ||
      !DOCUMENT_TYPES.includes(declaredType as DocumentTypeValue)
    ) {
      throw new ApplicationSubmissionError(
        422,
        `Invalid document type for file ${i + 1}`,
        { documentTypes: `Allowed types: ${DOCUMENT_TYPES.join(", ")}` },
      );
    }

    const safeFileName = path.basename(
      file.originalname.replace(/\\/g, "/"),
    );

    if (path.extname(safeFileName).toLowerCase() !== ".txt") {
      throw new ApplicationSubmissionError(
        422,
        `${safeFileName} must be a .txt file`,
        { documents: "Only .txt files are accepted in this version" },
      );
    }

    if (
      file.mimetype !== "text/plain" &&
      file.mimetype !== "application/octet-stream"
    ) {
      throw new ApplicationSubmissionError(
        422,
        `${safeFileName} must be a plain-text file`,
        { documents: "Only text/plain documents are accepted" },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ApplicationSubmissionError(
        413,
        `${safeFileName} exceeds the 1 MB limit`,
      );
    }

    try {
      new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
    } catch {
      throw new ApplicationSubmissionError(
        422,
        `${safeFileName} is not valid UTF-8 text`,
        { documents: "Save the document using UTF-8 encoding" },
      );
    }

    const sha256 = createHash("sha256")
      .update(file.buffer)
      .digest("hex");

    if (hashes.has(sha256)) {
      throw new ApplicationSubmissionError(
        409,
        "Duplicate document contents detected",
        { documents: "Each uploaded document must contain distinct content" },
      );
    }

    hashes.add(sha256);

    prepared.push({
      id: randomUUID(),
      documentNo: `DOC-${randomUUID()}`,
      declaredDocType: declaredType as DocumentTypeValue,
      fileName: safeFileName,
      buffer: file.buffer,
      sha256,
      mimeType: "text/plain",
      sizeBytes: file.size,
    });
  }

  return prepared;
}

export const applicationService = {
  async submit(
    applicantId: string,
    body: Record<string, unknown>,
    files: Express.Multer.File[],
  ) {
    const applicationData = validateApplication(body);
    const documents = prepareDocuments(body, files);

    const applicationId = randomUUID();
    const applicationNo =
      `ONB-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const uploadRoot = path.resolve(process.cwd(), "data", "uploads");
    const applicationDirectory = path.join(uploadRoot, applicationId);

    try {
      await mkdir(applicationDirectory, { recursive: true });

      const documentRecords = documents.map((document) => {
        const diskPath = path.join(
          applicationDirectory,
          `${document.sha256}.txt`,
        );

        return {
          ...document,
          diskPath,
          storagePath: path
            .relative(process.cwd(), diskPath)
            .split(path.sep)
            .join("/"),
        };
      });

      for (const document of documentRecords) {
        await writeFile(document.diskPath, document.buffer, {
          flag: "wx",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const application = await tx.application.create({
          data: {
            id: applicationId,
            applicationNo,
            applicantId,
            ...applicationData,
            applicationDate: parseDateOnly(getTodayIST())!,
            status: "SUBMITTED",
          },
        });

        const savedDocuments = [];

        for (const document of documentRecords) {
          const saved = await tx.document.create({
            data: {
              id: document.id,
              documentNo: document.documentNo,
              applicationId,
              declaredDocType: document.declaredDocType,
              fileName: document.fileName,
              storagePath: document.storagePath,
              sha256: document.sha256,
              mimeType: document.mimeType,
              sizeBytes: document.sizeBytes,
              extractionStatus: "PENDING",
            },
            select: {
              id: true,
              documentNo: true,
              declaredDocType: true,
              fileName: true,
              sha256: true,
              sizeBytes: true,
              createdAt: true,
            },
          });

          savedDocuments.push(saved);
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

        for (const document of savedDocuments) {
          await tx.auditLog.create({
            data: {
              applicationId,
              actorId: applicantId,
              documentId: document.id,
              eventType: "DOCUMENT_UPLOADED",
              afterValue: {
                documentNo: document.documentNo,
                declaredDocType: document.declaredDocType,
                sha256: document.sha256,
              },
            },
          });
        }

        return { application, documents: savedDocuments };
      });

      return result;
    } catch (error) {
      // Avoid leaving orphaned files when the database transaction fails.
      await rm(applicationDirectory, {
        recursive: true,
        force: true,
      });

      throw error;
    }
  },
};