import { z } from "zod";

export const sectionIds = [
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "achievements",
  "languages",
  "custom",
] as const;

export type SectionId = (typeof sectionIds)[number];
export type ResumeTemplate =
  | "modern"
  | "classic"
  | "ats"
  | "editorial"
  | "studio"
  | "signature"
  | "professional"
  | "minimal"
  | "executive";
export type ResumeDesign = {
  template: ResumeTemplate;
  accentColor: string;
  fontSize: number;
  fontFamily: "sans" | "serif" | "system";
  spacing: "compact" | "comfortable" | "relaxed";
  margin: "compact" | "standard" | "wide";
  headingStyle: "uppercase" | "title" | "underline";
  summaryAlignment: "left" | "center" | "right" | "justify";
};

const experienceSchema = z.object({
  id: z.string(),
  role: z.string(),
  company: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
});

const educationSchema = z.object({
  id: z.string(),
  degree: z.string(),
  institution: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  details: z.string(),
});

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  link: z.string(),
  description: z.string(),
});

export const resumeSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Give your resume a name."),
  updatedAt: z.string(),
  profile: z.object({
    name: z.string(),
    headline: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    website: z.string(),
    linkedin: z.string(),
  }),
  summary: z.string(),
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  skills: z.array(z.string()),
  projects: z.array(projectSchema),
  certifications: z.array(z.string()),
  achievements: z.array(z.string()),
  languages: z.array(z.string()),
  customSections: z.array(
    z.object({ id: z.string(), title: z.string(), content: z.string() }),
  ),
  sectionOrder: z.array(z.enum(sectionIds)),
  hiddenSections: z.array(z.enum(sectionIds)),
  design: z.object({
    template: z.enum([
      "modern",
      "classic",
      "ats",
      "editorial",
      "studio",
      "signature",
      "professional",
      "minimal",
      "executive",
    ]),
    accentColor: z.string(),
    fontSize: z.number(),
    fontFamily: z.enum(["sans", "serif", "system"]),
    spacing: z.enum(["compact", "comfortable", "relaxed"]),
    margin: z.enum(["compact", "standard", "wide"]),
    headingStyle: z.enum(["uppercase", "title", "underline"]),
    summaryAlignment: z.enum(["left", "center", "right", "justify"]),
  }),
});

export type Resume = z.infer<typeof resumeSchema>;

const makeId = () => crypto.randomUUID();

export function createEmptyResume(): Resume {
  return {
    id: makeId(),
    title: "Untitled resume",
    updatedAt: new Date().toISOString(),
    profile: {
      name: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      linkedin: "",
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    achievements: [],
    languages: [],
    customSections: [],
    sectionOrder: [...sectionIds],
    hiddenSections: [],
    design: {
      template: "classic",
      accentColor: "#1a4b73",
      fontSize: 10,
      fontFamily: "sans",
      spacing: "comfortable",
      margin: "standard",
      headingStyle: "uppercase",
      summaryAlignment: "justify",
    },
  };
}

export type ResumeVersion = {
  id: string;
  resumeId: string;
  createdAt: string;
  resume: Resume;
};
