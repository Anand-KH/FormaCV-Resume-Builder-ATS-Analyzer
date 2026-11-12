import { openDB, type IDBPDatabase } from "idb";
import {
  normalizeResume,
  resumeSchema,
  type Resume,
  type ResumeVersion,
} from "./types";

const MAX_VERSIONS = 20;

export interface AddVersionOptions {
  /** Skip the snapshot if the latest one is newer than this many milliseconds. */
  minIntervalMs?: number;
}

export const BACKUP_FORMAT = "formacv-backup";

export type ResumeBackup = {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  resumes: Resume[];
  versions: ResumeVersion[];
};

export type BackupImportResult = {
  added: number;
  updated: number;
  skipped: number;
};

let persistenceRequested = false;

/**
 * Ask the browser to treat this site's storage as persistent so it isn't
 * evicted under storage pressure. Best effort: unsupported or denied is fine.
 */
function requestPersistentStorage() {
  if (persistenceRequested) return;
  persistenceRequested = true;
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
  void navigator.storage
    .persisted()
    .then((persisted) => (persisted ? true : navigator.storage.persist()))
    .catch(() => undefined);
}

function parseResume(value: unknown): Resume | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Resume;
  const parsed = resumeSchema.safeParse(
    normalizeResume({ ...candidate, design: candidate.design ?? {} } as Resume),
  );
  return parsed.success ? parsed.data : undefined;
}

export interface ResumeRepository {
  list(): Promise<Resume[]>;
  get(id: string): Promise<Resume | undefined>;
  save(resume: Resume): Promise<void>;
  remove(id: string): Promise<void>;
  versions(resumeId: string): Promise<ResumeVersion[]>;
  addVersion(resume: Resume, options?: AddVersionOptions): Promise<void>;
  restoreVersion(versionId: string): Promise<Resume | undefined>;
  /** Snapshot resumes (all, or the given ids) and their history as a backup. */
  exportBackup(resumeIds?: string[]): Promise<ResumeBackup>;
  /**
   * Merge a backup into this browser. A resume that already exists is only
   * replaced when the backup copy is newer.
   */
  importBackup(backup: unknown): Promise<BackupImportResult>;
}

type ResumeDatabase = IDBPDatabase;

class IndexedDbResumeRepository implements ResumeRepository {
  private database: Promise<ResumeDatabase> = openDB("formacv-resumes", 1, {
    upgrade(database) {
      database.createObjectStore("resumes", { keyPath: "id" });
      const versions = database.createObjectStore("versions", {
        keyPath: "id",
      });
      versions.createIndex("resumeId", "resumeId");
    },
  });

  async list() {
    const database = await this.database;
    const resumes = (await database.getAll("resumes")) as Resume[];
    return resumes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    return (await this.database).get("resumes", id) as Promise<
      Resume | undefined
    >;
  }

  async save(resume: Resume) {
    requestPersistentStorage();
    await (await this.database).put("resumes", resume);
  }

  async remove(id: string) {
    const database = await this.database;
    const transaction = database.transaction(
      ["resumes", "versions"],
      "readwrite",
    );
    await transaction.objectStore("resumes").delete(id);
    const versions = await transaction
      .objectStore("versions")
      .index("resumeId")
      .getAllKeys(id);
    await Promise.all(
      versions.map((key) => transaction.objectStore("versions").delete(key)),
    );
    await transaction.done;
  }

  async versions(resumeId: string) {
    const database = await this.database;
    const entries = (await database.getAllFromIndex(
      "versions",
      "resumeId",
      resumeId,
    )) as ResumeVersion[];
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addVersion(resume: Resume, options: AddVersionOptions = {}) {
    const database = await this.database;
    // Read and write in one transaction so concurrent saves can't both pass
    // the duplicate check or miss stale entries during pruning.
    const transaction = database.transaction("versions", "readwrite");
    const previous = (
      (await transaction.store
        .index("resumeId")
        .getAll(resume.id)) as ResumeVersion[]
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = previous[0];
    const comparable = (value: Resume) =>
      JSON.stringify({ ...value, updatedAt: "" });
    const now = Date.now();
    const tooRecent =
      latest !== undefined &&
      options.minIntervalMs !== undefined &&
      now - Date.parse(latest.createdAt) < options.minIntervalMs;
    if (
      (latest && comparable(latest.resume) === comparable(resume)) ||
      tooRecent
    ) {
      await transaction.done;
      return;
    }
    const version: ResumeVersion = {
      id: crypto.randomUUID(),
      resumeId: resume.id,
      createdAt: new Date(now).toISOString(),
      resume: structuredClone(resume),
    };
    await transaction.store.put(version);
    for (const stale of previous.slice(MAX_VERSIONS - 1))
      await transaction.store.delete(stale.id);
    await transaction.done;
  }

  async restoreVersion(versionId: string) {
    const version = (await (await this.database).get("versions", versionId)) as
      | ResumeVersion
      | undefined;
    return version
      ? {
          ...structuredClone(version.resume),
          updatedAt: new Date().toISOString(),
        }
      : undefined;
  }

  async exportBackup(resumeIds?: string[]): Promise<ResumeBackup> {
    const database = await this.database;
    const wanted = resumeIds ? new Set(resumeIds) : undefined;
    const resumes = ((await database.getAll("resumes")) as Resume[]).filter(
      (resume) => !wanted || wanted.has(resume.id),
    );
    const versions = (
      (await database.getAll("versions")) as ResumeVersion[]
    ).filter((version) => !wanted || wanted.has(version.resumeId));
    return {
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: new Date().toISOString(),
      resumes,
      versions,
    };
  }

  async importBackup(backup: unknown): Promise<BackupImportResult> {
    if (
      !backup ||
      typeof backup !== "object" ||
      (backup as ResumeBackup).format !== BACKUP_FORMAT ||
      !Array.isArray((backup as ResumeBackup).resumes)
    )
      throw new Error("This file is not a FormaCV backup.");
    const source = backup as ResumeBackup;
    const result: BackupImportResult = { added: 0, updated: 0, skipped: 0 };
    const resumes = source.resumes.map(parseResume);
    const versions = (
      Array.isArray(source.versions) ? source.versions : []
    ).flatMap((version) => {
      const resume = parseResume(version?.resume);
      return resume &&
        typeof version.id === "string" &&
        typeof version.resumeId === "string" &&
        typeof version.createdAt === "string"
        ? [{ ...version, resume }]
        : [];
    });

    requestPersistentStorage();
    const database = await this.database;
    const transaction = database.transaction(
      ["resumes", "versions"],
      "readwrite",
    );
    const resumeStore = transaction.objectStore("resumes");
    const importedIds = new Set<string>();
    for (const resume of resumes) {
      if (!resume) {
        result.skipped += 1;
        continue;
      }
      const existing = (await resumeStore.get(resume.id)) as
        | Resume
        | undefined;
      if (existing && existing.updatedAt >= resume.updatedAt) {
        result.skipped += 1;
        continue;
      }
      await resumeStore.put(resume);
      importedIds.add(resume.id);
      result[existing ? "updated" : "added"] += 1;
    }
    const versionStore = transaction.objectStore("versions");
    for (const version of versions)
      if (importedIds.has(version.resumeId)) await versionStore.put(version);
    await transaction.done;
    return result;
  }
}

export const resumeRepository: ResumeRepository =
  new IndexedDbResumeRepository();
