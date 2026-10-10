// Gera os e-mails de autenticação da LOLA em português (HTML) em supabase/emails/.
// Colar cada arquivo em Supabase > Authentication > Emails > Templates (assunto na lista abaixo).
// Uso: npm run emails
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://www.lolaonline.com.br";
const saida = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "emails");

const TEMPLATES = [
  {
    arquivo: "confirmar-cadastro.html",
    template: "Confirm sign up",
    assunto: "Confirme seu e-mail na LOLA",
    titulo: "Bem-vinda à LOLA!",
    texto: "Falta só um passo: confirme seu e-mail para ativar sua conta e começar a comprar.",
    botao: "Confirmar meu e-mail",
    nota: "Se você não criou uma conta na LOLA, pode ignorar esta mensagem.",
  },
  {
    arquivo: "redefinir-senha.html",
    template: "Reset password",
    assunto: "Redefina sua senha da LOLA",
    titulo: "Vamos criar uma nova senha",
    texto: "Recebemos um pedido para redefinir a senha da sua conta. Clique no botão para escolher uma nova.",
    botao: "Redefinir minha senha",
    nota: "Se você não fez esse pedido, ignore este e-mail. Sua senha continua a mesma.",
  },
  {
    arquivo: "convite.html",
    template: "Invite user",
    assunto: "Você foi convidada para a LOLA",
    titulo: "Você recebeu um convite",
    texto: "A equipe LOLA convidou você para acessar a loja. Aceite o convite para criar sua senha.",
    botao: "Aceitar convite",
    nota: "Se você não esperava este convite, pode ignorar esta mensagem.",
  },
  {
    arquivo: "link-magico.html",
    template: "Magic link",
    assunto: "Seu link de acesso à LOLA",
    titulo: "Seu link de acesso",
    texto: "Clique no botão para entrar na sua conta sem digitar a senha.",
    botao: "Entrar na LOLA",
    nota: "Se você não pediu este acesso, ignore este e-mail.",
  },
  {
    arquivo: "alterar-email.html",
    template: "Change email address",
    assunto: "Confirme seu novo e-mail na LOLA",
    titulo: "Confirme o novo e-mail",
    texto: "Você pediu para trocar o e-mail da sua conta de {{ .Email }} para {{ .NewEmail }}. Confirme para concluir a troca.",
    botao: "Confirmar novo e-mail",
    nota: "Se você não pediu essa mudança, ignore esta mensagem e fale com a gente.",
  },
];

function html(t) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.assunto}</title>
</head>
<body style="margin:0;padding:0;background:#FDF6F3;font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif;color:#2B2420;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDF6F3;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:20px;overflow:hidden;">
      <tr><td style="background:#FF8FAB;padding:28px 32px;text-align:center;">
        <img src="${SITE}/lola-logo.png" alt="LOLA" height="44" style="height:44px;border:0;">
      </td></tr>
      <tr><td style="padding:36px 32px 12px;">
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:700;color:#2B2420;">${t.titulo}</h1>
        <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#6B5B4E;">${t.texto}</p>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#F2678F;border-radius:999px;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">${t.botao}</a>
        </td></tr></table>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#8C8079;">O botão não funciona? Copie e cole este endereço no navegador:<br>
          <a href="{{ .ConfirmationURL }}" style="color:#A87EF0;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
      </td></tr>
      <tr><td style="padding:20px 32px 32px;">
        <hr style="border:0;border-top:1px solid #EFE0DB;margin:0 0 16px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#8C8079;">${t.nota}</p>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#8C8079;">LOLA &middot; Calçados e acessórios &middot; <a href="${SITE}" style="color:#8C8079;">lolaonline.com.br</a></p>
  </td></tr>
</table>
</body>
</html>
`;
}

mkdirSync(saida, { recursive: true });
const indice = ["# E-mails de autenticação (português)", "", "Gerados por `npm run emails`. Cole em Supabase > Authentication > Emails > Templates.", ""];
for (const t of TEMPLATES) {
  writeFileSync(join(saida, t.arquivo), html(t), "utf8");
  indice.push(`- **${t.template}**: arquivo \`${t.arquivo}\`, assunto: \`${t.assunto}\``);
}
writeFileSync(join(saida, "README.md"), indice.join("\n") + "\n", "utf8");
console.log(`${TEMPLATES.length} e-mails gerados em supabase/emails/`);
