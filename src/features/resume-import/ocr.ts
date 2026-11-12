import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export type OcrProgress = {
  /** What is happening, e.g. "Loading OCR engine" or "Reading page 1 of 2". */
  status: string;
  /** Overall progress from 0 to 1. */
  fraction: number;
};

/** Render scale for OCR: ~3x of 72 dpi gives ~216 dpi, plenty for resume text. */
const RENDER_SCALE = 3;

/**
 * Read the text of a PDF that has no text layer by rendering each page and
 * running OCR (Tesseract) on it, entirely in the browser. The engine and the
 * English model are served from this app (public/tesseract) and cached by the
 * browser after first use; the document itself is never uploaded.
 */
export async function ocrPdf(
  file: File,
  onProgress: (progress: OcrProgress) => void = () => {},
): Promise<string> {
  onProgress({ status: "Loading OCR engine", fraction: 0 });
  const [pdfjs, { createWorker, OEM }] = await Promise.all([
    import("pdfjs-dist"),
    import("tesseract.js"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const document = await loadingTask.promise;
  const pages = document.numPages;
  let currentPage = 0;

  const assets = new URL(
    `${import.meta.env.BASE_URL}tesseract/`,
    window.location.href,
  ).href;
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: `${assets}worker.min.js`,
    corePath: assets,
    langPath: assets,
    gzip: true,
    logger: (message: { status: string; progress: number }) => {
      if (message.status === "recognizing text" && currentPage > 0)
        onProgress({
          status: `Reading page ${currentPage} of ${pages}`,
          fraction: 0.1 + (0.9 * (currentPage - 1 + message.progress)) / pages,
        });
      else if (currentPage === 0)
        onProgress({
          status: "Loading OCR engine",
          fraction: 0.1 * message.progress,
        });
    },
  });

  try {
    const texts: string[] = [];
    for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
      currentPage = pageNumber;
      onProgress({
        status: `Reading page ${pageNumber} of ${pages}`,
        fraction: 0.1 + (0.9 * (pageNumber - 1)) / pages,
      });
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      texts.push(data.text);
      canvas.width = 0;
      canvas.height = 0;
    }
    onProgress({ status: "Done", fraction: 1 });
    return texts.join("\n");
  } finally {
    await worker.terminate();
    await loadingTask.destroy();
  }
}
