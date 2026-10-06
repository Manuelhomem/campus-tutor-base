import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export interface CatalogoItem {
  id: string;
  nome: string;
  descricao: string;
  unidade: "hora" | "unidade" | "pacote";
  precoUnitario: number; // em cêntimos de EUR
  moeda: "EUR";
  ativo: boolean;
  condicoes: string;
  isDemo: boolean;
}

export interface InterpretacaoItem {
  catalogoId: string;
  quantidade: number | null;
  evidencia: string;
}

export interface InterpretacaoIA {
  resumo: string;
  itens: InterpretacaoItem[];
  prazoPedido: string | null;
  informacaoEmFalta: string[];
  necessitaRevisao: boolean;
  motivoRevisao: string | null;
}

export type PedidoStatus =
  "Recebido" | "Em análise" | "Necessita de revisão" | "Proposta criada" | "Erro";

export interface Pedido {
  id: string;
  nome: string;
  email: string;
  pedido: string;
  status: PedidoStatus;
  createdAt: string;
  updatedAt: string;
  interpretacao?: InterpretacaoIA | null;
  informacaoEmFalta?: string[];
  motivoRevisao?: string | null;
  propostaId?: string | null;
  propostaToken?: string | null;
  erro?: string | null;
}

export interface PropostaItem {
  catalogoId: string;
  nome: string;
  descricao: string;
  unidade: "hora" | "unidade" | "pacote";
  quantidade: number;
  precoUnitario: number; // em cêntimos
  subtotal: number; // em cêntimos
  condicoes: string;
  evidencia?: string;
}

export type NotificacaoStatus = "Por enviar" | "Aceite pelo serviço" | "Falhou" | "Não configurado";

export interface NotificacaoInfo {
  status: NotificacaoStatus;
  id?: string;
  tentativaEm?: string;
  erro?: string;
  destinatario?: string;
}

export interface Proposta {
  id: string;
  numero: string;
  pedidoId: string;
  token: string;
  createdAt: string;
  validadeAte: string;
  resumo: string;
  itens: PropostaItem[];
  total: number; // em cêntimos
  condicoes: string;
  isDemo: boolean;
  notificacao?: NotificacaoInfo;
}

export const SEED_CATALOGO: CatalogoItem[] = [
  {
    id: "matematica-sessao-individual",
    nome: "Explicação de Matemática",
    descricao:
      "Sessão individual de apoio em Álgebra Linear, Análise Matemática e Cálculo (60 min)",
    unidade: "hora",
    precoUnitario: 1200,
    moeda: "EUR",
    ativo: true,
    condicoes: "Sessão individual com duração de 60 minutos",
    isDemo: true,
  },
  {
    id: "programacao-sessao-individual",
    nome: "Explicação de Programação",
    descricao:
      "Sessão individual de introdução à programação, lógica e estruturas de controlo (60 min)",
    unidade: "hora",
    precoUnitario: 1500,
    moeda: "EUR",
    ativo: true,
    condicoes: "Sessão individual com duração de 60 minutos",
    isDemo: true,
  },
  {
    id: "algoritmos-sessao-individual",
    nome: "Explicação de Algoritmos e Estruturas de Dados",
    descricao:
      "Sessão individual focada em estruturas de dados, complexidade e resolução de problemas práticos (60 min)",
    unidade: "hora",
    precoUnitario: 1500,
    moeda: "EUR",
    ativo: true,
    condicoes: "Sessão individual com duração de 60 minutos",
    isDemo: true,
  },
  {
    id: "desenvolvimento-agil-sessao-individual",
    nome: "Explicação de Desenvolvimento Ágil de Software",
    descricao:
      "Sessão individual de metodologias ágeis, arquitetura e engenharia de software (60 min)",
    unidade: "hora",
    precoUnitario: 1500,
    moeda: "EUR",
    ativo: true,
    condicoes: "Sessão individual com duração de 60 minutos",
    isDemo: true,
  },
  {
    id: "primeira-sessao-experimentacao",
    nome: "Primeira sessão de experimentação",
    descricao: "Primeira sessão de experimentação em qualquer disciplina (60 min)",
    unidade: "hora",
    precoUnitario: 0,
    moeda: "EUR",
    ativo: true,
    condicoes: "Aplicável apenas à primeira sessão de cada cliente novo",
    isDemo: true,
  },
];

export async function ensureCatalogoSeeded(): Promise<CatalogoItem[]> {
  try {
    const snap = await getDocs(collection(db, "catalogo"));
    if (snap.docs.length > 0) {
      return snap.docs.map((d) => d.data() as CatalogoItem);
    }
    // Inicializar apenas se não existirem itens
    for (const item of SEED_CATALOGO) {
      await setDoc(doc(db, "catalogo", item.id), item);
    }
    return SEED_CATALOGO;
  } catch (err) {
    console.error("Erro ao inicializar catálogo no Firestore:", err);
    return SEED_CATALOGO;
  }
}

export async function getCatalogo(): Promise<CatalogoItem[]> {
  try {
    const snap = await getDocs(collection(db, "catalogo"));
    if (snap.docs.length === 0) {
      return await ensureCatalogoSeeded();
    }
    return snap.docs.map((d) => d.data() as CatalogoItem);
  } catch (err) {
    console.error("Erro ao ler catálogo:", err);
    return SEED_CATALOGO;
  }
}

export async function getActiveCatalogo(): Promise<CatalogoItem[]> {
  const all = await getCatalogo();
  return all.filter((i) => i.ativo);
}

export function cleanFirestoreData<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  if (data === null || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value !== undefined) {
      result[key] = cleanFirestoreData(value);
    } else {
      result[key] = null;
    }
  }
  return result as T;
}

export async function savePedido(pedido: Pedido): Promise<void> {
  await setDoc(doc(db, "pedidos", pedido.id), cleanFirestoreData(pedido));
}

export async function updatePedido(id: string, partial: Partial<Pedido>): Promise<void> {
  await setDoc(
    doc(db, "pedidos", id),
    cleanFirestoreData({
      ...partial,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true },
  );
}

export async function getPedidoById(id: string): Promise<Pedido | null> {
  const snap = await getDoc(doc(db, "pedidos", id));
  if (!snap.exists()) return null;
  return snap.data() as Pedido;
}

export async function listPedidos(statusFilter?: PedidoStatus): Promise<Pedido[]> {
  try {
    const q = collection(db, "pedidos");
    if (statusFilter) {
      const snap = await getDocs(query(q, where("status", "==", statusFilter)));
      const list = snap.docs.map((d) => d.data() as Pedido);
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as Pedido);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error("Erro ao listar pedidos:", err);
    return [];
  }
}

export async function saveProposta(proposta: Proposta): Promise<void> {
  // Guardamos usando o ID e também indexável pelo token
  await setDoc(doc(db, "propostas", proposta.id), cleanFirestoreData(proposta));
}

export async function getPropostaByToken(token: string): Promise<Proposta | null> {
  try {
    // 1. Tentar por ID directo se id == token
    const directSnap = await getDoc(doc(db, "propostas", token));
    if (directSnap.exists()) {
      return directSnap.data() as Proposta;
    }
    // 2. Tentar por campo token
    const q = query(collection(db, "propostas"), where("token", "==", token));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Proposta;
    }
    return null;
  } catch (err) {
    console.error("Erro ao obter proposta por token:", err);
    return null;
  }
}

export async function getPropostaById(id: string): Promise<Proposta | null> {
  const snap = await getDoc(doc(db, "propostas", id));
  if (!snap.exists()) return null;
  return snap.data() as Proposta;
}

export async function updateProposta(id: string, partial: Partial<Proposta>): Promise<void> {
  await setDoc(doc(db, "propostas", id), cleanFirestoreData(partial), { merge: true });
}
