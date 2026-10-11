import { Box, Typography } from "@mui/material";
import type { CSSProperties, ReactNode } from "react";
import type { Resume, SectionId } from "../../domain/resume/types";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box className="document-section">
      <Typography component="h3">{title}</Typography>
      {children}
    </Box>
  );
}

function externalHref(value: string) {
  const address = value.trim();
  if (!address) return undefined;
  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(address) ? address : `https://${address}`,
    );
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function ResumeDocument({
  resume,
  compact = false,
}: {
  resume: Resume;
  compact?: boolean;
}) {
  const hidden = new Set(resume.hiddenSections);
  const fontFamilies = {
    sans: '"DM Sans", sans-serif',
    serif: "Georgia, serif",
    system: "Arial, sans-serif",
  };
  const spacing = { compact: 0.8, comfortable: 1, relaxed: 1.2 };
  const margins = { compact: 0.8, standard: 1, wide: 1.2 };
  const renderSection = (id: SectionId) => {
    if (hidden.has(id)) return null;
    switch (id) {
      case "experience":
        return (
          resume.experience.length > 0 && (
            <Section key={id} title="Experience">
              {resume.experience.map((item) => (
                <Box className="document-entry" key={item.id}>
                  <Box className="document-entry-heading">
                    <strong>{item.role || "Role"}</strong>
                    <span>
                      {[item.startDate, item.endDate]
                        .filter(Boolean)
                        .join(" — ")}
                    </span>
                  </Box>
                  <Box className="document-entry-subheading">
                    {[item.company, item.location].filter(Boolean).join(" · ")}
                  </Box>
                  {item.description && (
                    <Typography className="document-copy">
                      {item.description}
                    </Typography>
                  )}
                </Box>
              ))}
            </Section>
          )
        );
      case "education":
        return (
          resume.education.length > 0 && (
            <Section key={id} title="Education">
              {resume.education.map((item) => (
                <Box className="document-entry" key={item.id}>
                  <Box className="document-entry-heading">
                    <strong>{item.degree || "Degree"}</strong>
                    <span>
                      {[item.startDate, item.endDate]
                        .filter(Boolean)
                        .join(" — ")}
                    </span>
                  </Box>
                  <Box className="document-entry-subheading">
                    {[item.institution, item.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </Box>
                  {item.details && (
                    <Typography className="document-copy">
                      {item.details}
                    </Typography>
                  )}
                </Box>
              ))}
            </Section>
          )
        );
      case "skills":
        return (
          resume.skills.length > 0 && (
            <Section key={id} title="Skills">
              <Typography className="document-copy">
                {resume.skills.join(" · ")}
              </Typography>
            </Section>
          )
        );
      case "projects":
        return (
          resume.projects.length > 0 && (
            <Section key={id} title="Projects">
              {resume.projects.map((project) => (
                <Box className="document-entry" key={project.id}>
                  <Box className="document-entry-heading">
                    <strong>{project.name || "Project"}</strong>
                    {project.link && <span>{project.link}</span>}
                  </Box>
                  {project.description && (
                    <Typography className="document-copy">
                      {project.description}
                    </Typography>
                  )}
                </Box>
              ))}
            </Section>
          )
        );
      case "certifications":
      case "achievements":
      case "languages": {
        const labels = {
          certifications: "Certifications",
          achievements: "Achievements",
          languages: "Languages",
        };
        const items = resume[id].filter((item) => item.trim());
        return (
          items.length > 0 && (
            <Section key={id} title={labels[id]}>
              {id === "certifications" || id === "achievements" ? (
                <Box component="ul" className="document-list">
                  {items.map((item, index) => (
                    <li key={`${index}-${item}`}>{item}</li>
                  ))}
                </Box>
              ) : (
                <Typography className="document-copy">
                  {items.join(" · ")}
                </Typography>
              )}
            </Section>
          )
        );
      }
      case "custom":
        return resume.customSections.map((section) => (
          <Section
            key={section.id}
            title={section.title || "Additional information"}
          >
            <Typography className="document-copy">{section.content}</Typography>
          </Section>
        ));
    }
  };

  const contactItems = [
    { key: "email", value: resume.profile.email },
    { key: "phone", value: resume.profile.phone },
    { key: "location", value: resume.profile.location },
    {
      key: "website",
      value: resume.profile.website,
      href: externalHref(resume.profile.website),
    },
    {
      key: "linkedin",
      value: resume.profile.linkedin,
      href: externalHref(resume.profile.linkedin),
    },
  ].filter((item) => item.value.trim());

  const summaryTitle =
    resume.design.template === "classic" || resume.design.template === "ats"
      ? "Professional Summary"
      : "Profile";

  return (
    <Box
      className={`resume-document template-${resume.design.template} heading-${resume.design.headingStyle}${compact ? " compact-document" : ""}`}
      style={
        {
          "--resume-accent": resume.design.accentColor,
          "--resume-font-size": `${resume.design.fontSize}pt`,
          "--resume-font-family": fontFamilies[resume.design.fontFamily],
          "--resume-spacing": spacing[resume.design.spacing],
          "--resume-margin": margins[resume.design.margin],
          "--resume-content-alignment":
            resume.design.summaryAlignment ?? "justify",
        } as CSSProperties
      }
    >
      <Box className="document-header">
        <Typography component="h2">
          {resume.profile.name || "Your name"}
        </Typography>
        {resume.profile.headline && (
          <Typography className="document-headline">
            {resume.profile.headline}
          </Typography>
        )}
        {contactItems.length > 0 && (
          <Box className="document-contact">
            {contactItems.map((item) => (
              <span key={`${item.key}-${item.value}`}>
                {item.href ? (
                  <a href={item.href} target="_blank" rel="noreferrer">
                    {item.value}
                  </a>
                ) : (
                  item.value
                )}
              </span>
            ))}
          </Box>
        )}
      </Box>
      {resume.summary && (
        <Section title={summaryTitle}>
          <Typography className="document-copy">{resume.summary}</Typography>
        </Section>
      )}
      {resume.sectionOrder.map(renderSection)}
    </Box>
  );
}
