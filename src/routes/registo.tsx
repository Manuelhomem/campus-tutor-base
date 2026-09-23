import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/registo")({
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
  const [form, setForm] = useState({
    primeiroNome: "",
    ultimoNome: "",
    email: "",
    ano: "",
    curso: "",
    password: "",
    confirmarPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};

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

    navigate({ to: "/" });
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
            to="/login"
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

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
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

            <button
              type="submit"
              className="w-full rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
            >
              Criar Conta
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Já tens conta?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
