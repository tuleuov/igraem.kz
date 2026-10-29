import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';
import { AuthUser } from '../middlewares/authMiddleware';

interface AuthenticatedWebSocket extends WebSocket {
  user?: AuthUser;
  proposalId?: string;
  isAlive?: boolean;
}

export class WebSocketService {
  private static wss: WebSocketServer | null = null;
  // Map of proposalId -> Set of sockets
  private static rooms: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  public static init(server: http.Server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      try {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        // Expect path like: /ws/play-proposals/:id/chat?token=XYZ
        const match = url.pathname.match(/^\/ws\/play-proposals\/([^/]+)\/chat/);
        const token = url.searchParams.get('token') || (req.headers['sec-websocket-protocol'] as string);

        if (!match || !token) {
          ws.close(1008, 'Invalid route or missing token');
          return;
        }

        const proposalId = match[1];

        let decoded: AuthUser;
        try {
          decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUser;
        } catch (err) {
          ws.close(1008, 'Unauthorized: Invalid token');
          return;
        }

        // Verify access to proposal chat
        const proposal = await prisma.playProposal.findUnique({
          where: { id: proposalId },
        });

        if (!proposal) {
          ws.close(1008, 'Proposal not found');
          return;
        }

        const isOrganizer = proposal.organizer_id === decoded.id;
        if (!isOrganizer) {
          const participant = await prisma.proposalParticipant.findUnique({
            where: {
              proposal_id_user_id: {
                proposal_id: proposalId,
                user_id: decoded.id,
              },
            },
          });

          if (!participant || !['PENDING', 'APPROVED'].includes(participant.status)) {
            ws.close(1008, 'Access denied: You must be organizer or pending/approved participant');
            return;
          }
        }

        ws.user = decoded;
        ws.proposalId = proposalId;

        // Join room
        if (!this.rooms.has(proposalId)) {
          this.rooms.set(proposalId, new Set());
        }
        this.rooms.get(proposalId)!.add(ws);

        ws.send(JSON.stringify({
          event: 'connected',
          data: { proposalId, user: decoded.full_name },
        }));

        ws.on('message', async (data) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed.event === 'send_message' && parsed.text) {
              const { PlayProposalService } = require('./playProposalService');
              const message = await PlayProposalService.sendMessage(proposalId, decoded.id, parsed.text);
              this.broadcastToProposal(proposalId, {
                event: 'new_message',
                data: message,
              });
            }
          } catch (e: any) {
            ws.send(JSON.stringify({ event: 'error', error: e.message }));
          }
        });

        ws.on('close', () => {
          if (ws.proposalId && this.rooms.has(ws.proposalId)) {
            const room = this.rooms.get(ws.proposalId)!;
            room.delete(ws);
            if (room.size === 0) {
              this.rooms.delete(ws.proposalId);
            }
          }
        });
      } catch (err: any) {
        console.error('[WebSocketService] Connection error:', err.message);
        ws.close(1011, 'Internal server error');
      }
    });

    // Heartbeat check every 30s
    const interval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((ws: WebSocket) => {
        const authWs = ws as AuthenticatedWebSocket;
        if (authWs.isAlive === false) return ws.terminate();
        authWs.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });

    console.log('[WebSocketService] WebSocket server initialized for proposals chat');
  }

  public static broadcastToProposal(proposalId: string, payload: any) {
    const room = this.rooms.get(proposalId);
    if (!room) return;
    const messageStr = JSON.stringify(payload);
    room.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}
