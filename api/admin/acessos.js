import { autorizado } from "../_lib.js";
import { temRedis, pipe, agoraSP } from "../_redis.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!autorizado(req)) return res.status(401).json({ erro: "Senha incorreta" });
  if (!temRedis()) return res.status(200).json({ ativo: false });
  try {
    const agora = Date.now();
    const dias = [];
    for (let i = 6; i >= 0; i--) dias.push(agoraSP(new Date(agora - i * 864e5)).dia);
    const hoje = dias[6];
    const cmds = [
      ["ZCOUNT", "online", agora - 60 * 1000, "+inf"],
      ["HGETALL", `h:${hoje}`],
      ["HGETALL", `o:${hoje}`],
      ["HGETALL", `d:${hoje}`],
      ["LRANGE", "recentes", 0, 19],
      ...dias.map((d) => ["GET", `v:${d}`]),
      ...dias.map((d) => ["PFCOUNT", `u:${d}`]),
    ];
    const r = await pipe(cmds);
    const hash = (arr) => {
      const o = {};
      for (let i = 0; i < (arr || []).length; i += 2) o[arr[i]] = Number(arr[i + 1]);
      return o;
    };
    const horasObj = hash(r[1]);
    const horas = Array.from({ length: 24 }, (_, h) => horasObj[String(h).padStart(2, "0")] || 0);
    const v = r.slice(5, 12).map((x) => Number(x || 0));
    const u = r.slice(12, 19).map((x) => Number(x || 0));
    return res.status(200).json({
      ativo: true,
      online: Number(r[0] || 0),
      hoje: { visitas: v[6], unicos: u[6] },
      horas,
      origens: hash(r[2]),
      dispositivos: hash(r[3]),
      recentes: (r[4] || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean),
      semana: dias.map((d, i) => ({ dia: d, visitas: v[i], unicos: u[i] })),
      horaAtual: Number(agoraSP().hora),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Falha ao carregar acessos" });
  }
}
