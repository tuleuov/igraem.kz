import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, Users, MapPin, Clock, Calendar, Send,
  Check, X, Loader2, MessageCircle, UserCheck, AlertCircle,
} from 'lucide-react';
import {
  playProposalsApi,
  ProposalDetail,
  ProposalParticipantInfo,
  ProposalMessageInfo,
  ParticipantStatus,
} from '../services/playProposalsApi';
import {
  SPORT_EMOJI, SPORT_LABEL, STATUS_LABEL, STATUS_COLOR,
  PARTICIPATION_LABEL, PARTICIPATION_COLOR,
} from './ProposalCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

const PARTICIPANT_STATUS_ACTIONS: Partial<Record<ParticipantStatus, string>> = {
  PENDING: 'ожидает',
  APPROVED: 'одобрен',
  REJECTED: 'отклонён',
  WITHDRAWN: 'отказался',
  REMOVED: 'удалён',
};

// ─── Participants Panel ────────────────────────────────────────────────────────

interface ParticipantsPanelProps {
  participants: ProposalParticipantInfo[];
  isOrganizer: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onKick: (id: string) => void;
  loading: boolean;
}

const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  participants, isOrganizer, onApprove, onReject, onKick, loading,
}) => {
  const pending = participants.filter((p) => p.status === 'PENDING');
  const approved = participants.filter((p) => p.status === 'APPROVED');
  const others = participants.filter((p) => ['REJECTED', 'WITHDRAWN', 'REMOVED'].includes(p.status));

  const renderParticipant = (p: ProposalParticipantInfo) => (
    <div
      key={p.id}
      className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 px-4 py-3 gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-500 font-bold text-sm">
          {p.user.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{p.user.full_name}</p>
          {p.user.phone_number && isOrganizer && (
            <p className="text-xs text-slate-500">{p.user.phone_number}</p>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PARTICIPATION_COLOR[p.status]}`}>
            {PARTICIPANT_STATUS_ACTIONS[p.status] ?? p.status}
          </span>
        </div>
      </div>

      {/* Organizer actions */}
      {isOrganizer && (
        <div className="flex items-center gap-1.5 shrink-0">
          {p.status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={() => onApprove(p.id)}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-[#E8F8F0] text-[#00B050] border border-[#00B050]/20 flex items-center justify-center active:scale-95 transition-all disabled:opacity-60"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => onReject(p.id)}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-red-50 text-red-500 border border-red-200 flex items-center justify-center active:scale-95 transition-all disabled:opacity-60"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </>
          )}
          {p.status === 'APPROVED' && (
            <button
              type="button"
              onClick={() => onKick(p.id)}
              disabled={loading}
              className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 active:scale-95 transition-all disabled:opacity-60"
            >
              Удалить
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-4">
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider px-1">
            Ждут одобрения ({pending.length})
          </p>
          {pending.map(renderParticipant)}
        </div>
      )}
      {approved.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#00B050] uppercase tracking-wider px-1">
            Одобрены ({approved.length})
          </p>
          {approved.map(renderParticipant)}
        </div>
      )}
      {others.length > 0 && isOrganizer && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Прочие ({others.length})
          </p>
          {others.map(renderParticipant)}
        </div>
      )}
      {participants.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Заявок ещё нет</p>
          <p className="text-xs mt-1">Поделись ссылкой на эту игру</p>
        </div>
      )}
    </div>
  );
};

// ─── Chat Panel ───────────────────────────────────────────────────────────────

interface ChatPanelProps {
  messages: ProposalMessageInfo[];
  currentUserId?: string;
  onSend: (text: string) => Promise<void>;
  canChat: boolean;
  loadingMsg: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages, currentUserId, onSend, canChat, loadingMsg,
}) => {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || loadingMsg) return;
    const t = text.trim();
    setText('');
    await onSend(t);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2">
        {messages.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Чат пуст</p>
            <p className="text-xs mt-1">Первое сообщение за тобой!</p>
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.sender.id === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMe && (
                  <span className="text-[10px] text-slate-500 font-semibold px-1">
                    {m.sender.full_name}
                  </span>
                )}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${
                    isMe
                      ? 'bg-[#00B050] text-white rounded-br-sm'
                      : 'bg-white border border-slate-200/80 text-slate-900 rounded-bl-sm shadow-xs'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-400 px-1">{formatTime(m.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canChat ? (
        <div className="flex items-end gap-2 pt-3 border-t border-slate-100">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Сообщение…"
            maxLength={1000}
            rows={1}
            className="flex-1 resize-none bg-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border focus:border-[#00B050]/40 transition-all max-h-28 overflow-y-auto"
            style={{ fieldSizing: 'content' } as any}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || loadingMsg}
            className="w-11 h-11 rounded-full bg-[#00B050] text-white flex items-center justify-center active:scale-95 transition-all disabled:opacity-40 shrink-0"
          >
            {loadingMsg ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-400 text-center">
            Подайте заявку на участие, чтобы написать в чат
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface ProposalDetailScreenProps {
  proposalId: string;
  currentUserId?: string;
  onBack: () => void;
  onRefreshList?: () => void;
}

type SubTab = 'info' | 'participants' | 'chat';

export const ProposalDetailScreen: React.FC<ProposalDetailScreenProps> = ({
  proposalId, currentUserId, onBack, onRefreshList,
}) => {
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SubTab>('info');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await playProposalsApi.getById(proposalId);
      setProposal(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => { load(); }, [load]);

  // WebSocket connection for real-time chat with polling fallback
  useEffect(() => {
    if (activeTab !== 'chat' || !proposal) return;

    let ws: WebSocket | null = null;
    const token = localStorage.getItem('token');

    if (token) {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/play-proposals/${proposalId}/chat?token=${token}`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.event === 'new_message' && parsed.data) {
              setProposal((prev) => {
                if (!prev) return prev;
                // Avoid duplicates
                if (prev.messages.some((m) => m.id === parsed.data.id)) return prev;
                return {
                  ...prev,
                  messages: [...prev.messages, parsed.data],
                };
              });
            }
          } catch (e) {
            console.warn('[WS message error]:', e);
          }
        };

        ws.onerror = (e) => {
          console.warn('[WS error, will fallback to polling]:', e);
        };
      } catch (err) {
        console.warn('[WS setup failed]:', err);
      }
    }

    // Polling fallback every 5s
    const interval = setInterval(async () => {
      try {
        const res = await playProposalsApi.getById(proposalId);
        setProposal((prev) => {
          if (!prev) return res.data;
          return {
            ...res.data,
            // Keep messages updated smoothly
            messages: res.data.messages,
          };
        });
      } catch { /* silent */ }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [activeTab, proposalId, proposal?.id]);

  const showAction = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleJoin = async () => {
    if (!proposal) return;
    try {
      setActionLoading(true);
      await playProposalsApi.join(proposal.id);
      await load();
      onRefreshList?.();
      showAction('Заявка отправлена! Ждите одобрения организатора.');
    } catch (e: any) {
      const msgs: Record<string, string> = {
        USER_BANNED: 'Ваш аккаунт заблокирован',
        ALREADY_REQUESTED: 'Вы уже подали заявку',
        PROPOSAL_FULL: 'Мест больше нет',
        CANNOT_JOIN_OWN: 'Нельзя вступить в свою заявку',
        PROPOSAL_NOT_OPEN: 'Заявка закрыта',
      };
      showAction(msgs[e.code] || e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!proposal) return;
    try {
      setActionLoading(true);
      await playProposalsApi.withdraw(proposal.id);
      await load();
      onRefreshList?.();
      showAction('Вы отказались от участия.');
    } catch (e: any) {
      showAction(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!proposal || !window.confirm('Отменить заявку? Все участники будут уведомлены.')) return;
    try {
      setActionLoading(true);
      await playProposalsApi.cancel(proposal.id);
      await load();
      onRefreshList?.();
    } catch (e: any) {
      showAction(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (participantId: string) => {
    if (!proposal) return;
    try {
      setActionLoading(true);
      await playProposalsApi.respondToParticipant(proposal.id, participantId, 'APPROVED');
      await load();
    } catch (e: any) {
      showAction(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (participantId: string) => {
    if (!proposal) return;
    try {
      setActionLoading(true);
      await playProposalsApi.respondToParticipant(proposal.id, participantId, 'REJECTED');
      await load();
    } catch (e: any) {
      showAction(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleKick = async (participantId: string) => {
    if (!proposal) return;
    try {
      setActionLoading(true);
      await playProposalsApi.removeParticipant(proposal.id, participantId);
      await load();
    } catch (e: any) {
      showAction(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!proposal) return;
    try {
      setMsgLoading(true);
      await playProposalsApi.sendMessage(proposal.id, text);
      await load();
    } catch (e: any) {
      showAction(e.message);
    } finally {
      setMsgLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00B050] animate-spin" />
        <p className="text-sm text-slate-500 mt-3">Загрузка…</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center px-6">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium text-center">{error || 'Заявка не найдена'}</p>
        <button
          onClick={onBack}
          className="mt-4 bg-[#00B050] text-white font-bold px-6 py-3 rounded-2xl active:scale-95 transition-all"
        >
          Назад
        </button>
      </div>
    );
  }

  const isOrganizer = currentUserId === proposal.organizer.id;
  const myStatus = proposal.my_participation_status;
  const spots = proposal.max_participants - 1 - proposal.approved_count;
  const pendingCount = proposal.participants.filter((p) => p.status === 'PENDING').length;

  // Determine if user can chat: organizer OR PENDING/APPROVED participant
  const canChat =
    isOrganizer ||
    myStatus === 'PENDING' ||
    myStatus === 'APPROVED';

  // Determine bottom action button
  const renderActionButton = () => {
    if (proposal.status !== 'open') return null;
    if (isOrganizer) {
      return (
        <button
          type="button"
          onClick={handleCancel}
          disabled={actionLoading}
          className="w-full border border-red-200 bg-red-50 text-red-500 font-bold text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Отменить заявку
        </button>
      );
    }
    if (!myStatus || myStatus === 'REJECTED' || myStatus === 'REMOVED') {
      return (
        <button
          type="button"
          onClick={handleJoin}
          disabled={actionLoading || spots <= 0}
          className="w-full bg-[#00B050] text-white font-bold text-base rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm"
        >
          {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
          {spots <= 0 ? 'Мест нет' : 'Хочу участвовать'}
        </button>
      );
    }
    if (myStatus === 'PENDING') {
      return (
        <button
          type="button"
          onClick={handleWithdraw}
          disabled={actionLoading}
          className="w-full border border-slate-200 bg-white text-slate-600 font-bold text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Отозвать заявку
        </button>
      );
    }
    if (myStatus === 'APPROVED') {
      return (
        <button
          type="button"
          onClick={handleWithdraw}
          disabled={actionLoading}
          className="w-full border border-slate-200 bg-white text-slate-600 font-semibold text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Покинуть игру
        </button>
      );
    }
    return null;
  };

  const subTabs: { id: SubTab; label: string; badge?: number }[] = [
    { id: 'info', label: 'О игре' },
    { id: 'participants', label: 'Участники', badge: isOrganizer ? pendingCount : undefined },
    { id: 'chat', label: 'Чат' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 bg-[#E8F8F0] text-[#00B050] px-3.5 py-1.5 rounded-full font-bold text-xs border border-[#00B050]/20 hover:bg-[#d5f5e3] active:scale-95 transition-all"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          Назад
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{SPORT_EMOJI[proposal.sport_type]}</span>
            <h1 className="font-black text-slate-900 text-base truncate">
              {SPORT_LABEL[proposal.sport_type]}
            </h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[proposal.status]}`}>
              {STATUS_LABEL[proposal.status]}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="bg-white border-b border-slate-100 px-4 py-2">
        <div className="relative bg-slate-100 rounded-2xl p-1 flex">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                activeTab === tab.id
                  ? 'bg-white shadow-xs text-slate-900'
                  : 'text-slate-500'
              }`}
            >
              {tab.label}
              {!!tab.badge && tab.badge > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#00B050] text-white text-[9px] font-black flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Action message toast */}
      {actionMsg && (
        <div className="absolute top-24 left-4 right-4 z-20 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-lg text-center">
          {actionMsg}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        {/* ── Info Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Organizer */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#E8F8F0] flex items-center justify-center text-[#00B050] font-black text-base shrink-0">
                {proposal.organizer.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Организатор</p>
                <p className="font-bold text-slate-900 text-sm">{proposal.organizer.full_name}</p>
              </div>
              {isOrganizer && (
                <span className="ml-auto text-[10px] bg-[#E8F8F0] text-[#00B050] border border-[#00B050]/20 px-2.5 py-1 rounded-full font-bold">
                  Это вы
                </span>
              )}
            </div>

            {/* Date + time */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-4.5 h-4.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Дата</p>
                  <p className="font-bold text-slate-900 text-sm">{formatDate(proposal.event_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Clock className="w-4.5 h-4.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Время</p>
                  <p className="font-bold text-slate-900 text-sm">
                    {proposal.start_time}
                    {proposal.end_time ? ` – ${proposal.end_time}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4.5 h-4.5 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Место</p>
                <p className="font-semibold text-slate-900 text-sm leading-snug">{proposal.location_text}</p>
                <a
                  href={`https://maps.google.com/?q=${proposal.latitude},${proposal.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[#00B050] font-semibold mt-1 inline-block"
                >
                  Открыть на карте →
                </a>
              </div>
            </div>

            {/* Participants summary */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-900">
                    {proposal.approved_count + 1} / {proposal.max_participants}
                  </span>
                  <span className="text-xs text-slate-500">участников</span>
                </div>
                {proposal.status === 'open' && (
                  <span className={`text-xs font-bold ${spots <= 0 ? 'text-red-500' : 'text-[#00B050]'}`}>
                    {spots <= 0 ? 'Мест нет' : `Свободно: ${spots}`}
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${spots <= 0 ? 'bg-red-400' : 'bg-[#00B050]'}`}
                  style={{
                    width: `${Math.min(100, ((proposal.approved_count + 1) / proposal.max_participants) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Comment */}
            {proposal.comment && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1.5">Комментарий</p>
                <p className="text-sm text-slate-700 leading-relaxed">{proposal.comment}</p>
              </div>
            )}

            {/* My status */}
            {myStatus && !isOrganizer && (
              <div className={`rounded-2xl border p-4 text-center ${PARTICIPATION_COLOR[myStatus]}`}>
                <p className="font-bold text-sm">{PARTICIPATION_LABEL[myStatus]}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Participants Tab ──────────────────────────────────────────────── */}
        {activeTab === 'participants' && (
          <ParticipantsPanel
            participants={proposal.participants}
            isOrganizer={isOrganizer}
            onApprove={handleApprove}
            onReject={handleReject}
            onKick={handleKick}
            loading={actionLoading}
          />
        )}

        {/* ── Chat Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <div style={{ height: 'calc(100vh - 280px)' }} className="flex flex-col">
            <ChatPanel
              messages={proposal.messages}
              currentUserId={currentUserId}
              onSend={handleSendMessage}
              canChat={canChat}
              loadingMsg={msgLoading}
            />
          </div>
        )}
      </div>

      {/* Bottom action button */}
      {activeTab === 'info' && renderActionButton() && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-4 py-4">
          {renderActionButton()}
        </div>
      )}
    </div>
  );
};
