import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  createEmptyResume,
  type Resume,
  type SectionId,
} from "../../domain/resume/types";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const bulletPrefix = /^[\u2022\u25cf\u25aa*+-]\s*/;
const dateRange =
  /((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+)?(?:19|20)\d{2})\s*(?:-|to|through)\s*((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+)?(?:19|20)\d{2}|present|current)/i;

const sectionAliases: Record<
  Exclude<SectionId, "custom"> | "summary",
  string[]
> = {
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "work history",
  ],
  education: ["education", "academic background", "academic history"],
  skills: [
    "skills",
    "technical skills",
    "core skills",
    "core competencies",
    "technologies",
  ],
  projects: ["projects", "selected projects", "project experience"],
  certifications: [
    "certifications",
    "certificates",
    "licenses and certifications",
    "licenses",
  ],
  achievements: ["achievements", "awards", "honors", "accomplishments"],
  languages: ["languages", "language skills"],
  summary: [
    "summary",
    "professional summary",
    "profile",
    "professional profile",
    "about me",
    "career summary",
    "objective",
  ],
};

type ParsedSection = Exclude<SectionId, "custom"> | "summary";

function normalizeText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizedHeading(line: string) {
  return line
    .toLowerCase()
    .replace(/[:\s]+$/, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectSectionHeading(line: string): ParsedSection | undefined {
  const heading = normalizedHeading(line);
  return (Object.entries(sectionAliases) as [ParsedSection, string[]][]).find(
    ([, aliases]) => aliases.includes(heading),
  )?.[0];
}

function isCustomHeading(line: string) {
  const clean = line.trim();
  return (
    clean.length > 2 &&
    clean.length < 46 &&
    (clean.endsWith(":") || /^[A-Z][A-Z\s/&-]+$/.test(clean))
  );
}

function splitIntoSections(text: string) {
  const sections = new Map<string, string[]>();
  const header: string[] = [];
  let activeSection: string | undefined;

  for (const line of text
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean)) {
    const knownHeading = detectSectionHeading(line);
    if (knownHeading) {
      activeSection = knownHeading;
      if (!sections.has(activeSection)) sections.set(activeSection, []);
      continue;
    }
    if (activeSection && isCustomHeading(line) && !dateRange.test(line)) {
      const isExperienceCompanyLine =
        activeSection === "experience" &&
        line === line.toUpperCase() &&
        line.length < 80 &&
        !line.endsWith(":");

      if (isExperienceCompanyLine) {
        sections.get(activeSection)?.push(line);
        continue;
      }

      activeSection = `custom:${line.replace(/:$/, "").trim()}`;
      if (!sections.has(activeSection)) sections.set(activeSection, []);
      continue;
    }
    if (activeSection) sections.get(activeSection)?.push(line);
    else header.push(line);
  }
  return { sections, header };
}

function contactLines(lines: string[]) {
  const email =
    lines.join(" ").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone =
    lines
      .join(" ")
      .match(/(?:\+?\d[\d ()-]{7,}\d)/)?.[0]
      ?.trim() ?? "";
  const links =
    lines.join(" ").match(/(?:https?:\/\/)?(?:www\.)?[^\s,]+/gi) ?? [];
  const linkedin = links.find((link) => /linkedin\.com/i.test(link)) ?? "";
  const website = links.find((link) => !/linkedin\.com/i.test(link)) ?? "";
  const candidates = lines.filter(
    (line) =>
      !line.includes("@") &&
      !/https?:\/\//i.test(line) &&
      !/linkedin\.com/i.test(line) &&
      !/resume|curriculum vitae|\bcv\b/i.test(line),
  );
  const name = candidates[0] ?? "";
  const headline =
    candidates.find(
      (line) => line !== name && !dateRange.test(line) && line.length < 100,
    ) ?? "";
  const location =
    candidates.find(
      (line) =>
        line !== name &&
        line !== headline &&
        line.includes(",") &&
        !phone.includes(line),
    ) ?? "";
  return { name, headline, email, phone, location, website, linkedin };
}

function cleanLine(line: string) {
  return line.replace(bulletPrefix, "").trim();
}

function expandDateLines(lines: string[]) {
  return lines.flatMap((line) => {
    const match = line.match(dateRange);
    if (!match) return [line];
    const index = line.indexOf(match[0]);
    const before = line.slice(0, index).trim();
    const after = line.slice(index + match[0].length).trim();
    return [before, match[0], after].filter(Boolean);
  });
}

function makeEntries(lines: string[], kind: "experience"): Resume["experience"];
function makeEntries(lines: string[], kind: "education"): Resume["education"];
function makeEntries(
  lines: string[],
  kind: "experience" | "education",
): Resume["experience"] | Resume["education"] {
  const rawLines = expandDateLines(lines);
  const clean = rawLines.map(cleanLine).filter(Boolean);
  if (!clean.length) return [];
  const groups: string[][] = [];
  let current: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (dateRange.test(trimmed)) {
      if (
        current.length > 0 &&
        (current.some((item) => dateRange.test(item)) ||
          current.some(
            (item) =>
              bulletPrefix.test(item) ||
              item.includes("•") ||
              item.startsWith("-") ||
              item.startsWith("*"),
          ))
      ) {
        groups.push(current);
        current = [];
      }
      current.push(trimmed);
      continue;
    }
    current.push(trimmed);
  }
  if (current.length) groups.push(current);

  if (kind === "experience")
    return groups.map((group, index) => {
      const dateIndex = group.findIndex((line) => dateRange.test(line));
      const dateMatch = group
        .find((line) => dateRange.test(line))
        ?.match(dateRange);
      const headerLines = group
        .slice(0, dateIndex === -1 ? 2 : dateIndex + 1)
        .filter((line) => !dateRange.test(line));
      const detailLines = group
        .slice(dateIndex === -1 ? headerLines.length : dateIndex + 1)
        .filter((line) => !dateRange.test(line));
      const firstHeader = headerLines[0] ?? `Imported role ${index + 1}`;
      const [primary, secondary] = firstHeader.split(/\s+[|@]\s+|\s+at\s+/i, 2);
      const companyLine = secondary || headerLines[1] || "";
      const [institutionOrCompany, ...locationParts] =
        companyLine.split(/\s+[·|]\s+/);
      const description = [
        ...headerLines.slice(secondary ? 1 : 2),
        ...detailLines,
      ]
        .filter(Boolean)
        .join("\n");
      return {
        id: crypto.randomUUID(),
        role: primary.trim(),
        company: institutionOrCompany.trim(),
        location: locationParts.join(" · ").trim(),
        startDate: dateMatch?.[1] ?? "",
        endDate: dateMatch?.[2] ?? "",
        description,
      };
    });
  return groups.map((group, index) => {
    const dateIndex = group.findIndex((line) => dateRange.test(line));
    const dateMatch = group
      .find((line) => dateRange.test(line))
      ?.match(dateRange);
    const headerLines = group
      .slice(0, dateIndex === -1 ? 2 : dateIndex + 1)
      .filter((line) => !dateRange.test(line));
    const detailLines = group
      .slice(dateIndex === -1 ? headerLines.length : dateIndex + 1)
      .filter((line) => !dateRange.test(line));
    const firstHeader = headerLines[0] ?? `Imported education ${index + 1}`;
    const [primary, secondary] = firstHeader.split(/\s+[|@]\s+|\s+at\s+/i, 2);
    const institution = secondary || headerLines[1] || "";
    const details = [...headerLines.slice(secondary ? 1 : 2), ...detailLines]
      .filter(Boolean)
      .join("\n");
    return {
      id: crypto.randomUUID(),
      degree: primary.trim(),
      institution: institution.trim(),
      location: "",
      startDate: dateMatch?.[1] ?? "",
      endDate: dateMatch?.[2] ?? "",
      details,
    };
  });
}

function listItems(lines: string[]) {
  return lines
    .flatMap((line) => line.split(/[,;|]/))
    .map(cleanLine)
    .filter(Boolean);
}

export function mapResumeText(
  text: string,
  fileName = "Imported resume",
): Resume {
  const normalized = normalizeText(text);
  const { sections, header } = splitIntoSections(normalized);
  const resume = createEmptyResume();
  const baseName = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  resume.title = baseName ? `${baseName} (imported)` : "Imported resume";
  resume.profile = { ...resume.profile, ...contactLines(header) };

  const summaryLines = sections.get("summary") ?? [];
  resume.summary = summaryLines.map(cleanLine).join(" ");
  resume.experience = makeEntries(
    sections.get("experience") ?? [],
    "experience",
  );
  resume.education = makeEntries(sections.get("education") ?? [], "education");
  resume.skills = listItems(sections.get("skills") ?? []);
  resume.projects = (sections.get("projects") ?? [])
    .map(cleanLine)
    .filter(Boolean)
    .map((line) => ({
      id: crypto.randomUUID(),
      name: line,
      link: "",
      description: "",
    }));
  resume.certifications = listItems(sections.get("certifications") ?? []);
  resume.achievements = listItems(sections.get("achievements") ?? []);
  resume.languages = listItems(sections.get("languages") ?? []);

  const customSections = [...sections.entries()]
    .filter(([key]) => key.startsWith("custom:"))
    .map(([key, lines]) => ({
      id: crypto.randomUUID(),
      title: key.slice(7),
      content: lines.map(cleanLine).join("\n"),
    }))
    .filter((section) => section.content);

  const hasRecognizedSection = [...sections.keys()].some(
    (key) => !key.startsWith("custom:"),
  );
  const looseHeader = header.filter(
    (line) =>
      line !== resume.profile.name &&
      line !== resume.profile.headline &&
      !line.includes("@") &&
      !/https?:\/\//i.test(line),
  );
  if (customSections.length) resume.customSections.push(...customSections);
  if (!hasRecognizedSection) {
    resume.customSections.push({
      id: crypto.randomUUID(),
      title: "Imported resume content",
      content: normalized,
    });
  } else if (looseHeader.length > 0) {
    resume.customSections.push({
      id: crypto.randomUUID(),
      title: "Additional imported content",
      content: looseHeader.join("\n"),
    });
  }
  return resume;
}

export async function extractResumeText(file: File) {
  if (file.size > MAX_FILE_SIZE)
    throw new Error("Choose a file smaller than 20 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  let text = "";

  if (extension === "txt") {
    text = await file.text();
  } else if (extension === "docx") {
    const mammoth = (await import("mammoth/mammoth.browser")).default;
    text = (
      await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    ).value;
  } else if (extension === "pdf") {
    const { GlobalWorkerOptions, getDocument } = await import("pdfjs-dist");
    GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const loadingTask = getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    const document = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(
        content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
      );
    }
    text = pages.join("\n");
    await loadingTask.destroy();
  } else {
    throw new Error("Choose a PDF, DOCX, or TXT resume.");
  }

  const cleaned = normalizeText(text);
  if (cleaned.length < 20) {
    if (extension === "pdf")
      throw new Error(
        "No selectable text was found. This PDF may be scanned; OCR import is not available yet.",
      );
    throw new Error("No readable resume text was found in this file.");
  }
  return cleaned;
}

export async function importResumeFile(file: File) {
  const text = await extractResumeText(file);
  return mapResumeText(text, file.name);
}
