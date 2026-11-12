import {
  ArrowBack,
  CloudUpload,
  NoteAdd,
  ViewQuilt,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { resumeRepository } from "../../domain/resume/repository";
import { templateOptions, type Resume } from "../../domain/resume/types";
import { importResumeFile } from "../resume-import/parseResume";
import { TemplateThumbnail } from "../templates/TemplateThumbnail";
import { newResumePath, StartResumeContext } from "./startResumeContext";

type Step = "choose" | "templates" | "import-preview";

export function StartResumeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importPreview, setImportPreview] = useState<Resume | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const openStartResume = useCallback(() => {
    setStep("choose");
    setImportError("");
    setImportPreview(null);
    setOpen(true);
  }, []);
  const contextValue = useMemo(() => ({ openStartResume }), [openStartResume]);

  function close() {
    if (!importing) setOpen(false);
  }

  function go(path: string, state?: unknown) {
    setOpen(false);
    navigate(path, state ? { state } : undefined);
  }

  async function readImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImportError("");
    setImporting(true);
    try {
      setImportPreview(await importResumeFile(file));
      setStep("import-preview");
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "This resume could not be read.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function saveImportedResume() {
    if (!importPreview) return;
    try {
      await resumeRepository.save(importPreview);
      go(`/resume/${importPreview.id}`, { imported: true });
    } catch {
      setImportError(
        "The extracted resume could not be saved in this browser. Check available storage and try again.",
      );
      setStep("choose");
      setImportPreview(null);
    }
  }

  return (
    <StartResumeContext.Provider value={contextValue}>
      {children}
      <Dialog open={open} onClose={close} fullWidth maxWidth="md">
        <DialogTitle className="start-dialog-title">
          {step !== "choose" && (
            <IconButton
              aria-label="Back"
              onClick={() => setStep("choose")}
              size="small"
            >
              <ArrowBack fontSize="small" />
            </IconButton>
          )}
          {step === "choose" && "Start a resume"}
          {step === "templates" && "Pick a template"}
          {step === "import-preview" && "Review imported resume"}
        </DialogTitle>
        <DialogContent dividers>
          {importError && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setImportError("")}
            >
              {importError}
            </Alert>
          )}

          {step === "choose" && (
            <Box className="start-options">
              <StartOption
                icon={<NoteAdd />}
                title="Blank page"
                body="Start from scratch with the Classic layout. You can switch templates any time."
                onClick={() => go(newResumePath())}
              />
              <StartOption
                icon={
                  importing ? <CircularProgress size={22} /> : <CloudUpload />
                }
                title={importing ? "Reading your file…" : "Import a file"}
                body="Bring in an existing PDF, DOCX, or TXT resume. It is read in this browser and never uploaded."
                onClick={() => fileInput.current?.click()}
                disabled={importing}
              />
              <StartOption
                icon={<ViewQuilt />}
                title="Pick a template"
                body="Choose a layout first, then fill it in."
                onClick={() => setStep("templates")}
              />
              <input
                ref={fileInput}
                className="visually-hidden-input"
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={(event) => void readImportFile(event)}
              />
            </Box>
          )}

          {step === "templates" && (
            <Box className="template-picker">
              {templateOptions.map((option) => (
                <ButtonBase
                  key={option.value}
                  className="template-choice"
                  onClick={() => go(newResumePath(option.value))}
                >
                  <TemplateThumbnail
                    template={option.value}
                    width={132}
                    height={170}
                  />
                  <Typography>{option.label}</Typography>
                </ButtonBase>
              ))}
            </Box>
          )}

          {step === "import-preview" && importPreview && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                The file was read in this browser. Review every extracted field
                in the editor; document formatting and complex layouts may not
                transfer exactly.
              </Alert>
              <Typography variant="h3" sx={{ mb: 1 }}>
                {importPreview.profile.name || importPreview.title}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {importPreview.profile.headline || "Resume details found"}
              </Typography>
              <Box className="import-summary-grid">
                <Typography>
                  <strong>{importPreview.experience.length}</strong> experience
                  entries
                </Typography>
                <Typography>
                  <strong>{importPreview.education.length}</strong> education
                  entries
                </Typography>
                <Typography>
                  <strong>{importPreview.skills.length}</strong> skills
                </Typography>
                <Typography>
                  <strong>{importPreview.projects.length}</strong> projects
                </Typography>
              </Box>
              {importPreview.customSections.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Unrecognized content is preserved under a custom section so
                  you can organize it later.
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={importing}>
            Cancel
          </Button>
          {step === "import-preview" && (
            <Button
              variant="contained"
              onClick={() => void saveImportedResume()}
            >
              Import and edit
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </StartResumeContext.Provider>
  );
}

function StartOption({
  icon,
  title,
  body,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ButtonBase className="start-option" onClick={onClick} disabled={disabled}>
      <Box className="start-option-icon">{icon}</Box>
      <Typography variant="h3">{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {body}
      </Typography>
    </ButtonBase>
  );
}
