import {
  Add,
  ArrowBack,
  DragIndicator,
  History,
  Print,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactNode } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Link as RouterLink, useLocation, useParams } from "react-router-dom";
import type {
  ResumeDesign,
  ResumeVersion,
  SectionId,
} from "../../domain/resume/types";
import { resumeSchema, type Resume } from "../../domain/resume/types";
import { resumeRepository } from "../../domain/resume/repository";
import { ResumeDocument } from "../templates/ResumeDocument";

const sectionLabels: Record<SectionId, string> = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  achievements: "Achievements",
  languages: "Languages",
  custom: "Custom sections",
};

const defaultDesign: ResumeDesign = {
  template: "classic",
  accentColor: "#1a4b73",
  fontSize: 10,
  fontFamily: "sans",
  spacing: "comfortable",
  margin: "standard",
  headingStyle: "uppercase",
  summaryAlignment: "justify",
};

function normalizeResumeDesign(resume: Resume): Resume {
  return { ...resume, design: { ...defaultDesign, ...resume.design } };
}

type DescriptionListStyle = "bullets" | "numbered" | "dashes" | "plain";

function getDescriptionListStyle(
  description: string,
): DescriptionListStyle | null {
  const firstLine = description
    .split("\n")
    .find((line) => line.trim())
    ?.trim();
  if (!firstLine) return null;
  if (/^[•●▪*]\s*/.test(firstLine)) return "bullets";
  if (/^\d+[.)]\s*/.test(firstLine)) return "numbered";
  if (/^[–—-]\s*/.test(firstLine)) return "dashes";
  return "plain";
}

function formatDescriptionList(
  description: string,
  style: DescriptionListStyle,
) {
  if (!description.trim()) {
    if (style === "bullets") return "• ";
    if (style === "numbered") return "1. ";
    if (style === "dashes") return "– ";
    return "";
  }
  const lines = description
    .split("\n")
    .map((line) =>
      line.replace(/^(?:[•●▪*]\s*|\d+[.)]\s*|[–—-]\s*)/, "").trim(),
    );
  let number = 0;
  const prefixes = {
    bullets: "• ",
    numbered: "",
    dashes: "– ",
    plain: "",
  };
  return lines
    .map((line) => {
      if (!line) return "";
      if (style === "plain") return line;
      if (style === "numbered") return `${++number}. ${line}`;
      return `${prefixes[style]}${line}`;
    })
    .join("\n");
}

function SortableRow({
  id,
  children,
  className = "",
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <Box
      ref={setNodeRef}
      className={`${className}${isDragging ? " is-dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <IconButton
        className="drag-handle"
        size="small"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <DragIndicator fontSize="small" />
      </IconButton>
      {children}
    </Box>
  );
}

function Field({
  label,
  name,
  register,
  multiline = false,
  rows = 2,
  placeholder = "",
}: {
  label: string;
  name: Parameters<ReturnType<typeof useForm<Resume>>["register"]>[0];
  register: ReturnType<typeof useForm<Resume>>["register"];
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <TextField
      label={label}
      placeholder={placeholder}
      fullWidth
      multiline={multiline}
      minRows={multiline ? rows : undefined}
      {...register(name)}
    />
  );
}

export function EditorPage() {
  const { resumeId = "" } = useParams();
  const location = useLocation();
  const importedFromFile = Boolean(
    (location.state as { imported?: boolean } | null)?.imported,
  );
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [lastSaved, setLastSaved] = useState("");
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const { control, register, reset, setValue, getValues } = useForm<Resume>({
    resolver: zodResolver(resumeSchema),
    mode: "onBlur",
  });
  const experience = useFieldArray({ control, name: "experience" });
  const education = useFieldArray({ control, name: "education" });
  const projects = useFieldArray({ control, name: "projects" });
  const customSections = useFieldArray({ control, name: "customSections" });
  const values = useWatch({ control });
  const serializedValues = JSON.stringify(values);

  useEffect(() => {
    let active = true;
    void resumeRepository
      .get(resumeId)
      .then((resume) => {
        if (!active) return;
        if (resume) reset(normalizeResumeDesign(resume));
        else setMissing(true);
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setMissing(true);
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [resumeId, reset]);

  useEffect(() => {
    if (!ready || missing || !values?.id) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        const current = getValues();
        const saved = await resumeRepository.get(resumeId);
        const currentContent = JSON.stringify({ ...current, updatedAt: "" });
        const savedContent = saved
          ? JSON.stringify({ ...saved, updatedAt: "" })
          : "";
        if (currentContent !== savedContent) {
          if (saved) await resumeRepository.addVersion(saved);
          await resumeRepository.save({
            ...current,
            updatedAt: new Date().toISOString(),
          });
        }
        setLastSaved(
          new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        );
      })().catch(() => setNotice("Could not save to this browser."));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [getValues, missing, ready, serializedValues, values?.id, resumeId]);

  if (!ready)
    return (
      <Box className="loading-state">
        <CircularProgress size={28} />
      </Box>
    );
  if (missing || !values?.id)
    return (
      <Alert severity="warning" sx={{ m: 4 }}>
        This resume could not be found.{" "}
        <Button component={RouterLink} to="/dashboard">
          Back to resumes
        </Button>
      </Alert>
    );
  const currentResume = values as Resume;

  function reorderSections(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const order = getValues("sectionOrder");
    const from = order.indexOf(String(event.active.id) as SectionId);
    const to = order.indexOf(String(event.over.id) as SectionId);
    if (from !== -1 && to !== -1)
      setValue("sectionOrder", arrayMove(order, from, to), {
        shouldDirty: true,
      });
  }

  function reorderExperience(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const items = getValues("experience");
    const from = items.findIndex((item) => item.id === event.active.id);
    const to = items.findIndex((item) => item.id === event.over?.id);
    if (from !== -1 && to !== -1) experience.move(from, to);
  }

  function reorderProjects(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const items = getValues("projects");
    const from = items.findIndex((item) => item.id === event.active.id);
    const to = items.findIndex((item) => item.id === event.over?.id);
    if (from !== -1 && to !== -1) projects.move(from, to);
  }

  async function openHistory() {
    await resumeRepository.addVersion(getValues());
    setVersions(await resumeRepository.versions(resumeId));
    setHistoryOpen(true);
  }

  async function restore(versionId: string) {
    const restored = await resumeRepository.restoreVersion(versionId);
    if (!restored) return;
    const normalized = normalizeResumeDesign(restored);
    reset(normalized);
    await resumeRepository.save(normalized);
    setHistoryOpen(false);
    setNotice("Previous version restored.");
  }

  function toggleSection(id: SectionId) {
    const hidden = getValues("hiddenSections");
    setValue(
      "hiddenSections",
      hidden.includes(id)
        ? hidden.filter((item) => item !== id)
        : [...hidden, id],
      { shouldDirty: true },
    );
  }

  function setExperienceListStyle(index: number, style: DescriptionListStyle) {
    const fieldName = `experience.${index}.description` as const;
    setValue(fieldName, formatDescriptionList(getValues(fieldName), style), {
      shouldDirty: true,
      shouldTouch: true,
    });
  }

  function setProjectListStyle(index: number, style: DescriptionListStyle) {
    const fieldName = `projects.${index}.description` as const;
    setValue(fieldName, formatDescriptionList(getValues(fieldName), style), {
      shouldDirty: true,
      shouldTouch: true,
    });
  }

  function printResume() {
    window.print();
  }

  const currentSectionOrder = currentResume.sectionOrder;
  const hiddenSections = currentResume.hiddenSections;

  return (
    <Box className="editor-page">
      <Box className="editor-topline">
        <Button
          component={RouterLink}
          to="/dashboard"
          startIcon={<ArrowBack />}
          color="inherit"
        >
          All resumes
        </Button>
        <Box className="save-status">
          <span className="save-dot" />
          {lastSaved ? `Saved at ${lastSaved}` : "Saving changes automatically"}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<History />} onClick={() => void openHistory()}>
            History
          </Button>
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={printResume}
          >
            Print / PDF
          </Button>
        </Stack>
      </Box>
      {importedFromFile && (
        <Alert className="editor-alert" severity="info">
          Imported resume ready. Review the extracted fields and correct
          anything that did not transfer accurately.
        </Alert>
      )}
      {notice && (
        <Alert
          className="editor-alert"
          severity="info"
          onClose={() => setNotice("")}
        >
          {notice}
        </Alert>
      )}
      <Box className="editor-title-row">
        <TextField
          className="resume-title-input"
          variant="standard"
          aria-label="Resume title"
          {...register("title")}
        />
        <Chip
          size="small"
          label="Private · saved on this device"
          variant="outlined"
        />
      </Box>
      <Box className="editor-workspace">
        <Paper className="editor-navigation" variant="outlined">
          <Typography className="panel-eyebrow">YOUR DOCUMENT</Typography>
          <DndContext onDragEnd={reorderSections}>
            <SortableContext
              items={currentSectionOrder}
              strategy={verticalListSortingStrategy}
            >
              <Stack className="section-nav-list" spacing={0.25}>
                {currentSectionOrder.map((id) => (
                  <SortableRow key={id} id={id} className="section-nav-row">
                    <Button
                      onClick={() =>
                        document.getElementById(`edit-${id}`)?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                      }
                      className="section-nav-button"
                      color="inherit"
                    >
                      {sectionLabels[id]}
                    </Button>
                    <Tooltip
                      title={
                        hiddenSections.includes(id)
                          ? "Show section in resume"
                          : "Hide section from resume"
                      }
                    >
                      <IconButton
                        size="small"
                        aria-label={`${hiddenSections.includes(id) ? "Show" : "Hide"} ${sectionLabels[id]}`}
                        onClick={() => toggleSection(id)}
                      >
                        {hiddenSections.includes(id) ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </SortableRow>
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
          <Divider sx={{ my: 2 }} />
          <Typography className="panel-eyebrow">LOOK & FEEL</Typography>
          <Controller
            control={control}
            name="design.template"
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Template"
                fullWidth
                size="small"
                sx={{ mb: 1.5 }}
              >
                <MenuItem value="modern">Modern</MenuItem>
                <MenuItem value="classic">Classic</MenuItem>
                <MenuItem value="ats">ATS</MenuItem>
                <MenuItem value="editorial">Editorial</MenuItem>
                <MenuItem value="studio">Studio</MenuItem>
                <MenuItem value="signature">Signature</MenuItem>
                <MenuItem value="professional">Professional</MenuItem>
                <MenuItem value="minimal">Minimal</MenuItem>
                <MenuItem value="executive">Executive</MenuItem>
              </TextField>
            )}
          />
          <Controller
            control={control}
            name="design.accentColor"
            render={({ field }) => (
              <TextField
                {...field}
                label="Accent color"
                type="color"
                fullWidth
                size="small"
              />
            )}
          />
          <Controller
            control={control}
            name="design.fontSize"
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Text size"
                fullWidth
                size="small"
                sx={{ mt: 1.5 }}
                onChange={(event) => field.onChange(Number(event.target.value))}
              >
                <MenuItem value={9}>Compact</MenuItem>
                <MenuItem value={10}>Standard</MenuItem>
                <MenuItem value={11}>Comfortable</MenuItem>
              </TextField>
            )}
          />
          <Controller
            control={control}
            name="design.fontFamily"
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Typeface"
                fullWidth
                size="small"
                sx={{ mt: 1.5 }}
              >
                <MenuItem value="sans">Sans serif</MenuItem>
                <MenuItem value="serif">Serif</MenuItem>
                <MenuItem value="system">Arial</MenuItem>
              </TextField>
            )}
          />
          <Controller
            control={control}
            name="design.spacing"
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Line spacing"
                fullWidth
                size="small"
                sx={{ mt: 1.5 }}
              >
                <MenuItem value="compact">Compact</MenuItem>
                <MenuItem value="comfortable">Comfortable</MenuItem>
                <MenuItem value="relaxed">Relaxed</MenuItem>
              </TextField>
            )}
          />
          <Controller
            control={control}
            name="design.margin"
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Page margins"
                fullWidth
                size="small"
                sx={{ mt: 1.5 }}
              >
                <MenuItem value="compact">Narrow</MenuItem>
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="wide">Wide</MenuItem>
              </TextField>
            )}
          />
          <Controller
            control={control}
            name="design.headingStyle"
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Heading style"
                fullWidth
                size="small"
                sx={{ mt: 1.5 }}
              >
                <MenuItem value="uppercase">Uppercase</MenuItem>
                <MenuItem value="title">Title case</MenuItem>
                <MenuItem value="underline">Underlined</MenuItem>
              </TextField>
            )}
          />
          <Controller
            control={control}
            name="design.summaryAlignment"
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Section alignment"
                fullWidth
                size="small"
                sx={{ mt: 1.5 }}
              >
                <MenuItem value="left">Left</MenuItem>
                <MenuItem value="center">Center</MenuItem>
                <MenuItem value="right">Right</MenuItem>
                <MenuItem value="justify">Justify</MenuItem>
              </TextField>
            )}
          />
        </Paper>

        <Box className="editor-form-column">
          <Paper className="form-section" id="edit-profile" variant="outlined">
            <Box className="form-section-heading">
              <Box>
                <Typography variant="h2">Personal details</Typography>
                <Typography color="text.secondary" variant="body2">
                  Start with the essentials.
                </Typography>
              </Box>
            </Box>
            <Box className="form-grid">
              <Field
                label="Full name"
                name="profile.name"
                register={register}
              />
              <Field
                label="Professional title"
                name="profile.headline"
                register={register}
              />
              <Field label="Email" name="profile.email" register={register} />
              <Field label="Phone" name="profile.phone" register={register} />
              <Field
                label="Location"
                name="profile.location"
                register={register}
              />
              <Field
                label="Website"
                name="profile.website"
                register={register}
              />
              <Field
                label="LinkedIn"
                name="profile.linkedin"
                register={register}
              />
            </Box>
          </Paper>
          <Paper className="form-section" id="edit-summary" variant="outlined">
            <Typography variant="h2">Professional summary</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
              A concise introduction to the value you bring.
            </Typography>
            <Field
              label="Summary"
              name="summary"
              register={register}
              multiline
              rows={4}
              placeholder="Describe your experience, strengths, and direction."
            />
          </Paper>
          <Paper
            className="form-section"
            id="edit-experience"
            variant="outlined"
          >
            <Box className="form-section-heading">
              <Box>
                <Typography variant="h2">Experience</Typography>
                <Typography color="text.secondary" variant="body2">
                  Focus on the impact of your work.
                </Typography>
              </Box>
            </Box>
            <DndContext onDragEnd={reorderExperience}>
              <SortableContext
                items={currentResume.experience.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <Stack spacing={2}>
                  {experience.fields.map((item, index) => (
                    <SortableRow
                      key={item.id}
                      id={currentResume.experience[index]?.id ?? item.id}
                      className="entry-editor"
                    >
                      <Box className="entry-fields">
                        <Stack
                          direction="row"
                          sx={{ justifyContent: "space-between" }}
                        >
                          <Typography variant="h3">Role {index + 1}</Typography>
                          <Button
                            color="error"
                            onClick={() => experience.remove(index)}
                          >
                            Remove
                          </Button>
                        </Stack>
                        <Box className="form-grid">
                          <Field
                            label="Job title"
                            name={`experience.${index}.role`}
                            register={register}
                          />
                          <Field
                            label="Company"
                            name={`experience.${index}.company`}
                            register={register}
                          />
                          <Field
                            label="Location"
                            name={`experience.${index}.location`}
                            register={register}
                          />
                          <Field
                            label="Start"
                            name={`experience.${index}.startDate`}
                            register={register}
                            placeholder="2022"
                          />
                          <Field
                            label="End"
                            name={`experience.${index}.endDate`}
                            register={register}
                            placeholder="Present"
                          />
                        </Box>
                        <Box sx={{ mt: 2 }}>
                          <ToggleButtonGroup
                            exclusive
                            size="small"
                            fullWidth
                            aria-label={`Highlights format for role ${index + 1}`}
                            value={getDescriptionListStyle(
                              currentResume.experience[index]?.description ??
                                "",
                            )}
                            onChange={(
                              _,
                              style: DescriptionListStyle | null,
                            ) => {
                              if (style) setExperienceListStyle(index, style);
                            }}
                            sx={{ mb: 0.5 }}
                          >
                            <ToggleButton value="bullets">
                              • Bullets
                            </ToggleButton>
                            <ToggleButton value="numbered">
                              1. Numbered
                            </ToggleButton>
                            <ToggleButton value="dashes">– Dashes</ToggleButton>
                            <ToggleButton value="plain">Plain</ToggleButton>
                          </ToggleButtonGroup>
                          <Field
                            label="Highlights and outcomes"
                            name={`experience.${index}.description`}
                            register={register}
                            multiline
                            rows={3}
                            placeholder="Use specific actions and measurable outcomes where possible."
                          />
                        </Box>
                      </Box>
                    </SortableRow>
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                startIcon={<Add />}
                onClick={() =>
                  experience.append({
                    id: crypto.randomUUID(),
                    role: "",
                    company: "",
                    location: "",
                    startDate: "",
                    endDate: "",
                    description: "",
                  })
                }
              >
                Add
              </Button>
            </Box>
          </Paper>
          <Paper
            className="form-section"
            id="edit-education"
            variant="outlined"
          >
            <Box className="form-section-heading">
              <Box>
                <Typography variant="h2">Education</Typography>
              </Box>
            </Box>
            {education.fields.map((item, index) => (
              <Box className="entry-fields plain-entry" key={item.id}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography variant="h3">Education {index + 1}</Typography>
                  <Button color="error" onClick={() => education.remove(index)}>
                    Remove
                  </Button>
                </Stack>
                <Box className="form-grid">
                  <Field
                    label="Degree"
                    name={`education.${index}.degree`}
                    register={register}
                  />
                  <Field
                    label="Institution"
                    name={`education.${index}.institution`}
                    register={register}
                  />
                  <Field
                    label="Location"
                    name={`education.${index}.location`}
                    register={register}
                  />
                  <Field
                    label="Start"
                    name={`education.${index}.startDate`}
                    register={register}
                  />
                  <Field
                    label="End"
                    name={`education.${index}.endDate`}
                    register={register}
                  />
                  <Field
                    label="Details"
                    name={`education.${index}.details`}
                    register={register}
                  />
                </Box>
              </Box>
            ))}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                startIcon={<Add />}
                onClick={() =>
                  education.append({
                    id: crypto.randomUUID(),
                    degree: "",
                    institution: "",
                    location: "",
                    startDate: "",
                    endDate: "",
                    details: "",
                  })
                }
              >
                Add
              </Button>
            </Box>
          </Paper>
          <Paper className="form-section" id="edit-skills" variant="outlined">
            <Typography variant="h2">Technical skills</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
              Separate skills with commas.
            </Typography>
            <TextField
              fullWidth
              label="Skills"
              value={(values.skills ?? []).join(", ")}
              onChange={(event) =>
                setValue(
                  "skills",
                  event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  { shouldDirty: true },
                )
              }
            />
          </Paper>
          <Paper className="form-section" id="edit-projects" variant="outlined">
            <Box className="form-section-heading">
              <Box>
                <Typography variant="h2">Projects</Typography>
              </Box>
            </Box>
            <DndContext onDragEnd={reorderProjects}>
              <SortableContext
                items={currentResume.projects.map((project) => project.id)}
                strategy={verticalListSortingStrategy}
              >
                <Stack spacing={1}>
                  {projects.fields.map((item, index) => (
                    <SortableRow
                      className="entry-editor"
                      key={item.id}
                      id={currentResume.projects[index]?.id ?? item.id}
                    >
                      <Box className="entry-fields">
                        <Stack
                          direction="row"
                          sx={{ justifyContent: "space-between" }}
                        >
                          <Typography variant="h3">
                            Project {index + 1}
                          </Typography>
                          <Button
                            color="error"
                            onClick={() => projects.remove(index)}
                          >
                            Remove
                          </Button>
                        </Stack>
                        <Box className="form-grid">
                          <Field
                            label="Project name"
                            name={`projects.${index}.name`}
                            register={register}
                          />
                          <Field
                            label="Link"
                            name={`projects.${index}.link`}
                            register={register}
                          />
                          <Box className="span-all">
                            <ToggleButtonGroup
                              exclusive
                              size="small"
                              fullWidth
                              aria-label={`Description format for project ${index + 1}`}
                              value={getDescriptionListStyle(
                                currentResume.projects[index]?.description ??
                                  "",
                              )}
                              onChange={(
                                _,
                                style: DescriptionListStyle | null,
                              ) => {
                                if (style) setProjectListStyle(index, style);
                              }}
                              sx={{ mb: 0.5 }}
                            >
                              <ToggleButton value="bullets">
                                • Bullets
                              </ToggleButton>
                              <ToggleButton value="numbered">
                                1. Numbered
                              </ToggleButton>
                              <ToggleButton value="dashes">
                                – Dashes
                              </ToggleButton>
                              <ToggleButton value="plain">Plain</ToggleButton>
                            </ToggleButtonGroup>
                            <Field
                              label="Description"
                              name={`projects.${index}.description`}
                              register={register}
                              multiline
                              rows={2}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </SortableRow>
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                startIcon={<Add />}
                onClick={() =>
                  projects.append({
                    id: crypto.randomUUID(),
                    name: "",
                    link: "",
                    description: "",
                  })
                }
              >
                Add
              </Button>
            </Box>
          </Paper>
          <Paper
            className="form-section"
            id="edit-certifications"
            variant="outlined"
          >
            <Box className="form-section-heading">
              <Box>
                <Typography variant="h2">Certifications</Typography>
                <Typography color="text.secondary" variant="body2">
                  Add each certificate separately; include its issuer in the
                  same entry.
                </Typography>
              </Box>
            </Box>
            <Stack spacing={1.5}>
              {(values.certifications ?? []).map((certification, index) => (
                <Stack
                  key={index}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <TextField
                    fullWidth
                    label={`Certificate ${index + 1}`}
                    placeholder="Certificate name — Issuer"
                    value={certification}
                    onChange={(event) => {
                      const next = [...(getValues("certifications") ?? [])];
                      next[index] = event.target.value;
                      setValue("certifications", next, { shouldDirty: true });
                    }}
                  />
                  <Button
                    color="error"
                    aria-label={`Remove certificate ${index + 1}`}
                    onClick={() =>
                      setValue(
                        "certifications",
                        (getValues("certifications") ?? []).filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                        { shouldDirty: true },
                      )
                    }
                  >
                    Remove
                  </Button>
                </Stack>
              ))}
            </Stack>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                startIcon={<Add />}
                onClick={() =>
                  setValue(
                    "certifications",
                    [...(getValues("certifications") ?? []), ""],
                    { shouldDirty: true },
                  )
                }
              >
                Add
              </Button>
            </Box>
          </Paper>
          <Paper
            className="form-section"
            id="edit-achievements"
            variant="outlined"
          >
            <Box className="form-section-heading">
              <Box>
                <Typography variant="h2">Achievements</Typography>
                <Typography color="text.secondary" variant="body2">
                  Add each achievement separately.
                </Typography>
              </Box>
            </Box>
            <Stack spacing={1.5}>
              {(values.achievements ?? []).map((achievement, index) => (
                <Stack
                  key={index}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <TextField
                    fullWidth
                    label={`Achievement ${index + 1}`}
                    placeholder="Achievement or measurable outcome"
                    value={achievement}
                    onChange={(event) => {
                      const next = [...(getValues("achievements") ?? [])];
                      next[index] = event.target.value;
                      setValue("achievements", next, { shouldDirty: true });
                    }}
                  />
                  <Button
                    color="error"
                    aria-label={`Remove achievement ${index + 1}`}
                    onClick={() =>
                      setValue(
                        "achievements",
                        (getValues("achievements") ?? []).filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                        { shouldDirty: true },
                      )
                    }
                  >
                    Remove
                  </Button>
                </Stack>
              ))}
            </Stack>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                startIcon={<Add />}
                onClick={() =>
                  setValue(
                    "achievements",
                    [...(getValues("achievements") ?? []), ""],
                    { shouldDirty: true },
                  )
                }
              >
                Add
              </Button>
            </Box>
          </Paper>
          <Paper
            className="form-section"
            id="edit-languages"
            variant="outlined"
          >
            <Typography variant="h2">Languages</Typography>
            <TextField
              className="simple-list-input"
              fullWidth
              label="Languages"
              value={(values.languages ?? []).join(", ")}
              onChange={(event) =>
                setValue(
                  "languages",
                  event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  { shouldDirty: true },
                )
              }
            />
          </Paper>
          <Paper className="form-section" id="edit-custom" variant="outlined">
            <Box className="form-section-heading">
              <Box>
                <Typography variant="h2">Custom sections</Typography>
              </Box>
            </Box>
            {customSections.fields.map((item, index) => (
              <Box className="entry-fields plain-entry" key={item.id}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography variant="h3">
                    Custom section {index + 1}
                  </Typography>
                  <Button
                    color="error"
                    onClick={() => customSections.remove(index)}
                  >
                    Remove
                  </Button>
                </Stack>
                <Box className="form-grid">
                  <Field
                    label="Heading"
                    name={`customSections.${index}.title`}
                    register={register}
                  />
                  <Box className="span-all">
                    <Field
                      label="Content"
                      name={`customSections.${index}.content`}
                      register={register}
                      multiline
                      rows={3}
                    />
                  </Box>
                </Box>
              </Box>
            ))}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                startIcon={<Add />}
                onClick={() =>
                  customSections.append({
                    id: crypto.randomUUID(),
                    title: "",
                    content: "",
                  })
                }
              >
                Add
              </Button>
            </Box>
          </Paper>
        </Box>

        <Paper className="preview-panel" variant="outlined">
          <Box className="preview-panel-heading">
            <Typography className="panel-eyebrow">LIVE PREVIEW</Typography>
            <IconButton onClick={printResume} aria-label="Print resume">
              <Print />
            </IconButton>
          </Box>
          <Box className="preview-scroll">
            <ResumeDocument resume={currentResume} />
          </Box>
        </Paper>
      </Box>
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Version history</DialogTitle>
        <DialogContent dividers>
          {versions.length === 0 ? (
            <Typography color="text.secondary">
              No previous snapshots yet. Create one by editing the resume and
              opening history again.
            </Typography>
          ) : (
            versions.map((version) => (
              <Paper
                className="version-item"
                key={version.id}
                variant="outlined"
              >
                <Box>
                  <Typography variant="h3">
                    {new Date(version.createdAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {version.resume.profile.headline || version.resume.title}
                  </Typography>
                </Box>
                <Button onClick={() => void restore(version.id)}>
                  Restore
                </Button>
              </Paper>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
