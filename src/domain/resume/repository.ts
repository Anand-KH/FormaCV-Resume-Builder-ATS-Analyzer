import { openDB, type IDBPDatabase } from "idb";
import type { Resume, ResumeVersion } from "./types";

export interface ResumeRepository {
  list(): Promise<Resume[]>;
  get(id: string): Promise<Resume | undefined>;
  save(resume: Resume): Promise<void>;
  remove(id: string): Promise<void>;
  versions(resumeId: string): Promise<ResumeVersion[]>;
  addVersion(resume: Resume): Promise<void>;
  restoreVersion(versionId: string): Promise<Resume | undefined>;
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

  async addVersion(resume: Resume) {
    const database = await this.database;
    const previous = await this.versions(resume.id);
    const comparable = (value: Resume) =>
      JSON.stringify({ ...value, updatedAt: "" });
    if (previous[0] && comparable(previous[0].resume) === comparable(resume))
      return;
    const transaction = database.transaction("versions", "readwrite");
    const version: ResumeVersion = {
      id: crypto.randomUUID(),
      resumeId: resume.id,
      createdAt: new Date().toISOString(),
      resume: structuredClone(resume),
    };
    await transaction.store.put(version);
    for (const stale of previous.slice(19))
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
}

export const resumeRepository: ResumeRepository =
  new IndexedDbResumeRepository();
