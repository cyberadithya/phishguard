import type { AnalysisResult, EmailData } from "./types.js";

export const MESSAGE_TYPES = {
  GET_CURRENT_EMAIL: "GET_CURRENT_EMAIL",
  ANALYZE_EMAIL: "ANALYZE_EMAIL",
  EMAIL_UPDATED: "EMAIL_UPDATED",
} as const;

export interface GetCurrentEmailResponse {
  email: EmailData | null;
  emailKey: string | null;
}

export interface AnalyzeEmailRequest {
  email: EmailData;
  emailKey: string;
}

export interface AnalyzeEmailResponse {
  result: AnalysisResult;
  emailKey: string;
}

export interface EmailUpdatedMessage {
  type: typeof MESSAGE_TYPES.EMAIL_UPDATED;
  emailKey: string;
  result: AnalysisResult;
}
