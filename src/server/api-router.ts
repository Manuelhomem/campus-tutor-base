import crypto from "node:crypto";
import {
  ensureCatalogoSeeded,
  getActiveCatalogo,
  getCatalogo,
  getPedidoById,
  getPropostaByToken,
  listPedidos,
  savePedido,
  saveProposta,
  updatePedido,
  updateProposta,
  type CatalogoItem,
  type Pedido,
  type PedidoStatus,
  type Proposta,
} from "./db";
import { interpretPedidoWithGemini, getGeminiApiKey, getGeminiModel } from "./gemini";
import { calculateProposal } from "./proposal-engine";
import { sendProposalNotificationToStudent } from "./resend-service";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

// In-memory rate limiting para proteção contra spam (IP / submissões recentes)
const recentSubmissions = new Map<string, number>();

function isRateLimited(key: string, limitMs = 3000): boolean {
  const now = Date.now();
  const last = recentSubmissions.get(key);
  if (last && now - last < limitMs) {
    return true;
  }
  recentSubmissions.set(key, now);
  // Limpeza periódica
  if (recentSubmissions.size > 500) {
    for (const [k, t] of recentSubmissions.entries()) {
      if (now - t > 60000) recentSubmissions.delete(k);
    }
  }
  return false;
}

function getAppBaseUrl(req: Request): string {
  if (process.env.APP_BASE_URL?.trim()) {
    return process.env.APP_BASE_URL.trim();
  }
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

function verifyAdminAuth(req: Request): { authorized: boolean; reason?: string } {
  const adminUid = process.env.ADMIN_UID?.trim();
  const authHeader = req.headers.get("authorization") || "";
  const headerUid = req.headers.get("x-admin-uid") || "";
  const headerEmail = req.headers.get("x-admin-email") || "";

  // Se o aluno configurou ADMIN_UID, exige correspondência exata
  if (adminUid) {
    if (headerUid === adminUid) {
      return { authorized: true };
    }
    // Verificar token bearer se fornecido
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      if (token === adminUid) {
        return { authorized: true };
      }
    }
    // Email do titular também é aceite como fallback legítimo
    if (headerEmail === "mamfh@iscte-iul.pt") {
      return { authorized: true };
    }
    return {
      authorized: false,
      reason: `UID ${headerUid || "não fornecido"} não corresponde ao ADMIN_UID configurado.`,
    };
  }

  // Se ADMIN_UID ainda não foi definido nos secrets, autoriza temporariamente o email do titular do workspace
  if (headerEmail === "mamfh@iscte-iul.pt" || headerUid) {
    return { authorized: true };
  }

  return {
    authorized: false,
    reason: "É necessário iniciar sessão com a conta de administrador no painel.",
  };
}

export async function handleApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Garantir catálogo inicializado em segundo plano se necessário
  ensureCatalogoSeeded().catch(console.error);

  // 1. SUBMETER PEDIDO DE PROPOSTA (Público)
  if (path === "/api/propostas/pedir" && req.method === "POST") {
    try {
      const clientIp = req.headers.get("x-forwarded-for") || "unknown";
      if (isRateLimited(`submit_${clientIp}`, 2000)) {
        return Response.json(
          { error: "Por favor aguarde alguns segundos antes de submeter outro pedido." },
          { status: 429 },
        );
      }

      const body = await req.json().catch(() => null);
      if (!body) {
        return Response.json({ error: "Dados inválidos." }, { status: 400 });
      }

      const nome = typeof body.nome === "string" ? body.nome.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const pedidoTexto = typeof body.pedido === "string" ? body.pedido.trim() : "";

      // Validação rigorosa dos 3 campos obrigatórios
      if (!nome || nome.length < 2 || nome.length > 150) {
        return Response.json(
          { error: "Por favor insira um nome válido (entre 2 e 150 caracteres)." },
          { status: 400 },
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email) || email.length > 200) {
        return Response.json(
          { error: "Por favor insira um endereço de email com formato válido." },
          { status: 400 },
        );
      }

      if (!pedidoTexto || pedidoTexto.length < 5 || pedidoTexto.length > 5000) {
        return Response.json(
          { error: "Por favor descreva o seu pedido com pelo menos 5 caracteres (máximo 5000)." },
          { status: 400 },
        );
      }

      const agora = new Date().toISOString();
      const pedidoId = `ped_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

      // 1. Consultar o catálogo ativo
      const catalogoAtivo = await getActiveCatalogo();

      // 2. Interpretar com Gemini (sem enviar nome nem email por privacidade)
      const { interpretacao, error: geminiError } = await interpretPedidoWithGemini(
        pedidoTexto,
        catalogoAtivo,
      );

      // 3. Se não necessita de revisão e tem itens com quantidade, calcular a proposta
      let propostaCriada: Proposta | null = null;
      let statusFinal: PedidoStatus = "Necessita de revisão";

      if (!interpretacao.necessitaRevisao && interpretacao.itens.length > 0) {
        propostaCriada = calculateProposal({
          pedidoId,
          resumo: interpretacao.resumo,
          itensInterpretados: interpretacao.itens,
          catalogo: catalogoAtivo,
        });

        if (propostaCriada) {
          statusFinal = "Proposta criada";

          // 4. Enviar notificação por email ao aluno via Resend
          const baseUrl = getAppBaseUrl(req);
          const notifResult = await sendProposalNotificationToStudent({
            proposta: propostaCriada,
            baseUrl,
          });

          propostaCriada.notificacao = notifResult;
          await saveProposta(propostaCriada);
        } else {
          statusFinal = "Necessita de revisão";
          interpretacao.necessitaRevisao = true;
          interpretacao.motivoRevisao =
            interpretacao.motivoRevisao ||
            "Não foi possível calcular automaticamente o valor com base nos itens solicitados.";
        }
      } else {
        statusFinal = "Necessita de revisão";
      }

      // 5. Guardar o pedido completo no Firestore
      const novoPedido: Pedido = {
        id: pedidoId,
        nome,
        email,
        pedido: pedidoTexto,
        status: statusFinal,
        createdAt: agora,
        updatedAt: agora,
        interpretacao: interpretacao || null,
        informacaoEmFalta: interpretacao?.informacaoEmFalta || [],
        motivoRevisao: interpretacao?.motivoRevisao || null,
        propostaId: propostaCriada ? propostaCriada.id : null,
        propostaToken: propostaCriada ? propostaCriada.token : null,
        erro: geminiError || null,
      };

      await savePedido(novoPedido);

      // Resposta ao cliente: "O seu pedido foi recebido com sucesso."
      return Response.json({
        ok: true,
        message: "O seu pedido foi recebido com sucesso.",
        pedidoId,
        status: novoPedido.status,
      });
    } catch (err: unknown) {
      console.error("Erro no processamento do pedido:", err);
      return Response.json(
        { error: "Ocorreu um erro ao processar o seu pedido. Por favor tente novamente." },
        { status: 500 },
      );
    }
  }

  // 2. CONSULTAR PROPOSTA POR TOKEN (Público, sem login)
  if (path.startsWith("/api/propostas/ver/") && req.method === "GET") {
    try {
      const token = path.replace("/api/propostas/ver/", "").trim();
      if (!token || token.length < 16) {
        return Response.json({ error: "Token inválido ou não fornecido." }, { status: 400 });
      }

      const proposta = await getPropostaByToken(token);
      if (!proposta) {
        return Response.json(
          { error: "Proposta não encontrada ou link expirado." },
          { status: 404 },
        );
      }

      // Devolver apenas campos públicos higienizados (sem PII de cliente nem dados internos de email)
      const safeProposta = {
        numero: proposta.numero,
        createdAt: proposta.createdAt,
        validadeAte: proposta.validadeAte,
        resumo: proposta.resumo,
        itens: proposta.itens.map((item) => ({
          catalogoId: item.catalogoId,
          nome: item.nome,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          subtotal: item.subtotal,
          condicoes: item.condicoes,
        })),
        total: proposta.total,
        condicoes: proposta.condicoes,
        isDemo: proposta.isDemo,
      };

      return Response.json({ ok: true, proposta: safeProposta });
    } catch (err) {
      console.error("Erro ao obter proposta pública:", err);
      return Response.json(
        { error: "Não foi possível carregar a proposta solicitada." },
        { status: 500 },
      );
    }
  }

  // 3. ADMIN: LISTAR PEDIDOS
  if (path === "/api/admin/pedidos" && req.method === "GET") {
    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return Response.json({ error: auth.reason || "Acesso não autorizado." }, { status: 403 });
    }

    const statusParam = url.searchParams.get("status") as PedidoStatus | null;
    const pedidos = await listPedidos(statusParam || undefined);

    // Complementar com dados da proposta se existir
    const result = await Promise.all(
      pedidos.map(async (p) => {
        let propostaValor: number | null = null;
        let notificacaoStatus: string | null = null;
        if (p.propostaId) {
          const prop = await getPropostaByToken(p.propostaId);
          if (prop) {
            propostaValor = prop.total;
            notificacaoStatus = prop.notificacao?.status || "Por enviar";
          }
        }
        return {
          ...p,
          propostaValor,
          notificacaoStatus,
        };
      }),
    );

    return Response.json({ ok: true, pedidos: result });
  }

  // 4. ADMIN: REPETIR PROCESSAMENTO COM GEMINI
  if (path.match(/^\/api\/admin\/pedidos\/[^/]+\/reprocessar$/) && req.method === "POST") {
    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return Response.json({ error: auth.reason }, { status: 403 });
    }

    const pedidoId = path.split("/")[4];
    const pedido = await getPedidoById(pedidoId);
    if (!pedido) {
      return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    const catalogo = await getActiveCatalogo();
    await updatePedido(pedidoId, { status: "Em análise" });

    const { interpretacao, error } = await interpretPedidoWithGemini(pedido.pedido, catalogo);

    let propostaCriada: Proposta | null = null;
    let novoStatus: PedidoStatus = "Necessita de revisão";

    if (!interpretacao.necessitaRevisao && interpretacao.itens.length > 0) {
      propostaCriada = calculateProposal({
        pedidoId,
        resumo: interpretacao.resumo,
        itensInterpretados: interpretacao.itens,
        catalogo,
      });

      if (propostaCriada) {
        await saveProposta(propostaCriada);
        novoStatus = "Proposta criada";

        const baseUrl = getAppBaseUrl(req);
        const notifResult = await sendProposalNotificationToStudent({
          proposta: propostaCriada,
          baseUrl,
        });
        propostaCriada.notificacao = notifResult;
        await updateProposta(propostaCriada.id, { notificacao: notifResult });
      }
    }

    await updatePedido(pedidoId, {
      status: novoStatus,
      interpretacao,
      informacaoEmFalta: interpretacao.informacaoEmFalta,
      motivoRevisao: interpretacao.motivoRevisao,
      propostaId: propostaCriada?.id || pedido.propostaId,
      propostaToken: propostaCriada?.token || pedido.propostaToken,
      erro: error || null,
    });

    const atualizado = await getPedidoById(pedidoId);
    return Response.json({ ok: true, pedido: atualizado, proposta: propostaCriada });
  }

  // 5. ADMIN: RESOLVER PEDIDO EM REVISÃO MANUALMENTE
  if (path.match(/^\/api\/admin\/pedidos\/[^/]+\/resolver$/) && req.method === "POST") {
    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return Response.json({ error: auth.reason }, { status: 403 });
    }

    const pedidoId = path.split("/")[4];
    const pedido = await getPedidoById(pedidoId);
    if (!pedido) {
      return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.itens) || body.itens.length === 0) {
      return Response.json(
        { error: "Selecione pelo menos um item do catálogo com quantidade válida." },
        { status: 400 },
      );
    }

    const catalogo = await getActiveCatalogo();
    const proposta = calculateProposal({
      pedidoId,
      resumo: body.resumo?.trim() || `Proposta aprovada manualmente para ${pedido.nome}`,
      itensInterpretados: body.itens.map((i: { catalogoId: string; quantidade: number }) => ({
        catalogoId: i.catalogoId,
        quantidade: i.quantidade,
        evidencia: "Seleção manual na área de administração",
      })),
      catalogo,
    });

    if (!proposta) {
      return Response.json(
        { error: "Não foi possível calcular a proposta com os itens fornecidos." },
        { status: 400 },
      );
    }

    await saveProposta(proposta);

    const baseUrl = getAppBaseUrl(req);
    const notifResult = await sendProposalNotificationToStudent({
      proposta,
      baseUrl,
    });
    proposta.notificacao = notifResult;
    await updateProposta(proposta.id, { notificacao: notifResult });

    await updatePedido(pedidoId, {
      status: "Proposta criada",
      propostaId: proposta.id,
      propostaToken: proposta.token,
      motivoRevisao: null,
    });

    const atualizado = await getPedidoById(pedidoId);
    return Response.json({ ok: true, pedido: atualizado, proposta });
  }

  // 6. ADMIN: REENVIAR NOTIFICAÇÃO RESEND
  if (path.match(/^\/api\/admin\/pedidos\/[^/]+\/reenviar-notificacao$/) && req.method === "POST") {
    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return Response.json({ error: auth.reason }, { status: 403 });
    }

    const pedidoId = path.split("/")[4];
    const pedido = await getPedidoById(pedidoId);
    if (!pedido || !pedido.propostaId) {
      return Response.json(
        { error: "Pedido não tem nenhuma proposta associada para notificar." },
        { status: 400 },
      );
    }

    const proposta = await getPropostaByToken(pedido.propostaId);
    if (!proposta) {
      return Response.json({ error: "Proposta não encontrada." }, { status: 404 });
    }

    const baseUrl = getAppBaseUrl(req);
    const notif = await sendProposalNotificationToStudent({ proposta, baseUrl });
    await updateProposta(proposta.id, { notificacao: notif });

    return Response.json({ ok: true, notificacao: notif });
  }

  // 7. ADMIN: CATÁLOGO CRUD
  if (path === "/api/admin/catalogo" && req.method === "GET") {
    const items = await getCatalogo();
    return Response.json({ ok: true, catalogo: items });
  }

  if (path === "/api/admin/catalogo" && req.method === "POST") {
    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return Response.json({ error: auth.reason }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.nome || !body.precoUnitario) {
      return Response.json({ error: "Nome e preço unitário são obrigatórios." }, { status: 400 });
    }

    const id =
      body.id?.trim() ||
      body.nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const item: CatalogoItem = {
      id,
      nome: String(body.nome).trim(),
      descricao: String(body.descricao || "").trim(),
      unidade: body.unidade === "pacote" || body.unidade === "unidade" ? body.unidade : "hora",
      precoUnitario: Math.round(Number(body.precoUnitario)),
      moeda: "EUR",
      ativo: body.ativo !== false,
      condicoes: String(body.condicoes || "").trim(),
      isDemo: Boolean(body.isDemo),
    };

    await setDoc(doc(db, "catalogo", item.id), item);
    return Response.json({ ok: true, item });
  }

  if (path.startsWith("/api/admin/catalogo/") && req.method === "PUT") {
    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return Response.json({ error: auth.reason }, { status: 403 });
    }

    const id = path.replace("/api/admin/catalogo/", "").trim();
    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const partial: Partial<CatalogoItem> = {};
    if (body.nome !== undefined) partial.nome = String(body.nome).trim();
    if (body.descricao !== undefined) partial.descricao = String(body.descricao).trim();
    if (body.precoUnitario !== undefined)
      partial.precoUnitario = Math.round(Number(body.precoUnitario));
    if (body.unidade !== undefined) partial.unidade = body.unidade;
    if (body.ativo !== undefined) partial.ativo = Boolean(body.ativo);
    if (body.condicoes !== undefined) partial.condicoes = String(body.condicoes).trim();

    await setDoc(doc(db, "catalogo", id), partial, { merge: true });
    return Response.json({ ok: true, id, updated: partial });
  }

  // 8. ADMIN: ESTADO DAS CONFIGURAÇÕES
  if (path === "/api/admin/config-status" && req.method === "GET") {
    const geminiKey = getGeminiApiKey();
    const geminiKeyConfigured = Boolean(geminiKey?.trim());
    const geminiKeyLooksValid = geminiKey ? geminiKey.startsWith("AIzaSy") : false;
    const geminiKeyPrefix = geminiKey ? `${geminiKey.slice(0, 6)}...` : null;
    const resendKeyConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
    const emailAlunoConfigured = Boolean(process.env.EMAIL_ALUNO?.trim());
    const adminUidConfigured = Boolean(process.env.ADMIN_UID?.trim());
    const appBaseUrl = process.env.APP_BASE_URL?.trim() || getAppBaseUrl(req);

    return Response.json({
      ok: true,
      config: {
        geminiKeyConfigured,
        geminiKeyLooksValid,
        geminiKeyPrefix,
        geminiModel: getGeminiModel(),
        resendKeyConfigured,
        emailAlunoConfigured,
        emailAluno: process.env.EMAIL_ALUNO || null,
        adminUidConfigured,
        adminUid: process.env.ADMIN_UID || null,
        appBaseUrl,
      },
    });
  }

  return null;
}
