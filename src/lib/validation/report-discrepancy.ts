import { z } from "zod";

export const reportDiscrepancySchema = z.object({
  fixtureId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "Explain what's wrong (at least 10 characters).")
    .max(500, "Keep it under 500 characters."),
  proofUrl: z.string().trim().url("Enter a valid source URL."),
});

export interface ReportDiscrepancyState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialReportDiscrepancyState: ReportDiscrepancyState = { status: "idle" };
