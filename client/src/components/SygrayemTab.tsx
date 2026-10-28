import React, { useState, useEffect, useCallback } from 'react';
import { Plus, List, Map as MapIcon, SlidersHorizontal, X, Loader2, RefreshCw } from 'lucide-react';
import {
  playProposalsApi,
  ProposalCard,
  ProposalMapPoint,
  ProposalSportType,
  ProposalFilters,
} from '../services/playProposalsApi';
import { ProposalCardItem, SPORT_EMOJI, SPORT_LABEL } from './ProposalCard';
import { ProposalDetailScreen } from './ProposalDetailScreen';
import { CreateProposalScreen } from './CreateProposalScreen';

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = 'list' | 'map';
const SPORTS: ProposalSportType[] = ['football', 'basketball', 'volleyball'];

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateRU(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
interface FilterBarProps {
  filters: ProposalFilters & { event_date?: string };
  onChange: (f: ProposalFilters & { event_date?: string }) => void;
}

const ProposalFilterBar: React.FC<FilterBarProps> = ({ filters, onChange }) => {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState(filters.event_date || getTodayStr());

  const toggleSport = (s: ProposalSportType) => {
    const cur = filters.sport_type || [];
    const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
    onChange({ ...filters, sport_type: next });
  };

  const handleDateApply = () => {
    onChange({ ...filters, event_date: tempDate });
    setOpen(false);
  };

  const hasFilters =
    (filters.sport_type?.length ?? 0) > 0 ||
    (filters.event_date && filters.event_date !== getTodayStr());

  return (
    <div className="bg-white border-b border-slate-200/80 px-4 py-2.5 space-y-2">
      {/* Sport pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {SPORTS.map((s) => {
          const active = filters.sport_type?.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleSport(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-all active:scale-95 ${
                active
                  ? 'bg-[#E8F8F0] text-[#00B050] border-[#00B050]/30'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              <span>{SPORT_EMOJI[s]}</span>
              {SPORT_LABEL[s]}
            </button>
          );
        })}

        {/* Date filter trigger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-all active:scale-95 ml-auto shrink-0 ${
            open
              ? 'bg-[#E8F8F0] text-[#00B050] border-[#00B050]/30'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          {filters.event_date ? formatDateRU(filters.event_date) : 'Сегодня'}
        </button>

        {/* Reset */}
        {hasFilters && (
          <button
            type="button"
            onClick={() => onChange({ event_date: getTodayStr() })}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 bg-white text-slate-500 whitespace-nowrap active:scale-95 transition-all shrink-0"
          >
            <X className="w-3 h-3" />
            Сбросить
          </button>
        )}
      </div>

      {/* Date picker dropdown */}
      {open && (
        <div className="flex items-center gap-2 pt-1 pb-0.5">
          <input
            type="date"
            value={tempDate}
            min={getTodayStr()}
            onChange={(e) => setTempDate(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#00B050]"
          />
          <button
            type="button"
            onClick={handleDateApply}
            className="bg-[#00B050] text-white font-bold text-xs px-4 py-2 rounded-xl active:scale-95 transition-all"
          >
            Применить
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Map View (простая карта через iframe / placeholder) ─────────────────────
// Для MVP показываем список точек в виде grid, т.к. полноценная карта
// требует ключа Mapbox/Yandex. Маркеры кликабельны.

interface MapViewProps {
  points: ProposalMapPoint[];
  onSelectPoint: (id: string) => void;
  loading: boolean;
}

const ProposalMapView: React.FC<MapViewProps> = ({ points, onSelectPoint, loading }) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00B050] animate-spin" />
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl mb-3">🗺️</span>
        <p className="font-bold text-slate-700">Нет заявок на карте</p>
        <p className="text-sm text-slate-500 mt-1">Попробуй изменить фильтры или выбрать другую дату</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
      {/* Map placeholder banner */}
      <div className="rounded-2xl overflow-hidden bg-slate-200 h-40 mb-4 relative flex items-center justify-center border border-slate-200">
        <div className="text-center">
          <MapIcon className="w-8 h-8 text-slate-400 mx-auto mb-1" />
          <p className="text-xs text-slate-500 font-medium">
            Карта ({points.length} точек)
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Интерактивная карта — следующая итерация</p>
        </div>
        {/* Scatter some emoji "markers" as decorative visual */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {points.slice(0, 6).map((p, i) => (
            <span
              key={p.id}
              className="absolute text-xl"
              style={{
                left: `${15 + (i % 3) * 30}%`,
                top: `${20 + Math.floor(i / 3) * 45}%`,
              }}
            >
              {p.sport_type === 'football' ? '⚽' : p.sport_type === 'basketball' ? '🏀' : '🏐'}
            </span>
          ))}
        </div>
      </div>

      {/* List of points as cards */}
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
        Все заявки · {points.length}
      </p>
      <div className="grid grid-cols-1 gap-2">
        {points.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectPoint(p.id)}
            className="w-full flex items-center gap-3 bg-white rounded-2xl border border-slate-200/80 px-4 py-3 text-left active:scale-[0.98] transition-all hover:border-[#00B050]/30"
          >
            <span className="text-2xl shrink-0">
              {p.sport_type === 'football' ? '⚽' : p.sport_type === 'basketball' ? '🏀' : '🏐'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900">
                {SPORT_LABEL[p.sport_type]}
              </p>
              <p className="text-xs text-slate-500">
                {p.start_time} · {p.approved_count + 1}/{p.max_participants} чел.
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                p.status === 'open'
                  ? 'bg-[#E8F8F0] text-[#00B050] border-[#00B050]/20'
                  : 'bg-orange-50 text-orange-600 border-orange-200'
              }`}
            >
              {p.status === 'open' ? 'Набор' : 'Идёт'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main SygrayemTab ─────────────────────────────────────────────────────────

interface SygrayemTabProps {
  currentUserId?: string;
}

export const SygrayemTab: React.FC<SygrayemTabProps> = ({ currentUserId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<ProposalFilters & { event_date?: string }>({
    event_date: getTodayStr(),
  });

  const [proposals, setProposals] = useState<ProposalCard[]>([]);
  const [mapPoints, setMapPoints] = useState<ProposalMapPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // ── Load list ───────────────────────────────────────────────────────────
  const loadList = useCallback(
    async (resetPage = true) => {
      try {
        resetPage ? setLoading(true) : setLoadingMore(true);
        const p = resetPage ? 1 : page;
        const res = await playProposalsApi.list({ ...filters, page: p, limit: 20 });
        if (resetPage) {
          setProposals(res.data);
          setPage(2);
        } else {
          setProposals((prev) => [...prev, ...res.data]);
          setPage((prev) => prev + 1);
        }
        setTotal(res.pagination.total);
      } catch { /* silent */ } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters, page]
  );

  // ── Load map ────────────────────────────────────────────────────────────
  const loadMap = useCallback(async () => {
    try {
      setLoading(true);
      const res = await playProposalsApi.mapPoints({
        ...filters,
        event_date: filters.event_date || getTodayStr(),
      });
      setMapPoints(res.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (viewMode === 'list') loadList(true);
    else loadMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, viewMode]);

  const handleFilterChange = (f: typeof filters) => {
    setFilters(f);
    setPage(1);
  };

  const handleCreated = (id: string) => {
    setShowCreate(false);
    setSelectedId(id);
    loadList(true);
  };

  // ── Detail screen ───────────────────────────────────────────────────────
  if (selectedId) {
    return (
      <ProposalDetailScreen
        proposalId={selectedId}
        currentUserId={currentUserId}
        onBack={() => setSelectedId(null)}
        onRefreshList={() => {
          if (viewMode === 'list') loadList(true);
          else loadMap();
        }}
      />
    );
  }

  // ── Create screen ───────────────────────────────────────────────────────
  if (showCreate) {
    return (
      <CreateProposalScreen
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 text-slate-900 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200/80 px-4 pt-3.5 pb-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-black text-slate-900 text-lg leading-tight">Сыграем?</h1>
          <p className="text-xs text-slate-500 font-medium">
            {total > 0 ? `${total} ${total === 1 ? 'заявка' : total < 5 ? 'заявки' : 'заявок'}` : 'Нет активных заявок'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            type="button"
            onClick={() => viewMode === 'list' ? loadList(true) : loadMap()}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Список
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Карта
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <ProposalFilterBar filters={filters} onChange={handleFilterChange} />

      {/* ── List view ───────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#00B050] animate-spin" />
            </div>
          ) : proposals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <span className="text-5xl mb-3">⚽</span>
              <p className="font-bold text-slate-700 text-base">Заявок ещё нет</p>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                Создайте первую — и кто-то обязательно присоединится!
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="bg-[#00B050] text-white font-bold px-6 py-3 rounded-2xl active:scale-95 transition-all shadow-sm"
              >
                Создать заявку
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3">
              {proposals.map((p) => (
                <ProposalCardItem
                  key={p.id}
                  proposal={p}
                  onClick={(pr) => setSelectedId(pr.id)}
                  currentUserId={currentUserId}
                />
              ))}

              {/* Load more */}
              {proposals.length < total && (
                <button
                  type="button"
                  onClick={() => loadList(false)}
                  disabled={loadingMore}
                  className="w-full bg-white border border-slate-200 text-slate-600 font-semibold text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#00B050]" />
                  ) : (
                    `Ещё (${total - proposals.length})`
                  )}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Map view ─────────────────────────────────────────────────────── */}
      {viewMode === 'map' && (
        <ProposalMapView
          points={mapPoints}
          onSelectPoint={setSelectedId}
          loading={loading}
        />
      )}

      {/* ── FAB: Create ─────────────────────────────────────────────────── */}
      {currentUserId && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-4 z-20 w-14 h-14 bg-[#00B050] text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 hover:bg-[#009040] transition-all"
          aria-label="Создать заявку"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
};
