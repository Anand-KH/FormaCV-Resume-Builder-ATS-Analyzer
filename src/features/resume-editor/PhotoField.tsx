import {
  AddAPhoto,
  Close,
  DeleteOutlined,
  Person,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Switch,
  Typography,
} from "@mui/material";
import { useRef, useState, type ChangeEvent } from "react";
import {
  photoFreeTemplates,
  templateOptions,
  type ResumeTemplate,
} from "../../domain/resume/types";
import { preparePhoto } from "./photo";

export function PhotoField({
  photo,
  showPhoto,
  template,
  onPhotoChange,
  onShowPhotoChange,
}: {
  photo: string | undefined;
  showPhoto: boolean;
  template: ResumeTemplate;
  onPhotoChange: (photo: string | undefined) => void;
  onShowPhotoChange: (show: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  /** The photo just deleted, kept in memory so the delete can be undone. */
  const [deletedPhoto, setDeletedPhoto] = useState<string | null>(null);
  const templateHidesPhoto = photoFreeTemplates.includes(template);
  const templateName =
    templateOptions.find((option) => option.value === template)?.label ??
    template;

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError("");
    setDeletedPhoto(null);
    setProcessing(true);
    try {
      onPhotoChange(await preparePhoto(file));
      onShowPhotoChange(true);
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "This image could not be used.",
      );
    } finally {
      setProcessing(false);
    }
  }

  function deletePhoto() {
    if (!photo) return;
    setError("");
    setDeletedPhoto(photo);
    onPhotoChange(undefined);
  }

  function undoDelete() {
    if (!deletedPhoto) return;
    setError("");
    onPhotoChange(deletedPhoto);
    setDeletedPhoto(null);
  }

  return (
    <Box className="photo-field">
      <Box className="photo-field-avatar-wrap">
        <Avatar
          className="photo-field-avatar"
          src={photo}
          alt={photo ? "Profile photo" : undefined}
          variant="rounded"
        >
          {processing ? <CircularProgress size={22} /> : <Person />}
        </Avatar>
        {photo && (
          <IconButton
            className="photo-field-delete"
            size="small"
            aria-label="Delete photo"
            title="Delete photo"
            onClick={deletePhoto}
          >
            <Close fontSize="inherit" />
          </IconButton>
        )}
      </Box>
      <Box className="photo-field-body">
        <Typography sx={{ fontWeight: 700 }}>Photo</Typography>
        <Typography variant="body2" color="text.secondary">
          Optional. Each template places it differently. Many employers in the
          US, UK, and Canada prefer resumes without photos.
        </Typography>
        <Box className="photo-field-actions">
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddAPhoto />}
            onClick={() => fileInput.current?.click()}
            disabled={processing || templateHidesPhoto}
          >
            {photo ? "Replace" : "Upload photo"}
          </Button>
          {photo && (
            <>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteOutlined />}
                onClick={deletePhoto}
              >
                Delete photo
              </Button>
              {!templateHidesPhoto && (
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showPhoto}
                      onChange={(event) =>
                        onShowPhotoChange(event.target.checked)
                      }
                    />
                  }
                  label="Show on resume"
                />
              )}
            </>
          )}
          <input
            ref={fileInput}
            className="visually-hidden-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={templateHidesPhoto}
            onChange={(event) => void readFile(event)}
          />
        </Box>
        {templateHidesPhoto && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Photo upload is not available for the {templateName} template.
            Applicant tracking systems can’t read images, so this template
            never shows a photo.
            {photo &&
              " Your photo is kept and will appear again if you switch to another template."}
          </Alert>
        )}
        {deletedPhoto && !photo && (
          <Alert
            severity="info"
            sx={{ mt: 1 }}
            action={
              <Button color="inherit" size="small" onClick={undoDelete}>
                Undo
              </Button>
            }
            onClose={() => setDeletedPhoto(null)}
          >
            Photo deleted.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
