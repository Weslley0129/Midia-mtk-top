import { autorizado } from "../_lib.js";
import { temRedis, redis, pipe } from "../_redis.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!autorizado(req)) return res.status(401).json({ erro: "Senha incorreta" });
  if (!temRedis()) return res.status(200).json({ ativo: false, lista: [] });
  try {
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const sid = String(b.sid || "");
      if (!/^[a-z0-9]{8,32}$/i.test(sid)) return res.status(400).json({ erro: "Registro inválido" });
      if (b.acao === "contatado") {
        await redis("HSET", `rascunho:${sid}`, "contatadoEm", Date.now());
      } else if (b.acao === "reabrir") {
        await redis("HDEL", `rascunho:${sid}`, "contatadoEm");
      } else if (b.acao === "apagar") {
        await pipe([["DEL", `rascunho:${sid}`], ["ZREM", "rascunhos", sid]]);
      } else {
        return res.status(400).json({ erro: "Ação inválida" });
      }
      return res.status(200).json({ ok: true });
    }
    const sids = await redis("ZREVRANGE", "rascunhos", 0, 199);
    if (!sids || !sids.length) return res.status(200).json({ ativo: true, lista: [] });
    const r = await pipe(sids.map((s) => ["HGETALL", `rascunho:${s}`]));
    const lista = r
      .map((arr) => {
        const o = {};
        for (let i = 0; i < (arr || []).length; i += 2) o[arr[i]] = arr[i + 1];
        return o;
      })
      .filter((o) => o.sid && !o.convertidoEm)
      .map((o) => ({
        sid: o.sid, nome: o.nome, instagram: o.instagram, whatsapp: o.whatsapp || "",
        qtd: Number(o.qtd || 0), valor: Number(o.valor || 0),
        criadoEm: Number(o.criadoEm || 0), atualizadoEm: Number(o.atualizadoEm || 0),
        contatadoEm: o.contatadoEm ? Number(o.contatadoEm) : null,
      }));
    return res.status(200).json({ ativo: true, lista });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Falha ao carregar carrinhos abandonados" });
  }
}
