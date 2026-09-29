import { defineTool } from "@lovable.dev/mcp-js";
import { BOOKING_SUBJECTS } from "@/lib/booking-data";

export default defineTool({
  name: "list_subjects",
  title: "List subjects",
  description: "List the subjects students can book tutoring sessions for.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const subjects = BOOKING_SUBJECTS.map((s) => ({ slug: s.slug, name: s.name }));
    return {
      content: [{ type: "text", text: JSON.stringify(subjects) }],
      structuredContent: { subjects },
    };
  },
});
