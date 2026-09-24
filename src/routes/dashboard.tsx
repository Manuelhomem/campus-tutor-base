import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { CalendarDays, GraduationCap, LogOut, Plus, User } from "lucide-react";
import { getBookings, getCurrentUser, getTutorSessions, logout, type Booking } from "@/lib/auth";
import { DAYS } from "@/lib/booking-data";

const MOCK_SESSIONS: Booking[] = [
  { subject: "Matemática", tutor: "Ana Silva", day: "Terça, 29 set", time: "15:00", mode: "Online" },
  { subject: "Programação", tutor: "João Pinto", day: "Quinta, 1 out", time: "14:30", mode: "Presencial" },
  { subject: "Algoritmos", tutor: "Inês Cardoso", day: "Sexta, 2 out", time: "11:00", mode: "Presencial" },
];

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: () => {
    if (!getCurrentUser()) throw redirect({ to: "/login", search: { redirect: "/dashboard" } });
  },
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
  const user = getCurrentUser();
  if (!user) return null;
  const sessions = [...getBookings(user.email), ...MOCK_SESSIONS];

  function handleLogout() {
    logout();
    navigate({ to: "/login", replace: true });
  }

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
            <p className="text-sm font-semibold text-primary">O meu painel</p>
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
              <h2 className="font-display text-xl font-semibold text-foreground">Disciplinas que lecionas</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {(user.disciplinas ?? []).map((d) => (
                  <span key={d} className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-primary">{d}</span>
                ))}
              </div>
              {user.bio && <p className="mt-6 text-sm text-muted-foreground">{user.bio}</p>}
            </section>
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <h2 className="font-display text-xl font-semibold text-foreground">A tua disponibilidade</h2>
              <ul className="mt-5 space-y-3">
                {DAYS.map((d) => {
                  const hours = (user.disponibilidade ?? [])
                    .filter((k) => k.startsWith(d + "|"))
                    .map((k) => k.split("|")[1])
                    .sort();
                  if (!hours.length) return null;
                  return (
                    <li key={d} className="flex flex-wrap items-center gap-2">
                      <span className="w-20 text-sm font-semibold text-foreground">{d}</span>
                      {hours.map((h) => (
                        <span key={h} className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">{h} · {user.disponibilidadeModo?.[`${d}|${h}`] ?? "Presencial"}</span>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 md:col-span-2">
              <h2 className="font-display text-xl font-semibold text-foreground">Próximas Sessões Agendadas</h2>
              {getTutorSessions(user).length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Ainda não tens sessões marcadas por alunos.</p>
              ) : (
                <ul className="mt-6 divide-y divide-border">
                  {getTutorSessions(user).map((s, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-4 py-4">
                      <div className="flex items-center gap-4">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary"><CalendarDays className="size-5" /></span>
                        <div>
                          <p className="font-semibold text-foreground">{s.subject}</p>
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><User className="size-3.5" /> {s.student ?? "Aluno"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{s.day} · {s.time}</p>
                        <p className="text-xs text-muted-foreground">{s.mode}</p>
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
            {sessions.map((s, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                    <CalendarDays className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{s.subject}</p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <User className="size-3.5" /> {s.tutor}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {s.day} · {s.time}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.mode}</p>
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
