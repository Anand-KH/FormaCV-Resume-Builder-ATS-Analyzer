import type { Resume } from "../../domain/resume/types";

const skillVocabulary = [
  "react",
  "typescript",
  "javascript",
  "node.js",
  "node",
  "mongodb",
  "postgresql",
  "sql",
  "aws",
  "azure",
  "gcp",
  "docker",
  "kubernetes",
  "rest api",
  "rest apis",
  "graphql",
  "python",
  "java",
  "c#",
  "figma",
  "product strategy",
  "user research",
  "data analysis",
  "machine learning",
  "ci/cd",
  "git",
  "html",
  "css",
  "leadership",
  "agile",
  "scrum",
];
const ignoredWords = new Set(
  "about after again also been being from have into more most other should their there these those through under using where which while with your that this will would role team work experience years".split(
    " ",
  ),
);

function normalizeText(value: string) {
  return ` ${value
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()} `;
}

function containsTerm(text: string, term: string) {
  const normalizedText = normalizeText(text);
  const words = normalizeText(term).trim().split(" ");
  const finalWord = words.pop() ?? "";
  const phrase = [...words, finalWord].join(" ");
  const variants = [phrase];
  if (
    finalWord.length > 3 &&
    finalWord.endsWith("s") &&
    !finalWord.endsWith("ss")
  )
    variants.push([...words, finalWord.slice(0, -1)].join(" "));
  else if (finalWord.length > 2 && !finalWord.endsWith("s"))
    variants.push([...words, `${finalWord}s`].join(" "));
  return variants.some((variant) => normalizedText.includes(` ${variant} `));
}

export type AtsResult = {
  score: number;
  potentialPoints: number;
  improvements: {
    title: string;
    detail: string;
    points: number;
  }[];
  categories: {
    label: string;
    score: number;
    maximum: number;
    detail: string;
  }[];
  matched: string[];
  missing: string[];
  suggestions: string[];
  sectionsMissing: string[];
};

function extractTerms(jobDescription: string) {
  const source = jobDescription.toLowerCase();
  const known = skillVocabulary.filter((skill) => source.includes(skill));
  const specificKnown = known.filter(
    (skill) => !known.some((other) => other !== skill && other.includes(skill)),
  );
  if (specificKnown.length > 0) return [...new Set(specificKnown)];
  const words = source.match(/[a-z][a-z+#.-]{3,}/g) ?? [];
  const counts = new Map<string, number>();
  words.forEach((word) => {
    if (!ignoredWords.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);
}

export function analyzeResume(
  resume: Resume,
  jobDescription: string,
): AtsResult {
  const resumeText = [
    resume.profile.headline,
    resume.summary,
    resume.profile.name,
    ...resume.skills,
    ...resume.experience.flatMap((item) => [
      item.role,
      item.company,
      item.description,
    ]),
    ...resume.education.flatMap((item) => [
      item.degree,
      item.institution,
      item.details,
    ]),
    ...resume.projects.flatMap((item) => [item.name, item.description]),
    ...resume.certifications,
    ...resume.achievements,
    ...resume.languages,
  ]
    .join(" ")
    .toLowerCase();
  const terms = extractTerms(jobDescription);
  const matched = terms.filter((term) => containsTerm(resumeText, term));
  const missing = terms.filter((term) => !containsTerm(resumeText, term));
  const presentSections = [
    Boolean(resume.summary.trim()),
    resume.experience.length > 0,
    resume.education.length > 0,
    resume.skills.length > 0,
    Boolean(resume.profile.email.trim()),
  ];
  const sectionsMissing = [
    "Professional summary",
    "Experience",
    "Education",
    "Skills",
    "Email address",
  ].filter((_, index) => !presentSections[index]);
  const sectionScore = Math.round(
    (presentSections.filter(Boolean).length / presentSections.length) * 20,
  );
  const keywordScore = terms.length
    ? Math.round((matched.length / terms.length) * 40)
    : 0;
  const hasContact = Boolean(
    resume.profile.email.trim() && resume.profile.name.trim(),
  );
  const formatScore =
    5 +
    (hasContact ? 5 : 0) +
    (resume.profile.phone || resume.profile.location ? 5 : 0);
  const experienceText = resume.experience
    .map((item) => item.description)
    .join(" ");
  const hasActionLanguage =
    /\b(led|built|created|improved|reduced|increased|delivered|launched|managed|designed|developed)\b/i.test(
      experienceText,
    );
  const hasNumbers = /\d+%?|\$\d+/.test(experienceText);
  const experienceScore =
    (resume.experience.length ? 6 : 0) +
    (hasActionLanguage ? 4 : 0) +
    (hasNumbers ? 5 : 0);
  const readabilityScore =
    resume.summary.trim().length >= 80 && resume.summary.trim().length <= 450
      ? 10
      : resume.summary.trim()
        ? 6
        : 0;
  const score = Math.min(
    100,
    keywordScore +
      sectionScore +
      formatScore +
      experienceScore +
      readabilityScore,
  );
  const suggestions: string[] = [];
  const improvements: AtsResult["improvements"] = [];
  const addImprovement = (title: string, detail: string, points: number) => {
    if (points > 0) improvements.push({ title, detail, points });
  };

  addImprovement(
    "Match relevant job terms",
    missing.length
      ? `Review: ${missing.slice(0, 5).join(", ")}. Include a term only when it accurately describes your skills or experience.`
      : "Add a job description to check role-specific keywords.",
    keywordScore < 40 ? 40 - keywordScore : 0,
  );
  addImprovement(
    "Complete core sections",
    sectionsMissing.length
      ? `Review these sections: ${sectionsMissing.join(", ")}.`
      : "Your summary, experience, education, skills, and email are present.",
    20 - sectionScore,
  );
  const missingContact = [
    !resume.profile.name.trim() && "your name",
    !resume.profile.email.trim() && "an email address",
    !(resume.profile.phone || resume.profile.location) && "phone or location",
  ].filter(Boolean);
  addImprovement(
    "Strengthen contact details",
    missingContact.length
      ? `Add ${missingContact.join(" and ")} so recruiters can identify and contact you.`
      : "Your name, email, and an additional contact detail are present.",
    15 - formatScore,
  );
  addImprovement(
    "Show experience and measurable impact",
    !resume.experience.length
      ? "Add relevant work experience, using action verbs and accurate measurable outcomes where possible."
      : !hasActionLanguage || !hasNumbers
        ? "Use clear action verbs and add accurate numbers, scope, or outcomes to experience bullets."
        : "Your experience includes action language and measurable outcomes.",
    15 - experienceScore,
  );
  addImprovement(
    "Refine the professional summary",
    !resume.summary.trim()
      ? "Add a concise, role-focused summary (ideally 80 to 450 characters)."
      : "Aim for a focused summary between 80 and 450 characters.",
    10 - readabilityScore,
  );

  if (missing.length)
    suggestions.push(
      `Review these job-description terms: ${missing.slice(0, 5).join(", ")}. Add them only where they accurately describe your experience.`,
    );
  if (sectionsMissing.includes("Professional summary"))
    suggestions.push(
      "Add a concise professional summary tailored to the kind of role you want.",
    );
  if (resume.experience.length && !hasNumbers)
    suggestions.push(
      "Where accurate, add measurable scope or outcomes to one or more experience bullets.",
    );
  if (sectionsMissing.includes("Skills"))
    suggestions.push(
      "Add a focused skills section with tools and methods you genuinely use.",
    );
  if (!suggestions.length)
    suggestions.push(
      "Your resume covers the main signals found in this description. Review the role-specific wording for accuracy and clarity.",
    );
  return {
    score,
    potentialPoints: improvements.reduce((sum, item) => sum + item.points, 0),
    improvements,
    categories: [
      {
        label: "Keyword coverage",
        score: keywordScore,
        maximum: 40,
        detail: `${matched.length} of ${terms.length} extracted terms found`,
      },
      {
        label: "Core sections",
        score: sectionScore,
        maximum: 20,
        detail: `${presentSections.filter(Boolean).length} of ${presentSections.length} common sections present`,
      },
      {
        label: "Contact & structure",
        score: formatScore,
        maximum: 15,
        detail: hasContact
          ? "Name and email are present"
          : "Add a name and email address",
      },
      {
        label: "Experience evidence",
        score: experienceScore,
        maximum: 15,
        detail: `${hasActionLanguage ? "Action language" : "Action language missing"} / ${hasNumbers ? "measurable outcomes found" : "few measurable outcomes"}`,
      },
      {
        label: "Summary readability",
        score: readabilityScore,
        maximum: 10,
        detail: resume.summary.trim()
          ? "Summary length checked"
          : "No summary provided",
      },
    ],
    matched,
    missing,
    suggestions,
    sectionsMissing,
  };
}
