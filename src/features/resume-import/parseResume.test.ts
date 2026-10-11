import { describe, expect, it } from "vitest";
import { extractResumeText, mapResumeText } from "./parseResume";

describe("extractResumeText", () => {
  it("reads plain text files in the browser", async () => {
    const file = new File(
      [
        "Jordan Lee\njordan@example.com\nFrontend developer with ten years of experience.",
      ],
      "jordan.txt",
      { type: "text/plain" },
    );

    await expect(extractResumeText(file)).resolves.toContain("Jordan Lee");
  });

  it("rejects unsupported file extensions with a useful message", async () => {
    const file = new File(["resume"], "resume.rtf", {
      type: "application/rtf",
    });

    await expect(extractResumeText(file)).rejects.toThrow(
      "Choose a PDF, DOCX, or TXT resume.",
    );
  });
});

describe("mapResumeText", () => {
  it("maps contact details, common sections, and work history to the resume model", () => {
    const resume = mapResumeText(`Jordan Lee
Senior Frontend Engineer
jordan@example.com | +1 555 123 4567 | https://linkedin.com/in/jordan

PROFESSIONAL SUMMARY
Frontend engineer focused on accessible products and responsive interfaces.

EXPERIENCE
Senior Engineer | Northstar
2021 - Present
- Built a design system used by 12 teams.
Engineer | Fieldnote
2018 - 2021
- Improved performance by 30%.

EDUCATION
BS Computer Science | State University
2014 - 2018

SKILLS
React, TypeScript, Accessibility, CSS

CERTIFICATIONS
AWS Certified Developer`);

    expect(resume.profile.name).toBe("Jordan Lee");
    expect(resume.profile.email).toBe("jordan@example.com");
    expect(resume.experience).toHaveLength(2);
    expect(resume.experience[0]).toMatchObject({
      role: "Senior Engineer",
      company: "Northstar",
      startDate: "2021",
      endDate: "Present",
    });
    expect(resume.experience[0].description).toContain("design system");
    expect(resume.education[0]).toMatchObject({
      degree: "BS Computer Science",
      institution: "State University",
    });
    expect(resume.skills).toEqual([
      "React",
      "TypeScript",
      "Accessibility",
      "CSS",
    ]);
    expect(resume.certifications).toEqual(["AWS Certified Developer"]);
  });

  it("parses em-dash date ranges and keeps role/company data intact", () => {
    const resume = mapResumeText(`Anand K H
Software Engineer
khanand1998@gmail.com / 9164038633
Bengaluru
PROFILE
Full Stack Developer with 5+ years of experience.
EXPERIENCE
Associate IT Consultant
IT Infotech India LTD · Bengaluru
2024 — Present
• Designed and developed RESTful APIs.
MAIORA IT SERVICES AND CONSULTING PVT LTD
2021 — 2023
• Built Angular applications.`);

    expect(resume.experience).toHaveLength(2);
    expect(resume.experience[0]).toMatchObject({
      role: "Associate IT Consultant",
      company: "IT Infotech India LTD",
      startDate: "2024",
      endDate: "Present",
    });
    expect(resume.experience[1].startDate).toBe("2021");
    expect(resume.experience[1].endDate).toBe("2023");
  });

  it("preserves unrecognized resume content for editing instead of discarding it", () => {
    const resume = mapResumeText(
      "Taylor Morgan\ntaylor@example.com\nAward-winning operations lead with 10 years of experience.",
      "taylor.txt",
    );

    expect(resume.title).toBe("taylor (imported)");
    expect(resume.customSections).toHaveLength(1);
    expect(resume.customSections[0].content).toContain(
      "Award-winning operations lead",
    );
  });
});
