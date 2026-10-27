import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { PlayProposalService, ProposalFilters, SportType } from '../services/playProposalService';

// ─── Helper ───────────────────────────────────────────────────────────────────
function handleServiceError(err: any, res: Response) {
  const code = err.code ?? 'INTERNAL_ERROR';
  const statusMap: Record<string, number> = {
    USER_BANNED: 403,
    FORBIDDEN: 403,
    PROPOSAL_NOT_FOUND: 404,
    PARTICIPANT_NOT_FOUND: 404,
    DATE_IN_PAST: 400,
    TIME_IN_PAST: 400,
    VALIDATION_ERROR: 400,
    TEXT_TOO_LONG: 400,
    NOT_A_PARTICIPANT: 400,
    CANNOT_JOIN_OWN: 400,
    PROPOSAL_CLOSED: 409,
    ALREADY_REQUESTED: 409,
    PROPOSAL_FULL: 409,
    TOO_MANY_OPEN_PROPOSALS: 409,
    PROPOSAL_NOT_EDITABLE: 409,
    PROPOSAL_NOT_CANCELABLE: 409,
    PROPOSAL_NOT_COMPLETABLE: 409,
    CHAT_ACCESS_DENIED: 403,
  };

  const status = statusMap[code] ?? 500;

  if (status === 500) {
    console.error('[PlayProposalsController] Unhandled error:', err);
  }

  return res.status(status).json({
    success: false,
    error: err.message,
    code,
    ...(code === 'USER_BANNED' ? { banned_until: err.banned_until } : {}),
  });
}

function parseFilters(query: any): ProposalFilters {
  const sportTypes = query.sport_type
    ? Array.isArray(query.sport_type)
      ? query.sport_type
      : [query.sport_type]
    : undefined;

  return {
    sport_type: sportTypes as SportType[] | undefined,
    event_date: query.event_date,
    start_time_from: query.start_time_from,
    start_time_to: query.start_time_to,
    page: query.page ? parseInt(query.page, 10) : 1,
    limit: query.limit ? parseInt(query.limit, 10) : 20,
  };
}

// ─── Controller ───────────────────────────────────────────────────────────────
export class PlayProposalsController {
  /** GET /play-proposals — Список заявок */
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const filters = parseFilters(req.query);
      const result = await PlayProposalService.list(filters, req.user?.id);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** GET /play-proposals/map — Точки для карты */
  static async mapPoints(req: AuthenticatedRequest, res: Response) {
    try {
      const filters = parseFilters(req.query);
      const data = await PlayProposalService.mapPoints(filters);
      return res.json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** GET /play-proposals/my — Мои заявки [JWT] */
  static async myProposals(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const data = await PlayProposalService.getMyProposals(req.user.id);
      return res.json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** GET /play-proposals/:id — Детальная карточка */
  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await PlayProposalService.getById(req.params.id, req.user?.id);
      return res.json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** POST /play-proposals — Создать заявку [JWT] */
  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const {
        sport_type, event_date, start_time, end_time,
        location_text, latitude, longitude, comment, max_participants,
      } = req.body;

      if (!sport_type || !event_date || !start_time || !location_text ||
          latitude === undefined || longitude === undefined || !max_participants) {
        return res.status(400).json({
          success: false,
          error: 'Обязательные поля: sport_type, event_date, start_time, location_text, latitude, longitude, max_participants',
          code: 'VALIDATION_ERROR',
        });
      }

      const data = await PlayProposalService.create(req.user.id, {
        sport_type, event_date, start_time, end_time,
        location_text, latitude: Number(latitude), longitude: Number(longitude),
        comment, max_participants: Number(max_participants),
      });

      return res.status(201).json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** PATCH /play-proposals/:id — Редактировать [JWT] */
  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const data = await PlayProposalService.update(req.params.id, req.user.id, req.body);
      return res.json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** POST /play-proposals/:id/cancel — Отменить [JWT] */
  static async cancel(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const data = await PlayProposalService.cancel(req.params.id, req.user.id);
      return res.json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** POST /play-proposals/:id/complete — Завершить [JWT] */
  static async complete(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const data = await PlayProposalService.complete(req.params.id, req.user.id);
      return res.json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** POST /play-proposals/:id/join — Подать заявку [JWT] */
  static async join(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const data = await PlayProposalService.join(req.params.id, req.user.id);
      return res.status(201).json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** POST /play-proposals/:id/participants/:participantId/respond — Одобрить/отклонить [JWT] */
  static async respondToParticipant(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const { status } = req.body;
      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'status должен быть APPROVED или REJECTED',
          code: 'VALIDATION_ERROR',
        });
      }
      const data = await PlayProposalService.respondToParticipant(
        req.params.id, req.params.participantId, req.user.id, status
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** POST /play-proposals/:id/withdraw — Отказаться от участия [JWT] */
  static async withdraw(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const data = await PlayProposalService.withdraw(req.params.id, req.user.id);
      return res.json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** DELETE /play-proposals/:id/participants/:participantId — Кик участника [JWT] */
  static async removeParticipant(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const data = await PlayProposalService.removeParticipant(
        req.params.id, req.params.participantId, req.user.id
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** GET /play-proposals/:id/messages — История чата [JWT] */
  static async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const data = await PlayProposalService.getMessages(
        req.params.id, req.user.id, req.query.before as string | undefined, limit
      );
      return res.json({ success: true, ...data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }

  /** POST /play-proposals/:id/messages — Отправить сообщение [JWT] */
  static async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, error: 'text обязателен', code: 'VALIDATION_ERROR' });
      }
      const data = await PlayProposalService.sendMessage(req.params.id, req.user.id, text);
      return res.status(201).json({ success: true, data });
    } catch (err: any) {
      return handleServiceError(err, res);
    }
  }
}
