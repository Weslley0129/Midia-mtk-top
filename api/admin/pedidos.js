import { autorizado, listarTodos } from "../_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!autorizado(req)) return res.status(401).json({ erro: "Senha incorreta" });
  if (req.method !== "GET") return res.status(405).json({ erro: "Use GET" });
  try {
    return res.status(200).json({ pedidos: await listarTodos() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Falha ao carregar pedidos" });
  }
}
