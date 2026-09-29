import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, GraduationCap } from "lucide-react";
import { BOOKING_SUBJECTS } from "@/lib/booking-data";
import { requireLogin } from "@/lib/auth";

export const Route = createFileRoute("/agendar/")({
  ssr: false,
  beforeLoad: ({ location }) => requireLogin(location.href),
  head: () => ({
    meta: [
      { title: "Escolher disciplina — TutorIscte" },
      {
        name: "description",
        content:
          "Passo 1 de 2: escolhe a disciplina para a tua sessão de explicações com um tutor do ISCTE.",
      },
      { property: "og:title", content: "Escolher disciplina — TutorIscte" },
      {
        property: "og:description",
        content: "Escolhe a disciplina e avança para os horários disponíveis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChooseSubjectPage,
});

function ChooseSubjectPage() {
  return (
    <div className="min-h-screen bg-tint">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              Tutor<span className="text-primary">Iscte</span>
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-semibold text-primary">Passo 1 de 2</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Escolhe a disciplina
        </h1>
        <p className="mt-3 max-w-xl text-lg text-muted-foreground">
          Seleciona a cadeira em que precisas de ajuda. No passo seguinte vês os horários e tutores
          disponíveis.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BOOKING_SUBJECTS.map((subject) => (
            <Link
              key={subject.slug}
              to="/agendar/$disciplina"
              params={{ disciplina: subject.slug }}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <subject.icon className="size-6" />
              </span>
              <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
                {subject.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {subject.description}
              </p>
              <span className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm font-semibold text-primary">
                {subject.slots.length} horários disponíveis
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
