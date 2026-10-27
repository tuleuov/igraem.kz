import { prisma } from '../config/prisma';

// ─── Константы ────────────────────────────────────────────────────────────────
const MAX_OPEN_PROPOSALS_PER_USER = 5;
const MAX_PARTICIPANTS_LIMIT = 50;
const MIN_PARTICIPANTS_LIMIT = 2;
const MAX_COMMENT_LENGTH = 500;
const MAX_LOCATION_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 1000;

// ─── Типы ─────────────────────────────────────────────────────────────────────
export type SportType = 'football' | 'basketball' | 'volleyball';
export type ProposalStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ParticipantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'REMOVED';

export interface CreateProposalDTO {
  sport_type: SportType;
  event_date: string;     // YYYY-MM-DD
  start_time: string;     // HH:mm
  end_time?: string;      // HH:mm
  location_text: string;
  latitude: number;
  longitude: number;
  comment?: string;
  max_participants: number;
}

export interface UpdateProposalDTO {
  location_text?: string;
  comment?: string;
  max_participants?: number;
  end_time?: string;
}

export interface ProposalFilters {
  sport_type?: SportType | SportType[];
  event_date?: string;
  start_time_from?: string;
  start_time_to?: string;
  page?: number;
  limit?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Возвращает текущую дату в Asia/Almaty в формате YYYY-MM-DD */
export function getTodayAlmaty(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' });
}

/** Возвращает текущее время в Asia/Almaty в формате HH:mm */
export function getCurrentTimeAlmaty(): string {
  return new Date().toLocaleTimeString('ru-RU', {
    timeZone: 'Asia/Almaty',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Количество одобренных участников (не считая организатора) */
async function getApprovedCount(proposalId: string): Promise<number> {
  return prisma.proposalParticipant.count({
    where: { proposal_id: proposalId, status: 'APPROVED' },
  });
}

/** Проверяет активный бан пользователя */
async function assertUserNotBanned(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_banned: true, banned_until: true },
  });
  if (user?.is_banned && user.banned_until && new Date(user.banned_until) > new Date()) {
    const error: any = new Error('USER_BANNED');
    error.code = 'USER_BANNED';
    error.banned_until = user.banned_until;
    throw error;
  }
}

/** Форматирует заявку для ответа API */
function formatProposalCard(proposal: any, myParticipation?: any) {
  const approvedCount =
    proposal._count?.participants ??
    proposal.participants?.filter((p: any) => p.status === 'APPROVED').length ??
    0;

  return {
    id: proposal.id,
    sport_type: proposal.sport_type,
    event_date: proposal.event_date,
    start_time: proposal.start_time,
    end_time: proposal.end_time,
    location_text: proposal.location_text,
    latitude: proposal.latitude,
    longitude: proposal.longitude,
    comment: proposal.comment,
    max_participants: proposal.max_participants,
    approved_count: approvedCount,
    status: proposal.status,
    organizer: proposal.organizer
      ? {
          id: proposal.organizer.id,
          full_name: proposal.organizer.full_name,
          avatar_url: proposal.organizer.avatar_url,
        }
      : undefined,
    my_participation_status: myParticipation?.status ?? null,
    created_at: proposal.created_at,
    updated_at: proposal.updated_at,
  };
}

// ─── Service Methods ──────────────────────────────────────────────────────────

export const PlayProposalService = {
  // ── Создать заявку ────────────────────────────────────────────────────────
  async create(organizerId: string, dto: CreateProposalDTO) {
    await assertUserNotBanned(organizerId);

    // Валидация sport_type
    const validSports: SportType[] = ['football', 'basketball', 'volleyball'];
    if (!validSports.includes(dto.sport_type)) {
      throw Object.assign(new Error('Invalid sport_type'), { code: 'VALIDATION_ERROR' });
    }

    // Дата не в прошлом
    const today = getTodayAlmaty();
    if (dto.event_date < today) {
      throw Object.assign(new Error('Date in past'), { code: 'DATE_IN_PAST' });
    }

    // Если сегодня — время не в прошлом
    if (dto.event_date === today) {
      const nowTime = getCurrentTimeAlmaty();
      if (dto.start_time <= nowTime) {
        throw Object.assign(new Error('Time in past'), { code: 'TIME_IN_PAST' });
      }
    }

    // Лимит max_participants
    if (
      dto.max_participants < MIN_PARTICIPANTS_LIMIT ||
      dto.max_participants > MAX_PARTICIPANTS_LIMIT
    ) {
      throw Object.assign(new Error('max_participants must be 2–50'), { code: 'VALIDATION_ERROR' });
    }

    // location_text
    if (!dto.location_text || dto.location_text.trim().length < 5) {
      throw Object.assign(new Error('location_text too short'), { code: 'VALIDATION_ERROR' });
    }
    if (dto.location_text.length > MAX_LOCATION_LENGTH) {
      throw Object.assign(new Error('location_text too long'), { code: 'VALIDATION_ERROR' });
    }

    // comment
    if (dto.comment && dto.comment.length > MAX_COMMENT_LENGTH) {
      throw Object.assign(new Error('comment too long'), { code: 'VALIDATION_ERROR' });
    }

    // Лимит 5 активных заявок
    const openCount = await prisma.playProposal.count({
      where: { organizer_id: organizerId, status: { in: ['open', 'in_progress'] } },
    });
    if (openCount >= MAX_OPEN_PROPOSALS_PER_USER) {
      throw Object.assign(new Error('Too many open proposals'), { code: 'TOO_MANY_OPEN_PROPOSALS' });
    }

    const proposal = await prisma.playProposal.create({
      data: {
        organizer_id: organizerId,
        sport_type: dto.sport_type,
        event_date: dto.event_date,
        start_time: dto.start_time,
        end_time: dto.end_time ?? null,
        location_text: dto.location_text.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        comment: dto.comment?.trim() ?? null,
        max_participants: dto.max_participants,
        status: 'open',
      },
      include: {
        organizer: { select: { id: true, full_name: true, avatar_url: true } },
        _count: { select: { participants: { where: { status: 'APPROVED' } } } },
      },
    });

    return formatProposalCard(proposal);
  },

  // ── Список заявок ─────────────────────────────────────────────────────────
  async list(filters: ProposalFilters, requestingUserId?: string) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const sportTypes = filters.sport_type
      ? Array.isArray(filters.sport_type)
        ? filters.sport_type
        : [filters.sport_type]
      : undefined;

    const where: any = {
      status: { in: ['open', 'in_progress'] },
      ...(sportTypes ? { sport_type: { in: sportTypes } } : {}),
      ...(filters.event_date ? { event_date: filters.event_date } : {}),
      ...(filters.start_time_from || filters.start_time_to
        ? {
            start_time: {
              ...(filters.start_time_from ? { gte: filters.start_time_from } : {}),
              ...(filters.start_time_to ? { lte: filters.start_time_to } : {}),
            },
          }
        : {}),
    };

    const [proposals, total] = await Promise.all([
      prisma.playProposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ event_date: 'asc' }, { start_time: 'asc' }],
        include: {
          organizer: { select: { id: true, full_name: true, avatar_url: true } },
          _count: { select: { participants: { where: { status: 'APPROVED' } } } },
          ...(requestingUserId
            ? {
                participants: {
                  where: { user_id: requestingUserId },
                  select: { status: true },
                },
              }
            : {}),
        },
      }),
      prisma.playProposal.count({ where }),
    ]);

    return {
      data: proposals.map((p) => {
        const myP = requestingUserId
          ? p.participants?.find((pp: any) => pp.user_id === requestingUserId)
          : undefined;
        return formatProposalCard(p, myP);
      }),
      pagination: { page, limit, total },
    };
  },

  // ── Точки для карты ───────────────────────────────────────────────────────
  async mapPoints(filters: ProposalFilters) {
    const eventDate = filters.event_date ?? getTodayAlmaty();
    const sportTypes = filters.sport_type
      ? Array.isArray(filters.sport_type)
        ? filters.sport_type
        : [filters.sport_type]
      : undefined;

    const where: any = {
      status: { in: ['open', 'in_progress'] },
      event_date: eventDate,
      ...(sportTypes ? { sport_type: { in: sportTypes } } : {}),
      ...(filters.start_time_from || filters.start_time_to
        ? {
            start_time: {
              ...(filters.start_time_from ? { gte: filters.start_time_from } : {}),
              ...(filters.start_time_to ? { lte: filters.start_time_to } : {}),
            },
          }
        : {}),
    };

    const proposals = await prisma.playProposal.findMany({
      where,
      select: {
        id: true,
        sport_type: true,
        event_date: true,
        start_time: true,
        latitude: true,
        longitude: true,
        max_participants: true,
        status: true,
        _count: { select: { participants: { where: { status: 'APPROVED' } } } },
      },
    });

    return proposals.map((p) => ({
      id: p.id,
      sport_type: p.sport_type,
      event_date: p.event_date,
      start_time: p.start_time,
      latitude: p.latitude,
      longitude: p.longitude,
      max_participants: p.max_participants,
      approved_count: p._count.participants,
      status: p.status,
    }));
  },

  // ── Детальная карточка ────────────────────────────────────────────────────
  async getById(proposalId: string, requestingUserId?: string) {
    const proposal = await prisma.playProposal.findUnique({
      where: { id: proposalId },
      include: {
        organizer: { select: { id: true, full_name: true, avatar_url: true } },
        participants: {
          orderBy: { created_at: 'asc' },
          include: {
            user: { select: { id: true, full_name: true, avatar_url: true, phone_number: true } },
          },
        },
        messages: {
          orderBy: { created_at: 'asc' },
          take: 50,
          include: {
            sender: { select: { id: true, full_name: true, avatar_url: true } },
          },
        },
      },
    });

    if (!proposal) {
      throw Object.assign(new Error('Proposal not found'), { code: 'PROPOSAL_NOT_FOUND' });
    }

    const isOrganizer = requestingUserId === proposal.organizer_id;
    const myP = proposal.participants.find((p) => p.user_id === requestingUserId);
    const approvedCount = proposal.participants.filter((p) => p.status === 'APPROVED').length;

    return {
      ...formatProposalCard({ ...proposal, _count: undefined }, myP),
      approved_count: approvedCount,
      participants: proposal.participants.map((p) => ({
        id: p.id,
        user: {
          id: p.user.id,
          full_name: p.user.full_name,
          avatar_url: p.user.avatar_url,
          // phone_number видна только организатору
          ...(isOrganizer ? { phone_number: p.user.phone_number } : {}),
        },
        status: p.status,
        created_at: p.created_at,
      })),
      messages: proposal.messages.map((m) => ({
        id: m.id,
        sender: {
          id: m.sender.id,
          full_name: m.sender.full_name,
          avatar_url: m.sender.avatar_url,
        },
        text: m.text,
        created_at: m.created_at,
      })),
    };
  },

  // ── Редактировать заявку ──────────────────────────────────────────────────
  async update(proposalId: string, userId: string, dto: UpdateProposalDTO) {
    const proposal = await prisma.playProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      throw Object.assign(new Error('Proposal not found'), { code: 'PROPOSAL_NOT_FOUND' });
    }
    if (proposal.organizer_id !== userId) {
      throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
    }
    if (proposal.status !== 'open') {
      throw Object.assign(new Error('Proposal not editable'), { code: 'PROPOSAL_NOT_EDITABLE' });
    }

    if (dto.max_participants !== undefined) {
      if (dto.max_participants < MIN_PARTICIPANTS_LIMIT || dto.max_participants > MAX_PARTICIPANTS_LIMIT) {
        throw Object.assign(new Error('max_participants must be 2–50'), { code: 'VALIDATION_ERROR' });
      }
      // Нельзя уменьшить ниже уже одобренных
      const approved = await getApprovedCount(proposalId);
      if (dto.max_participants < approved + 1) {
        throw Object.assign(
          new Error('Cannot reduce max_participants below current approved count'),
          { code: 'VALIDATION_ERROR' }
        );
      }
    }

    if (dto.location_text !== undefined) {
      if (dto.location_text.trim().length < 5 || dto.location_text.length > MAX_LOCATION_LENGTH) {
        throw Object.assign(new Error('location_text invalid'), { code: 'VALIDATION_ERROR' });
      }
    }

    if (dto.comment !== undefined && dto.comment.length > MAX_COMMENT_LENGTH) {
      throw Object.assign(new Error('comment too long'), { code: 'VALIDATION_ERROR' });
    }

    const updated = await prisma.playProposal.update({
      where: { id: proposalId },
      data: {
        ...(dto.location_text !== undefined ? { location_text: dto.location_text.trim() } : {}),
        ...(dto.comment !== undefined ? { comment: dto.comment.trim() || null } : {}),
        ...(dto.max_participants !== undefined ? { max_participants: dto.max_participants } : {}),
        ...(dto.end_time !== undefined ? { end_time: dto.end_time || null } : {}),
      },
      include: {
        organizer: { select: { id: true, full_name: true, avatar_url: true } },
        _count: { select: { participants: { where: { status: 'APPROVED' } } } },
      },
    });

    return formatProposalCard(updated);
  },

  // ── Отменить заявку ───────────────────────────────────────────────────────
  async cancel(proposalId: string, userId: string) {
    const proposal = await prisma.playProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      throw Object.assign(new Error('Proposal not found'), { code: 'PROPOSAL_NOT_FOUND' });
    }
    if (proposal.organizer_id !== userId) {
      throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
    }
    if (!['open', 'in_progress'].includes(proposal.status)) {
      throw Object.assign(new Error('Cannot cancel'), { code: 'PROPOSAL_NOT_CANCELABLE' });
    }

    await prisma.playProposal.update({
      where: { id: proposalId },
      data: { status: 'cancelled' },
    });

    return { status: 'cancelled' };
  },

  // ── Завершить заявку ──────────────────────────────────────────────────────
  async complete(proposalId: string, userId: string) {
    const proposal = await prisma.playProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      throw Object.assign(new Error('Proposal not found'), { code: 'PROPOSAL_NOT_FOUND' });
    }
    if (proposal.organizer_id !== userId) {
      throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
    }
    if (!['open', 'in_progress'].includes(proposal.status)) {
      throw Object.assign(new Error('Cannot complete'), { code: 'PROPOSAL_NOT_COMPLETABLE' });
    }

    await prisma.playProposal.update({
      where: { id: proposalId },
      data: { status: 'completed' },
    });

    return { status: 'completed' };
  },

  // ── Подать заявку на участие ──────────────────────────────────────────────
  async join(proposalId: string, userId: string) {
    await assertUserNotBanned(userId);

    const proposal = await prisma.playProposal.findUnique({
      where: { id: proposalId },
      include: { _count: { select: { participants: { where: { status: 'APPROVED' } } } } },
    });

    if (!proposal) {
      throw Object.assign(new Error('Proposal not found'), { code: 'PROPOSAL_NOT_FOUND' });
    }
    if (proposal.organizer_id === userId) {
      throw Object.assign(new Error('Cannot join own proposal'), { code: 'CANNOT_JOIN_OWN' });
    }
    if (proposal.status !== 'open') {
      throw Object.assign(new Error('Proposal not open'), { code: 'PROPOSAL_NOT_OPEN' });
    }

    // Проверить существующую заявку
    const existing = await prisma.proposalParticipant.findUnique({
      where: { proposal_id_user_id: { proposal_id: proposalId, user_id: userId } },
    });
    if (existing && ['PENDING', 'APPROVED'].includes(existing.status)) {
      throw Object.assign(new Error('Already requested'), { code: 'ALREADY_REQUESTED' });
    }

    // Проверить свободные места (организатор занимает 1 место)
    const approvedCount = proposal._count.participants;
    if (approvedCount >= proposal.max_participants - 1) {
      throw Object.assign(new Error('Proposal full'), { code: 'PROPOSAL_FULL' });
    }

    let participant;
    if (existing) {
      // Повторная заявка после REJECTED/WITHDRAWN
      participant = await prisma.proposalParticipant.update({
        where: { id: existing.id },
        data: { status: 'PENDING' },
      });
    } else {
      participant = await prisma.proposalParticipant.create({
        data: { proposal_id: proposalId, user_id: userId, status: 'PENDING' },
      });
    }

    return { participant_id: participant.id, status: participant.status };
  },

  // ── Организатор: одобрить / отклонить участника ───────────────────────────
  async respondToParticipant(
    proposalId: string,
    participantId: string,
    organizerId: string,
    status: 'APPROVED' | 'REJECTED'
  ) {
    const proposal = await prisma.playProposal.findUnique({
      where: { id: proposalId },
      include: { _count: { select: { participants: { where: { status: 'APPROVED' } } } } },
    });

    if (!proposal) {
      throw Object.assign(new Error('Proposal not found'), { code: 'PROPOSAL_NOT_FOUND' });
    }
    if (proposal.organizer_id !== organizerId) {
      throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
    }

    const participant = await prisma.proposalParticipant.findFirst({
      where: { id: participantId, proposal_id: proposalId },
    });
    if (!participant) {
      throw Object.assign(new Error('Participant not found'), { code: 'PARTICIPANT_NOT_FOUND' });
    }

    // При одобрении — проверить места
    if (status === 'APPROVED') {
      const approvedCount = proposal._count.participants;
      if (approvedCount >= proposal.max_participants - 1) {
        throw Object.assign(new Error('Proposal full'), { code: 'PROPOSAL_FULL' });
      }
    }

    const updated = await prisma.proposalParticipant.update({
      where: { id: participantId },
      data: { status },
    });

    return { participant_id: updated.id, status: updated.status };
  },

  // ── Участник: отказаться от участия ──────────────────────────────────────
  async withdraw(proposalId: string, userId: string) {
    const participant = await prisma.proposalParticipant.findUnique({
      where: { proposal_id_user_id: { proposal_id: proposalId, user_id: userId } },
    });

    if (!participant || !['PENDING', 'APPROVED'].includes(participant.status)) {
      throw Object.assign(new Error('Not a participant'), { code: 'NOT_A_PARTICIPANT' });
    }

    const updated = await prisma.proposalParticipant.update({
      where: { id: participant.id },
      data: { status: 'WITHDRAWN' },
    });

    return { status: updated.status };
  },

  // ── Организатор: кикнуть участника ───────────────────────────────────────
  async removeParticipant(proposalId: string, participantId: string, organizerId: string) {
    const proposal = await prisma.playProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      throw Object.assign(new Error('Proposal not found'), { code: 'PROPOSAL_NOT_FOUND' });
    }
    if (proposal.organizer_id !== organizerId) {
      throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
    }

    const participant = await prisma.proposalParticipant.findFirst({
      where: { id: participantId, proposal_id: proposalId },
    });
    if (!participant) {
      throw Object.assign(new Error('Participant not found'), { code: 'PARTICIPANT_NOT_FOUND' });
    }

    const updated = await prisma.proposalParticipant.update({
      where: { id: participantId },
      data: { status: 'REMOVED' },
    });

    return { participant_id: updated.id, status: updated.status };
  },

  // ── Получить историю чата ─────────────────────────────────────────────────
  async getMessages(proposalId: string, userId: string, before?: string, limit = 50) {
    // Проверить доступ: организатор или PENDING/APPROVED participant
    const proposal = await prisma.playProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      throw Object.assign(new Error('Proposal not found'), { code: 'PROPOSAL_NOT_FOUND' });
    }

    const isOrganizer = proposal.organizer_id === userId;
    if (!isOrganizer) {
      const participant = await prisma.proposalParticipant.findUnique({
        where: { proposal_id_user_id: { proposal_id: proposalId, user_id: userId } },
      });
      if (!participant || !['PENDING', 'APPROVED'].includes(participant.status)) {
        throw Object.assign(new Error('Chat access denied'), { code: 'CHAT_ACCESS_DENIED' });
      }
    }

    const safeLmt = Math.min(100, Math.max(1, limit));
    const beforeMsg = before
      ? await prisma.proposalMessage.findUnique({ where: { id: before } })
      : null;

    const messages = await prisma.proposalMessage.findMany({
      where: {
        proposal_id: proposalId,
        ...(beforeMsg ? { created_at: { lt: beforeMsg.created_at } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: safeLmt + 1,
      include: { sender: { select: { id: true, full_name: true, avatar_url: true } } },
    });

    const hasMore = messages.length > safeLmt;
    const result = messages.slice(0, safeLmt).reverse();

    return {
      data: result.map((m) => ({
        id: m.id,
        sender: { id: m.sender.id, full_name: m.sender.full_name, avatar_url: m.sender.avatar_url },
        text: m.text,
        created_at: m.created_at,
      })),
      has_more: hasMore,
    };
  },

  // ── Отправить сообщение ───────────────────────────────────────────────────
  async sendMessage(proposalId: string, userId: string, text: string) {
    await assertUserNotBanned(userId);

    if (!text || text.trim().length === 0) {
      throw Object.assign(new Error('Empty message'), { code: 'VALIDATION_ERROR' });
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      throw Object.assign(new Error('Text too long'), { code: 'TEXT_TOO_LONG' });
    }

    const proposal = await prisma.playProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      throw Object.assign(new Error('Proposal not found'), { code: 'PROPOSAL_NOT_FOUND' });
    }
    if (['cancelled', 'completed'].includes(proposal.status)) {
      throw Object.assign(new Error('Proposal closed'), { code: 'PROPOSAL_CLOSED' });
    }

    const isOrganizer = proposal.organizer_id === userId;
    if (!isOrganizer) {
      const participant = await prisma.proposalParticipant.findUnique({
        where: { proposal_id_user_id: { proposal_id: proposalId, user_id: userId } },
      });
      if (!participant || !['PENDING', 'APPROVED'].includes(participant.status)) {
        throw Object.assign(new Error('Chat access denied'), { code: 'CHAT_ACCESS_DENIED' });
      }
    }

    const message = await prisma.proposalMessage.create({
      data: { proposal_id: proposalId, sender_id: userId, text: text.trim() },
      include: { sender: { select: { id: true, full_name: true, avatar_url: true } } },
    });

    return {
      id: message.id,
      sender: {
        id: message.sender.id,
        full_name: message.sender.full_name,
        avatar_url: message.sender.avatar_url,
      },
      text: message.text,
      created_at: message.created_at,
    };
  },

  // ── Мои заявки ────────────────────────────────────────────────────────────
  async getMyProposals(userId: string) {
    const [organized, participating] = await Promise.all([
      prisma.playProposal.findMany({
        where: { organizer_id: userId },
        orderBy: [{ event_date: 'desc' }, { start_time: 'desc' }],
        include: {
          organizer: { select: { id: true, full_name: true, avatar_url: true } },
          _count: { select: { participants: { where: { status: 'APPROVED' } } } },
        },
      }),
      prisma.proposalParticipant.findMany({
        where: { user_id: userId },
        include: {
          proposal: {
            include: {
              organizer: { select: { id: true, full_name: true, avatar_url: true } },
              _count: { select: { participants: { where: { status: 'APPROVED' } } } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return {
      organized: organized.map((p) => formatProposalCard(p)),
      participating: participating.map((pp) => ({
        ...formatProposalCard(pp.proposal),
        my_participation_status: pp.status,
      })),
    };
  },
};
