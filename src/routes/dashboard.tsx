import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, GraduationCap, LogOut, MapPin, Plus, User, Video } from "lucide-react";
import {
  getBookings,
  getCurrentUser,
  getTutorSessions,
  logout,
  requireLogin,
  type Account,
  type Booking,
} from "@/lib/auth";
import { DAYS } from "@/lib/booking-data";

const MOCK_SESSIONS: Booking[] = [
  {
    subject: "Matemática",
    tutor: "Ana Silva",
    day: "Terça",
    time: "15:00",
    mode: "Online",
  },
  {
    subject: "Programação",
    tutor: "João Pinto",
    day: "Quinta",
    time: "14:30",
    mode: "Presencial",
  },
  {
    subject: "Algoritmos",
    tutor: "Inês Cardoso",
    day: "Sexta",
    time: "11:00",
    mode: "Presencial",
  },
];

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: () => requireLogin("/dashboard", ""),
  head: () => ({
    meta: [
      { title: "O meu painel — TutorIscte" },
      { name: "description", content: "Vê as tuas próximas sessões de explicações no TutorIscte." },
      { property: "og:title", content: "O meu painel — TutorIscte" },
      { property: "og:description", content: "As tuas próximas sessões de explicações no ISCTE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(getCurrentUser());
  const [tutorSessions, setTutorSessions] = useState<Booking[]>(() =>
    user ? getTutorSessions(user) : [],
  );
  const [studentSessions, setStudentSessions] = useState<Booking[]>(() =>
    user ? getBookings(user.email) : [],
  );

  useEffect(() => {
    function refresh() {
      const u = getCurrentUser();
      setUser(u);
      if (u) {
        setTutorSessions(getTutorSessions(u));
        setStudentSessions(getBookings(u.email));
      }
    }
    refresh();
    window.addEventListener("tutoriscte-auth", refresh);
    return () => window.removeEventListener("tutoriscte-auth", refresh);
  }, []);

  if (!user) return null;

  async function handleLogout() {
    await logout();
    navigate({ to: "/login", replace: true });
  }

  const allStudentSessions = studentSessions.length > 0 ? studentSessions : MOCK_SESSIONS;

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
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            <LogOut className="size-4" />
            Terminar Sessão
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-primary">O meu painel</p>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">
                {user.tipo === "tutor" ? "Tutor" : "Aluno"}
              </span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Olá, {user.primeiroNome} {user.ultimoNome}!
            </h1>
            <p className="mt-2 text-muted-foreground">
              {user.curso} · {user.ano}
            </p>
          </div>
          <Link
            to="/agendar"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
          >
            <Plus className="size-4" />
            Marcar Nova Sessão
          </Link>
        </div>

        {user.tipo === "tutor" ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Disciplinas que lecionas
              </h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {(user.disciplinas ?? []).length > 0 ? (
                  user.disciplinas?.map((d) => (
                    <span
                      key={d}
                      className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-primary"
                    >
                      {d}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma disciplina selecionada.</p>
                )}
              </div>
              {user.bio && <p className="mt-6 text-sm text-muted-foreground">{user.bio}</p>}
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <h2 className="font-display text-xl font-semibold text-foreground">
                A tua disponibilidade
              </h2>
              <ul className="mt-5 space-y-3">
                {DAYS.map((d) => {
                  const hours = (user.disponibilidade ?? [])
                    .filter((k) => k.startsWith(d + "|"))
                    .map((k) => k.split("|")[1])
                    .filter((h): h is string => Boolean(h))
                    .sort();
                  if (!hours.length) return null;
                  return (
                    <li key={d} className="flex flex-wrap items-center gap-2">
                      <span className="w-20 text-sm font-semibold text-foreground">{d}</span>
                      {hours.map((h) => {
                        const m = user.disponibilidadeModo?.[`${d}|${h}`] ?? "Presencial";
                        return (
                          <span
                            key={h}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-accent/30 px-2 py-0.5 text-xs font-medium text-foreground"
                          >
                            <span>{h}</span>
                            <span className="text-muted-foreground">·</span>
                            {m === "Online" && <Video className="size-3 text-blue-500" />}
                            {m === "Presencial" && <MapPin className="size-3 text-emerald-500" />}
                            {m === "Ambas" && (
                              <>
                                <MapPin className="size-3 text-emerald-500" />
                                <Video className="size-3 text-blue-500" />
                              </>
                            )}
                            <span className="text-muted-foreground">{m}</span>
                          </span>
                        );
                      })}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 md:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Próximas Sessões Agendadas
                </h2>
                {tutorSessions.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {tutorSessions.length} {tutorSessions.length === 1 ? "sessão" : "sessões"}
                  </span>
                )}
              </div>

              {tutorSessions.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-border py-8 text-center">
                  <CalendarDays className="mx-auto size-8 text-muted-foreground/60" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ainda não tens sessões marcadas por alunos.
                  </p>
                </div>
              ) : (
                <ul className="mt-6 divide-y divide-border">
                  {tutorSessions.map((s, i) => (
                    <li
                      key={`${s.subject}-${s.day}-${s.time}-${i}`}
                      className="flex flex-wrap items-center justify-between gap-4 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                          <CalendarDays className="size-5" />
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{s.subject}</p>
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <User className="size-3.5 text-primary" /> Aluno:{" "}
                            <span className="font-medium text-foreground">
                              {s.student ?? "Aluno"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {s.day} · {s.time}
                        </p>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          {s.mode === "Online" ? (
                            <Video className="size-3 text-blue-500" />
                          ) : (
                            <MapPin className="size-3 text-emerald-500" />
                          )}
                          {s.mode}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <section className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-xl font-semibold text-foreground">Próximas Sessões</h2>
            <ul className="mt-6 divide-y divide-border">
              {allStudentSessions.map((s, i) => (
                <li
                  key={`${s.subject}-${s.day}-${s.time}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                      <CalendarDays className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{s.subject}</p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <User className="size-3.5 text-primary" /> Tutor:{" "}
                        <span className="font-medium text-foreground">{s.tutor}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {s.day} · {s.time}
                    </p>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      {s.mode === "Online" ? (
                        <Video className="size-3 text-blue-500" />
                      ) : (
                        <MapPin className="size-3 text-emerald-500" />
                      )}
                      {s.mode}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
