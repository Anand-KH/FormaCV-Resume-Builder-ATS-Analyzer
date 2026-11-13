import { useEffect } from "react";

/** Public site address, from VITE_SITE_URL in .env. */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ?? "https://formacv.surge.sh"
).replace(/\/$/, "");

export const DEFAULT_TITLE =
  "FormaCV — Free Resume Builder & ATS Resume Checker";
export const DEFAULT_DESCRIPTION =
  "Build a professional resume for free with 9 templates, check it against any job description with an ATS score, and export a PDF that ATS software can read. No sign-up: your data stays in your browser.";

export type PageMeta = {
  title: string;
  description?: string;
  /** Path for the canonical URL, e.g. "/ats". Omit for pages that shouldn't be indexed. */
  path?: string;
  /** Keep this page out of search results (private, per-browser pages). */
  noindex?: boolean;
};

function setMetaContent(attribute: "name" | "property", key: string, value: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.content = value;
}

function setCanonical(url: string | null) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!url) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
}

/**
 * Set this page's title, description, canonical URL, social-preview text,
 * and indexing rule. The single-page app serves one HTML file, so each route
 * updates these tags when it mounts.
 */
export function usePageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  noindex = false,
}: PageMeta) {
  useEffect(() => {
    document.title = title;
    setMetaContent("name", "description", description);
    setMetaContent("property", "og:title", title);
    setMetaContent("property", "og:description", description);
    setMetaContent("name", "twitter:title", title);
    setMetaContent("name", "twitter:description", description);
    setMetaContent("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    const url = !noindex && path ? `${SITE_URL}${path}` : null;
    setCanonical(url);
    if (url) setMetaContent("property", "og:url", url);
  }, [title, description, path, noindex]);
}
