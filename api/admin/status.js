import { autorizado, ler, salvar, STATUS } from "../_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!autorizado(req)) return res.status(401).json({ erro: "Senha incorreta" });
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const id = String(b.id || "");
    if (!/^PED[A-Z0-9]{5,20}$/.test(id)) return res.status(400).json({ erro: "Pedido inválido" });
    if (!STATUS.includes(b.status)) return res.status(400).json({ erro: "Status inválido" });
    const p = await ler(id);
    if (!p) return res.status(404).json({ erro: "Pedido não encontrado" });
    p.status = b.status;
    if (typeof b.obs === "string") p.obs = b.obs.slice(0, 300);
    p.historico = [...(p.historico || []), { status: b.status, em: new Date().toISOString() }];
    await salvar(p);
    return res.status(200).json({ pedido: p });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Falha ao atualizar" });
  }
}
