import crypto from "node:crypto";
import type { CatalogoItem, InterpretacaoItem, Proposta, PropostaItem } from "./db";

export function calculateProposal({
  pedidoId,
  resumo,
  itensInterpretados,
  catalogo,
}: {
  pedidoId: string;
  resumo: string;
  itensInterpretados: InterpretacaoItem[];
  catalogo: CatalogoItem[];
}): Proposta | null {
  const catalogoMap = new Map<string, CatalogoItem>();
  for (const c of catalogo) {
    catalogoMap.set(c.id, c);
  }

  const propostaItens: PropostaItem[] = [];
  let totalCents = 0;

  for (const item of itensInterpretados) {
    const cat = catalogoMap.get(item.catalogoId);
    if (!cat || !cat.ativo) {
      // Item não existe ou inativo -> não é possível calcular com segurança
      return null;
    }

    const quantidade =
      item.quantidade !== null && item.quantidade !== undefined && item.quantidade > 0
        ? Math.round(item.quantidade)
        : null;

    if (quantidade === null) {
      // Quantidade desconhecida -> necessita revisão manual
      return null;
    }

    const subtotal = Math.round(quantidade * cat.precoUnitario);
    totalCents += subtotal;

    propostaItens.push({
      catalogoId: cat.id,
      nome: cat.nome,
      descricao: cat.descricao,
      unidade: cat.unidade,
      quantidade,
      precoUnitario: cat.precoUnitario,
      subtotal,
      condicoes: cat.condicoes,
      evidencia: item.evidencia,
    });
  }

  if (propostaItens.length === 0) {
    return null;
  }

  const ano = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const numero = `PROP-${ano}-${randomSuffix}`;

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomBytes(12).toString("hex");

  const agora = new Date();
  const validade = new Date(agora.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 dias de demonstração

  const proposta: Proposta = {
    id: token, // Usamos o próprio token seguro e único como identificador de documento
    numero,
    pedidoId,
    token,
    createdAt: agora.toISOString(),
    validadeAte: validade.toISOString(),
    resumo,
    itens: propostaItens,
    total: totalCents,
    condicoes:
      "Validade da proposta: 15 dias. Sessões individuais de 60 minutos realizadas no campus do ISCTE-IUL ou por videoconferência. Horários a combinar de acordo com a disponibilidade do tutor.",
    isDemo: true,
    notificacao: {
      status: "Por enviar",
    },
  };

  return proposta;
}

export function formatCentsToEur(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros);
}
