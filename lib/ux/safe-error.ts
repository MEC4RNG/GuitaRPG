export type FailureContext =
  | "AUTH"
  | "DELETE"
  | "EXPORT"
  | "PROFILE_READ"
  | "PROFILE_SAVE"
  | "QUEST_SAVE"
  | "SESSION_READ"
  | "SESSION_WRITE"
  | "RESULT_READ"
  | "RESULT_SAVE";

const messages: Record<FailureContext, string> = {
  AUTH: "Account access is temporarily unavailable. Please try again.",
  DELETE: "This Player could not be deleted. You remain signed in and can retry.",
  EXPORT: "Your Player data could not be downloaded. Please try again.",
  PROFILE_READ: "Profile data is unavailable. Please try again.",
  PROFILE_SAVE: "Profile could not be saved. Your changes are still here; please retry.",
  QUEST_SAVE: "This Quest could not be saved. Please retry.",
  SESSION_READ: "This Practice Session is unavailable. Please retry.",
  SESSION_WRITE: "That practice update could not be saved. Please retry.",
  RESULT_READ: "The completion workflow is unavailable. Please retry.",
  RESULT_SAVE: "Your Result could not be saved. Your reflection is still here; please retry.",
};

export function safeErrorMessage(context: FailureContext) {
  return messages[context];
}
