# OnboardIQ backend AI processing patch

This patch contains backend-only files for processing the existing `APPLICATION_SUBMITTED` Supabase Queue messages. It consumes the already-stored OCR text, calls Groq for document classification and field extraction, stores field-level confidence, evaluates deterministic R1-R17 rules, writes reviewer summary/tags, and exposes KYC-Officer-only APIs for reviewing results.

## Important separation of responsibilities

- OCR already happens during application submission. This worker does not OCR files again; it uses `Document.ocrText`.
- Groq classifies documents and extracts fields only. It does not make the final KYC decision.
- `kycRules.service.ts` implements deterministic R1-R17 evaluation, name similarity, watchlist screening, risk category, re-KYC date and routing.
- `ExtractedField.confidence` stores confidence per field. `Application.nameMatchScore` is a separate deterministic name similarity score; do not describe it as an AI confidence score.
- `Application.aiSummary` is a short AI-generated remark only for `REVIEW` outcomes, and `Application.aiTags` is derived deterministically from status, risk and reason codes.
- The sample files and hackathon data are synthetic. Do not send real applicant identity documents or OCR text to a hosted LLM without appropriate approval.

## Files

- `src/services/groqExtraction.service.ts` — Groq classification/extraction and optional reviewer summary.
- `src/services/kycRules.service.ts` — deterministic R1-R17 business rules and persistence.
- `src/workers/kyc.worker.ts` — PGMQ consumer; reads the application ID from the message payload.
- `src/controllers/kycReview.controller.ts` and `src/routes/kycReview.routes.ts` — KYC Officer-only list/detail APIs; detail access to OCR text is audited.
- `prisma/schema.prisma` — complete schema matching the schema shared in chat plus OCR and AI output columns. Review your local schema before replacing it if you have made other changes.
- `prisma/rule_configuration.seed.sql` — optional default threshold seed. It uses `ON CONFLICT` so it can be rerun.

## 1. Install Groq SDK

From the `Backend` directory:

```powershell
pnpm add groq-sdk
```

The project should already have `tsx`, `@prisma/client`/generated Prisma client dependencies, Supabase connectivity and the OCR upload pipeline from the earlier setup.

## 2. Environment variables

Add these to `Backend/.env` (do not commit actual values):

```dotenv
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
KYC_QUEUE_NAME=onboardiq_kyc_processing
```

The worker uses the existing `src/db/prisma.ts` Prisma client and the existing PostgreSQL connection. It does not need a Supabase browser/publishable key.

## 3. Prisma schema

Merge the following fields into your existing `Application` model if they are not already present:

```prisma
aiSummary     String?  @db.Text
aiTags        String[] @default([])
aiModel       String?
aiProcessedAt DateTime?
```

The `Document` model must also contain the OCR fields already used by your upload code:

```prisma
ocrText    String? @db.Text
ocrStatus  String  @default("PENDING")
ocrVersion String?
```

The complete updated schema in this patch contains those fields. If you use it to replace the local schema, first compare it with your current file; do not overwrite unrelated local changes.

Apply and generate with your project's Prisma 7 configuration:

```powershell
pnpm exec prisma migrate dev --name add_ai_review_output
pnpm exec prisma generate
```

If these columns already exist in the database, Prisma migration should only add what is missing. Do not manually create duplicate columns.

## 4. Seed thresholds

In Supabase SQL Editor, run `prisma/rule_configuration.seed.sql` once. It seeds the documented defaults into `rule_configurations`. The service reads any matching keys from the table and falls back to the documented defaults if a key is absent.

Keys used:

- `min_field_confidence`
- `name_match_threshold` (alias `name_match_pass`)
- `name_match_reject_threshold` (alias `name_match_reject`)
- `watchlist_match_threshold` (alias `watchlist_match`)
- `watchlist_possible_threshold` (alias `watchlist_possible`)
- `minimum_age` (alias `min_age`)
- `pan_pattern`
- `pan_holder_type_character`
- `address_proof_max_age_days`
- `name_title_tokens`
- `medium_income_threshold` (alias `medium_risk_income_threshold`)
- `rekyc_years_high`, `rekyc_years_medium`, `rekyc_years_low`

Import your hackathon `case_02_rules_config_V1.0.json` values into these keys if its field names differ; preserve the source file's thresholds rather than silently changing them.

## 5. Wire the KYC review route into Express

Add to `src/app.ts` imports:

```typescript
import kycReviewRoutes from "./routes/kycReview.routes.js";
```

Mount it before `notFoundHandler` and `errorHandler`:

```typescript
app.use("/api/v1/kyc", kycReviewRoutes);
```

The router applies `authenticate` and `requireRole("KYC_OFFICER")` to all endpoints. If your auth middleware uses a different export name, use the same authenticated middleware name as your working routes.

## 6. Run the worker separately

Keep your API running in one terminal:

```powershell
pnpm dev
```

In another terminal, from `Backend`:

```powershell
pnpm exec tsx src/workers/kyc.worker.ts
```

The worker reads one message with a 120-second visibility timeout. It archives the existing test message (`event: QUEUE_TEST`) instead of treating it as an application. For an `APPLICATION_SUBMITTED` event, it:

1. Reads `applicationId` from the PGMQ message payload.
2. Loads that application and its `Document.ocrText` values using Prisma.
3. Calls Groq separately for each document, using only OCR text and not the declared type.
4. Saves `Document.classifiedDocType`, extraction source/version/status, and `ExtractedField` rows including the `doc_type` confidence row.
5. Runs R1-R17, saving decision, reason codes, name similarity score, risk, re-KYC date, status, tags, summary and `KycDecision` history.
6. Archives the queue message after successful persistence.

If extraction fails for a document, it stores `OTHER` with confidence 0; the deterministic rules should route the case to review. Network/database errors are retried by leaving the message unacknowledged until the visibility timeout expires. After repeated worker failures, the case is routed to `IN_REVIEW` with `LOW_EXTRACTION_CONFIDENCE`.

## 7. KYC Officer endpoints

Use a KYC Officer access token as the Bearer token:

### List applications (defaults to the review queue)

```http
GET http://localhost:4000/api/v1/kyc/applications
Authorization: Bearer <KYC_OFFICER_ACCESS_TOKEN>
```

Optional filters/pagination:

```http
GET http://localhost:4000/api/v1/kyc/applications?status=IN_REVIEW&page=1&pageSize=20
```

The list returns applicant information, masked PAN, extracted field values and confidence scores, decision/risk/reasons, AI summary, AI tags, and document metadata. It does not return the full OCR text in the list response.

### View one application and OCR text

```http
GET http://localhost:4000/api/v1/kyc/applications/<APPLICATION_UUID>
Authorization: Bearer <KYC_OFFICER_ACCESS_TOKEN>
```

This returns OCR text, extracted fields/confidence, audit history, decisions, and AI review data. Each document text view is written to `audit_logs` as `DOCUMENT_TEXT_VIEWED`.

Applicant and Compliance Officer tokens should receive HTTP 403 on these KYC-Officer-only endpoints.

## 8. Verify output in Supabase SQL Editor

```sql
SELECT
  "applicationNo", status, decision, "reasonCodes", "nameMatchScore",
  "riskCategory", "rekycDueDate", "aiSummary", "aiTags", "aiModel", "aiProcessedAt"
FROM applications
ORDER BY "createdAt" DESC
LIMIT 10;
```

```sql
SELECT
  d."documentNo", d."classifiedDocType", d."extractionStatus",
  f."fieldName", f.value, f.confidence, f.source, f.version
FROM documents d
JOIN extracted_fields f ON f."documentId" = d.id
ORDER BY f."createdAt" DESC;
```

## Notes / limitations

- Review the actual `case_02_rules_config_V1.0.json` against the seeded keys. The code defaults match the documented default values, but any custom thresholds need loading from that file.
- PEP/sanctions/existing-customer/occupation tables must be seeded from the hackathon data pack for matching rules to work correctly.
- The summary is an LLM-generated aid, not a decision. The code routes applications only using deterministic rules.
- Queue processing is designed to tolerate re-delivery. A completed application with `aiProcessedAt` and completed/failed document extraction statuses is not reprocessed when an acknowledgement fails.
- Supabase Storage files remain private. This patch does not generate public document URLs or return a signed URL.
