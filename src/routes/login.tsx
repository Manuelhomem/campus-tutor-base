import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — TutorIscte" },
      {
        name: "description",
        content:
          "Entra na tua conta TutorIscte para gerires as tuas sessões de explicações no ISCTE.",
      },
      { property: "og:title", content: "Entrar — TutorIscte" },
      {
        property: "og:description",
        content:
          "Entra na tua conta TutorIscte para gerires as tuas sessões de explicações no ISCTE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const inputClass =
  "w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};

    if (!form.email.trim()) {
      next.email = "Indica o teu email.";
    } else if (!form.email.includes("@")) {
      next.email = "Indica um email válido.";
    }
    if (!form.password) next.password = "Indica a tua password.";

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
            to="/registo"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ainda não tens conta? <span className="text-primary">Fazer Registo</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Entrar
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Bem-vindo de volta! Entra para gerires as tuas sessões.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
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

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <span className="mb-1.5 cursor-pointer text-xs font-medium text-primary hover:underline">
                  Esqueci-me da password
                </span>
              </div>
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

            <button
              type="submit"
              className="w-full rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
            >
              Entrar
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Ainda não tens conta?{" "}
              <Link
                to="/registo"
                className="font-medium text-primary hover:underline"
              >
                Fazer Registo
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
