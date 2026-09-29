import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type OAuthResult = { data: unknown; error: { message: string } | null };
const oauth = (
  supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
      approveAuthorization: (id: string) => Promise<OAuthResult>;
      denyAuthorization: (id: string) => Promise<OAuthResult>;
    };
  }
).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Autorizar ligação — TutorIscte" },
      { name: "description", content: "Autoriza um assistente a aceder à tua conta TutorIscte." },
      { property: "og:title", content: "Autorizar ligação — TutorIscte" },
      {
        property: "og:description",
        content: "Autoriza um assistente a aceder à tua conta TutorIscte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Pedido de autorização inválido.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname + location.searchStr },
      });
    }
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    const { data: u } = await supabase.auth.getUser();
    return { details: data, email: u.user?.email ?? "" };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-tint px-6 text-center text-foreground">
      Não foi possível carregar este pedido: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = details?.client?.name ?? "Uma aplicação";

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Não foi recebido nenhum endereço de retorno.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-tint px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <GraduationCap className="size-6" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
          Ligar {client} ao TutorIscte
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {client} poderá ver disciplinas e horários, marcar sessões e consultar as tuas sessões em
          teu nome.
        </p>
        {email && (
          <p className="mt-4 text-sm text-foreground">
            Sessão iniciada como <strong>{email}</strong>
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Partilha o teu perfil básico e email. As permissões da app continuam a aplicar-se.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-8 flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Autorizar
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground disabled:opacity-60"
          >
            Cancelar ligação
          </button>
        </div>
      </div>
    </main>
  );
}
