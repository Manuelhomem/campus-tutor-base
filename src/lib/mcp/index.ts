import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSubjects from "./tools/list-subjects";
import listAvailableSlots from "./tools/list-available-slots";
import bookSession from "./tools/book-session";
import listMySessions from "./tools/list-my-sessions";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "tutor-connect-hub",
  title: "Tutor Connect Hub",
  version: "0.1.0",
  instructions:
    "TutorIscte tutoring bookings. Use `list_subjects`, then `list_available_slots` for a subject, then `book_session` to book. Use `list_my_sessions` to see upcoming sessions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSubjects, listAvailableSlots, bookSession, listMySessions],
});
