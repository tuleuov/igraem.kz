import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DoorOpen, Navigation, Loader2 } from 'lucide-react';
import { CityName, Venue, Booking } from '../types';
import { CITIES_CONFIG } from '../data/venuesData';
import { formatDateDDMMYYYY } from '../utils/date';

interface MapViewProps {
  currentCity: CityName;
  venues: Venue[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  activeBooking?: Booking | null;
  upcomingBooking?: Booking | null;
  onOpenVenue: (booking: Booking) => void;
  userCoords?: { lat: number; lng: number } | null;
  onUpdateUserCoords?: (coords: { lat: number; lng: number }) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  currentCity,
  venues,
  selectedVenue,
  onSelectVenue,
  activeBooking,
  upcomingBooking,
  onOpenVenue,
  userCoords,
  onUpdateUserCoords,
}) => {
  const displayBooking = activeBooking || upcomingBooking;
  const isActiveBooking = Boolean(activeBooking);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Auto-locate on first map mount if permission is granted
  useEffect(() => {
    if ('geolocation' in navigator && !userCoords) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (onUpdateUserCoords) {
            onUpdateUserCoords(coords);
          }
        },
        (err) => {
          console.warn('[Geolocation Auto] Permission denied or position unavailable:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const handleLocateUser = () => {
    if (!('geolocation' in navigator)) {
      alert('Геолокация не поддерживается вашим браузером');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (onUpdateUserCoords) {
          onUpdateUserCoords(coords);
        }
        if (mapRef.current) {
          mapRef.current.flyTo([coords.lat, coords.lng], 16, {
            animate: true,
            duration: 1.2,
          });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('[Geolocation] Error:', err);
        if (userCoords && mapRef.current) {
          mapRef.current.flyTo([userCoords.lat, userCoords.lng], 16, { animate: true });
        } else {
          alert('Не удалось определить местоположение. Пожалуйста, разрешите доступ к геопозиции в настройках браузера.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const cityConfig = CITIES_CONFIG[currentCity];

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [cityConfig.lat, cityConfig.lng],
        zoom: cityConfig.zoom,
        zoomControl: false,
        attributionControl: false,
      });

      // OpenStreetMap tiles (no API key required, reliable worldwide)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapRef.current = map;

      // Force Leaflet to recalculate container bounds after flex layout mounts
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 200);
    }

    // Window resize handler to invalidate map size automatically
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      const cityConfig = CITIES_CONFIG[currentCity];
      mapRef.current.setView([cityConfig.lat, cityConfig.lng], cityConfig.zoom, {
        animate: true,
      });
      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 100);
    }
  }, [currentCity]);

  useEffect(() => {
    if (!mapRef.current) return;

    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    venues.forEach((venue, index) => {
      const isSelected = selectedVenue?.id === venue.id;
      const ballEmoji = venue.sport === 'football' ? '⚽' : '🏀';
      const pinSize = isSelected ? 36 : 30;
      const fontSize = isSelected ? 20 : 16;

      // Slight micro-offset for venues sharing exact same lat/lng so both pins are visible & clickable side-by-side
      const sameCoordsIndex = venues.filter((v, i) => i < index && Math.abs(v.lat - venue.lat) < 0.00001 && Math.abs(v.lng - venue.lng) < 0.00001).length;
      const effectiveLat = venue.lat + (sameCoordsIndex > 0 ? sameCoordsIndex * 0.00008 : 0);
      const effectiveLng = venue.lng + (sameCoordsIndex > 0 ? sameCoordsIndex * 0.00014 : 0);

      const pinHtml = `
        <div class="custom-map-pin ${isSelected ? 'active' : ''}" style="
          width: ${pinSize}px;
          height: ${pinSize}px;
          background: #FFFFFF;
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${fontSize}px;
          line-height: 1;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">${ballEmoji}</div>
      `;

      const customIcon = L.divIcon({
        html: pinHtml,
        className: 'custom-leaflet-icon',
        iconSize: [pinSize, pinSize],
        iconAnchor: [pinSize / 2, pinSize / 2],
      });

      const marker = L.marker([effectiveLat, effectiveLng], { icon: customIcon }).addTo(mapRef.current!);
      marker.on('click', () => onSelectVenue(venue));

      markersRef.current[venue.id] = marker;
    });
  }, [venues, selectedVenue, onSelectVenue]);

  // Render glowing blue "Вы здесь" user location marker on the map
  useEffect(() => {
    if (!mapRef.current) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userCoords && userCoords.lat && userCoords.lng) {
      const userPinHtml = `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div class="user-pulse-ring" style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(37, 99, 235, 0.35);"></div>
          <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 2px 10px rgba(37, 99, 235, 0.6);"></div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userPinHtml,
        className: 'user-location-leaflet-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
      marker.bindTooltip('Вы здесь', { permanent: true, direction: 'top', offset: [0, -10], className: 'custom-user-tooltip' });
      userMarkerRef.current = marker;
    }
  }, [userCoords]);

  return (
    <div className="relative w-full flex-1 flex flex-col min-h-[300px] overflow-hidden">
      {/* Map Canvas taking 100% full height and width */}
      <div ref={containerRef} className="w-full h-full flex-1 min-h-[300px]" />

      {/* Floating GPS Location Button (top right corner) */}
      <button
        type="button"
        onClick={handleLocateUser}
        disabled={isLocating}
        className="absolute top-4 right-4 z-20 w-11 h-11 bg-white hover:bg-slate-50 border border-slate-200/60 rounded-2xl shadow-md flex items-center justify-center text-slate-800 transition-all active:scale-95 pointer-events-auto"
        title="Моё местоположение"
      >
        {isLocating ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
        ) : (
          <Navigation className="w-5 h-5 fill-slate-700/20 text-slate-800" />
        )}
      </button>

      {/* Floating Active OR Upcoming Booking Card - Priority to Active Booking */}
      {displayBooking && (
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-auto">
          <div
            onClick={() => onOpenVenue(displayBooking)}
            className={`bg-white rounded-2xl p-4 shadow-xl border flex items-center justify-between cursor-pointer hover:border-slate-300 active:scale-[0.99] transition-all animate-fade-in ${
              isActiveBooking ? 'border-[#00B050]/60 ring-2 ring-[#00B050]/20' : 'border-slate-100/80'
            }`}
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#00B050] flex items-center gap-1.5">
                  {isActiveBooking ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00B050] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00B050]"></span>
                      </span>
                      <span>Активная бронь</span>
                    </>
                  ) : (
                    'Ближайшая бронь'
                  )}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-1.5 truncate">
                <span className="truncate">{displayBooking.venueTitle}</span>
                <span className="shrink-0">{displayBooking.sport === 'football' ? '⚽' : '🏀'}</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate">
                {formatDateDDMMYYYY(displayBooking.date)}, {displayBooking.timeSlot}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

