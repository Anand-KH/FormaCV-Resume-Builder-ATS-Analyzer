import { memo } from "react";
import {
  createEmptyResume,
  type Resume,
  type ResumeTemplate,
} from "../../domain/resume/types";
import { ResumeDocument } from "./ResumeDocument";

/** Width of the rendered A4 page in CSS pixels (210mm). */
const PAGE_WIDTH = 794;

/** Neutral placeholder portrait so pickers show each template's photo placement. */
const SAMPLE_PHOTO =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#dfe6df"/><circle cx="50" cy="40" r="18" fill="#a9b7ad"/><path d="M16 100c4-22 18-32 34-32s30 10 34 32z" fill="#a9b7ad"/></svg>',
  );

function sampleResume(template: ResumeTemplate): Resume {
  const resume = createEmptyResume(template);
  return {
    ...resume,
    profile: {
      ...resume.profile,
      name: "Alex Morgan",
      headline: "Product Designer",
      email: "alex@email.com",
      phone: "+1 555 0100",
      location: "New York",
      photo: SAMPLE_PHOTO,
    },
    summary:
      "Designer with seven years of experience shaping clear, accessible products for growing teams.",
    experience: [
      {
        id: "sample-1",
        role: "Senior Product Designer",
        company: "Northwind",
        location: "Remote",
        startDate: "2022",
        endDate: "Now",
        description:
          "• Led the redesign of onboarding.\n• Built a shared design system.",
      },
      {
        id: "sample-2",
        role: "Product Designer",
        company: "Brightline",
        location: "New York",
        startDate: "2019",
        endDate: "2022",
        description: "• Shipped research-led features.",
      },
    ],
    education: [
      {
        id: "sample-3",
        degree: "B.A. Design",
        institution: "Parsons",
        location: "",
        startDate: "2015",
        endDate: "2019",
        details: "",
      },
    ],
    skills: ["Research", "Prototyping", "Figma", "Systems"],
  };
}

/**
 * A miniature, non-interactive render of a template with sample content, so
 * template choices show what the layout really looks like.
 */
export const TemplateThumbnail = memo(function TemplateThumbnail({
  template,
  width,
  height,
}: {
  template: ResumeTemplate;
  width: number;
  height: number;
}) {
  return (
    <div
      className="template-thumbnail"
      style={{ width, height }}
      inert
      aria-hidden="true"
    >
      <div
        className="template-thumbnail-page"
        style={{ transform: `scale(${width / PAGE_WIDTH})` }}
      >
        <ResumeDocument resume={sampleResume(template)} />
      </div>
    </div>
  );
});
