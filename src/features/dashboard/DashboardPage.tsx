import {
  Add,
  Backup,
  ContentCopy,
  Delete,
  Description,
  DriveFileRenameOutline,
  EditOutlined,
  FileDownload,
  FileUpload,
  Insights,
  MoreHoriz,
  TrackChanges,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  normalizeResume,
  templateOptions,
  type Resume,
} from "../../domain/resume/types";
import {
  resumeRepository,
  type ResumeBackup,
} from "../../domain/resume/repository";
import {
  analyzeResume,
  MIN_JOB_DESCRIPTION_LENGTH,
} from "../ats-checker/analyze";
import type { EditorLocationState } from "../resume-editor/EditorPage";
import { useStartResume } from "../start/startResumeContext";
import { ResumeDocument } from "../templates/ResumeDocument";

/** How long the "Undo" option stays available after a delete. */
const UNDO_WINDOW_MS = 8000;

function jobMatchScore(resume: Resume) {
  const description = resume.targetJob?.description ?? "";
  return description.trim().length > MIN_JOB_DESCRIPTION_LENGTH
    ? analyzeResume(resume, description).score
    : null;
}

const relativeTime = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});
const timeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "Edited 5 minutes ago", "Edited yesterday", … */
function editedLabel(iso: string) {
  const seconds = (Date.parse(iso) - Date.now()) / 1000;
  for (const [unit, size] of timeUnits)
    if (Math.abs(seconds) >= size)
      return `Edited ${relativeTime.format(Math.round(seconds / size), unit)}`;
  return "Edited just now";
}

function templateLabel(resume: Resume) {
  return (
    templateOptions.find((option) => option.value === resume.design.template)
      ?.label ?? "Custom"
  );
}

function downloadJson(fileName: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function DashboardPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuResume, setMenuResume] = useState<Resume | null>(null);
  const [backupAnchor, setBackupAnchor] = useState<HTMLElement | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [tailorOpen, setTailorOpen] = useState(false);
  const [tailorTitle, setTailorTitle] = useState("");
  const [tailorDescription, setTailorDescription] = useState("");
  const [deleted, setDeleted] = useState<ResumeBackup | null>(null);
  const [message, setMessage] = useState<{
    severity: "success" | "error";
    text: string;
  } | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { openStartResume } = useStartResume();

  async function refresh() {
    try {
      setResumes(await resumeRepository.list());
      setStorageError(false);
    } catch {
      setStorageError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void resumeRepository
      .list()
      .then((items) => {
        if (active) {
          setResumes(items);
          setStorageError(false);
        }
      })
      .catch(() => {
        if (active) setStorageError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function closeMenu() {
    setMenuAnchor(null);
  }

  async function deleteResume() {
    if (!menuResume) return;
    closeMenu();
    try {
      // Keep a copy (with history) in memory so the delete can be undone.
      const snapshot = await resumeRepository.exportBackup([menuResume.id]);
      await resumeRepository.remove(menuResume.id);
      setDeleted(snapshot);
    } catch {
      setMessage({ severity: "error", text: "Could not delete this resume." });
    }
    setMenuResume(null);
    await refresh();
  }

  async function undoDelete() {
    if (!deleted) return;
    const snapshot = deleted;
    setDeleted(null);
    try {
      await resumeRepository.importBackup(snapshot);
    } catch {
      setMessage({ severity: "error", text: "Could not restore the resume." });
    }
    await refresh();
  }

  async function duplicateResume() {
    if (!menuResume) return;
    const duplicate = {
      ...structuredClone(menuResume),
      id: crypto.randomUUID(),
      title: `${menuResume.title || "Untitled resume"} copy`,
      updatedAt: new Date().toISOString(),
    };
    await resumeRepository.save(duplicate);
    closeMenu();
    setMenuResume(null);
    await refresh();
  }

  async function renameResume() {
    if (!menuResume || !renameValue.trim()) return;
    await resumeRepository.save({
      ...menuResume,
      title: renameValue.trim(),
      updatedAt: new Date().toISOString(),
    });
    setRenameOpen(false);
    setMenuResume(null);
    await refresh();
  }

  async function tailorResume() {
    if (!menuResume || tailorDescription.trim().length <= MIN_JOB_DESCRIPTION_LENGTH)
      return;
    const jobTitle = tailorTitle.trim();
    const tailored: Resume = {
      ...structuredClone(menuResume),
      id: crypto.randomUUID(),
      title: `${menuResume.title || "Untitled resume"} · ${jobTitle || "tailored"}`,
      targetJob: { title: jobTitle, description: tailorDescription.trim() },
      updatedAt: new Date().toISOString(),
    };
    try {
      await resumeRepository.save(tailored);
      setTailorOpen(false);
      const state: EditorLocationState = { panel: "match" };
      navigate(`/resume/${tailored.id}`, { state });
    } catch {
      setMessage({
        severity: "error",
        text: "Could not save the tailored copy in this browser.",
      });
    }
  }

  async function exportBackup() {
    setBackupAnchor(null);
    try {
      const backup = await resumeRepository.exportBackup();
      downloadJson(
        `formacv-backup-${new Date().toISOString().slice(0, 10)}.json`,
        backup,
      );
      setMessage({
        severity: "success",
        text: `Backup downloaded with ${backup.resumes.length} resume${backup.resumes.length === 1 ? "" : "s"}.`,
      });
    } catch {
      setMessage({ severity: "error", text: "Could not create the backup." });
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const result = await resumeRepository.importBackup(
        JSON.parse(await file.text()),
      );
      const parts = [
        result.added && `${result.added} added`,
        result.updated && `${result.updated} updated`,
        result.skipped && `${result.skipped} already up to date or unreadable`,
      ].filter(Boolean);
      setMessage({
        severity: "success",
        text: `Backup restored: ${parts.join(", ") || "nothing to import"}.`,
      });
    } catch (error) {
      setMessage({
        severity: "error",
        text:
          error instanceof SyntaxError
            ? "This file is not a FormaCV backup."
            : error instanceof Error
              ? error.message
              : "Could not read this backup.",
      });
    }
    await refresh();
  }

  return (
    <Container className="dashboard-page" maxWidth="xl">
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">YOUR WORKSPACE</Typography>
          <Typography variant="h1">Your resumes</Typography>
          <Typography color="text.secondary">
            Saved in this browser only. Export a backup to keep a copy or move
            to another device.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} className="dashboard-actions">
          <Button
            variant="outlined"
            startIcon={<Backup />}
            onClick={(event) => setBackupAnchor(event.currentTarget)}
          >
            Backup
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openStartResume}
          >
            Start a resume
          </Button>
          <input
            ref={backupInput}
            className="visually-hidden-input"
            type="file"
            accept=".json,application/json"
            onChange={(event) => void importBackup(event)}
          />
        </Stack>
      </Box>
      {storageError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Browser storage could not be opened. Your changes may not be saved.
        </Alert>
      )}
      {message && (
        <Alert
          severity={message.severity}
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}
      {loading ? (
        <Typography color="text.secondary">Loading your workspace…</Typography>
      ) : resumes.length === 0 ? (
        <Paper className="empty-state" variant="outlined">
          <Box className="empty-mark">
            <Description />
          </Box>
          <Typography variant="h2">Make the first draft yours.</Typography>
          <Typography color="text.secondary">
            Start from a blank page, a template, or an existing resume file.
          </Typography>
          <Button
            variant="contained"
            onClick={openStartResume}
            startIcon={<Add />}
          >
            Start your first resume
          </Button>
          <Button
            component={RouterLink}
            to="/ats"
            color="inherit"
            startIcon={<Insights />}
          >
            Explore the ATS checker
          </Button>
        </Paper>
      ) : (
        <Box className="resume-grid">
          {resumes.map((resume) => {
            const score = jobMatchScore(resume);
            return (
              <Paper className="resume-card" key={resume.id} variant="outlined">
                <Box
                  component={RouterLink}
                  to={`/resume/${resume.id}`}
                  className="resume-card-preview"
                  aria-label={`Open ${resume.title || "Untitled resume"}`}
                >
                  {/* A scaled-down render of the real resume; not interactive. */}
                  <div className="thumb-frame" inert aria-hidden="true">
                    <div className="thumb-page">
                      <ResumeDocument resume={normalizeResume(resume)} />
                    </div>
                  </div>
                </Box>
                <Box className="resume-card-body">
                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h3" noWrap>
                        {resume.title || "Untitled resume"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {resume.profile.headline || "Draft resume"}
                      </Typography>
                    </Box>
                    <IconButton
                      aria-label={`Options for ${resume.title}`}
                      onClick={(event) => {
                        setMenuAnchor(event.currentTarget);
                        setMenuResume(resume);
                      }}
                    >
                      <MoreHoriz />
                    </IconButton>
                  </Stack>
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}
                  >
                    <Typography
                      className="updated-label"
                      variant="caption"
                      title={new Date(resume.updatedAt).toLocaleString()}
                    >
                      {templateLabel(resume)} · {editedLabel(resume.updatedAt)}
                    </Typography>
                    {score !== null && (
                      <Chip
                        size="small"
                        icon={<TrackChanges />}
                        label={`${resume.targetJob?.title || "Job"} match ${score}`}
                        variant="outlined"
                        color={score >= 70 ? "success" : "default"}
                      />
                    )}
                  </Stack>
                  <Button
                    component={RouterLink}
                    to={`/resume/${resume.id}`}
                    variant="outlined"
                    fullWidth
                    startIcon={<EditOutlined />}
                  >
                    Continue editing
                  </Button>
                </Box>
              </Paper>
            );
          })}
          <Button className="add-resume-card" onClick={openStartResume}>
            <Add />
            <span>New resume</span>
          </Button>
        </Box>
      )}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            setTailorTitle("");
            setTailorDescription("");
            setTailorOpen(true);
            closeMenu();
          }}
        >
          <ListItemIcon>
            <TrackChanges fontSize="small" />
          </ListItemIcon>
          <ListItemText>Tailor for a job…</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setRenameValue(menuResume?.title ?? "");
            setRenameOpen(true);
            closeMenu();
          }}
        >
          <ListItemIcon>
            <DriveFileRenameOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => void duplicateResume()}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => void deleteResume()}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete resume</ListItemText>
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={backupAnchor}
        open={Boolean(backupAnchor)}
        onClose={() => setBackupAnchor(null)}
      >
        <MenuItem
          onClick={() => void exportBackup()}
          disabled={resumes.length === 0}
        >
          <ListItemIcon>
            <FileDownload fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Export backup"
            secondary="Download every resume and its history as a file"
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setBackupAnchor(null);
            backupInput.current?.click();
          }}
        >
          <ListItemIcon>
            <FileUpload fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Import backup"
            secondary="Restore resumes from a FormaCV backup file"
          />
        </MenuItem>
      </Menu>
      <Dialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Rename resume</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Resume name"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void renameResume()}
            disabled={!renameValue.trim()}
          >
            Save name
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={tailorOpen}
        onClose={() => setTailorOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Tailor for a job</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
            Creates a copy of “{menuResume?.title || "Untitled resume"}” linked
            to this job, and opens it with the job match panel so you can see
            what to adjust. The original stays unchanged.
          </Typography>
          <Stack spacing={2}>
            <TextField
              autoFocus
              fullWidth
              label="Job title"
              placeholder="e.g. Senior Product Designer at Acme"
              value={tailorTitle}
              onChange={(event) => setTailorTitle(event.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={6}
              maxRows={14}
              label="Job description"
              placeholder="Paste the full job description."
              value={tailorDescription}
              onChange={(event) => setTailorDescription(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTailorOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void tailorResume()}
            disabled={
              tailorDescription.trim().length <= MIN_JOB_DESCRIPTION_LENGTH
            }
          >
            Create tailored copy
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(deleted)}
        autoHideDuration={UNDO_WINDOW_MS}
        onClose={(_, reason) => {
          if (reason !== "clickaway") setDeleted(null);
        }}
        message={`Deleted “${deleted?.resumes[0]?.title || "resume"}”`}
        action={
          <Button color="secondary" size="small" onClick={() => void undoDelete()}>
            Undo
          </Button>
        }
      />
    </Container>
  );
}
