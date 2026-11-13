// Runs after `vite build`. Surge serves files as-is, so this creates:
// - dist/200.html: served for any path Surge doesn't have, so deep links and
//   refreshes (/dashboard, /resume/:id) load the app instead of a 404.
// - dist/ats.html: the ATS checker page (Surge serves it at /ats) with its own
//   title, description, and canonical URL in the HTML, so search engines and
//   link previews see the right text without running JavaScript.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const indexPath = join(dist, "index.html");
if (!existsSync(indexPath)) throw new Error("dist/index.html not found. Run the build first.");

copyFileSync(indexPath, join(dist, "200.html"));

const escape = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function withPageMeta(html, { title, description, url }) {
  const replaced = { count: 0 };
  const sub = (pattern, value) => {
    html = html.replace(pattern, (_, start, end) => {
      replaced.count += 1;
      return `${start}${escape(value)}${end}`;
    });
  };
  sub(/(<title>)[^<]*(<\/title>)/, title);
  sub(/(<meta\s+name="description"\s+content=")[^"]*(")/, description);
  sub(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, url);
  sub(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, url);
  sub(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, title);
  sub(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, description);
  sub(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, title);
  sub(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, description);
  if (replaced.count !== 8) throw new Error(`Expected to update 8 tags, updated ${replaced.count}. Check index.html.`);
  return html;
}

const index = readFileSync(indexPath, "utf8");
const site = index.match(/<link\s+rel="canonical"\s+href="([^"]+)\/"/)?.[1];
if (!site) throw new Error("Could not read the canonical site URL from index.html.");

writeFileSync(
  join(dist, "ats.html"),
  withPageMeta(index, {
    title: "Free ATS Resume Checker: Score Your Resume Against Any Job | FormaCV",
    description:
      "Check your resume against a job description for free. Get an ATS score, matched and missing keywords, and clear fixes. Upload a PDF, DOCX, or TXT; it is analyzed in your browser and never uploaded.",
    url: `${site}/ats`,
  }),
);
console.log("Static pages ready: dist/200.html, dist/ats.html");
