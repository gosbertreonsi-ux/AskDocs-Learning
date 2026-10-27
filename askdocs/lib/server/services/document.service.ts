
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

const MAX_TEXT_LENGTH = 250_000;

export async function extractPdfText(
  file: File
): Promise<string> {
  const bytes = new Uint8Array(
    await file.arrayBuffer()
  );

  // Verify the PDF header.
  const header = String.fromCharCode(
    ...bytes.slice(0, 5)
  );

  if (header !== "%PDF-") {
    throw new Error("File is not a valid PDF");
  }

  const parser = new PDFParse({
    data: bytes,
  });

  try {
    const result = await parser.getText();
    const text = result.text.trim();

    if (!text) {
      throw new Error(
        "No selectable text found. This PDF may need OCR."
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error(
        "Document contains too much text for this demo"
      );
    }

    return text;
  } finally {
    await parser.destroy();
  }
}
