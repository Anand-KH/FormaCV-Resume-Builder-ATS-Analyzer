import { PictureAsPdf } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { rememberSkipPdfGuide } from "./pdfGuide";

/**
 * Explains how to save a PDF that ATS software can read before opening the
 * browser's print window. "Microsoft Print to PDF" turns text into shapes.
 */
export function SavePdfDialog({
  open,
  onClose,
  onPrint,
}: {
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Save as PDF</DialogTitle>
      <DialogContent>
        <Box component="ol" className="pdf-steps">
          <li>
            In the print window, set <strong>Destination</strong> to{" "}
            <strong>Save as PDF</strong>.
          </li>
          <li>
            Click <strong>Save</strong> and choose where to keep the file.
          </li>
        </Box>
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          Don’t choose <strong>Microsoft Print to PDF</strong>. It turns your
          text into shapes, so applicant tracking systems can’t read the file.
        </Alert>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
          Tip: open the saved PDF and try selecting a word. If it highlights,
          ATS software can read it.
        </Typography>
        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Checkbox
              size="small"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
            />
          }
          label="Don’t show this again"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<PictureAsPdf />}
          onClick={() => {
            rememberSkipPdfGuide(dontShowAgain);
            onPrint();
          }}
        >
          Open print window
        </Button>
      </DialogActions>
    </Dialog>
  );
}
