import { useEffect, useRef, useState } from "react";
import { GraduationCap, MessageCircle, Send, X } from "lucide-react";

type Message = { role: "bot" | "user"; text: string };

const FALLBACK =
  "Infelizmente não consigo ajudar, pff envie um email para mamfh@iscte-iul.pt para mais informações";

const FAQ_ANSWERS: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["tutor", "tutores", "quem"],
    answer:
      "Os tutores são estudantes do ISCTE que já aprovaram as disciplinas com boas notas e foram selecionados pela equipa do TutorIscte. Todos conhecem os programas das cadeiras e a forma de avaliar dos professores.",
  },
  {
    keywords: ["custa", "custo", "preço", "preco", "pagar", "grátis", "gratis", "valor"],
    answer:
      "As primeiras sessões de experimentação são gratuitas. Depois, as sessões têm valores acessíveis pensados para estudantes, com descontos em pacotes de várias sessões.",
  },
  {
    keywords: [
      "marco",
      "marcar",
      "marcação",
      "marcacao",
      "agendar",
      "agendamento",
      "remarcar",
      "cancelar",
    ],
    answer:
      'Clica em "Marcar Sessão", escolhe a disciplina e o horário que te der mais jeito, e recebe a confirmação por email. Podes remarcar ou cancelar até 12 horas antes.',
  },
  {
    keywords: ["presencial", "online", "videochamada", "campus", "modalidade", "onde"],
    answer:
      "As sessões podem ser presenciais ou online! Podes ter a sessão no campus do ISCTE ou por videochamada — decides tu no momento da marcação.",
  },
  {
    keywords: [
      "ser tutor",
      "candidatar",
      "candidatura",
      "também",
      "tambem",
      "ensinar",
      "dar explicações",
      "dar explicacoes",
    ],
    answer:
      "Sim, podes ser tutor! Se aprovaste disciplinas com boas notas e gostas de ajudar colegas, candidata-te pelo mesmo botão de agendamento — a equipa entra em contacto contigo.",
  },
  {
    keywords: [
      "disciplina",
      "disciplinas",
      "cadeira",
      "cadeiras",
      "matemática",
      "matematica",
      "programação",
      "programacao",
      "algoritmos",
      "ágil",
      "agil",
    ],
    answer:
      "Temos tutores para Matemática, Programação, Algoritmos e Desenvolvimento Ágil — as cadeiras onde os estudantes mais precisam de ajuda.",
  },
];

function getAnswer(question: string): string {
  const q = question.toLowerCase();
  let best: { answer: string; score: number } | null = null;
  for (const faq of FAQ_ANSWERS) {
    const score = faq.keywords.filter((k) => q.includes(k)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { answer: faq.answer, score };
    }
  }
  return best ? best.answer : FALLBACK;
}

export function FaqChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Olá! Sou o assistente do TutorIscte. Pergunta-me sobre os tutores, preços, marcações ou modalidades das sessões.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "bot", text: getAnswer(text) },
    ]);
    setInput("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar assistente" : "Abrir assistente"}
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center gap-3 border-b border-border bg-primary px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-card/20 text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-primary-foreground">Assistente TutorIscte</p>
              <p className="text-xs text-primary-foreground/80">
                Responde com base nas perguntas frequentes
              </p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <form
            className="flex items-center gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreve a tua pergunta..."
              className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="submit"
              aria-label="Enviar"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
