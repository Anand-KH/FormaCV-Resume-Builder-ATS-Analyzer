import {
  Add,
  CloudUpload,
  ContentCopy,
  Delete,
  Description,
  EditOutlined,
  Insights,
  MoreHoriz,
  DriveFileRenameOutline,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { createEmptyResume, type Resume } from "../../domain/resume/types";
import { resumeRepository } from "../../domain/resume/repository";
import { importResumeFile } from "../resume-import/parseResume";

export function DashboardPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuResume, setMenuResume] = useState<Resume | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importPreview, setImportPreview] = useState<Resume | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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

  async function createResume() {
    const resume = createEmptyResume();
    await resumeRepository.save(resume);
    navigate(`/resume/${resume.id}`);
  }

  async function deleteResume() {
    if (!menuResume) return;
    await resumeRepository.remove(menuResume.id);
    setMenuAnchor(null);
    setMenuResume(null);
    setDeleteOpen(false);
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
    setMenuAnchor(null);
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

  async function readImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImportError("");
    setImporting(true);
    try {
      setImportPreview(await importResumeFile(file));
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
      navigate(`/resume/${importPreview.id}`, { state: { imported: true } });
    } catch {
      setImportError(
        "The extracted resume could not be saved in this browser. Check available storage and try again.",
      );
      setImportPreview(null);
    }
  }

  return (
    <Container className="dashboard-page" maxWidth="xl">
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">YOUR WORKSPACE</Typography>
          <Typography variant="h1">Your resumes</Typography>
          <Typography color="text.secondary">
            A good next step starts with a clear story.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} className="dashboard-actions">
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={() => fileInput.current?.click()}
            disabled={importing}
          >
            {importing ? "Reading resume..." : "Import resume"}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => void createResume()}
          >
            Create resume
          </Button>
          <input
            ref={fileInput}
            className="visually-hidden-input"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(event) => void readImportFile(event)}
          />
        </Stack>
      </Box>
      {storageError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Browser storage could not be opened. Your changes may not be saved.
        </Alert>
      )}
      {importError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setImportError("")}
        >
          {importError}
        </Alert>
      )}
      {importing && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Reading this file locally. Larger resumes may take a few seconds.
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
            Start with a blank page, then build a resume you can tailor for
            every opportunity.
          </Typography>
          <Button
            variant="contained"
            onClick={() => void createResume()}
            startIcon={<Add />}
          >
            Create your first resume
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
          {resumes.map((resume) => (
            <Paper className="resume-card" key={resume.id} variant="outlined">
              <Box className="resume-card-preview">
                <div className={`mini-sheet mini-${resume.design.template}`}>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <i />
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
                <Typography className="updated-label" variant="caption">
                  Edited {new Date(resume.updatedAt).toLocaleDateString()}
                </Typography>
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
          ))}
          <Button
            className="add-resume-card"
            onClick={() => void createResume()}
          >
            <Add />
            <span>New resume</span>
          </Button>
        </Box>
      )}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setRenameValue(menuResume?.title ?? "");
            setRenameOpen(true);
            setMenuAnchor(null);
          }}
        >
          <DriveFileRenameOutline fontSize="small" sx={{ mr: 1 }} />
          Rename
        </MenuItem>
        <MenuItem onClick={() => void duplicateResume()}>
          <ContentCopy fontSize="small" sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteOpen(true);
            setMenuAnchor(null);
          }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete resume
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
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete this resume?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This also removes its saved version history from this device.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Keep resume</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void deleteResume()}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(importPreview)}
        onClose={() => setImportPreview(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Review imported resume</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            The file was read in this browser. Review every extracted field in
            the editor; document formatting and complex layouts may not transfer
            exactly.
          </Alert>
          <Typography variant="h3" sx={{ mb: 1 }}>
            {importPreview?.profile.name || importPreview?.title}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {importPreview?.profile.headline || "Resume details found"}
          </Typography>
          <Box className="import-summary-grid">
            <Typography>
              <strong>{importPreview?.experience.length ?? 0}</strong>{" "}
              experience entries
            </Typography>
            <Typography>
              <strong>{importPreview?.education.length ?? 0}</strong> education
              entries
            </Typography>
            <Typography>
              <strong>{importPreview?.skills.length ?? 0}</strong> skills
            </Typography>
            <Typography>
              <strong>{importPreview?.projects.length ?? 0}</strong> projects
            </Typography>
          </Box>
          {importPreview?.customSections.length ? (
            <Typography variant="body2" color="text.secondary">
              Unrecognized content is preserved under a custom section so you
              can organize it later.
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportPreview(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveImportedResume()}>
            Import and edit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
