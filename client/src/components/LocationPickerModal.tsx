import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { X, Navigation, Check, Loader2, MapPin } from 'lucide-react';

interface LocationPickerModalProps {
  initialLat?: number | '';
  initialLng?: number | '';
  initialAddress?: string;
  onClose: () => void;
  onSelect: (data: { address: string; lat: number; lng: number }) => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  initialLat,
  initialLng,
  initialAddress,
  onClose,
  onSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat !== '' && initialLng !== '' && typeof initialLat === 'number' && typeof initialLng === 'number'
      ? { lat: initialLat, lng: initialLng }
      : null
  );

  const [address, setAddress] = useState<string>(initialAddress || '');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Helper function to format human-readable address with house number priority
  const formatAddressFromOSM = (data: any, fallbackLat: number, fallbackLng: number): string => {
    if (!data) return `Точка (${fallbackLat.toFixed(4)}, ${fallbackLng.toFixed(4)})`;

    const addr = data.address || {};
    const road = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.suburb || '';
    const houseNumber = addr.house_number || addr.building || '';
    const city = addr.city || addr.town || addr.village || addr.county || addr.state || '';

    // If road + house number exists (e.g. ул. Абая, 12, Алматы)
    if (road && houseNumber) {
      return city ? `${road}, д. ${houseNumber}, ${city}` : `${road}, д. ${houseNumber}`;
    }

    if (road) {
      return city ? `${road}, ${city}` : road;
    }

    if (data.display_name) {
      // Split display name by comma and take top 2-3 specific parts
      const parts = data.display_name.split(',').map((p: string) => p.trim());
      if (parts.length >= 2) {
        return parts.slice(0, 3).join(', ');
      }
      return parts[0] || data.display_name;
    }

    return `Координаты: ${fallbackLat.toFixed(5)}, ${fallbackLng.toFixed(5)}`;
  };

  // Reverse geocode lat, lng to address using OpenStreetMap Nominatim
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ru&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'IgraemKZ-SportsApp/1.0',
        },
      });

      if (!res.ok) {
        throw new Error('Geocoding service error');
      }

      const data = await res.json();
      const resolvedAddress = formatAddressFromOSM(data, lat, lng);
      setAddress(resolvedAddress);
    } catch (err) {
      console.warn('[ReverseGeocode] Failed:', err);
      // Fallback display if offline or network throttled
      setAddress(`Выбранная точка: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Update pin position and marker on the map
  const setPoint = useCallback((lat: number, lng: number, fetchAddress = true) => {
    setSelectedCoords({ lat, lng });

    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const pinHtml = `
        <div style="
          width: 42px;
          height: 42px;
          background: #00B050;
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 4px 16px rgba(0, 176, 80, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          line-height: 1;
        ">📍</div>
      `;
      const customIcon = L.divIcon({
        html: pinHtml,
        className: 'location-picker-pin',
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapRef.current);
      markerRef.current = marker;
    }

    if (fetchAddress) {
      reverseGeocode(lat, lng);
    }
  }, [reverseGeocode]);

  // Center to user GPS location
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается вашим браузером');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 16, { animate: true });
        }
        setPoint(latitude, longitude, true);
      },
      (err) => {
        setIsLocating(false);
        console.warn('[Geolocation] Error:', err);
        alert('Не удалось определить местоположение. Выберите точку кликом по карте.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [setPoint]);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    // Default center Kazakhstan (Karaganda/Temirtau region or user initial)
    const defaultCenter: [number, number] =
      initialLat && initialLng && typeof initialLat === 'number' && typeof initialLng === 'number'
        ? [initialLat, initialLng]
        : [50.060371, 72.993374];

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: initialLat && initialLng ? 16 : 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    mapRef.current = map;

    // Map Click handler to place point
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setPoint(lat, lng, true);
    });

    // If initial point passed, place marker
    if (initialLat && initialLng && typeof initialLat === 'number' && typeof initialLng === 'number') {
      setPoint(initialLat, initialLng, !initialAddress);
    } else {
      // Automatically center to user position on mount if no initial coordinates
      if (navigator.geolocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setIsLocating(false);
            const { latitude, longitude } = pos.coords;
            if (mapRef.current) {
              mapRef.current.setView([latitude, longitude], 16, { animate: true });
            }
            setPoint(latitude, longitude, true);
          },
          () => {
            setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      }
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleConfirm = () => {
    if (!selectedCoords) return;
    onSelect({
      address: address.trim() || `Точка (${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)})`,
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-fade-in">
      {/* Top Bar with Close button */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto w-11 h-11 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-slate-900 active:scale-95 transition-all"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="pointer-events-auto w-11 h-11 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200/80 flex items-center justify-center text-[#00B050] hover:bg-[#E8F8F0] active:scale-95 transition-all disabled:opacity-60"
          title="Моё местоположение"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Navigation className="w-5 h-5 fill-current" />
          )}
        </button>
      </div>

      {/* Map Container */}
      <div className="relative w-full flex-1 min-h-0">
        <div ref={containerRef} className="w-full h-full" />

        {/* Small floating hint on top center */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-md flex items-center gap-1.5 whitespace-nowrap">
            <MapPin className="w-3.5 h-3.5 text-[#00B050]" />
            <span>Нажмите на карту, чтобы выбрать точку</span>
          </div>
        </div>
      </div>

      {/* Bottom Floating Card & Confirmation Section */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent pointer-events-none">
        <div className="pointer-events-auto max-w-md mx-auto space-y-3">
          {/* White Card with Resolved House / Street Address */}
          <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-200/80 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F8F0] border border-[#00B050]/20 text-[#00B050] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ближайший адрес
                </p>

                {isGeocoding ? (
                  <div className="flex items-center gap-2 py-1 text-xs text-slate-500 font-medium">
                    <Loader2 className="w-3.5 h-3.5 text-[#00B050] animate-spin" />
                    <span>Определяем точный адрес здания...</span>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-900 leading-snug mt-0.5">
                    {address || 'Точка не выбрана (нажмите на карту)'}
                  </p>
                )}

                {selectedCoords && (
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedCoords || isGeocoding}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
              selectedCoords && !isGeocoding
                ? 'bg-[#00B050] text-white hover:bg-[#009040]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>Подтвердить место</span>
          </button>
        </div>
      </div>
    </div>
  );
};
