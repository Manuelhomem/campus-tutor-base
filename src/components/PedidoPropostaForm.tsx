import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";

export function PedidoPropostaForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [pedido, setPedido] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pedidoId, setPedidoId] = useState<string | null>(null);

  function validate() {
    const trimmedNome = nome.trim();
    const trimmedEmail = email.trim();
    const trimmedPedido = pedido.trim();

    if (!trimmedNome || trimmedNome.length < 2) {
      return "Por favor, introduza o seu nome (mínimo 2 caracteres).";
    }
    if (trimmedNome.length > 150) {
      return "O nome não pode exceder 150 caracteres.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return "Por favor, introduza um endereço de email válido.";
    }
    if (trimmedEmail.length > 200) {
      return "O email não pode exceder 200 caracteres.";
    }

    if (!trimmedPedido || trimmedPedido.length < 5) {
      return "Por favor, descreva o seu pedido com pelo menos 5 caracteres.";
    }
    if (trimmedPedido.length > 5000) {
      return "O texto do pedido não pode exceder 5000 caracteres.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErrorMessage(null);
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/propostas/pedir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          pedido: pedido.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Ocorreu um erro ao submeter o pedido.");
      }

      setSuccess(true);
      setPedidoId(data.pedidoId || null);
      setNome("");
      setEmail("");
      setPedido("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao processar o pedido.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="pedido-proposta" className="scroll-mt-20 bg-tint/60 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Orçamento inteligente com IA
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pedido de proposta
          </h2>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Diz-nos o que precisas — a nossa inteligência artificial interpreta o teu pedido e
            prepara uma proposta adaptada com base no catálogo de explicações.
          </p>
        </div>

        <div className="mt-12 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
          {success ? (
            <div className="py-8 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="size-9" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-bold text-foreground">
                O seu pedido foi recebido com sucesso.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
                A informação foi registada e está a ser analisada. O tutor responsável irá avaliar
                os tópicos pretendidos e a disponibilidade para agendamento.
              </p>
              {pedidoId && (
                <p className="mt-4 text-xs font-mono text-muted-foreground/80">
                  Referência do pedido:{" "}
                  <span className="font-semibold text-foreground">{pedidoId}</span>
                </p>
              )}
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setPedidoId(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  Fazer outro pedido de proposta
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {errorMessage && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 animate-in fade-in">
                  <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <p className="leading-snug">{errorMessage}</p>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="proposta-nome"
                    className="block text-sm font-semibold text-foreground"
                  >
                    Nome <span className="text-primary">*</span>
                  </label>
                  <input
                    id="proposta-nome"
                    type="text"
                    required
                    maxLength={150}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Maria Santos"
                    disabled={loading}
                    className="mt-2 block w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="proposta-email"
                    className="block text-sm font-semibold text-foreground"
                  >
                    Email <span className="text-primary">*</span>
                  </label>
                  <input
                    id="proposta-email"
                    type="email"
                    required
                    maxLength={200}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: maria.santos@iscte-iul.pt"
                    disabled={loading}
                    className="mt-2 block w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="proposta-pedido"
                  className="block text-sm font-semibold text-foreground"
                >
                  Pedido <span className="text-primary">*</span>
                </label>
                <textarea
                  id="proposta-pedido"
                  required
                  rows={5}
                  maxLength={5000}
                  value={pedido}
                  onChange={(e) => setPedido(e.target.value)}
                  placeholder="Ex: Olá! Preciso de apoio em Programação para preparar o projeto de Java e gostaria de ter 2 horas de explicação por semana. Também gostaria de saber se posso usufruir da primeira sessão experimental."
                  disabled={loading}
                  className="mt-2 block w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 leading-relaxed"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Descreve as disciplinas pretendidas, tópicos e estimativa de horas.</span>
                  <span>{pedido.length}/5000</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-accent/30 p-4 text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">
                  Nota sobre a utilização dos dados:
                </span>{" "}
                Os dados inseridos neste formulário destinam-se exclusivamente à análise pedagógica
                e elaboração da proposta de explicações para o estudante.
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  Campos assinalados com <span className="text-primary font-bold">*</span> são de
                  preenchimento obrigatório.
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 focus:outline-hidden focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />A processar pedido...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Pedir proposta
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
