const SKIP_KEY = "formacv.skipPdfGuide";

/** Whether the viewer asked not to see the Save as PDF guide again (per browser). */
export function shouldSkipPdfGuide() {
  try {
    return window.localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberSkipPdfGuide(skip: boolean) {
  try {
    if (skip) window.localStorage.setItem(SKIP_KEY, "1");
    else window.localStorage.removeItem(SKIP_KEY);
  } catch {
    // Storage unavailable (private mode etc.): the guide just shows again.
  }
}
