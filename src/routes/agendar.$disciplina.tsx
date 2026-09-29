import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  MapPin,
  Video,
} from "lucide-react";
import { CAL_BOOKING_URL, DAYS, getSubject, type Slot } from "@/lib/booking-data";
import { addBooking, getAccounts, getCurrentUser, requireLogin } from "@/lib/auth";

export const Route = createFileRoute("/agendar/$disciplina")({
  ssr: false,
  beforeLoad: ({ location }) => requireLogin(location.href),
  head: ({ params }) => {
    const subject = getSubject(params.disciplina);
    const name = subject?.name ?? "Disciplina";
    return {
      meta: [
        { title: `Horários de ${name} — TutorIscte` },
        {
          name: "description",
          content: `Passo 2 de 2: escolhe o horário e o tutor para a tua sessão de ${name} no ISCTE.`,
        },
        { property: "og:title", content: `Horários de ${name} — TutorIscte` },
        {
          property: "og:description",
          content: `Vê os horários e tutores disponíveis para ${name} e confirma a tua marcação.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: SchedulePage,
});

function SchedulePage() {
  const { disciplina } = Route.useParams();
  const subject = getSubject(disciplina);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [confirmed, setConfirmed] = useState<Slot | null>(null);
  const [chosenMode, setChosenMode] = useState<"Presencial" | "Online">("Presencial");

  const allSlots: Slot[] = subject
    ? [
        ...subject.slots,
        ...getAccounts()
          .filter((a) => a.tipo === "tutor" && a.disciplinas?.includes(subject.name))
          .flatMap((a) =>
            (a.disponibilidade ?? []).map((k) => {
              const [day, time] = k.split("|");
              return {
                day: day ?? "Segunda",
                time: time ?? "10:00",
                tutor: `${a.primeiroNome} ${a.ultimoNome}`,
                tutorEmail: a.email,
                mode: a.disponibilidadeModo?.[k] ?? "Presencial",
              } as Slot;
            }),
          ),
      ]
    : [];

  if (!subject) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-tint px-6 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Disciplina não encontrada
        </h1>
        <Link
          to="/agendar"
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Ver disciplinas
        </Link>
      </div>
    );
  }

  const effectiveSelectedMode =
    selected?.mode === "Ambas" ? chosenMode : (selected?.mode ?? "Presencial");

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
            to="/agendar"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Mudar disciplina
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        {confirmed ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-7" />
            </span>
            <h1 className="mt-6 font-display text-2xl font-bold text-foreground sm:text-3xl">
              Sessão marcada!
            </h1>
            <p className="mt-3 text-muted-foreground">
              {subject.name} com{" "}
              <span className="font-semibold text-foreground">{confirmed.tutor}</span> —{" "}
              {confirmed.day} às {confirmed.time} (
              <span className="font-semibold text-foreground">{confirmed.mode}</span>). Vais receber
              a confirmação por email.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={CAL_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Abrir marcação no Cal.com
                <ExternalLink className="size-4" />
              </a>
              <Link
                to="/agendar"
                className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Marcar outra sessão
              </Link>
              <Link
                to="/dashboard"
                className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Ver o meu painel
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-primary">Passo 2 de 2</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Horários de {subject.name}
            </h1>
            <p className="mt-3 max-w-xl text-lg text-muted-foreground">
              Escolhe o horário que te der mais jeito e confirma a marcação com o tutor.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {DAYS.map((day) => {
                const slots = allSlots
                  .filter((s) => s.day === day)
                  .sort((a, b) => a.time.localeCompare(b.time));
                return (
                  <div key={day} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
                      {day}
                    </h2>
                    <div className="mt-3 space-y-2">
                      {slots.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sem horários</p>
                      ) : (
                        slots.map((slot) => {
                          const isSelected =
                            selected?.day === slot.day &&
                            selected?.time === slot.time &&
                            selected?.tutor === slot.tutor;
                          return (
                            <button
                              key={`${slot.day}-${slot.time}-${slot.tutor}`}
                              type="button"
                              onClick={() => {
                                setSelected(slot);
                                if (slot.mode === "Online") {
                                  setChosenMode("Online");
                                } else {
                                  setChosenMode("Presencial");
                                }
                              }}
                              className={`w-full rounded-xl border p-3 text-left transition-all ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                                  : "border-border bg-background hover:border-primary/40 hover:bg-accent"
                              }`}
                            >
                              <span className="flex items-center gap-1.5 text-sm font-semibold">
                                <Clock className="size-3.5" />
                                {slot.time}
                              </span>
                              <span
                                className={`mt-1 block text-xs font-medium ${
                                  isSelected
                                    ? "text-primary-foreground/90"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {slot.tutor}
                              </span>

                              {/* Modalidade Badge with icons */}
                              <span
                                className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                  isSelected
                                    ? "bg-white/20 text-primary-foreground"
                                    : slot.mode === "Ambas"
                                      ? "border border-primary/20 bg-primary/10 text-primary"
                                      : slot.mode === "Online"
                                        ? "border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {slot.mode === "Presencial" && <MapPin className="size-3" />}
                                {slot.mode === "Online" && <Video className="size-3" />}
                                {slot.mode === "Ambas" && (
                                  <>
                                    <MapPin className="size-3" />
                                    <Video className="size-3" />
                                  </>
                                )}
                                <span>{slot.mode}</span>
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarCheck className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selected ? (
                      <>
                        <span className="font-semibold text-foreground">{selected.tutor}</span> —{" "}
                        {selected.day} às {selected.time}
                        <span className="ml-1 inline-flex items-center gap-1 font-semibold text-foreground">
                          · {effectiveSelectedMode}
                        </span>
                      </>
                    ) : (
                      "Seleciona um horário para continuar."
                    )}
                  </p>

                  {/* If mode is 'Ambas', allow choosing between Presencial and Online */}
                  {selected?.mode === "Ambas" && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        Escolhe a modalidade:
                      </span>
                      <div className="inline-flex gap-1.5 rounded-full border border-border bg-muted/50 p-0.5">
                        {(["Presencial", "Online"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setChosenMode(m)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                              chosenMode === m
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {m === "Presencial" ? (
                              <MapPin className="size-3" />
                            ) : (
                              <Video className="size-3" />
                            )}
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <a
                href={CAL_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={async () => {
                  if (!selected) return;
                  const user = getCurrentUser();
                  const mode = selected.mode === "Ambas" ? chosenMode : selected.mode;
                  if (user) {
                    await addBooking(user.email, {
                      subject: subject.name,
                      tutor: selected.tutor,
                      ...(selected.tutorEmail ? { tutorEmail: selected.tutorEmail } : {}),
                      student: `${user.primeiroNome} ${user.ultimoNome}`,
                      studentEmail: user.email,
                      day: selected.day,
                      time: selected.time,
                      mode,
                    });
                  }
                  setConfirmed({ ...selected, mode });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                {selected ? "Confirmar marcação no Cal.com" : "Abrir agendamento no Cal.com"}
                <ExternalLink className="size-4" />
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
