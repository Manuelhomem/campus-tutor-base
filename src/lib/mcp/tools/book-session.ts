import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSubject } from "@/lib/booking-data";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "book_session",
  title: "Book a tutoring session",
  description: "Book a tutoring session for the signed-in student in a slot returned by list_available_slots.",
  inputSchema: {
    subject_slug: z.string().describe("Subject slug, e.g. 'matematica'."),
    day: z.string().describe("Weekday as returned by list_available_slots, e.g. 'Terça'."),
    time: z.string().describe("Time as returned by list_available_slots, e.g. '15:00'."),
    tutor: z.string().describe("Tutor name from the slot."),
    tutor_id: z.string().nullable().optional().describe("tutor_id from the slot, if any."),
    mode: z.enum(["Presencial", "Online"]).describe("Chosen modality."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ subject_slug, day, time, tutor, tutor_id, mode }, ctx) => {
    const subject = getSubject(subject_slug);
    if (!subject) throw new ToolError(`Unknown subject: ${subject_slug}`);
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const { data: me } = await supabase.from("profiles").select("primeiro_nome, ultimo_nome").eq("id", userId!).maybeSingle();
    if (!me) throw new ToolError("No TutorIscte profile found for this account.");
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        student_id: userId!,
        student_name: `${me.primeiro_nome} ${me.ultimo_nome}`,
        tutor_id: tutor_id ?? null,
        tutor_name: tutor,
        subject: subject.name,
        day,
        time,
        mode,
      })
      .select("id, subject, tutor_name, day, time, mode")
      .single();
    if (error) throw new ToolError(error.message);
    return { content: [{ type: "text", text: `Booked ${data.subject} with ${data.tutor_name} on ${data.day} at ${data.time} (${data.mode}).` }], structuredContent: { booking: data } };
  },
});
