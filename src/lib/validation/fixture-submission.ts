import { z } from "zod";

export const fixtureSubmissionSchema = z
  .object({
    competitionId: z.string().uuid({ message: "Choose a competition." }),
    homeTeamName: z
      .string()
      .trim()
      .min(2, "Enter the home team name.")
      .max(100, "Keep it under 100 characters."),
    awayTeamName: z
      .string()
      .trim()
      .min(2, "Enter the away team name.")
      .max(100, "Keep it under 100 characters."),
    date: z.string().min(1, "Pick a date."),
    time: z.string().min(1, "Pick a kickoff time."),
    venueName: z
      .string()
      .trim()
      .min(2, "Enter a venue name.")
      .max(150, "Keep it under 150 characters."),
    proofUrl: z
      .string()
      .trim()
      .url("Enter a valid URL (e.g. a club website or social post)."),
  })
  .refine(
    (data) => data.homeTeamName.toLowerCase() !== data.awayTeamName.toLowerCase(),
    { message: "Home and away teams must be different.", path: ["awayTeamName"] },
  );

export type FixtureSubmissionInput = z.infer<typeof fixtureSubmissionSchema>;

export interface SubmitFixtureState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialSubmitFixtureState: SubmitFixtureState = { status: "idle" };
