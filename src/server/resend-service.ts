import { Resend } from "resend";
import type { NotificacaoInfo, Proposta } from "./db";
import { formatCentsToEur } from "./proposal-engine";

export async function sendProposalNotificationToStudent({
  proposta,
  baseUrl,
}: {
  proposta: Proposta;
  baseUrl: string;
}): Promise<NotificacaoInfo> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const emailAluno = process.env.EMAIL_ALUNO?.trim();

  const tentativaEm = new Date().toISOString();

  if (!apiKey || !emailAluno) {
    const faltam: string[] = [];
    if (!apiKey) faltam.push("RESEND_API_KEY");
    if (!emailAluno) faltam.push("EMAIL_ALUNO");

    return {
      status: "Não configurado",
      tentativaEm,
      erro: `Configuração em falta no servidor: ${faltam.join(", ")}. As notificações internas por email requerem a chave Resend e o email associado à conta Resend.`,
    };
  }

  const cleanedBaseUrl = baseUrl.replace(/\/+$/, "");
  const propostaUrl = `${cleanedBaseUrl}/proposta/${proposta.token}`;

  try {
    const resend = new Resend(apiKey);

    const valorFormatado = formatCentsToEur(proposta.total);

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Nova Proposta — TutorIscte</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0284c7; padding: 24px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">TutorIscte — Nova Proposta Gerada</h1>
      <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Notificação interna para o tutor/administrador</p>
    </div>
    <div style="padding: 32px;">
      <p style="margin-top: 0; font-size: 16px; line-height: 1.5;">
        Foi gerada uma nova proposta orçamental no <strong>TutorIscte</strong> em resposta a um pedido de explicações.
      </p>
      
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Número da Proposta:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${proposta.numero}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Âmbito:</td>
            <td style="padding: 6px 0; font-weight: 500; text-align: right;">${proposta.resumo}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Itens incluídos:</td>
            <td style="padding: 6px 0; font-weight: 500; text-align: right;">${proposta.itens.length} serviço(s)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Total sem IVA:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #0284c7; font-size: 16px; text-align: right;">${valorFormatado}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 32px 0 24px;">
        <a href="${propostaUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 9999px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(2,132,199,0.3);">
          Consultar Proposta Completa &rarr;
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
        Se o botão não funcionar, copia e cola o seguinte link no teu navegador:<br>
        <a href="${propostaUrl}" style="color: #0284c7; word-break: break-all;">${propostaUrl}</a>
      </p>
    </div>
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 12px; color: #94a3b8;">
      Modo de aula TutorIscte: Esta notificação foi enviada exclusivamente para o email do aluno titular (${emailAluno}).
    </div>
  </div>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: emailAluno,
      subject: `Nova proposta gerada — TutorIscte (${proposta.numero})`,
      html,
    });

    if (error) {
      console.warn("Resend API retornou erro:", error);
      return {
        status: "Falhou",
        tentativaEm,
        erro: error.message || "Erro no envio via Resend",
        destinatario: emailAluno,
      };
    }

    if (data?.id) {
      return {
        status: "Aceite pelo serviço",
        id: data.id,
        tentativaEm,
        destinatario: emailAluno,
      };
    }

    return {
      status: "Falhou",
      tentativaEm,
      erro: "Resposta inesperada da API Resend sem ID de mensagem",
      destinatario: emailAluno,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Exceção ao chamar Resend:", msg);
    return {
      status: "Falhou",
      tentativaEm,
      erro: msg,
      destinatario: emailAluno,
    };
  }
}
