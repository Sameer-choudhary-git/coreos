import scribe from "scribe.js-ocr";

const MAX_OCR_PAGES = 10;
const MAX_OCR_TEXT_LENGTH = 100_000;

type SupportedMimeType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

export function detectDocumentMimeType(
  file: Express.Multer.File,
): SupportedMimeType {
  const buffer = file.buffer;
  const extension =
    file.originalname.split(".").pop()?.toLowerCase() ?? "";

  let detected: SupportedMimeType | null = null;

  if (
    extension === "pdf" &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  ) {
    detected = "application/pdf";
  } else if (
    ["jpg", "jpeg"].includes(extension) &&
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    detected = "image/jpeg";
  } else if (
    extension === "png" &&
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  ) {
    detected = "image/png";
  } else if (
    extension === "webp" &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    detected = "image/webp";
  }

  if (!detected) {
    throw new Error(
      "Unsupported or invalid document. Upload a valid PDF, JPG, PNG or WebP image.",
    );
  }

  return detected;
}

export async function extractDocumentText(
  buffer: Buffer,
  mimeType: SupportedMimeType,
): Promise<string> {
  const data = toArrayBuffer(buffer);

  const input =
    mimeType === "application/pdf"
      ? { pdfFiles: [data] }
      : { imageFiles: [data] };

  const document = await scribe.openDocument(input);

  try {
    const pageCount = Number(document.inputData?.pageCount ?? 1);

    if (pageCount > MAX_OCR_PAGES) {
      throw new Error(
        `PDF has ${pageCount} pages. The limit is ${MAX_OCR_PAGES} pages.`,
      );
    }

    await document.recognize({
      langs: ["eng"],
      mode: "quality",
    });

    const text = await document.exportData("text");

    if (typeof text !== "string" || !text.trim()) {
      throw new Error(
        "No readable text was found. Upload a clearer scan or PDF.",
      );
    }

    if (text.length > MAX_OCR_TEXT_LENGTH) {
      throw new Error("Extracted text exceeds the permitted length.");
    }

    return text.trim();
  } finally {
    await document.close();
  }
}

export async function shutdownOcr(): Promise<void> {
  await scribe.terminate();
}