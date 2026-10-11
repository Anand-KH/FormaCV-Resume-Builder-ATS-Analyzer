# FormaCV

FormaCV is a browser-based resume builder and ATS checker. Create a resume from scratch or import an existing document, edit and format its sections, preview the result, and print it or save it as a PDF. Resume data is stored locally in the browser; no account is required.

## Features

- Create, edit, rename, duplicate, and delete resumes from the workspace.
- Import resumes from PDF, DOCX, and TXT files into editable resume fields.
- Organize and reorder resume sections, and hide sections from the final document.
- Choose from nine templates: Modern, Classic, ATS, Editorial, Studio, Signature, Professional, Minimal, and Executive.
- Adjust accent color, typeface, text size, line spacing, margins, heading style, and section alignment.
- Add multiple experience, education, project, certification, achievement, and custom-section entries.
- Format experience and project descriptions as bullets, numbered lists, dashes, or plain text.
- Preview changes live, open website and LinkedIn links, and print or save the resume as a PDF.
- Check an uploaded or saved resume against a job description. View the score breakdown, matched and missing terms, and prioritized improvement suggestions.
- Keep resumes and version history in browser storage using IndexedDB.

## Technology

- **Languages:** TypeScript, JavaScript, HTML, CSS
- **UI:** React 19, Material UI, Emotion
- **Build and development:** Vite
- **Routing:** React Router
- **Forms and validation:** React Hook Form, Zod
- **Drag-and-drop:** dnd-kit
- **Local storage:** IndexedDB with `idb`
- **Document import:** PDF.js (PDF), Mammoth (DOCX), browser File API (TXT)
- **Testing and quality:** Vitest, Testing Library, ESLint, TypeScript

## Requirements

- Node.js and npm
- A modern browser with IndexedDB support

## Getting started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal.

## Available commands

| Command             | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the Vite development server                  |
| `npm run build`     | Create a production build in `dist/`               |
| `npm run preview`   | Preview the production build locally               |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |
| `npm run lint`      | Run ESLint                                         |
| `npm test`          | Run the Vitest test suite                          |

## Application routes

- `/` — Product landing page
- `/dashboard` — Resume workspace
- `/resume/:resumeId` — Resume editor and live preview
- `/ats` — ATS checker

## Import and ATS notes

- PDF imports require selectable text. Scanned PDFs and image-only documents are not OCR-supported.
- Resume import is limited to 20 MB per file.
- ATS analysis runs in the browser and requires a job description to calculate role-specific keyword coverage.
- The ATS score is an explainable heuristic, not a prediction or guarantee of how a specific employer's applicant-tracking system will rank a resume.
- Resume content and imported files are not uploaded to a project backend. Clearing browser data can remove locally stored resumes and history, so keep exported copies of important documents.

## Project layout

```text
src/
  domain/resume/          Resume model and IndexedDB repository
  features/dashboard/     Resume workspace and import flow
  features/resume-editor/ Resume editing, ordering, and preview workflow
  features/resume-import/ PDF, DOCX, and TXT parsing
  features/ats-checker/   ATS score analysis and results
  features/templates/     Resume document renderer
```
