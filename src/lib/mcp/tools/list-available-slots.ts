import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSubject } from "@/lib/booking-data";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_available_slots",
  title: "List available time slots",
  description:
    "List the weekly time slots, tutors and modality (Presencial/Online/Ambas) available for a subject.",
  inputSchema: {
    subject_slug: z.string().describe("Subject slug from list_subjects, e.g. 'algoritmos'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ subject_slug }, ctx) => {
    const subject = getSubject(subject_slug);
    if (!subject) throw new ToolError(`Unknown subject: ${subject_slug}`);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, primeiro_nome, ultimo_nome, disciplinas, disponibilidade, disponibilidade_modo")
      .eq("tipo", "tutor")
      .contains("disciplinas", [subject.name]);
    if (error) throw new ToolError(error.message);
    const slots = [
      ...subject.slots.map((s) => ({
        day: s.day,
        time: s.time,
        tutor: s.tutor,
        tutor_id: null as string | null,
        mode: String(s.mode),
      })),
      ...(data ?? []).flatMap((t) => {
        const modes = (t.disponibilidade_modo ?? {}) as Record<string, string>;
        return (t.disponibilidade ?? []).map((k) => {
          const [day, time] = k.split("|");
          return {
            day,
            time,
            tutor: `${t.primeiro_nome} ${t.ultimo_nome}`,
            tutor_id: t.id as string | null,
            mode: modes[k] ?? "Presencial",
          };
        });
      }),
    ];
    return {
      content: [{ type: "text", text: JSON.stringify(slots) }],
      structuredContent: { subject: subject.name, slots },
    };
  },
});
