import "dotenv/config";

import { prisma } from "../db/prisma.js";
import {
  extractDocument,
  groqModelName,
  type DocumentExtraction,
} from "../services/groqExtraction.service.js";
import { evaluateAndPersistKyc } from "../services/kycRules.service.js";

const QUEUE_NAME = process.env.KYC_QUEUE_NAME ?? "onboardiq_kyc_processing";
const VISIBILITY_TIMEOUT_SECONDS = 120;
const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 1_000;

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is missing. Add it to Backend/.env");
}

type QueueMessage = {
  msg_id: bigint | string | number;
  read_ct: number | string;
  message: unknown;
};

type QueuePayload = {
  event?: string;
  version?: number;
  applicationId?: string;
};

function parsePayload(raw: unknown): QueuePayload | null {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  return value as QueuePayload;
}

async function archiveMessage(messageId: string): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ archived: boolean }>>`
    SELECT pgmq.archive(
      ${QUEUE_NAME},
      ${messageId}::bigint
    ) AS archived
  `;
  if (rows[0]?.archived !== true) {
    throw new Error(`PGMQ did not archive message ${messageId}`);
  }
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function failedExtraction(): DocumentExtraction {
  return {
    doc_type: "OTHER",
    doc_type_confidence: 0,
    fields: [],
  };
}

async function persistDocumentExtraction(
  documentId: string,
  extraction: DocumentExtraction,
  failed: boolean,
): Promise<void> {
  const model = groqModelName();
  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: documentId },
      data: {
        classifiedDocType: extraction.doc_type,
        extractionSource: "AI",
        extractionVersion: model,
        extractionStatus: failed ? "FAILED" : "COMPLETED",
      },
    });

    // Make a message retry idempotent for this model version. Previous model
    // versions remain stored, allowing extraction history and comparison.
    await tx.extractedField.deleteMany({
      where: {
        documentId,
        source: "AI",
        version: model,
      },
    });

    await tx.extractedField.createMany({
      data: [
        {
          documentId,
          fieldName: "doc_type",
          value: extraction.doc_type,
          confidence: extraction.doc_type_confidence,
          source: "AI",
          version: model,
        },
        ...extraction.fields.map((field) => ({
          documentId,
          fieldName: field.field_name,
          value: field.value,
          confidence: field.confidence,
          source: "AI" as const,
          version: model,
        })),
      ],
    });
  });
}

async function processApplication(applicationId: string): Promise<void> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      documents: {
        select: {
          id: true,
          documentNo: true,
          fileName: true,
          ocrText: true,
          ocrStatus: true,
          extractionStatus: true,
        },
      },
    },
  });

  if (!application) throw new Error(`Application ${applicationId} not found`);
  if (application.documents.length === 0) throw new Error("Application has no documents");

  // If the DB writes completed but queue archival failed, don't call Groq twice.
  if (
    application.aiProcessedAt &&
    application.documents.every((document) =>
      document.extractionStatus === "COMPLETED" || document.extractionStatus === "FAILED",
    )
  ) {
    console.log(`Application ${applicationId} already processed; skipping duplicate job`);
    return;
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "EXTRACTING" },
  });

  for (const document of application.documents) {
    let extraction: DocumentExtraction;
    let failed = false;

    try {
      if (document.ocrStatus !== "COMPLETED" || !document.ocrText?.trim()) {
        throw new Error(`OCR text unavailable for ${document.documentNo}`);
      }
      // Only send the OCR text needed for extraction; never send full application
      // records or a declared document type as model input.
      extraction = await extractDocument(document.ocrText);
    } catch (error) {
      failed = true;
      extraction = failedExtraction();
      const errorName = error instanceof Error ? error.name : "UnknownError";
      // Do not log OCR text, PAN, Aadhaar digits, name, or model prompts.
      console.error(`Extraction failed for document ${document.documentNo}: ${errorName}`);
    }

    await persistDocumentExtraction(document.id, extraction, failed);
  }

  // Deterministic R1-R17 rules compute the decision, name match score, risk,
  // reason codes, re-KYC date, status, tags and reviewer summary metadata.
  await evaluateAndPersistKyc(applicationId);
}

async function markManualReview(applicationId: string, reason: string): Promise<void> {
  const existing = await prisma.application.findUnique({ where: { id: applicationId }, select: { id: true } });
  if (!existing) return;

  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
        decision: "REVIEW",
        status: "IN_REVIEW",
        reasonCodes: ["LOW_EXTRACTION_CONFIDENCE"],
        aiSummary: "AI-generated summary: document extraction could not be completed. Officer review is required; this summary does not recommend a decision.",
        aiTags: ["DECISION_REVIEW", "STATUS_IN_REVIEW", "LOW_EXTRACTION_CONFIDENCE", "WORKER_RETRY_LIMIT_REACHED"],
        aiModel: groqModelName(),
        aiProcessedAt: new Date(),
      },
    });

    await tx.kycDecision.create({
      data: {
        applicationId,
        decision: "REVIEW",
        reasonCodes: ["LOW_EXTRACTION_CONFIDENCE"],
        rulesVersion: "worker-fallback-v1.0",
      },
    });

    await tx.auditLog.create({
      data: {
        applicationId,
        eventType: "AI_WORKER_RETRY_LIMIT_REACHED",
        reason: reason.slice(0, 500),
        afterValue: {
          status: "IN_REVIEW",
          reasonCodes: ["LOW_EXTRACTION_CONFIDENCE"],
        },
      },
    });
  });
}

async function processQueueMessage(message: QueueMessage): Promise<void> {
  const messageId = String(message.msg_id);
  const payload = parsePayload(message.message);

  // A test message or malformed event must not block real application jobs.
  if (
    !payload ||
    payload.event !== "APPLICATION_SUBMITTED" ||
    typeof payload.applicationId !== "string"
  ) {
    console.log(`Archiving unsupported/test queue message ${messageId}`);
    await archiveMessage(messageId);
    return;
  }

  try {
    console.log(`Processing application ${payload.applicationId}`);
    await processApplication(payload.applicationId);
    await archiveMessage(messageId);
    console.log(`Completed and archived queue message ${messageId}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown worker error";
    const attempt = Number(message.read_ct);

    console.error(`Queue message ${messageId} failed on attempt ${attempt}: ${reason}`);

    if (attempt >= MAX_ATTEMPTS) {
      await markManualReview(payload.applicationId, reason);
      await archiveMessage(messageId);
      console.error(`Message ${messageId} sent to manual review after retries`);
    }
    // Before MAX_ATTEMPTS, leave the message unacknowledged; it becomes visible
    // again once the PGMQ visibility timeout expires.
  }
}

let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

async function main(): Promise<void> {
  console.log(`OnboardIQ KYC worker listening to ${QUEUE_NAME}; model=${groqModelName()}`);

  while (!stopping) {
    const messages = await prisma.$queryRaw<QueueMessage[]>`
      SELECT msg_id, read_ct, message
      FROM pgmq.read(
        ${QUEUE_NAME},
        ${VISIBILITY_TIMEOUT_SECONDS},
        1
      )
    `;

    if (messages.length === 0) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    await processQueueMessage(messages[0]);
  }

  await prisma.$disconnect();
  console.log("OnboardIQ KYC worker stopped");
}

main().catch(async (error: unknown) => {
  console.error("KYC worker stopped unexpectedly:", error instanceof Error ? error.message : "Unknown error");
  await prisma.$disconnect();
  process.exitCode = 1;
});
