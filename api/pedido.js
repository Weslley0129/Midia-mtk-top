import { PACOTES, salvar, novoId, limpar } from "./_lib.js";
import { temRedis, pipe } from "./_redis.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const nome = limpar(b.nome, 80);
    const instagram = limpar(b.instagram, 30).replace(/^@/, "");
    const whatsapp = limpar(b.whatsapp, 25);
    const qtd = Number(b.qtd);
    if (nome.length < 3) return res.status(400).json({ erro: "Nome inválido" });
    if (!/^[A-Za-z0-9._]{1,30}$/.test(instagram)) return res.status(400).json({ erro: "Instagram inválido" });
    if (!PACOTES[qtd]) return res.status(400).json({ erro: "Pacote inválido" });

    const pedido = {
      id: novoId(),
      criadoEm: new Date().toISOString(),
      nome,
      instagram,
      whatsapp,
      qtd,
      valor: PACOTES[qtd],
      status: "aguardando",
      historico: [{ status: "aguardando", em: new Date().toISOString() }],
    };
    await salvar(pedido);
    // Quem gerou o PIX deixa de ser carrinho abandonado
    const sid = String(b.sid || "");
    if (temRedis() && /^[a-z0-9]{8,32}$/i.test(sid)) {
      try {
        await pipe([["DEL", `rascunho:${sid}`], ["ZREM", "rascunhos", sid], ["SET", `convertido:${sid}`, "1", "EX", 60 * 60 * 24 * 15]]);
      } catch (e) {
        console.error("limpar rascunho", e);
      }
    }
    return res.status(201).json({ id: pedido.id, valor: pedido.valor });
  } catch (e) {
    console.error("erro ao salvar pedido", e);
    return res.status(500).json({ erro: "Não foi possível registrar o pedido" });
  }
}
