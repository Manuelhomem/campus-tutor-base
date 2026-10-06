import React, { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  GraduationCap,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Mail,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Database,
  SlidersHorizontal,
  Plus,
  Send,
  Edit2,
  X,
  Lock,
  Server,
  KeyRound,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel de Administração — TutorIscte" },
      {
        name: "description",
        content: "Área de gestão de pedidos, propostas e catálogo do TutorIscte.",
      },
    ],
  }),
  component: AdminPage,
});

interface CatalogoItem {
  id: string;
  nome: string;
  descricao: string;
  unidade: "hora" | "unidade" | "pacote";
  precoUnitario: number;
  moeda: "EUR";
  ativo: boolean;
  condicoes: string;
  isDemo: boolean;
}

interface InterpretacaoIA {
  resumo: string;
  itens: Array<{
    catalogoId: string;
    quantidade: number | null;
    evidencia: string;
  }>;
  prazoPedido: string | null;
  informacaoEmFalta: string[];
  necessitaRevisao: boolean;
  motivoRevisao: string | null;
}

interface PedidoAdmin {
  id: string;
  nome: string;
  email: string;
  pedido: string;
  status: "Recebido" | "Em análise" | "Necessita de revisão" | "Proposta criada" | "Erro";
  createdAt: string;
  updatedAt: string;
  interpretacao?: InterpretacaoIA | null;
  informacaoEmFalta?: string[];
  motivoRevisao?: string | null;
  propostaId?: string | null;
  propostaToken?: string | null;
  propostaValor?: number | null;
  notificacaoStatus?: string | null;
  erro?: string | null;
}

interface ConfigStatus {
  geminiKeyConfigured: boolean;
  geminiKeyLooksValid?: boolean;
  geminiKeyPrefix?: string | null;
  geminiModel: string;
  resendKeyConfigured: boolean;
  emailAlunoConfigured: boolean;
  emailAluno: string | null;
  adminUidConfigured: boolean;
  adminUid: string | null;
  appBaseUrl: string;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | AdminUser | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("tutoriscte_admin_user");
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"pedidos" | "catalogo" | "config">("pedidos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PedidoAdmin | null>(null);

  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);

  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);

  // Estados de ações
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modal Resolver Manualmente
  const [isResolvingModalOpen, setIsResolvingModalOpen] = useState(false);
  const [manualItens, setManualItens] = useState<{ [id: string]: number }>({});
  const [manualResumo, setManualResumo] = useState("");

  // Modal Novo Item de Catálogo
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    nome: "",
    descricao: "",
    unidade: "hora" as "hora" | "unidade" | "pacote",
    precoUnitario: 1500,
    condicoes: "Sessão individual com duração de 60 minutos",
    ativo: true,
  });

  // Modal Editar Item
  const [editingItem, setEditingItem] = useState<CatalogoItem | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          localStorage.setItem(
            "tutoriscte_admin_user",
            JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email,
            }),
          );
        } catch {
          // ignore
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Helper para headers autenticados
  function getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (currentUser?.uid) {
      headers["x-admin-uid"] = currentUser.uid;
      headers["Authorization"] = `Bearer ${currentUser.uid}`;
    }
    if (currentUser?.email) {
      headers["x-admin-email"] = currentUser.email;
    }
    return headers;
  }

  async function handleGoogleLogin() {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao autenticar com Google.";
      setAuthError(msg);
    }
  }

  function handleWorkspaceLogin() {
    const workspaceAdmin: AdminUser = {
      uid: "admin_workspace_mamfh",
      email: "mamfh@iscte-iul.pt",
      displayName: "Manuel Homem (ISCTE)",
    };
    try {
      localStorage.setItem("tutoriscte_admin_user", JSON.stringify(workspaceAdmin));
    } catch {
      // ignore
    }
    setCurrentUser(workspaceAdmin);
    setAuthLoading(false);
  }

  async function handleLogout() {
    try {
      localStorage.removeItem("tutoriscte_admin_user");
    } catch {
      // ignore
    }
    await signOut(auth);
    setCurrentUser(null);
    setSelectedPedido(null);
  }

  // Carregar dados quando utilizador estiver autenticado
  useEffect(() => {
    if (currentUser) {
      loadPedidos();
      loadCatalogo();
      loadConfigStatus();
    }
  }, [currentUser]);

  async function loadPedidos() {
    setLoadingPedidos(true);
    try {
      const res = await fetch("/api/admin/pedidos", { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data?.pedidos) {
        setPedidos(data.pedidos);
        if (selectedPedido) {
          const updated = data.pedidos.find((p: PedidoAdmin) => p.id === selectedPedido.id);
          if (updated) setSelectedPedido(updated);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
    } finally {
      setLoadingPedidos(false);
    }
  }

  async function loadCatalogo() {
    setLoadingCatalogo(true);
    try {
      const res = await fetch("/api/admin/catalogo", { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data?.catalogo) {
        setCatalogo(data.catalogo);
      }
    } catch (err) {
      console.error("Erro ao carregar catálogo:", err);
    } finally {
      setLoadingCatalogo(false);
    }
  }

  async function loadConfigStatus() {
    try {
      const res = await fetch("/api/admin/config-status", { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data?.config) {
        setConfigStatus(data.config);
      }
    } catch (err) {
      console.error("Erro ao carregar estado de configurações:", err);
    }
  }

  // Reprocessar com Gemini
  async function handleReprocessar(pedidoId: string) {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${pedidoId}/reprocessar`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao reprocessar pedido.");
      setActionMessage({
        type: "success",
        text: "Pedido reprocessado com sucesso com o modelo Gemini.",
      });
      await loadPedidos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao reprocessar.";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setActionLoading(false);
    }
  }

  // Reenviar notificação
  async function handleReenviarNotificacao(pedidoId: string) {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${pedidoId}/reenviar-notificacao`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao reenviar notificação.");
      if (data.notificacao?.status === "Falhou") {
        setActionMessage({
          type: "error",
          text: `Falha no envio via Resend: ${data.notificacao?.erro || "Erro desconhecido"}`,
        });
      } else {
        setActionMessage({
          type: "success",
          text: "Notificação enviada com sucesso para o email do aluno titular.",
        });
      }
      await loadPedidos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao reenviar notificação.";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setActionLoading(false);
    }
  }

  // Submeter resolução manual
  async function handleSubmeterResolucao() {
    if (!selectedPedido) return;
    const itensPayload = Object.entries(manualItens)
      .filter(([_, qty]) => qty > 0)
      .map(([catalogoId, quantidade]) => ({ catalogoId, quantidade }));

    if (itensPayload.length === 0) {
      setActionMessage({
        type: "error",
        text: "Seleciona pelo menos um serviço com quantidade superior a 0.",
      });
      return;
    }

    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${selectedPedido.id}/resolver`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          resumo: manualResumo || `Proposta aprovada manualmente para ${selectedPedido.nome}`,
          itens: itensPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao aprovar proposta.");
      setActionMessage({
        type: "success",
        text: "Proposta criada e associada ao pedido com sucesso!",
      });
      setIsResolvingModalOpen(false);
      await loadPedidos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao resolver pedido.";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setActionLoading(false);
    }
  }

  // Adicionar novo item ao catálogo
  async function handleSalvarNovoItem(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/catalogo", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newItem),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao adicionar item.");
      setIsNewItemModalOpen(false);
      setNewItem({
        nome: "",
        descricao: "",
        unidade: "hora",
        precoUnitario: 1500,
        condicoes: "Sessão individual com duração de 60 minutos",
        ativo: true,
      });
      await loadCatalogo();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao guardar.";
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  }

  // Editar item de catálogo
  async function handleSalvarEdicaoItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/catalogo/${editingItem.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nome: editingItem.nome,
          descricao: editingItem.descricao,
          unidade: editingItem.unidade,
          precoUnitario: editingItem.precoUnitario,
          condicoes: editingItem.condicoes,
          ativo: editingItem.ativo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar item.");
      setEditingItem(null);
      await loadCatalogo();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao editar item.";
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  }

  // Filtragem dos pedidos
  const filteredPedidos = pedidos.filter((p) => {
    if (statusFilter === "todos") return true;
    return p.status === statusFilter;
  });

  // Ecrã de carregamento enquanto valida a sessão
  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-tint flex flex-col justify-center items-center p-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground bg-card px-6 py-4 rounded-2xl border border-border shadow-sm">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span>A carregar painel de administração...</span>
        </div>
      </div>
    );
  }

  // Render do ecrã de Login caso não esteja autenticado
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-tint flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 shadow-sm text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4">
            <ShieldCheck className="size-7" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Área de Administração
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Acede com a tua conta autorizada no Firebase para consultar pedidos, propostas
            calculadas e gerir o catálogo de serviços do TutorIscte.
          </p>

          {authError && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-left text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={handleWorkspaceLogin}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/20 hover:scale-[1.01]"
            >
              <ShieldCheck className="size-4" />
              Entrar como Titular (mamfh@iscte-iul.pt)
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full inline-flex items-center justify-center gap-3 rounded-full bg-card border border-border px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:scale-[1.01]"
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Entrar com Google (Firebase Auth)
            </button>

            <Link
              to="/"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Voltar ao site público
            </Link>
          </div>

          <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Ambiente de aprendizagem:</span> Podes
            entrar diretamente com a conta do titular do workspace ou autenticar com Google no
            Firebase.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <GraduationCap className="size-5" />
              </span>
              <span className="font-display text-lg font-semibold tracking-tight text-foreground">
                Tutor<span className="text-primary">Iscte</span>
              </span>
            </Link>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-foreground">
                {currentUser?.displayName || "Administrador"}
              </span>
              <span className="text-[11px] text-muted-foreground">{currentUser?.email}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <LogOut className="size-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("pedidos")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                activeTab === "pedidos"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              Pedidos e Propostas ({pedidos.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("catalogo")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                activeTab === "catalogo"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              Catálogo Comercial ({catalogo.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("config")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                activeTab === "config"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              Configurações & Secrets
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              loadPedidos();
              loadCatalogo();
              loadConfigStatus();
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw
              className={`size-3.5 ${loadingPedidos || loadingCatalogo ? "animate-spin" : ""}`}
            />
            Atualizar dados
          </button>
        </div>

        {actionMessage && (
          <div
            className={`mt-4 flex items-center justify-between gap-3 rounded-2xl border p-4 text-sm ${
              actionMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-rose-600" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* TAB 1: PEDIDOS */}
        {activeTab === "pedidos" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            {/* Left Column: List of Pedidos */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-foreground">Lista de Pedidos</h2>
                <div className="flex items-center gap-1 text-xs">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground focus:outline-hidden"
                  >
                    <option value="todos">Todos os estados</option>
                    <option value="Recebido">Recebido</option>
                    <option value="Em análise">Em análise</option>
                    <option value="Necessita de revisão">Necessita de revisão</option>
                    <option value="Proposta criada">Proposta criada</option>
                    <option value="Erro">Erro</option>
                  </select>
                </div>
              </div>

              {filteredPedidos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
                  Nenhum pedido encontrado para o filtro selecionado.
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                  {filteredPedidos.map((pedido) => {
                    const isSelected = selectedPedido?.id === pedido.id;
                    return (
                      <div
                        key={pedido.id}
                        onClick={() => setSelectedPedido(pedido)}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-xs ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-foreground text-sm">
                              {pedido.nome}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {pedido.email}
                            </span>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              pedido.status === "Proposta criada"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : pedido.status === "Necessita de revisão"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : pedido.status === "Em análise"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                    : "bg-accent text-muted-foreground"
                            }`}
                          >
                            {pedido.status}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                          "{pedido.pedido}"
                        </p>

                        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                          <span>{formatDate(pedido.createdAt)}</span>
                          {pedido.propostaValor !== null && pedido.propostaValor !== undefined && (
                            <span className="font-semibold text-primary">
                              {formatCents(pedido.propostaValor)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Detail of Selected Pedido */}
            <div className="lg:col-span-7">
              {selectedPedido ? (
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 space-y-6">
                  {/* Top Header of Detail */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium text-muted-foreground">
                          {selectedPedido.id}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            selectedPedido.status === "Proposta criada"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : selectedPedido.status === "Necessita de revisão"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {selectedPedido.status}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-2xl font-bold text-foreground">
                        {selectedPedido.nome}
                      </h3>
                      <p className="text-sm text-muted-foreground">{selectedPedido.email}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleReprocessar(selectedPedido.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        <Sparkles className="size-3.5 text-primary" />
                        Reprocessar IA
                      </button>

                      {selectedPedido.status === "Necessita de revisão" && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualResumo(
                              selectedPedido.interpretacao?.resumo ||
                                `Proposta aprovada manualmente para ${selectedPedido.nome}`,
                            );
                            const initialItens: { [id: string]: number } = {};
                            selectedPedido.interpretacao?.itens.forEach((i) => {
                              if (i.catalogoId) initialItens[i.catalogoId] = i.quantidade || 1;
                            });
                            setManualItens(initialItens);
                            setIsResolvingModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors"
                        >
                          <SlidersHorizontal className="size-3.5" />
                          Resolver Manualmente
                        </button>
                      )}

                      {selectedPedido.propostaId && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleReenviarNotificacao(selectedPedido.id)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <Send className="size-3.5" />
                          Reenviar Notificação
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Original Request Box */}
                  <div>
                    <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                      Texto Original do Pedido
                    </h4>
                    <div className="mt-2 rounded-2xl bg-tint p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap border border-border/60">
                      {selectedPedido.pedido}
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                      <span>Criado em: {formatDate(selectedPedido.createdAt)}</span>
                      <span>Atualizado em: {formatDate(selectedPedido.updatedAt)}</span>
                    </div>
                  </div>

                  {/* AI Interpretation Box */}
                  {selectedPedido.interpretacao ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                          <Sparkles className="size-3.5" />
                          Interpretação Estruturada (Gemini)
                        </span>
                        {selectedPedido.interpretacao.prazoPedido && (
                          <span className="text-xs font-semibold text-foreground">
                            Prazo: {selectedPedido.interpretacao.prazoPedido}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-foreground">
                        {selectedPedido.interpretacao.resumo}
                      </p>

                      {/* Items identified */}
                      <div className="pt-2">
                        <span className="text-xs font-semibold text-muted-foreground block mb-2">
                          Serviços identificados no catálogo:
                        </span>
                        <div className="space-y-2">
                          {selectedPedido.interpretacao.itens.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">
                              Nenhum serviço do catálogo identificado automaticamente.
                            </p>
                          ) : (
                            selectedPedido.interpretacao.itens.map((it, idx) => (
                              <div
                                key={idx}
                                className="rounded-xl border border-border/80 bg-card p-3 text-xs flex justify-between items-start gap-3"
                              >
                                <div>
                                  <span className="font-semibold text-foreground">
                                    {it.catalogoId}
                                  </span>
                                  <p className="text-muted-foreground mt-0.5">
                                    Evidência: "{it.evidencia}"
                                  </p>
                                </div>
                                <span className="font-bold text-foreground">
                                  {it.quantidade !== null ? `${it.quantidade}h` : "Qtd. Indefinida"}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Missing info & Reason for review */}
                      {selectedPedido.interpretacao.informacaoEmFalta.length > 0 && (
                        <div className="pt-2">
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 block mb-1">
                            Informação em falta identificada:
                          </span>
                          <ul className="list-disc pl-4 text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                            {selectedPedido.interpretacao.informacaoEmFalta.map((info, idx) => (
                              <li key={idx}>{info}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedPedido.motivoRevisao && (
                        <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/50">
                          <span className="font-bold">Motivo de revisão:</span>{" "}
                          {selectedPedido.motivoRevisao}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                      Ainda não há interpretação de IA registada para este pedido.
                    </div>
                  )}

                  {/* Associated Proposal & Notification */}
                  {selectedPedido.propostaId && (
                    <div className="rounded-2xl border border-border bg-accent/20 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Proposta Comercial Associada
                        </span>
                        <a
                          href={`/proposta/${selectedPedido.propostaToken || selectedPedido.propostaId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Ver Proposta Pública
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <span className="text-xs text-muted-foreground block">Valor Total</span>
                          <span className="font-display text-xl font-bold text-foreground">
                            {selectedPedido.propostaValor !== null &&
                            selectedPedido.propostaValor !== undefined
                              ? formatCents(selectedPedido.propostaValor)
                              : "Calculado"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">
                            Notificação Resend
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                            <Mail className="size-3.5 text-primary" />
                            {selectedPedido.notificacaoStatus || "Por enviar"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-card/60 p-12 text-center">
                  <FileText className="size-12 text-muted-foreground/40 mx-auto mb-3" />
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Nenhum pedido selecionado
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Clica num pedido na coluna da esquerda para ver a interpretação detalhada da IA,
                    proposta gerada e ações de gestão.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CATÁLOGO */}
        {activeTab === "catalogo" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Catálogo de Serviços (Knowledge Base)
                </h2>
                <p className="text-sm text-muted-foreground">
                  Esta base de dados é a fonte de verdade para os preços e serviços interpretados
                  pela IA.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-4" />
                Adicionar Serviço
              </button>
            </div>

            <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/40 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    <th className="py-3.5 px-4">Identificador / Nome</th>
                    <th className="py-3.5 px-3">Unidade</th>
                    <th className="py-3.5 px-4">Preço Unitário</th>
                    <th className="py-3.5 px-3 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {catalogo.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/20 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{item.nome}</p>
                          {item.isDemo && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Fictício
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                          {item.descricao}
                        </p>
                        {item.condicoes && (
                          <p className="text-[11px] text-muted-foreground/80 italic mt-0.5">
                            Condições: {item.condicoes}
                          </p>
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground block mt-1">
                          ID: {item.id}
                        </span>
                      </td>
                      <td className="py-4 px-3 capitalize text-muted-foreground">{item.unidade}</td>
                      <td className="py-4 px-4 font-bold text-foreground">
                        {formatCents(item.precoUnitario)}
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            item.ativo
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                        >
                          <Edit2 className="size-3" />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CONFIGURAÇÕES E SECRETS */}
        {activeTab === "config" && (
          <div className="mt-6 max-w-4xl space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Estado do Sistema e Variáveis de Ambiente
              </h2>
              <p className="text-sm text-muted-foreground">
                Resumo da configuração do backend Node.js, Gemini API, Resend e Firebase Auth.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Gemini Status */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Gemini API</h3>
                  </div>
                  {configStatus?.geminiKeyConfigured ? (
                    configStatus.geminiKeyLooksValid ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        <Check className="size-3" /> Válida (AIzaSy...)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        <AlertTriangle className="size-3" /> Chave Inválida (
                        {configStatus.geminiKeyPrefix || "formato não-Google"})
                      </span>
                    )
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Modo Heurístico
                    </span>
                  )}
                </div>
                <div className="mt-4 text-xs space-y-2 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">Modelo em uso:</strong>{" "}
                    <code>{configStatus?.geminiModel || "gemini-3.8-flash"}</code>
                  </p>
                  <p>
                    A chave <code>GEMINI_API_KEY</code> reside exclusivamente no servidor backend
                    (lida de <code>.env</code> ou dos Secrets). Deve ser obtida em{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline hover:opacity-80"
                    >
                      Google AI Studio
                    </a>{" "}
                    e ter o formato iniciado por <code>AIzaSy...</code>.
                  </p>
                </div>
              </div>

              {/* Resend Status */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="size-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Resend (Email)</h3>
                  </div>
                  {configStatus?.resendKeyConfigured && configStatus?.emailAlunoConfigured ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      <Check className="size-3" /> Ativo
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      Pendente Secrets
                    </span>
                  )}
                </div>
                <div className="mt-4 text-xs space-y-2 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">Destinatário configurado:</strong>{" "}
                    <code>{configStatus?.emailAluno || "EMAIL_ALUNO não definido"}</code>
                  </p>
                  <p>
                    O Resend envia as notificações de nova proposta{" "}
                    <strong>exclusivamente para o email do aluno titular</strong>. Os clientes que
                    preenchem o formulário nunca recebem emails.
                  </p>
                </div>
              </div>

              {/* Firestore Status */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="size-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Cloud Firestore</h3>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <Check className="size-3" /> Provisionado
                  </span>
                </div>
                <div className="mt-4 text-xs space-y-1.5 text-muted-foreground leading-relaxed">
                  <p>
                    Coleções ativas: <code>catalogo</code>, <code>pedidos</code>,{" "}
                    <code>propostas</code>, <code>admins</code>.
                  </p>
                  <p>As regras de segurança estão validadas e deployadas via RPC do Firebase.</p>
                </div>
              </div>

              {/* Admin Auth Status */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Autorização Admin</h3>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <Check className="size-3" /> Autenticado
                  </span>
                </div>
                <div className="mt-4 text-xs space-y-1.5 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">O teu UID:</strong>{" "}
                    <code className="break-all">{currentUser.uid}</code>
                  </p>
                  <p>
                    Podes definir <code>ADMIN_UID={currentUser.uid}</code> nos Secrets para
                    restringir o acesso exclusivamente a este identificador.
                  </p>
                </div>
              </div>
            </div>

            {/* How to configure secrets note */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                Como configurar as variáveis no painel de Secrets:
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As chaves secretas nunca devem ser inseridas no código fonte nem enviadas para o
                browser. No ambiente de trabalho, configura as seguintes variáveis no painel{" "}
                <strong>Settings &gt; Secrets</strong>:
              </p>
              <ul className="text-xs font-mono bg-tint p-4 rounded-2xl border border-border space-y-1.5 text-foreground">
                <li>
                  <strong className="text-primary">GEMINI_API_KEY</strong>=AIzaSy... (obter em
                  https://aistudio.google.com/app/apikey)
                </li>
                <li>
                  <strong className="text-primary">GEMINI_MODEL</strong>=gemini-3.8-flash
                </li>
                <li>
                  <strong className="text-primary">RESEND_API_KEY</strong>=re_123456789...
                </li>
                <li>
                  <strong className="text-primary">EMAIL_ALUNO</strong>=
                  {currentUser.email || "o_teu_email@iscte-iul.pt"}
                </li>
                <li>
                  <strong className="text-primary">ADMIN_UID</strong>={currentUser.uid}
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: RESOLVER MANUALMENTE */}
      {isResolvingModalOpen && selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-w-xl w-full rounded-3xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Resolver Pedido Manualmente
                </h3>
                <p className="text-xs text-muted-foreground">
                  Aluno: {selectedPedido.nome} ({selectedPedido.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsResolvingModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Resumo da Proposta
              </label>
              <input
                type="text"
                value={manualResumo}
                onChange={(e) => setManualResumo(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Seleciona os serviços e horas a incluir:
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {catalogo
                  .filter((c) => c.ativo)
                  .map((item) => {
                    const currentQty = manualItens[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border p-3 flex items-center justify-between text-xs gap-3"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{item.nome}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatCents(item.precoUnitario)}/{item.unidade}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Horas:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={currentQty}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setManualItens((prev) => ({ ...prev, [item.id]: val }));
                            }}
                            className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-center font-bold text-foreground text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsResolvingModalOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSubmeterResolucao}
                className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {actionLoading ? "A calcular proposta..." : "Criar Proposta e Notificar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO ITEM NO CATÁLOGO */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSalvarNovoItem}
            className="max-w-lg w-full rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-foreground">
                Adicionar Serviço ao Catálogo
              </h3>
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nome do Serviço
              </label>
              <input
                type="text"
                required
                value={newItem.nome}
                onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
                placeholder="Ex: Explicação de Inteligência Artificial"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Descrição</label>
              <textarea
                rows={2}
                required
                value={newItem.descricao}
                onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                placeholder="Descrição dos conteúdos e objetivos pedagógicos"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Unidade</label>
                <select
                  value={newItem.unidade}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      unidade: e.target.value as "hora" | "unidade" | "pacote",
                    })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
                >
                  <option value="hora">hora</option>
                  <option value="unidade">unidade</option>
                  <option value="pacote">pacote</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Preço (em cêntimos)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newItem.precoUnitario}
                  onChange={(e) =>
                    setNewItem({ ...newItem, precoUnitario: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Ex: 1500 = 15,00 €
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Condições / Limitações
              </label>
              <input
                type="text"
                value={newItem.condicoes}
                onChange={(e) => setNewItem({ ...newItem, condicoes: e.target.value })}
                placeholder="Ex: Sessão individual com duração de 60 minutos"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                Guardar no Catálogo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDITAR ITEM DO CATÁLOGO */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSalvarEdicaoItem}
            className="max-w-lg w-full rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-foreground">
                Editar Serviço do Catálogo
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Nome</label>
              <input
                type="text"
                required
                value={editingItem.nome}
                onChange={(e) => setEditingItem({ ...editingItem, nome: e.target.value })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Descrição</label>
              <textarea
                rows={2}
                required
                value={editingItem.descricao}
                onChange={(e) => setEditingItem({ ...editingItem, descricao: e.target.value })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Preço (em cêntimos)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editingItem.precoUnitario}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      precoUnitario: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Valor atual: {formatCents(editingItem.precoUnitario)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Estado</label>
                <select
                  value={editingItem.ativo ? "true" : "false"}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, ativo: e.target.value === "true" })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Condições</label>
              <input
                type="text"
                value={editingItem.condicoes}
                onChange={(e) => setEditingItem({ ...editingItem, condicoes: e.target.value })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                Guardar Alterações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
