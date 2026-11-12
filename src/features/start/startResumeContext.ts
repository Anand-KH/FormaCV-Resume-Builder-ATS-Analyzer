import { createContext, useContext } from "react";
import type { ResumeTemplate } from "../../domain/resume/types";

/** Route segment for a resume that hasn't been saved yet. */
export const NEW_RESUME_ID = "new";

/** Route for an unsaved draft; the editor saves it on the first edit. */
export function newResumePath(template?: ResumeTemplate) {
  return template
    ? `/resume/${NEW_RESUME_ID}?template=${template}`
    : `/resume/${NEW_RESUME_ID}`;
}

export type StartResumeContextValue = {
  /** Open the "Start a resume" dialog (blank, import, or template). */
  openStartResume: () => void;
};

export const StartResumeContext = createContext<StartResumeContextValue | null>(
  null,
);

export function useStartResume() {
  const context = useContext(StartResumeContext);
  if (!context)
    throw new Error("useStartResume must be used inside StartResumeProvider.");
  return context;
}
