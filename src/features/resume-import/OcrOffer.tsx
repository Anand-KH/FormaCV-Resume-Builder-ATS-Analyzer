import { DocumentScanner } from "@mui/icons-material";
import { Alert, Box, Button, LinearProgress, Typography } from "@mui/material";
import { useState } from "react";
import type { Resume } from "../../domain/resume/types";
import type { OcrProgress } from "./ocr";
import { importResumeFile, type PdfWithoutTextError } from "./parseResume";

/**
 * Explains why a PDF couldn't be read and offers to read it with OCR,
 * showing progress while it runs.
 */
export function OcrOffer({
  file,
  error,
  onResult,
  onDismiss,
}: {
  file: File;
  error: PdfWithoutTextError;
  onResult: (resume: Resume) => void;
  onDismiss: () => void;
}) {
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [failure, setFailure] = useState("");

  async function runOcr() {
    setFailure("");
    setProgress({ status: "Loading OCR engine", fraction: 0 });
    try {
      onResult(
        await importResumeFile(file, { ocr: true, onOcrProgress: setProgress }),
      );
    } catch (problem) {
      setFailure(
        problem instanceof Error
          ? problem.message
          : "OCR could not read this PDF.",
      );
    } finally {
      setProgress(null);
    }
  }

  return (
    <Alert
      severity="warning"
      className="ocr-offer"
      onClose={progress ? undefined : onDismiss}
    >
      <Typography variant="body2">{error.message}</Typography>
      {error.ocrCanHelp && (
        <Box className="ocr-offer-actions">
          {progress ? (
            <Box className="ocr-offer-progress" role="status">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {progress.status}…
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.round(progress.fraction * 100)}
              />
            </Box>
          ) : (
            <>
              <Button
                size="small"
                variant="contained"
                startIcon={<DocumentScanner />}
                onClick={() => void runOcr()}
              >
                Read with OCR
              </Button>
              <Typography variant="caption" color="text.secondary">
                Runs in your browser; nothing is uploaded. The first use
                downloads about 7 MB. OCR can misread some characters, so
                review the result.
              </Typography>
            </>
          )}
          {failure && (
            <Typography variant="body2" color="error">
              {failure}
            </Typography>
          )}
        </Box>
      )}
    </Alert>
  );
}
