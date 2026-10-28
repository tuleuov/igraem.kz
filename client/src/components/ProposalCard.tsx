import React from 'react';
import { Users, MapPin, Clock, Calendar } from 'lucide-react';
import { ProposalCard, ProposalSportType, ParticipantStatus } from '../services/playProposalsApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const SPORT_EMOJI: Record<ProposalSportType, string> = {
  football: '⚽',
  basketball: '🏀',
  volleyball: '🏐',
};

export const SPORT_LABEL: Record<ProposalSportType, string> = {
  football: 'Футбол',
  basketball: 'Баскетбол',
  volleyball: 'Волейбол',
};

export const STATUS_LABEL: Record<string, string> = {
  open: 'Набор',
  in_progress: 'Идёт',
  completed: 'Завершено',
  cancelled: 'Отменено',
};

export const STATUS_COLOR: Record<string, string> = {
  open: 'bg-[#E8F8F0] text-[#00B050] border-[#00B050]/20',
  in_progress: 'bg-orange-50 text-orange-600 border-orange-200',
  completed: 'bg-slate-100 text-slate-500 border-slate-200',
  cancelled: 'bg-red-50 text-red-500 border-red-200',
};

export const PARTICIPATION_LABEL: Record<ParticipantStatus, string> = {
  PENDING: 'Ждёт одобрения',
  APPROVED: '✓ Участвую',
  REJECTED: 'Отклонено',
  WITHDRAWN: 'Отказался',
  REMOVED: 'Удалён',
};

export const PARTICIPATION_COLOR: Record<ParticipantStatus, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-[#E8F8F0] text-[#00B050] border-[#00B050]/20',
  REJECTED: 'bg-red-50 text-red-500 border-red-200',
  WITHDRAWN: 'bg-slate-100 text-slate-500 border-slate-200',
  REMOVED: 'bg-red-50 text-red-500 border-red-200',
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

// ─── ProposalCard Component ───────────────────────────────────────────────────

interface ProposalCardProps {
  proposal: ProposalCard;
  onClick: (proposal: ProposalCard) => void;
  currentUserId?: string;
}

export const ProposalCardItem: React.FC<ProposalCardProps> = ({
  proposal,
  onClick,
  currentUserId,
}) => {
  const spots = proposal.max_participants - 1 - proposal.approved_count;
  const isFull = spots <= 0;
  const isOrganizer = currentUserId === proposal.organizer.id;

  return (
    <button
      type="button"
      onClick={() => onClick(proposal)}
      className="w-full text-left bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3 active:scale-[0.98] transition-all duration-150 hover:border-[#00B050]/30 hover:shadow-sm"
    >
      {/* Top row: sport + status + time */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{SPORT_EMOJI[proposal.sport_type]}</span>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">
              {SPORT_LABEL[proposal.sport_type]}
            </p>
            <p className="text-xs text-slate-500 font-medium">{proposal.organizer.full_name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[proposal.status]}`}
          >
            {STATUS_LABEL[proposal.status]}
          </span>
          {proposal.my_participation_status && !isOrganizer && (
            <span
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${PARTICIPATION_COLOR[proposal.my_participation_status]}`}
            >
              {PARTICIPATION_LABEL[proposal.my_participation_status]}
            </span>
          )}
          {isOrganizer && (
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
              Моя заявка
            </span>
          )}
        </div>
      </div>

      {/* Date & time */}
      <div className="flex items-center gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {formatDate(proposal.event_date)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {proposal.start_time}
          {proposal.end_time ? ` – ${proposal.end_time}` : ''}
        </span>
      </div>

      {/* Location */}
      <div className="flex items-start gap-1.5 text-xs text-slate-600">
        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span className="line-clamp-1">{proposal.location_text}</span>
      </div>

      {/* Comment */}
      {proposal.comment && (
        <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
          {proposal.comment}
        </p>
      )}

      {/* Participants progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>
            <span className="font-bold text-slate-900">
              {proposal.approved_count + 1}
            </span>
            /{proposal.max_participants} участников
          </span>
        </div>
        {proposal.status === 'open' && (
          <span
            className={`text-xs font-semibold ${
              isFull ? 'text-red-500' : 'text-[#00B050]'
            }`}
          >
            {isFull ? 'Мест нет' : `+${spots} мест`}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isFull ? 'bg-red-400' : 'bg-[#00B050]'
          }`}
          style={{
            width: `${Math.min(
              100,
              ((proposal.approved_count + 1) / proposal.max_participants) * 100
            )}%`,
          }}
        />
      </div>
    </button>
  );
};
