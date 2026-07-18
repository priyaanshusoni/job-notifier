import { Preference } from "../generated/prisma/client";

export type PreferenceInput = Omit<
  Preference,
  "userId" | "id" | "createdAt" | "updatedAt"
>;
