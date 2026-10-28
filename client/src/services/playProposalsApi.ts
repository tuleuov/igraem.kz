// ─── Types ────────────────────────────────────────────────────────────────────

export type ProposalSportType = 'football' | 'basketball' | 'volleyball';
export type ProposalStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ParticipantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'REMOVED';

export interface ProposalOrganizer {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface ProposalCard {
  id: string;
  sport_type: ProposalSportType;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location_text: string;
  latitude: number;
  longitude: number;
  comment: string | null;
  max_participants: number;
  approved_count: number;
  status: ProposalStatus;
  organizer: ProposalOrganizer;
  my_participation_status: ParticipantStatus | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalParticipantInfo {
  id: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    phone_number?: string;
  };
  status: ParticipantStatus;
  created_at: string;
}

export interface ProposalMessageInfo {
  id: string;
  sender: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  text: string;
  created_at: string;
}

export interface ProposalDetail extends ProposalCard {
  participants: ProposalParticipantInfo[];
  messages: ProposalMessageInfo[];
}

export interface ProposalMapPoint {
  id: string;
  sport_type: ProposalSportType;
  event_date: string;
  start_time: string;
  latitude: number;
  longitude: number;
  max_participants: number;
  approved_count: number;
  status: ProposalStatus;
}

export interface CreateProposalDTO {
  sport_type: ProposalSportType;
  event_date: string;
  start_time: string;
  end_time?: string;
  location_text: string;
  latitude: number;
  longitude: number;
  comment?: string;
  max_participants: number;
}

export interface ProposalFilters {
  sport_type?: ProposalSportType[];
  event_date?: string;
  start_time_from?: string;
  start_time_to?: string;
  page?: number;
  limit?: number;
}

// ─── API Client ───────────────────────────────────────────────────────────────

const API_BASE = '/api/v1';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function req<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers as Record<string, string> || {}) },
  });
  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data.error || data.message || 'Ошибка сети');
    err.code = data.code;
    err.banned_until = data.banned_until;
    throw err;
  }
  return data;
}

function buildQuery(filters: ProposalFilters & { event_date?: string }): string {
  const params = new URLSearchParams();
  if (filters.sport_type?.length) {
    filters.sport_type.forEach((s) => params.append('sport_type', s));
  }
  if (filters.event_date) params.set('event_date', filters.event_date);
  if (filters.start_time_from) params.set('start_time_from', filters.start_time_from);
  if (filters.start_time_to) params.set('start_time_to', filters.start_time_to);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const playProposalsApi = {
  // ── Список ────────────────────────────────────────────────────────────────
  async list(filters: ProposalFilters = {}): Promise<{
    data: ProposalCard[];
    pagination: { page: number; limit: number; total: number };
  }> {
    return req(`/play-proposals${buildQuery(filters)}`);
  },

  // ── Точки для карты ───────────────────────────────────────────────────────
  async mapPoints(filters: ProposalFilters & { event_date?: string } = {}): Promise<{
    data: ProposalMapPoint[];
  }> {
    return req(`/play-proposals/map${buildQuery(filters)}`);
  },

  // ── Мои заявки ────────────────────────────────────────────────────────────
  async myProposals(): Promise<{
    data: { organized: ProposalCard[]; participating: ProposalCard[] };
  }> {
    return req('/play-proposals/my');
  },

  // ── Детальная карточка ────────────────────────────────────────────────────
  async getById(id: string): Promise<{ data: ProposalDetail }> {
    return req(`/play-proposals/${id}`);
  },

  // ── Создать ───────────────────────────────────────────────────────────────
  async create(dto: CreateProposalDTO): Promise<{ data: ProposalCard }> {
    return req('/play-proposals', { method: 'POST', body: JSON.stringify(dto) });
  },

  // ── Редактировать ─────────────────────────────────────────────────────────
  async update(id: string, dto: Partial<CreateProposalDTO>): Promise<{ data: ProposalCard }> {
    return req(`/play-proposals/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
  },

  // ── Отменить ──────────────────────────────────────────────────────────────
  async cancel(id: string): Promise<{ data: { status: string } }> {
    return req(`/play-proposals/${id}/cancel`, { method: 'POST' });
  },

  // ── Завершить ─────────────────────────────────────────────────────────────
  async complete(id: string): Promise<{ data: { status: string } }> {
    return req(`/play-proposals/${id}/complete`, { method: 'POST' });
  },

  // ── Подать заявку ─────────────────────────────────────────────────────────
  async join(id: string): Promise<{ data: { participant_id: string; status: string } }> {
    return req(`/play-proposals/${id}/join`, { method: 'POST' });
  },

  // ── Ответить на заявку участника ──────────────────────────────────────────
  async respondToParticipant(
    proposalId: string,
    participantId: string,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<{ data: { participant_id: string; status: string } }> {
    return req(`/play-proposals/${proposalId}/participants/${participantId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  // ── Отказаться ────────────────────────────────────────────────────────────
  async withdraw(id: string): Promise<{ data: { status: string } }> {
    return req(`/play-proposals/${id}/withdraw`, { method: 'POST' });
  },

  // ── Кик участника ─────────────────────────────────────────────────────────
  async removeParticipant(
    proposalId: string,
    participantId: string
  ): Promise<{ data: { participant_id: string; status: string } }> {
    return req(`/play-proposals/${proposalId}/participants/${participantId}`, {
      method: 'DELETE',
    });
  },

  // ── Сообщения чата ────────────────────────────────────────────────────────
  async getMessages(
    proposalId: string,
    opts: { before?: string; limit?: number } = {}
  ): Promise<{ data: ProposalMessageInfo[]; has_more: boolean }> {
    const p = new URLSearchParams();
    if (opts.before) p.set('before', opts.before);
    if (opts.limit) p.set('limit', String(opts.limit));
    const q = p.toString() ? `?${p}` : '';
    return req(`/play-proposals/${proposalId}/messages${q}`);
  },

  // ── Отправить сообщение ───────────────────────────────────────────────────
  async sendMessage(
    proposalId: string,
    text: string
  ): Promise<{ data: ProposalMessageInfo }> {
    return req(`/play-proposals/${proposalId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
};
