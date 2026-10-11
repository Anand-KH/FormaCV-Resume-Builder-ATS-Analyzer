import {
  CloudUpload,
  EditOutlined,
  Insights,
  Search,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  MenuItem,
} from "@mui/material";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { resumeRepository } from "../../domain/resume/repository";
import type { Resume } from "../../domain/resume/types";
import { importResumeFile } from "../resume-import/parseResume";
import { analyzeResume, type AtsResult } from "./analyze";

export function AtsPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [source, setSource] = useState<"saved" | "upload">("saved");
  const [uploadedResume, setUploadedResume] = useState<Resume | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<AtsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [editError, setEditError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const selectedResume =
    source === "upload"
      ? uploadedResume
      : (resumes.find((resume) => resume.id === selectedId) ?? null);

  useEffect(() => {
    void resumeRepository
      .list()
      .then((items) => {
        setResumes(items);
        setSelectedId(items[0]?.id ?? "");
        if (items.length === 0) setSource("upload");
      })
      .catch(() => setStorageError(true))
      .finally(() => setLoading(false));
  }, []);

  async function readResumeFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setFileError("");
    setResult(null);
    setUploading(true);
    try {
      setUploadedResume(await importResumeFile(file));
      setUploadedFileName(file.name);
    } catch (error) {
      setUploadedResume(null);
      setUploadedFileName("");
      setFileError(
        error instanceof Error
          ? error.message
          : "This resume could not be read.",
      );
    } finally {
      setUploading(false);
    }
  }

  function runAnalysis() {
    if (!selectedResume || jobDescription.trim().length <= 20) return;
    setResult(analyzeResume(selectedResume, jobDescription));
  }

  async function openResumeEditor() {
    if (!selectedResume) return;
    setEditError("");
    try {
      if (source === "upload") await resumeRepository.save(selectedResume);
      navigate(`/resume/${selectedResume.id}`);
    } catch {
      setEditError("Could not save this resume in this browser. Try again.");
    }
  }

  return (
    <Container className="ats-page" maxWidth="xl">
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">ROLE MATCH</Typography>
          <Typography variant="h1">Check your fit.</Typography>
          <Typography color="text.secondary">
            Compare your resume to a job description and see where to focus.
          </Typography>
        </Box>
        <Chip
          icon={<Insights />}
          label="Explainable analysis"
          variant="outlined"
        />
      </Box>
      {loading ? (
        <CircularProgress />
      ) : (
        <Box className="ats-layout">
          <Paper className="ats-input-panel" variant="outlined">
            <Typography variant="h2">Choose a resume</Typography>
            <Typography variant="body2" color="text.secondary">
              Use a saved draft or upload your own PDF, DOCX, or TXT resume.
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={source}
              aria-label="Resume source"
              className="ats-source-toggle"
              onChange={(_, value: "saved" | "upload" | null) => {
                if (!value) return;
                setSource(value);
                setResult(null);
                setFileError("");
              }}
            >
              <ToggleButton value="saved" disabled={!resumes.length}>
                Saved resume
              </ToggleButton>
              <ToggleButton value="upload">Upload resume</ToggleButton>
            </ToggleButtonGroup>
            {source === "saved" && resumes.length > 0 ? (
              <TextField
                select
                fullWidth
                label="Resume to analyze"
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setResult(null);
                }}
                sx={{ mt: 2 }}
              >
                {resumes.map((resume) => (
                  <MenuItem key={resume.id} value={resume.id}>
                    {resume.title}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Box className="ats-upload-control">
                <input
                  ref={fileInput}
                  className="visually-hidden-input"
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(event) => void readResumeFile(event)}
                />
                <Button
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Reading resume..." : "Choose resume file"}
                </Button>
                {uploadedFileName && (
                  <Typography variant="body2" color="text.secondary">
                    {uploadedFileName}
                  </Typography>
                )}
                {fileError && <Alert severity="error">{fileError}</Alert>}
              </Box>
            )}
            <Typography variant="h2" sx={{ mt: 3 }}>
              Job description
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Paste the role requirements you want to compare.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={14}
              maxRows={24}
              label="Paste job description"
              placeholder="Include responsibilities, qualifications, and skills…"
              value={jobDescription}
              onChange={(event) => {
                setJobDescription(event.target.value);
                setResult(null);
              }}
              sx={{ mt: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              startIcon={<Insights />}
              onClick={runAnalysis}
              disabled={!selectedResume || jobDescription.trim().length <= 20}
              sx={{ mt: 2 }}
            >
              Check ATS score
            </Button>
            <Typography className="privacy-note">
              Analysis runs in your browser. Your resume and job description are
              not uploaded.
            </Typography>
          </Paper>
          <Box className="ats-results">
            {!result ? (
              <Paper className="ats-placeholder" variant="outlined">
                <Box className="empty-mark">
                  <Search />
                </Box>
                <Typography variant="h2">
                  Your analysis will appear here.
                </Typography>
                <Typography color="text.secondary">
                  Choose or upload a resume, paste the job description, then
                  check its ATS score.
                </Typography>
              </Paper>
            ) : (
              <>
                <Paper className="score-panel" variant="outlined">
                  <Box className="score-number">
                    <strong>{result.score}</strong>
                    <span>/ 100</span>
                  </Box>
                  <Box>
                    <Typography variant="h2">
                      A clearer picture of your match
                    </Typography>
                    <Typography color="text.secondary">
                      This is a transparent checklist, not a guarantee of how
                      any specific ATS will rank a resume.
                    </Typography>
                  </Box>
                </Paper>
                <Paper className="score-breakdown" variant="outlined">
                  <Typography variant="h2">Score breakdown</Typography>
                  {result.categories.map((category) => (
                    <Box className="score-row" key={category.label}>
                      <Box className="score-row-top">
                        <Typography sx={{ fontWeight: 700 }}>
                          {category.label}
                        </Typography>
                        <Typography variant="body2">
                          {category.score} / {category.maximum}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(category.score / category.maximum) * 100}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {category.detail}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
                <Box className="keyword-results">
                  <Paper className="keyword-panel" variant="outlined">
                    <Typography variant="h2">
                      Found in your resume{" "}
                      <Chip size="small" label={result.matched.length} />
                    </Typography>
                    <Box
                      sx={{
                        mt: 2,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.75,
                      }}
                    >
                      {result.matched.length ? (
                        result.matched.map((word) => (
                          <Chip
                            key={word}
                            color="success"
                            variant="outlined"
                            label={word}
                          />
                        ))
                      ) : (
                        <Typography color="text.secondary">
                          No matching terms detected yet.
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                  <Paper className="keyword-panel" variant="outlined">
                    <Typography variant="h2">
                      Not found{" "}
                      <Chip size="small" label={result.missing.length} />
                    </Typography>
                    <Box
                      sx={{
                        mt: 2,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.75,
                      }}
                    >
                      {result.missing.length ? (
                        result.missing.map((word) => (
                          <Chip
                            key={word}
                            color="warning"
                            variant="outlined"
                            label={word}
                          />
                        ))
                      ) : (
                        <Typography color="text.secondary">
                          All extracted terms appear in your resume.
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Box>
                <Paper className="suggestions-panel" variant="outlined">
                  <Box className="ats-improvements-heading">
                    <Box>
                      <Typography variant="h2">Improve your score</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Up to {result.potentialPoints} points are available
                        across these corrections.
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<EditOutlined />}
                      onClick={() => void openResumeEditor()}
                    >
                      Edit resume
                    </Button>
                  </Box>
                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    {result.improvements.length ? (
                      result.improvements.map((improvement) => (
                        <Box
                          className="ats-improvement"
                          key={improvement.title}
                        >
                          <Chip
                            color="primary"
                            size="small"
                            label={`+${improvement.points} pts`}
                          />
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>
                              {improvement.title}
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                              {improvement.detail}
                            </Typography>
                          </Box>
                        </Box>
                      ))
                    ) : (
                      <Alert severity="success">
                        Your resume currently earns all available points in
                        these checks. Review it for accuracy and clarity.
                      </Alert>
                    )}
                  </Stack>
                  {editError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {editError}
                    </Alert>
                  )}
                  {result.sectionsMissing.length > 0 && (
                    <Typography className="missing-sections" variant="body2">
                      Common sections to review:{" "}
                      {result.sectionsMissing.join(", ")}.
                    </Typography>
                  )}
                </Paper>
              </>
            )}
          </Box>
        </Box>
      )}
      {storageError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Browser storage could not be opened. Check your browser settings and
          try again.
        </Alert>
      )}
    </Container>
  );
}
