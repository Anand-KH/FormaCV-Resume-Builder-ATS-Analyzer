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

  it("skips snapshots newer than minIntervalMs", async () => {
    const resume = createEmptyResume();
    await resumeRepository.addVersion(resume);
    await resumeRepository.addVersion(
      { ...resume, summary: "Changed" },
      { minIntervalMs: 60_000 },
    );
    expect(await resumeRepository.versions(resume.id)).toHaveLength(1);

    await resumeRepository.addVersion({ ...resume, summary: "Changed" });
    expect(await resumeRepository.versions(resume.id)).toHaveLength(2);
    await resumeRepository.remove(resume.id);
  });

  it("keeps at most 20 snapshots under concurrent writes", async () => {
    const resume = createEmptyResume();
    await Promise.all(
      Array.from({ length: 30 }, (_, index) =>
        resumeRepository.addVersion({ ...resume, summary: `v${index}` }),
      ),
    );
    expect(await resumeRepository.versions(resume.id)).toHaveLength(20);
    await resumeRepository.remove(resume.id);
  });

  it("round-trips resumes and history through a backup", async () => {
    const resume = createEmptyResume();
    resume.summary = "Backed up";
    await resumeRepository.save(resume);
    await resumeRepository.addVersion(resume);

    const backup = await resumeRepository.exportBackup([resume.id]);
    expect(backup.resumes).toHaveLength(1);
    expect(backup.versions).toHaveLength(1);

    await resumeRepository.remove(resume.id);
    expect(await resumeRepository.importBackup(backup)).toEqual({
      added: 1,
      updated: 0,
      skipped: 0,
    });
    expect((await resumeRepository.get(resume.id))?.summary).toBe("Backed up");
    expect(await resumeRepository.versions(resume.id)).toHaveLength(1);
    await resumeRepository.remove(resume.id);
  });

  it("only overwrites an existing resume with a newer backup copy", async () => {
    const resume = createEmptyResume();
    resume.updatedAt = "2026-01-02T00:00:00.000Z";
    resume.summary = "Local";
    await resumeRepository.save(resume);
    const backupOf = (summary: string, updatedAt: string) => ({
      format: "formacv-backup",
      version: 1,
      exportedAt: updatedAt,
      resumes: [{ ...resume, summary, updatedAt }],
      versions: [],
    });

    const older = await resumeRepository.importBackup(
      backupOf("Older", "2026-01-01T00:00:00.000Z"),
    );
    expect(older.skipped).toBe(1);
    expect((await resumeRepository.get(resume.id))?.summary).toBe("Local");

    const newer = await resumeRepository.importBackup(
      backupOf("Newer", "2026-01-03T00:00:00.000Z"),
    );
    expect(newer.updated).toBe(1);
    expect((await resumeRepository.get(resume.id))?.summary).toBe("Newer");
    await resumeRepository.remove(resume.id);
  });

  it("rejects files that are not backups and skips invalid entries", async () => {
    await expect(
      resumeRepository.importBackup({ hello: "world" }),
    ).rejects.toThrow("not a FormaCV backup");
    const result = await resumeRepository.importBackup({
      format: "formacv-backup",
      version: 1,
      exportedAt: "",
      resumes: [{ id: "broken" }],
      versions: [],
    });
    expect(result).toEqual({ added: 0, updated: 0, skipped: 1 });
  });
});
