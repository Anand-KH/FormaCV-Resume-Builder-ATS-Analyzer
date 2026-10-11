import { describe, expect, it } from "vitest";
import { createEmptyResume } from "../../domain/resume/types";
import { analyzeResume } from "./analyze";

describe("analyzeResume", () => {
  it("returns a weighted score out of 100 with actionable missing terms", () => {
    const resume = createEmptyResume();
    resume.profile.name = "Jordan Lee";
    resume.profile.email = "jordan@example.com";
    resume.skills = ["React", "TypeScript", "MongoDB", "REST API"];
    resume.summary =
      "Frontend developer with experience building responsive interfaces and accessible products for customers.";
    resume.experience = [
      {
        id: "role-1",
        role: "Frontend Developer",
        company: "Northstar",
        location: "",
        startDate: "2022",
        endDate: "Present",
        description:
          "Built React features and improved page performance by 35%.",
      },
    ];

    const result = analyzeResume(
      resume,
      "We need React, TypeScript, Node.js, MongoDB, AWS, Docker, and REST APIs.",
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(
      result.categories.reduce((sum, category) => sum + category.maximum, 0),
    ).toBe(100);
    expect(result.matched).toEqual(
      expect.arrayContaining(["react", "typescript", "mongodb", "rest apis"]),
    );
    expect(result.missing).toEqual(
      expect.arrayContaining(["node.js", "aws", "docker"]),
    );
    expect(result.suggestions.join(" ")).toContain(
      "only where they accurately describe your experience",
    );
  });

  it("reports missing common sections without assuming they are mandatory for every role", () => {
    const result = analyzeResume(createEmptyResume(), "");

    expect(result.sectionsMissing).toEqual([
      "Professional summary",
      "Experience",
      "Education",
      "Skills",
      "Email address",
    ]);
    expect(result.suggestions).toContain(
      "Add a concise professional summary tailored to the kind of role you want.",
    );
  });
});
