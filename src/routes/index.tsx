import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/auth";
import { FaqChatbot } from "@/components/FaqChatbot";
import { CAL_BOOKING_URL } from "@/lib/booking-data";
import {
  BookOpenCheck,
  CalendarCheck,
  ChevronDown,
  Code2,
  ExternalLink,
  GraduationCap,
  KanbanSquare,
  ListChecks,
  Sigma,
  Sparkles,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "TutorIscte — Explicações com tutores estudantes do ISCTE",
      },
      {
        name: "description",
        content:
          "Marca sessões de explicações de Matemática, Programação, Algoritmos e Desenvolvimento Ágil com colegas tutores do ISCTE.",
      },
      {
        property: "og:title",
        content: "TutorIscte — Explicações com tutores estudantes do ISCTE",
      },
      {
        property: "og:description",
        content:
          "Aprende melhor com colegas que já lá passaram. Marca a tua sessão de explicações no ISCTE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const NAV_LINKS = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Disciplinas", href: "#disciplinas" },
  { label: "FAQ", href: "#faq" },
];

const STEPS = [
  {
    icon: BookOpenCheck,
    title: "Escolhe a disciplina",
    description:
      "Navega pelas disciplinas disponíveis — de Matemática a Desenvolvimento Ágil — e vê os tutores que já aprovaram a cadeira.",
  },
  {
    icon: CalendarCheck,
    title: "Marca a sessão",
    description:
      "Escolhe o dia e a hora que te der mais jeito. As sessões decorrem no campus ou online, conforme preferires.",
  },
  {
    icon: GraduationCap,
    title: "Aprende com um colega",
    description:
      "Trabalha lado a lado com um tutor que esteve no teu lugar. Explicações práticas, ao teu ritmo, sem pressões.",
  },
];

const SUBJECTS = [
  {
    icon: Sigma,
    name: "Matemática",
    description:
      "Álgebra linear, análise matemática e estatística — exercícios resolvidos passo a passo.",
    topics: ["Cálculo", "Álgebra Linear", "Estatística"],
  },
  {
    icon: Code2,
    name: "Programação",
    description:
      "Deixa de te perder em bugs: Java, Python e boas práticas de código com tutores de Informática.",
    topics: ["Java", "Python", "Programação Orientada a Objetos"],
  },
  {
    icon: ListChecks,
    name: "Algoritmos",
    description:
      "Estruturas de dados e complexidade explicadas de forma simples, com exemplos concretos.",
    topics: ["Estruturas de Dados", "Complexidade", "Recursividade"],
  },
  {
    icon: KanbanSquare,
    name: "Desenvolvimento Ágil",
    description:
      "Scrum, kanban e gestão de projetos de software — prepara-te para os trabalhos de grupo e para o mercado.",
    topics: ["Scrum", "Kanban", "Metodologias"],
  },
];

const FAQS = [
  {
    question: "Quem são os tutores?",
    answer:
      "São estudantes do ISCTE que já aprovaram as disciplinas com boas notas e que foram selecionados pela equipa do TutorIscte. Todos conhecem os programas das cadeiras e a forma de avaliar dos professores.",
  },
  {
    question: "Quanto custa uma sessão?",
    answer:
      "As primeiras sessões de experimentação são gratuitas. Depois, as sessões têm valores acessíveis pensados para estudantes, com descontos em pacotes de várias sessões.",
  },
  {
    question: "Como é que marco uma sessão?",
    answer:
      "Clica em \"Marcar Sessão\", escolhe a disciplina e o horário que te der mais jeito, e recebe a confirmação por email. Podes remarcar ou cancelar até 12 horas antes.",
  },
  {
    question: "As sessões são presenciais ou online?",
    answer:
      "As duas! Podes ter a sessão no campus do ISCTE ou por videochamada — decides tu no momento da marcação.",
  },
  {
    question: "Posso ser tutor também?",
    answer:
      "Sim! Se aprovaste disciplinas com boas notas e gostas de ajudar colegas, candidata-te pelo mesmo botão de agendamento — a equipa entra em contacto contigo.",
  },
];

function Navbar() {
  const user = useCurrentUser();
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            Tutor<span className="text-primary">Iscte</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Olá, {user.primeiroNome}
            </Link>
          ) : (
            <Link
              to="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Entrar
            </Link>
          )}
          <Link
            to="/agendar"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Marcar Sessão
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-tint">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_70%_10%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Por estudantes, para estudantes do ISCTE
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Explicações com colegas que{" "}
            <span className="text-primary">já lá passaram</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Matemática, Programação, Algoritmos e Desenvolvimento Ágil. Marca
            sessões de explicações com tutores estudantes do ISCTE e recupera o
            controlo sobre as tuas notas.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/agendar"
              className="rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.03]"
            >
              Marcar Sessão
            </Link>
            <a
              href="#como-funciona"
              className="rounded-full border border-border bg-card px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Como funciona
            </a>
          </div>
          <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6">
            <div>
              <dt className="text-sm text-muted-foreground">Tutores verificados</dt>
              <dd className="font-display text-2xl font-bold text-foreground">60+</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Sessões realizadas</dt>
              <dd className="font-display text-2xl font-bold text-foreground">1.400+</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Satisfação dos alunos</dt>
              <dd className="font-display text-2xl font-bold text-foreground">4,9/5</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Como funciona
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Três passos simples entre ti e uma sessão de explicações que vale a
            pena.
          </p>
        </div>
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <span className="absolute right-6 top-6 font-display text-4xl font-bold text-primary/10">
                {index + 1}
              </span>
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <step.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Subjects() {
  return (
    <section id="disciplinas" className="scroll-mt-20 bg-tint py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Disciplinas disponíveis
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Tutores para as cadeiras onde os estudantes mais precisam de ajuda.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {SUBJECTS.map((subject) => (
            <article
              key={subject.name}
              className="group rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <subject.icon className="size-6" />
                </span>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {subject.name}
                </h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {subject.description}
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {subject.topics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Perguntas frequentes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Tudo o que precisas de saber antes da tua primeira sessão.
          </p>
        </div>
        <div className="mt-12 space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border border-border bg-card px-5 py-4 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-foreground [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="marcar-sessao" className="scroll-mt-20 pb-20 sm:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklab,white_18%,transparent),transparent)]"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-primary-foreground">
              <Users className="size-3.5" />
              Lugares disponíveis esta semana
            </span>
            <h2 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Pronto para melhorar as tuas notas?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/85">
              Marca hoje a tua primeira sessão de explicações. A primeira é
              por nossa conta.
            </p>
            <Link
              to="/agendar"
              className="mt-8 inline-block rounded-full bg-card px-8 py-3.5 text-base font-semibold text-primary shadow-lg transition-transform hover:scale-[1.03]"
            >
              Marcar Sessão
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <span className="font-display text-base font-semibold text-foreground">
          Tutor<span className="text-primary">Iscte</span>
        </span>
        <p className="text-sm text-muted-foreground">
          Feito por estudantes, para estudantes do ISCTE.
        </p>
        <div className="flex gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Subjects />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <FaqChatbot />
    </div>
  );
}
