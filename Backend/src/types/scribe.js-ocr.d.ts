declare module "scribe.js-ocr" {
  type OcrInput = {
    pdfFiles?: ArrayBuffer[];
    imageFiles?: ArrayBuffer[];
  };

  type OcrDocument = {
    inputData?: { pageCount?: number };
    recognize(options: { langs: string[]; mode: string }): Promise<void>;
    exportData(format: string): Promise<unknown>;
    close(): Promise<void>;
  };

  const scribe: {
    openDocument(input: OcrInput): Promise<OcrDocument>;
    terminate(): Promise<void>;
  };

  export default scribe;
}