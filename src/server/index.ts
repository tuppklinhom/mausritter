import { getServerByName, routePartykitRequest } from "partyserver";
import { isValidCode, makeCode, type CreateRoomResponse } from "../shared/protocol";

export { CampaignRoom } from "./CampaignRoom";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      // Retry on the (unlikely) code collision.
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = makeCode();
        const gmKey = crypto.randomUUID();
        const stub = await getServerByName(env.CampaignRoom, code);
        const res = await stub.fetch("https://room/init", {
          method: "POST",
          body: JSON.stringify({ gmKey }),
        });
        if (res.ok) return Response.json({ code, gmKey } satisfies CreateRoomResponse);
      }
      return new Response("Could not allocate a room", { status: 503 });
    }

    const roomMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)$/);
    if (roomMatch && request.method === "GET") {
      if (!isValidCode(roomMatch[1])) return Response.json({ exists: false });
      const stub = await getServerByName(env.CampaignRoom, roomMatch[1]);
      return stub.fetch("https://room/");
    }

    return (
      (await routePartykitRequest(request, env, {
        onBeforeConnect: (_req, { name }) =>
          isValidCode(name) ? undefined : new Response("Bad room code", { status: 400 }),
      })) ?? new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
