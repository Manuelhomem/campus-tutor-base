import {
  Code2,
  KanbanSquare,
  ListChecks,
  Scale,
  Sigma,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/// Real booking calendar (Cal.com) used to confirm a tutoring session.
export const CAL_BOOKING_URL = "https://cal.com/manuel-homem-cufgzn/explicacoes";

export type Slot = {
  day: string;
  time: string;
  tutor: string;
  mode: "Presencial" | "Online" | "Ambas";
  tutorEmail?: string;
};

export type Subject = {
  slug: string;
  name: string;
  icon: LucideIcon;
  description: string;
  topics: string[];
  slots: Slot[];
};

export const BOOKING_SUBJECTS: Subject[] = [
  {
    slug: "matematica",
    name: "Matemática",
    icon: Sigma,
    description:
      "Álgebra linear, análise matemática e estatística — exercícios resolvidos passo a passo.",
    topics: ["Cálculo", "Álgebra Linear", "Estatística"],
    slots: [
      { day: "Segunda", time: "10:00", tutor: "Ana Silva", mode: "Presencial" },
      { day: "Terça", time: "15:00", tutor: "Ana Silva", mode: "Online" },
      { day: "Quarta", time: "11:30", tutor: "Rui Marques", mode: "Presencial" },
      { day: "Quinta", time: "17:00", tutor: "Beatriz Lopes", mode: "Online" },
      { day: "Sexta", time: "09:30", tutor: "Rui Marques", mode: "Presencial" },
      { day: "Sexta", time: "16:00", tutor: "Beatriz Lopes", mode: "Online" },
    ],
  },
  {
    slug: "direito",
    name: "Direito",
    icon: Scale,
    description: "Introdução ao Direito, Direito das Obrigações e casos práticos comentados.",
    topics: ["Direito Civil", "Casos Práticos", "Metodologia Jurídica"],
    slots: [
      { day: "Segunda", time: "14:00", tutor: "Miguel Faria", mode: "Presencial" },
      { day: "Terça", time: "18:00", tutor: "Carolina Nunes", mode: "Online" },
      { day: "Quinta", time: "10:30", tutor: "Miguel Faria", mode: "Presencial" },
      { day: "Sexta", time: "15:30", tutor: "Carolina Nunes", mode: "Online" },
    ],
  },
  {
    slug: "algoritmos",
    name: "Algoritmos",
    icon: ListChecks,
    description:
      "Estruturas de dados e complexidade explicadas de forma simples, com exemplos concretos.",
    topics: ["Estruturas de Dados", "Complexidade", "Recursividade"],
    slots: [
      { day: "Segunda", time: "16:30", tutor: "Tiago Ferreira", mode: "Online" },
      { day: "Quarta", time: "09:00", tutor: "Inês Cardoso", mode: "Presencial" },
      { day: "Quarta", time: "18:30", tutor: "Tiago Ferreira", mode: "Online" },
      { day: "Sexta", time: "11:00", tutor: "Inês Cardoso", mode: "Presencial" },
    ],
  },
  {
    slug: "programacao",
    name: "Programação",
    icon: Code2,
    description: "Java, Python e boas práticas de código com tutores de Informática.",
    topics: ["Java", "Python", "Programação Orientada a Objetos"],
    slots: [
      { day: "Terça", time: "10:00", tutor: "João Pinto", mode: "Presencial" },
      { day: "Terça", time: "17:30", tutor: "Sofia Almeida", mode: "Online" },
      { day: "Quinta", time: "14:30", tutor: "João Pinto", mode: "Presencial" },
      { day: "Quinta", time: "19:00", tutor: "Sofia Almeida", mode: "Online" },
      { day: "Sexta", time: "13:00", tutor: "João Pinto", mode: "Online" },
    ],
  },
  {
    slug: "desenvolvimento-agil",
    name: "Desenvolvimento Ágil",
    icon: KanbanSquare,
    description: "Scrum, kanban e gestão de projetos de software para os trabalhos de grupo.",
    topics: ["Scrum", "Kanban", "Metodologias"],
    slots: [
      { day: "Segunda", time: "18:00", tutor: "Marta Ribeiro", mode: "Online" },
      { day: "Quarta", time: "15:00", tutor: "Pedro Gomes", mode: "Presencial" },
      { day: "Sexta", time: "10:00", tutor: "Marta Ribeiro", mode: "Online" },
    ],
  },
  {
    slug: "estatistica",
    name: "Estatística",
    icon: TrendingUp,
    description: "Probabilidades, inferência e análise de dados com apoio em R e SPSS.",
    topics: ["Probabilidades", "Inferência", "R e SPSS"],
    slots: [
      { day: "Terça", time: "09:00", tutor: "Helena Costa", mode: "Presencial" },
      { day: "Quarta", time: "17:00", tutor: "Helena Costa", mode: "Online" },
      { day: "Quinta", time: "11:00", tutor: "Diogo Matos", mode: "Presencial" },
    ],
  },
];

export const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

export function getSubject(slug: string) {
  return BOOKING_SUBJECTS.find((s) => s.slug === slug);
}
