import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  Printer,
  ExternalLink,
  AlertCircle,
  Loader2,
  Info,
  ArrowLeft,
} from "lucide-react";
import { CAL_BOOKING_URL } from "@/lib/booking-data";

interface PropostaPublicItem {
  catalogoId: string;
  nome: string;
  descricao: string;
  unidade: "hora" | "unidade" | "pacote";
  quantidade: number;
  precoUnitario: number; // cêntimos
  subtotal: number; // cêntimos
  condicoes: string;
}

interface PropostaPublicData {
  numero: string;
  createdAt: string;
  validadeAte: string;
  resumo: string;
  itens: PropostaPublicItem[];
  total: number; // cêntimos
  condicoes: string;
  isDemo: boolean;
}

export const Route = createFileRoute("/proposta/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Proposta Comercial — TutorIscte" },
      {
        name: "description",
        content: "Consulta da proposta de explicações preparada para o estudante.",
      },
    ],
  }),
  component: PropostaPublicPage,
});

function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return isoStr;
  }
}

function PropostaPublicPage() {
  const { token } = useParams({ from: "/proposta/$token" });
  const [data, setData] = useState<PropostaPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchProposta() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/propostas/ver/${encodeURIComponent(token)}`);
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok || !json.proposta) {
          throw new Error(json?.error || "Proposta não encontrada ou link expirado.");
        }

        if (isMounted) {
          setData(json.proposta);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erro ao carregar a proposta.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (token) {
      fetchProposta();
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-tint flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="size-10 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">A carregar a proposta...</h2>
          <p className="text-sm text-muted-foreground mt-1">Por favor aguarde um momento.</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-tint flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle className="size-8" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold text-foreground">
            Proposta Não Encontrada
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {error || "O link acedido pode ter expirado ou o código da proposta é inválido."}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <ArrowLeft className="size-4" />
              Voltar à página inicial
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint pb-20">
      {/* Top Navigation */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40 print:hidden">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              Tutor<span className="text-primary">Iscte</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <Printer className="size-4" />
              Imprimir / PDF
            </button>
            <a
              href={CAL_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Agendar Sessão
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 pt-10 sm:px-6">
        {data.isDemo && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 flex items-center gap-3 print:hidden">
            <Info className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="leading-snug">
              <strong>Proposta de demonstração pedagógica:</strong> Os valores e registos
              apresentados são fictícios para efeitos de exercício de aprendizagem no âmbito da
              plataforma TutorIscte.
            </p>
          </div>
        )}

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-12 print:border-none print:shadow-none print:p-0">
          {/* Header of Proposal */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 border-b border-border pb-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <GraduationCap className="size-6" />
                </span>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                    Tutor<span className="text-primary">Iscte</span>
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Explicações entre estudantes do ISCTE-IUL
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-wider font-semibold text-primary">
                  Proposta Orçamental
                </p>
                <h2 className="mt-1 font-display text-3xl font-bold text-foreground">
                  {data.numero}
                </h2>
              </div>
            </div>

            <div className="sm:text-right space-y-2 text-sm bg-accent/40 rounded-2xl p-4 sm:p-5 border border-border/60">
              <div>
                <span className="text-xs text-muted-foreground block">Data de Emissão</span>
                <span className="font-semibold text-foreground flex items-center sm:justify-end gap-1.5 mt-0.5">
                  <Calendar className="size-3.5 text-primary" />
                  {formatDate(data.createdAt)}
                </span>
              </div>
              <div className="pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground block">Válida até</span>
                <span className="font-semibold text-foreground flex items-center sm:justify-end gap-1.5 mt-0.5">
                  <Clock className="size-3.5 text-primary" />
                  {formatDate(data.validadeAte)}
                </span>
              </div>
            </div>
          </div>

          {/* Scope Summary */}
          <div className="mt-8 rounded-2xl bg-tint/80 border border-border/80 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Âmbito do Pedido
            </h3>
            <p className="mt-2 text-base text-foreground font-medium leading-relaxed">
              {data.resumo}
            </p>
          </div>

          {/* Items Table */}
          <div className="mt-8">
            <h3 className="font-display text-lg font-bold text-foreground mb-4">
              Serviços e Sessões Incluídas
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/40 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    <th className="py-3.5 px-4">Item / Disciplina</th>
                    <th className="py-3.5 px-3 text-center">Unidade</th>
                    <th className="py-3.5 px-3 text-center">Qtd.</th>
                    <th className="py-3.5 px-4 text-right">Preço Unitário</th>
                    <th className="py-3.5 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.itens.map((item, idx) => (
                    <tr
                      key={`${item.catalogoId}-${idx}`}
                      className="hover:bg-accent/15 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <p className="font-semibold text-foreground">{item.nome}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {item.descricao}
                        </p>
                        {item.condicoes && (
                          <span className="inline-block mt-1 text-[11px] text-muted-foreground/90 italic">
                            * {item.condicoes}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-center capitalize text-muted-foreground">
                        {item.unidade}
                      </td>
                      <td className="py-4 px-3 text-center font-medium text-foreground">
                        {item.quantidade}
                      </td>
                      <td className="py-4 px-4 text-right text-muted-foreground">
                        {formatCents(item.precoUnitario)}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-foreground">
                        {formatCents(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pt-6 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1 max-w-sm">
              <p className="font-semibold text-foreground">Condições gerais de prestação:</p>
              <p className="leading-relaxed">{data.condicoes}</p>
            </div>

            <div className="w-full sm:w-72 rounded-2xl bg-accent/40 border border-border p-5 space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{formatCents(data.total)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>IVA (Isento art.º 9.º CIVA)</span>
                <span>0,00 €</span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-baseline">
                <span className="font-display font-bold text-foreground text-base">Total</span>
                <span className="font-display font-bold text-2xl text-primary">
                  {formatCents(data.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Call to Action for Student */}
          <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center print:hidden">
            <h4 className="font-display text-lg font-bold text-foreground">
              Como avançar com esta proposta?
            </h4>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              Para formalizar as tuas explicações, clica no botão abaixo para agendar a primeira
              sessão no horário mais conveniente através do nosso calendário.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-4">
              <a
                href={CAL_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:scale-[1.02]"
              >
                Agendar no Cal.com agora
                <ExternalLink className="size-4" />
              </a>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Voltar à página principal
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
