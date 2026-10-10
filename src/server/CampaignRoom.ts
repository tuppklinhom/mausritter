import { Server, type Connection, type ConnectionContext, type WSMessage } from "partyserver";
import { ClientMessage, type ServerMessage } from "../shared/protocol";
import { LOG_LIMIT, type CampaignState, type Role, type RollEntry } from "../shared/state";
import { roll } from "../shared/rules/dice";

interface ConnState {
  pid: string;
  role: Role;
}

/**
 * One Durable Object per campaign. The only place game state is mutated and
 * dice are rolled; clients send intents and render what comes back.
 */
export class CampaignRoom extends Server<Env> {
  static options = { hibernate: true };

  private state: CampaignState | null = null;
  private gmKey: string | null = null;

  async onStart() {
    this.state = (await this.ctx.storage.get<CampaignState>("state")) ?? null;
    this.gmKey = (await this.ctx.storage.get<string>("gmKey")) ?? null;
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname.endsWith("/init")) {
      if (this.state) return new Response("Room exists", { status: 409 });
      const { gmKey } = await request.json<{ gmKey: string }>();
      this.state = { code: this.name, createdAt: Date.now(), members: {}, log: [] };
      this.gmKey = gmKey;
      await this.ctx.storage.put({ state: this.state, gmKey });
      return new Response("ok");
    }
    if (request.method === "GET") {
      return Response.json({ exists: this.state !== null });
    }
    return new Response("Not found", { status: 404 });
  }

  async onConnect(conn: Connection<ConnState>, ctx: ConnectionContext) {
    const params = new URL(ctx.request.url).searchParams;
    const pid = params.get("pid")?.slice(0, 64);
    const name = params.get("name")?.trim().slice(0, 30) || "Mouse";
    if (!this.state) return this.reject(conn, "This room does not exist.");
    if (!pid) return this.reject(conn, "Missing player id.");

    const role: Role = this.gmKey !== null && params.get("gm") === this.gmKey ? "gm" : "player";
    conn.setState({ pid, role });
    this.state.members[pid] = { id: pid, name, role };
    await this.save();

    this.send(conn, { t: "welcome", you: { id: pid, role } });
    this.broadcastState();
  }

  async onMessage(conn: Connection<ConnState>, raw: WSMessage) {
    if (!this.state || !conn.state) return;
    let msg: ClientMessage;
    try {
      msg = ClientMessage.parse(JSON.parse(String(raw)));
    } catch {
      return this.send(conn, { t: "error", message: "Malformed message" });
    }
    const member = this.state.members[conn.state.pid];

    switch (msg.t) {
      case "roll": {
        let result;
        try {
          result = roll(msg.expr);
        } catch (e) {
          return this.send(conn, { t: "error", message: (e as Error).message });
        }
        const entry: RollEntry = {
          id: crypto.randomUUID(),
          at: Date.now(),
          byId: member.id,
          byName: member.name,
          label: msg.label,
          ...result,
        };
        this.state.log.push(entry);
        if (this.state.log.length > LOG_LIMIT) this.state.log.splice(0, this.state.log.length - LOG_LIMIT);
        await this.save();
        this.broadcastMsg({ t: "rolled", entry });
        return;
      }
      case "rename": {
        member.name = msg.name;
        await this.save();
        this.broadcastState();
        return;
      }
    }
  }

  onClose() {
    this.broadcastState();
  }

  private online(): string[] {
    const ids = new Set<string>();
    for (const c of this.getConnections<ConnState>()) if (c.state) ids.add(c.state.pid);
    return [...ids];
  }

  private broadcastState() {
    if (this.state) this.broadcastMsg({ t: "state", state: this.state, online: this.online() });
  }

  private broadcastMsg(msg: ServerMessage) {
    this.broadcast(JSON.stringify(msg));
  }

  private send(conn: Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  private reject(conn: Connection, message: string) {
    this.send(conn, { t: "error", message });
    conn.close(4004, message);
  }

  private save() {
    return this.ctx.storage.put("state", this.state);
  }
}
