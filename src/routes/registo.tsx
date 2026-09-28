import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, GraduationCap, Presentation } from "lucide-react";
import { useState } from "react";
import { registerAccount, type Modo } from "@/lib/auth";
import { BOOKING_SUBJECTS, DAYS } from "@/lib/booking-data";

const HOURS = Array.from({ length: 12 }, (_, i) => `${String(i + 9).padStart(2, "0")}:00`);

export const Route = createFileRoute("/registo")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") && !s.redirect.startsWith("//") ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Criar Conta — TutorIscte" },
      {
        name: "description",
        content:
          "Cria a tua conta TutorIscte com o email institucional do ISCTE e marca a tua primeira sessão de explicações.",
      },
      { property: "og:title", content: "Criar Conta — TutorIscte" },
      {
        property: "og:description",
        content:
          "Junta-te ao TutorIscte e aprende com colegas tutores do ISCTE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

const ANOS = ["1º ano", "2º ano", "3º ano", "Mestrado"];

const CURSOS = [
  "Desenvolvimento de Software e Aplicações",
  "Matemática Aplicada e Tecnologias Digitais",
  "Tecnologias Digitais e Gestão",
  "Tecnologias Digitais e Automação",
];

const inputClass =
  "w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

function RegisterPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [confirmMsg, setConfirmMsg] = useState("");
  const [form, setForm] = useState({
    primeiroNome: "",
    ultimoNome: "",
    email: "",
    ano: "",
    curso: "",
    password: "",
    confirmarPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form | "disciplinas" | "bio" | "slots", string>>>({});
  const [tipo, setTipo] = useState<"aluno" | "tutor" | null>(null);
  const [step, setStep] = useState(1);
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [modos, setModos] = useState<Record<string, Modo>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};

    if (!form.primeiroNome.trim()) next.primeiroNome = "Indica o teu primeiro nome.";
    if (!form.ultimoNome.trim()) next.ultimoNome = "Indica o teu último nome.";
    if (!form.email.trim()) {
      next.email = "Indica o teu email institucional.";
    } else if (!form.email.includes("@iscte-iul.pt")) {
      next.email = "O email deve ser institucional (ex: nome@iscte-iul.pt).";
    }
    if (!form.ano) next.ano = "Escolhe o teu ano.";
    if (!form.curso) next.curso = "Escolhe o teu curso.";
    if (form.password.length < 6) next.password = "A password deve ter pelo menos 6 caracteres.";
    if (form.confirmarPassword !== form.password)
      next.confirmarPassword = "As passwords não coincidem.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (tipo === "tutor" && step === 2) {
      setStep(3);
      return;
    }
    if (tipo === "tutor") {
      const e2: typeof errors = {};
      if (disciplinas.length === 0) e2.disciplinas = "Escolhe pelo menos uma disciplina.";
      if (!bio.trim()) e2.bio = "Escreve uma breve bio.";
      if (slots.length === 0) e2.slots = "Marca pelo menos um horário disponível.";
      setErrors(e2);
      if (Object.keys(e2).length) return;
    }

    const res = await registerAccount({
      tipo: tipo ?? "aluno",
      ...(tipo === "tutor" ? { disciplinas, bio: bio.trim(), disponibilidade: slots, disponibilidadeModo: Object.fromEntries(slots.map((k) => [k, modos[k] ?? "Presencial"])) } : {}),
      primeiroNome: form.primeiroNome.trim(),
      ultimoNome: form.ultimoNome.trim(),
      email: form.email,
      ano: form.ano,
      curso: form.curso,
      password: form.password,
    }, search.redirect ?? "/dashboard");
    if (!res.ok) {
      setErrors({ email: res.error ?? "Não foi possível criar a conta." });
      setStep(2);
      return;
    }
    if (res.needsConfirmation) {
      setConfirmMsg(`Enviámos um email de confirmação para ${form.email}. Confirma a tua conta para entrar.`);
      return;
    }
    if (search.redirect) window.location.href = search.redirect;
    else navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-tint">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              Tutor<span className="text-primary">Iscte</span>
            </span>
          </Link>
          <Link
            to="/login" search={{ redirect: search.redirect }}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Já tens conta? <span className="text-primary">Entrar</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Criar conta
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Regista-te com o teu email institucional do ISCTE para marcares
            sessões de explicações.
          </p>

          {step === 1 && (
            <div className="mt-8">
              <p className="mb-3 text-sm font-medium text-foreground">Passo 1 — Escolhe o teu perfil</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ["aluno", "Sou Aluno", "Quero marcar explicações.", BookOpen],
                  ["tutor", "Sou Tutor", "Quero dar explicações a colegas.", Presentation],
                ] as const).map(([v, t, d, Icon]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setTipo(v); setStep(2); }}
                    className="rounded-2xl border-2 border-border bg-card p-6 text-left transition-colors hover:border-primary hover:bg-accent"
                  >
                    <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary"><Icon className="size-5" /></span>
                    <p className="mt-4 font-display text-lg font-semibold text-foreground">{t}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step > 1 && (
          {confirmMsg && (
            <p role="status" className="mt-8 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">{confirmMsg}</p>
          )}
          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <div className="flex items-center justify-between rounded-xl bg-accent px-4 py-2.5 text-sm">
              <span className="font-medium text-foreground">
                Passo {step} de {tipo === "tutor" ? 3 : 2} · {tipo === "tutor" ? "Tutor" : "Aluno"}
              </span>
              <button type="button" onClick={() => setStep(step - 1)} className="font-medium text-primary hover:underline">Voltar</button>
            </div>
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <p className={labelClass}>Disciplinas que queres lecionar</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {BOOKING_SUBJECTS.map((s) => (
                      <label key={s.slug} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent">
                        <input type="checkbox" checked={disciplinas.includes(s.name)} onChange={() => toggle(disciplinas, setDisciplinas, s.name)} className="accent-primary" />
                        {s.name}
                      </label>
                    ))}
                  </div>
                  {errors.disciplinas && <p className="mt-1.5 text-xs text-destructive">{errors.disciplinas}</p>}
                </div>
                <div>
                  <label htmlFor="bio" className={labelClass}>Bio / experiência</label>
                  <textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ex: 3º ano, média de 18 a Cálculo, já dei explicações a colegas…" className={inputClass} />
                  {errors.bio && <p className="mt-1.5 text-xs text-destructive">{errors.bio}</p>}
                </div>
                <div>
                  <p className={labelClass}>Disponibilidade semanal (clica para marcar)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-1 text-xs">
                      <thead><tr><th></th>{DAYS.map((d) => <th key={d} className="font-medium text-muted-foreground">{d.slice(0, 3)}</th>)}</tr></thead>
                      <tbody>
                        {HOURS.map((h) => (
                          <tr key={h}>
                            <td className="pr-1 text-muted-foreground">{h}</td>
                            {DAYS.map((d) => {
                              const k = `${d}|${h}`;
                              const on = slots.includes(k);
                              return (
                                <td key={k}>
                                  <button type="button" aria-label={`${d} ${h}`} onClick={() => {
                                      if (!on) { setSlots([...slots, k]); setModos({ ...modos, [k]: modos[k] ?? "Presencial" }); }
                                      setEditing(k);
                                    }}
                                    className={`h-7 w-full rounded-md border text-[10px] font-semibold transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"} ${editing === k ? "ring-2 ring-primary/40 ring-offset-1" : ""}`}>
                                    {on ? (modos[k] ?? "Presencial")[0] : ""}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">P = Presencial · O = Online · A = Ambas</p>
                  {editing && slots.includes(editing) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-accent/60 p-3 text-sm">
                      <span className="mr-1 font-medium text-foreground">{editing.replace("|", " · ")}:</span>
                      {(["Presencial", "Online", "Ambas"] as const).map((m) => (
                        <button key={m} type="button" onClick={() => setModos({ ...modos, [editing]: m })}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${modos[editing] === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-accent"}`}>{m}</button>
                      ))}
                      <button type="button" onClick={() => { setSlots(slots.filter((x) => x !== editing)); setEditing(null); }}
                        className="ml-auto text-xs font-medium text-destructive hover:underline">Remover</button>
                    </div>
                  )}
                  {errors.slots && <p className="mt-1.5 text-xs text-destructive">{errors.slots}</p>}
                </div>
              </div>
            )}
            <div className={step === 3 ? "hidden" : "space-y-5"}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="primeiroNome" className={labelClass}>
                  Primeiro nome
                </label>
                <input
                  id="primeiroNome"
                  type="text"
                  value={form.primeiroNome}
                  onChange={set("primeiroNome")}
                  placeholder="Ana"
                  className={inputClass}
                />
                {errors.primeiroNome && (
                  <p className="mt-1.5 text-xs text-destructive">{errors.primeiroNome}</p>
                )}
              </div>
              <div>
                <label htmlFor="ultimoNome" className={labelClass}>
                  Último nome
                </label>
                <input
                  id="ultimoNome"
                  type="text"
                  value={form.ultimoNome}
                  onChange={set("ultimoNome")}
                  placeholder="Silva"
                  className={inputClass}
                />
                {errors.ultimoNome && (
                  <p className="mt-1.5 text-xs text-destructive">{errors.ultimoNome}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email institucional
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="nome@iscte-iul.pt"
                className={inputClass}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="ano" className={labelClass}>
                  Ano
                </label>
                <select
                  id="ano"
                  value={form.ano}
                  onChange={set("ano")}
                  className={inputClass}
                >
                  <option value="">Selecionar…</option>
                  {ANOS.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>
                {errors.ano && (
                  <p className="mt-1.5 text-xs text-destructive">{errors.ano}</p>
                )}
              </div>
              <div>
                <label htmlFor="curso" className={labelClass}>
                  Curso
                </label>
                <select
                  id="curso"
                  value={form.curso}
                  onChange={set("curso")}
                  className={inputClass}
                >
                  <option value="">Selecionar…</option>
                  {CURSOS.map((curso) => (
                    <option key={curso} value={curso}>
                      {curso}
                    </option>
                  ))}
                </select>
                {errors.curso && (
                  <p className="mt-1.5 text-xs text-destructive">{errors.curso}</p>
                )}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  className={inputClass}
                />
                {errors.password && (
                  <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>
                )}
              </div>
              <div>
                <label htmlFor="confirmarPassword" className={labelClass}>
                  Confirmar password
                </label>
                <input
                  id="confirmarPassword"
                  type="password"
                  value={form.confirmarPassword}
                  onChange={set("confirmarPassword")}
                  placeholder="••••••••"
                  className={inputClass}
                />
                {errors.confirmarPassword && (
                  <p className="mt-1.5 text-xs text-destructive">
                    {errors.confirmarPassword}
                  </p>
                )}
              </div>
            </div>

            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
            >
              {tipo === "tutor" && step === 2 ? "Continuar" : "Criar Conta"}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Já tens conta?{" "}
              <Link to="/login" search={{ redirect: search.redirect }} className="font-medium text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </form>
          )}
        </div>
      </main>
    </div>
  );
}
