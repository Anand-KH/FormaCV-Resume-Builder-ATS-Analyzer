import { ArrowForward } from "@mui/icons-material";
import {
  Alert,
  Box,
  ButtonBase,
  Chip,
  TextField,
  Typography,
} from "@mui/material";
import type { UseFormRegister } from "react-hook-form";
import type { Resume } from "../../domain/resume/types";
import type { AtsResult, AtsTarget } from "../ats-checker/analyze";

export function JobMatchPanel({
  register,
  result,
  onJump,
}: {
  register: UseFormRegister<Resume>;
  result: AtsResult | null;
  onJump: (target: AtsTarget) => void;
}) {
  return (
    <Box className="job-match">
      <Typography variant="body2" color="text.secondary">
        Paste the job you are applying for. It is saved with this resume, and
        the score updates as you edit.
      </Typography>
      <TextField
        label="Job title"
        size="small"
        fullWidth
        placeholder="e.g. Senior Product Designer"
        {...register("targetJob.title")}
      />
      <TextField
        label="Job description"
        size="small"
        fullWidth
        multiline
        minRows={5}
        maxRows={12}
        placeholder="Paste the full job description here."
        {...register("targetJob.description")}
      />

      {!result ? (
        <Alert severity="info">
          Add the job description to see how well this resume matches it.
        </Alert>
      ) : (
        <>
          <Box className="job-match-score">
            <strong>{result.score}</strong>
            <span>/ 100</span>
            <Typography variant="caption" color="text.secondary">
              An explainable checklist, not a prediction of how any specific
              ATS will rank you.
            </Typography>
          </Box>

          <Typography className="panel-eyebrow">WHAT TO FIX</Typography>
          {result.improvements.length ? (
            <Box className="job-match-list">
              {result.improvements.map((improvement) => (
                <ButtonBase
                  key={improvement.title}
                  className="job-match-item"
                  onClick={() => onJump(improvement.target)}
                >
                  <Chip
                    color="primary"
                    size="small"
                    label={`+${improvement.points}`}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>
                      {improvement.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {improvement.detail}
                    </Typography>
                  </Box>
                  <ArrowForward fontSize="small" className="job-match-go" />
                </ButtonBase>
              ))}
            </Box>
          ) : (
            <Alert severity="success">
              This resume earns all available points in these checks. Review it
              for accuracy and clarity.
            </Alert>
          )}

          <Typography className="panel-eyebrow">
            NOT FOUND ({result.missing.length})
          </Typography>
          <Box className="job-match-chips">
            {result.missing.length ? (
              result.missing.map((term) => (
                <Chip
                  key={term}
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={term}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                Every extracted term appears in your resume.
              </Typography>
            )}
          </Box>

          <Typography className="panel-eyebrow">
            FOUND ({result.matched.length})
          </Typography>
          <Box className="job-match-chips">
            {result.matched.length ? (
              result.matched.map((term) => (
                <Chip
                  key={term}
                  size="small"
                  color="success"
                  variant="outlined"
                  label={term}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No matching terms yet.
              </Typography>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
