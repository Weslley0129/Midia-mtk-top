// Guarda o que o cliente preencheu antes de gerar o PIX (carrinho abandonado).
// O formulário avisa o cliente que esses dados podem ser usados para contato (LGPD).
import { PACOTES, limpar } from "./_lib.js";
import { temRedis, redis, pipe } from "./_redis.js";

const TTL = 60 * 60 * 24 * 15; // apaga sozinho depois de 15 dias

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  if (!temRedis()) return res.status(204).end();
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const sid = String(b.sid || "");
    if (!/^[a-z0-9]{8,32}$/i.test(sid)) return res.status(400).end();
    const nome = limpar(b.nome, 80);
    const instagram = limpar(b.instagram, 30).replace(/^@/, "");
    const whatsapp = limpar(b.whatsapp, 25);
    const qtd = PACOTES[Number(b.qtd)] ? Number(b.qtd) : 0;
    if (nome.length < 3 || !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) return res.status(204).end();
    // Quem já gerou o PIX nesta visita não volta para a lista de abandonados
    if (await redis("EXISTS", `convertido:${sid}`)) return res.status(204).end();
    const agora = Date.now();
    const chave = `rascunho:${sid}`;
    await pipe([
      ["HSET", chave, "sid", sid, "nome", nome, "instagram", instagram, "whatsapp", whatsapp,
        "qtd", qtd, "valor", qtd ? PACOTES[qtd] : 0, "atualizadoEm", agora],
      ["HSETNX", chave, "criadoEm", agora],
      ["EXPIRE", chave, TTL],
      ["ZADD", "rascunhos", agora, sid],
      ["ZREMRANGEBYSCORE", "rascunhos", 0, agora - TTL * 1000],
    ]);
    return res.status(204).end();
  } catch (e) {
    console.error("rascunho", e);
    return res.status(204).end();
  }
}
