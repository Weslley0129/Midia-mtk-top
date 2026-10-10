import { temRedis, pipe, agoraSP } from "./_redis.js";

const TTL = 60 * 60 * 24 * 90; // guarda estatísticas por 90 dias

function origemDe(ref, utm) {
  if (utm) return String(utm).toLowerCase().slice(0, 30);
  if (!ref) return "direto";
  let h = "";
  try { h = new URL(ref).hostname.replace(/^www\./, ""); } catch { return "outros"; }
  if (/instagram|l\.instagram|ig\.me/.test(h)) return "instagram";
  if (/whatsapp|wa\.me/.test(h)) return "whatsapp";
  if (/facebook|fb\.|l\.facebook/.test(h)) return "facebook";
  if (/google\./.test(h)) return "google";
  if (/tiktok/.test(h)) return "tiktok";
  if (/impulso-seguidores/.test(h)) return "direto";
  return h.slice(0, 30);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  if (!temRedis()) return res.status(204).end();
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const sid = String(b.sid || "");
    if (!/^[a-z0-9]{8,32}$/i.test(sid)) return res.status(400).end();
    const agora = Date.now();
    const cmds = [
      ["ZADD", "online", agora, sid],
      ["ZREMRANGEBYSCORE", "online", 0, agora - 5 * 60 * 1000],
    ];
    if (b.tipo === "view") {
      const { dia, hora } = agoraSP();
      const ua = String(req.headers["user-agent"] || "");
      const disp = /Mobi|Android|iPhone|iPad/i.test(ua) ? "celular" : "computador";
      const origem = origemDe(b.ref, b.utm);
      let cidade = "";
      try { cidade = decodeURIComponent(req.headers["x-vercel-ip-city"] || ""); } catch {}
      const uf = String(req.headers["x-vercel-ip-country-region"] || "");
      const pais = String(req.headers["x-vercel-ip-country"] || "");
      const reg = JSON.stringify({ t: agora, origem, disp, cidade: cidade.slice(0, 40), uf: uf.slice(0, 4), pais: pais.slice(0, 3) });
      cmds.push(
        ["INCR", `v:${dia}`], ["EXPIRE", `v:${dia}`, TTL],
        ["PFADD", `u:${dia}`, sid], ["EXPIRE", `u:${dia}`, TTL],
        ["HINCRBY", `h:${dia}`, hora, 1], ["EXPIRE", `h:${dia}`, TTL],
        ["HINCRBY", `o:${dia}`, origem, 1], ["EXPIRE", `o:${dia}`, TTL],
        ["HINCRBY", `d:${dia}`, disp, 1], ["EXPIRE", `d:${dia}`, TTL],
        ["LPUSH", "recentes", reg], ["LTRIM", "recentes", 0, 49]
      );
    }
    await pipe(cmds);
    return res.status(204).end();
  } catch (e) {
    console.error("visita", e);
    return res.status(204).end();
  }
}
