import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { resumeRepository } from "./repository";
import { createEmptyResume } from "./types";

describe("IndexedDB resume repository", () => {
  it("saves, lists, and removes resumes", async () => {
    const resume = createEmptyResume();
    await resumeRepository.save(resume);

    expect(await resumeRepository.get(resume.id)).toEqual(resume);
    expect(
      (await resumeRepository.list()).some((item) => item.id === resume.id),
    ).toBe(true);

    await resumeRepository.remove(resume.id);
    expect(await resumeRepository.get(resume.id)).toBeUndefined();
  });

  it("stores and restores snapshots", async () => {
    const resume = createEmptyResume();
    resume.summary = "Original summary";
    await resumeRepository.save(resume);
    await resumeRepository.addVersion(resume);
    await resumeRepository.addVersion({
      ...resume,
      updatedAt: new Date(Date.now() + 1000).toISOString(),
    });

    const versions = await resumeRepository.versions(resume.id);
    const [version] = versions;
    const restored = await resumeRepository.restoreVersion(version.id);

    expect(version.resume.summary).toBe("Original summary");
    expect(versions).toHaveLength(1);
    expect(restored?.summary).toBe("Original summary");
    await resumeRepository.remove(resume.id);
  });
});
