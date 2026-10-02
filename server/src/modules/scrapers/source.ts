import { NormalizedJob, SearchProfile } from "../../lib/types";

/**
 * A pluggable job source. Additional providers (Adzuna, etc.) implement this
 * interface and get registered in the scheduler without touching the pipeline.
 */
export interface JobSource {
  name: string;
  search(profile: SearchProfile): Promise<NormalizedJob[]>;
}

/** Stable signature so identical searches are fetched once per pipeline run. */
export function profileSignature(profile: SearchProfile): string {
  const roles = [...profile.roles].sort().join("|").toLowerCase();
  const locations = [...profile.locations].sort().join("|").toLowerCase();
  return `${roles}::${locations}::${profile.recency}`;
}
