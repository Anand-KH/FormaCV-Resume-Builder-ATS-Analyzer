# FormaCV

FormaCV is a browser-based resume builder and ATS checker. Create a resume from scratch or import an existing document, edit and format its sections, preview the result, and print it or save it as a PDF. Resume data is stored locally in the browser; no account is required.

## Features

- Start a resume from a blank page, a template, or an imported file from one "Start a resume" dialog. A new resume is only saved once you make your first edit.
- Create, edit, rename, duplicate, and delete resumes from the workspace, with undo after a delete.
- Import resumes from PDF, DOCX, and TXT files into editable resume fields.
- Tailor a resume for a job: save the job description with the resume and use the editor's **Job match** panel for a live score, missing terms, and suggestions that jump to the section to fix. "Tailor for a job" on the dashboard creates a linked copy in one step.
- Organize and reorder resume sections, and hide sections from the final document.
- Choose from nine templates: Modern, Classic, ATS, Editorial, Studio, Signature, Professional, Minimal, and Executive.
- Adjust accent color, typeface, text size, line spacing, margins, heading style, and section alignment.
- Add an optional profile photo. It is cropped and compressed in the browser, and each template places it differently (the ATS template never shows it).
- Add multiple experience, education, project, certification, achievement, and custom-section entries.
- Format experience and project descriptions as bullets, numbered lists, dashes, or plain text.
- Preview changes live, open website and LinkedIn links, and print or save the resume as a PDF.
- Check an uploaded or saved resume against a job description. View the score breakdown, matched and missing terms, and prioritized improvement suggestions.
- Keep resumes and version history in browser storage using IndexedDB, export them as a JSON backup, and import that backup in another browser or on another device.
- Returning visitors in the same browser can jump straight back into their last resume from the landing page.

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
- `/resume/new` — Unsaved draft (optionally `?template=<name>`); becomes `/resume/:resumeId` on the first edit
- `/resume/:resumeId` — Resume editor with live preview and job match
- `/ats` — ATS checker

## Import and ATS notes

- PDF imports require selectable text. Scanned PDFs and image-only documents are not OCR-supported.
- Resume import is limited to 20 MB per file.
- ATS analysis runs in the browser and requires a job description to calculate role-specific keyword coverage.
- The ATS score is an explainable heuristic, not a prediction or guarantee of how a specific employer's applicant-tracking system will rank a resume.
- Resume content and imported files are not uploaded to a project backend. Data lives in this browser's IndexedDB: it is not shared across browsers or devices, is removed when site data is cleared or a private window closes, and may be evicted by some browsers (for example Safari after a period of inactivity). The app asks the browser for persistent storage, but use **Backup → Export backup** to keep a copy.

## Project layout

```text
src/
  domain/resume/          Resume model and IndexedDB repository
  features/dashboard/     Resume workspace and import flow
  features/resume-editor/ Resume editing, ordering, and preview workflow
  features/resume-import/ PDF, DOCX, and TXT parsing
  features/ats-checker/   ATS score analysis and results
  features/start/         "Start a resume" dialog (blank, template, import)
  features/templates/     Resume document renderer
```
