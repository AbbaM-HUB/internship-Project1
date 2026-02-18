import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  BOX_ROOM: DurableObjectNamespace;
  USER_PROFILES: KVNamespace; 
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.get('/', (c) => c.text("Project 1 Backend: ONLINE"));

app.get('/ws', async (c) => {
  const token = c.req.query('token');
  // We grab the email from the URL to use in our logs
  const userEmail = c.req.query('email') || "Unknown User";
  
  if (!token) {
    return c.text('Unauthorized: Missing Token', 401);
  }

  // --- KV CACHING LOGIC ---
  // We use the email as the Key for KV so logs are specific to the person
  let profile = await c.env.USER_PROFILES.get(userEmail, { type: 'json' });

  if (!profile) {
    // This is exactly what you want to see in your terminal
    console.log(`🚀 KV Cache MISS for: ${userEmail}`);
    
    profile = { 
        email: userEmail, 
        cached_at: new Date().toISOString() 
    };
    
    await c.env.USER_PROFILES.put(userEmail, JSON.stringify(profile), {
      expirationTtl: 3600 
    });
  } else {
    // This is exactly what you want to see in your terminal
    console.log(`📦 KV Cache HIT for: ${userEmail}`);
  }

  const id = c.env.BOX_ROOM.idFromName('global-room');
  const stub = c.env.BOX_ROOM.get(id);
  return stub.fetch(c.req.raw);
});

export default app;

export class BoxRoom implements DurableObject {
  constructor(public state: DurableObjectState) {}

  async fetch(request: Request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);

    const pos = await this.state.storage.get("pos") || { x: 100, y: 100 };
    server.send(JSON.stringify({ type: 'init', ...pos as object }));

    return new Response(null, { status: 101, webSocket: client } as any);
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    // This is the broadcast logic that keeps A and B in sync
    this.state.getWebSockets().forEach((client: WebSocket) => {
      if (client !== ws) {
        client.send(message);
      }
    });

    try {
      const data = JSON.parse(message);
      if (data.x !== undefined && data.y !== undefined) {
        await this.state.storage.put("pos", { x: data.x, y: data.y });
      }
    } catch (e) {
      console.error("Invalid JSON movement data");
    }
  }
}