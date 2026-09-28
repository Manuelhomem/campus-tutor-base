import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_sessions",
  title: "List my sessions",
  description: "List the signed-in user's tutoring sessions, both as student and as tutor.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const { data, error } = await supabase
      .from("bookings")
      .select("id, student_id, student_name, tutor_name, subject, day, time, mode")
      .order("created_at");
    if (error) throw new ToolError(error.message);
    const sessions = (data ?? []).map((b) => ({
      id: b.id,
      role: b.student_id === userId ? "student" : "tutor",
      subject: b.subject,
      tutor: b.tutor_name,
      student: b.student_name,
      day: b.day,
      time: b.time,
      mode: b.mode,
    }));
    return { content: [{ type: "text", text: JSON.stringify(sessions) }], structuredContent: { sessions } };
  },
});
