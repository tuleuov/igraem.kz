import React, { useState, useMemo, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { MapView } from './components/MapView';
import { FilterBar } from './components/FilterBar';
import { DateFilterModal } from './components/DateFilterModal';
import { VenueCardModal } from './components/VenueCardModal';
import { BookingSuccessScreen } from './components/BookingSuccessScreen';
import { BookingsTab } from './components/BookingsTab';
import { VenueOpenedScreen } from './components/VenueOpenedScreen';
import { FavoritesTab } from './components/FavoritesTab';
import { ProfileTab } from './components/ProfileTab';
import { RequestsTab } from './components/RequestsTab';
import { BottomNav } from './components/BottomNav';
import { VenueClosedModal } from './components/VenueClosedModal';
import { UnlockLoadingScreen } from './components/UnlockLoadingScreen';
import { BannedUserScreen } from './components/BannedUserScreen';
import { SygrayemTab } from './components/SygrayemTab';

import { CityName, SportType, Venue, TimeSlot, Booking, ActiveTab, MyRequestItem, VenueIncomingRequests } from './types';
import { INITIAL_VENUES } from './data/venuesData';
import { Language } from './i18n/translations';
import { api, UserProfile } from './services/api';

export const App: React.FC = () => {
  // Auth & Ban state
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>({
    id: 'guest-id-1',
    iin: '010101500000',
    phone_number: '+7 (707) 890-12-34',
    full_name: 'Игрок',
    role: 'user',
  });
  const [userPhone, setUserPhone] = useState('+7 (707) 890-12-34');

  // Dynamic Venues state
  const [venues, setVenues] = useState<Venue[]>(INITIAL_VENUES);

  // i18n Language state
  const [currentLang, setCurrentLang] = useState<Language>('ru');

  // Navigation & Location
  const [currentCity, setCurrentCity] = useState<CityName>('Темиртау');
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');

  // Filters - Football active by default
  const [selectedSport, setSelectedSport] = useState<SportType>('football');
  const [selectedDate, setSelectedDate] = useState<string>('Сегодня');
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  // Selected Venue for Slot Modal
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Favorites (empty array by default)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Bookings state (empty array by default, populated from API)
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Browser GPS Geolocation state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Requests state matching screenshots
  const [myRequests, setMyRequests] = useState<MyRequestItem[]>([
    {
      id: 'req-1',
      venueId: 'v1',
      venueTitle: 'Площадка у школы №13',
      sport: 'basketball',
      address: 'ул. Ленина, 45',
      date: '14.10.2026',
      timeSlot: '18:00 – 19:00',
      status: 'pending',
    },
    {
      id: 'req-2',
      venueId: 'v1',
      venueTitle: 'Площадка у школы №13',
      sport: 'basketball',
      address: 'ул. Ленина, 45',
      date: '14.10.2026',
      timeSlot: '18:00 – 19:00',
      status: 'confirmed',
    },
    {
      id: 'req-3',
      venueId: 'v1',
      venueTitle: 'Площадка у школы №13',
      sport: 'basketball',
      address: 'ул. Ленина, 45',
      date: '14.10.2026',
      timeSlot: '18:00 – 19:00',
      status: 'declined',
    },
  ]);

  const [incomingVenueRequests, setIncomingVenueRequests] = useState<VenueIncomingRequests[]>([
    {
      id: 'v-req-1',
      venueId: 'v1',
      venueTitle: 'Площадка у школы №13',
      sport: 'basketball',
      address: 'ул. Ленина, 45',
      date: '14.10.2026',
      timeSlot: '18:00 – 19:00',
      joinedCount: 2,
      requests: [
        { id: 'usr-1', userName: 'Матвей Матвеев', status: 'pending' },
        { id: 'usr-2', userName: 'Абдурахманкурбамбез Карабасбарабасулы Суперказинакович', status: 'pending' },
      ],
    },
    {
      id: 'v-req-2',
      venueId: 'v2',
      venueTitle: 'Площадка у школы №13',
      sport: 'basketball',
      address: 'ул. Ленина, 45',
      date: '14.10.2026',
      timeSlot: '18:00 – 19:00',
      joinedCount: 0,
      requests: [],
    },
    {
      id: 'v-req-3',
      venueId: 'v3',
      venueTitle: 'Площадка у школы №13',
      sport: 'basketball',
      address: 'ул. Ленина, 45',
      date: '14.10.2026',
      timeSlot: '18:00 – 19:00',
      joinedCount: 1,
      requests: [
        { id: 'usr-3', userName: 'Абдурахманкурбамбез Карабасбарабасулы Суперказинакович', status: 'accepted' },
        { id: 'usr-4', userName: 'Абдурахманкурбамбез Карабасбарабасулы Суперказинакович', status: 'declined' },
      ],
    },
  ]);

  const totalPendingRequestsCount = useMemo(() => {
    return incomingVenueRequests.reduce((acc, venue) => {
      return acc + venue.requests.filter((r) => r.status === 'pending').length;
    }, 0);
  }, [incomingVenueRequests]);

  const handleAcceptIncomingRequest = (venueReqId: string, reqId: string) => {
    setIncomingVenueRequests((prev) =>
      prev.map((v) =>
        v.id === venueReqId
          ? {
              ...v,
              requests: v.requests.map((r) => (r.id === reqId ? { ...r, status: 'accepted' } : r)),
            }
          : v
      )
    );
  };

  const handleDeclineIncomingRequest = (venueReqId: string, reqId: string) => {
    setIncomingVenueRequests((prev) =>
      prev.map((v) =>
        v.id === venueReqId
          ? {
              ...v,
              requests: v.requests.map((r) => (r.id === reqId ? { ...r, status: 'declined' } : r)),
            }
          : v
      )
    );
  };

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('[Geolocation] Location permission or signal unavailable:', err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Check saved token on mount
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then((res) => {
          if (res.success && res.data) {
            setUserProfile(res.data);
            setUserPhone(res.data.phone_number || '');
            setIsAuthenticated(true);
          }
        })
        .catch(() => {
          api.setToken(null);
          setIsAuthenticated(false);
        });
    }
  }, []);

  // Fetch grounds on auth or city change
  useEffect(() => {
    if (isAuthenticated) {
      api.getGrounds()
        .then((res) => {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const mappedVenues: Venue[] = res.data.map((g: any) => ({
              id: g.id,
              title: g.name || g.title || 'Площадка',
              sport: (g.type || g.sport_type || 'football').toLowerCase() as any,
              city: (g.city || 'Темиртау') as CityName,
              lat: g.latitude || 50.060371,
              lng: g.longitude || 72.993374,
              address: g.address || '',
              rating: g.rating !== undefined && g.rating !== null ? Number(g.rating) : 0.0,
              images: g.images && g.images.length > 0 ? g.images : (g.type === 'basketball' ? ['https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80'] : ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80']),
              description: g.description || 'Оборудованная спортивная площадка с покрытием.',
              amenities: g.amenities || ['Освещение', 'Ограждение'],
              workingHours: g.working_hours || '08:00 - 23:00',
              surface: g.surface || 'Искусственная трава',
              slots: g.slots || [
                { id: '1', time: '17:00 – 18:00', isAvailable: true },
                { id: '2', time: '18:00 – 19:00', isAvailable: true },
                { id: '3', time: '19:00 – 20:00', isAvailable: true },
              ],
              occupiedSlots: g.occupied_slots || [],
            }));
            setVenues(mappedVenues);
          }
        })
        .catch((err) => {
          console.warn('[App] Could not fetch grounds from API, using default list:', err);
        });
    }
  }, [isAuthenticated, currentCity]);

  // Views overlay states
  const [currentBookingSuccess, setCurrentBookingSuccess] = useState<Booking | null>(null);
  const [openedVenueBooking, setOpenedVenueBooking] = useState<Booking | null>(null);

  // Active ongoing booking (venue is open)
  const activeBooking = useMemo(() => {
    return bookings.find((b) => b.isOpened || b.status === 'active') || openedVenueBooking || null;
  }, [bookings, openedVenueBooking]);

  // Upcoming non-opened booking (if activeBooking exists, upcomingBooking is null so map shows ONLY active booking)
  const upcomingBooking = useMemo(() => {
    if (activeBooking) return null;
    return bookings.find((b) => b.status === 'upcoming' && !b.isOpened) || null;
  }, [bookings, activeBooking]);

  // Count only active/upcoming bookings for bottom nav badge
  const activeBookingsCount = useMemo(() => {
    return bookings.filter((b) => b.status === 'active' || b.status === 'upcoming').length;
  }, [bookings]);

  // Unlock Loading Process state
  const [unlockingBooking, setUnlockingBooking] = useState<Booking | null>(null);

  // Venue Closed Thanks Modal state
  const [isVenueClosedModalOpen, setIsVenueClosedModalOpen] = useState(false);
  const [closedVenueSport, setClosedVenueSport] = useState<SportType>('football');

  // Filtered Venues List for Map
  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      if (venue.city !== currentCity) return false;
      if (selectedSport !== 'all' && venue.sport !== selectedSport) return false;
      
      if (selectedTimeSlots.length > 0) {
        const hasMatchingSlot = venue.slots.some(
          (slot) => slot.isAvailable && selectedTimeSlots.includes(slot.time)
        );
        if (!hasMatchingSlot) return false;
      }

      return true;
    });
  }, [venues, currentCity, selectedSport, selectedTimeSlots]);

  const favoriteVenues = useMemo(() => {
    return venues.filter((v) => favoriteIds.includes(v.id));
  }, [venues, favoriteIds]);

  // Handlers
  const handleAuthSuccess = (user: UserProfile) => {
    setUserProfile(user);
    setUserPhone(user.phone_number || '');
    setIsAuthenticated(true);
  };

  // Fetch user's real bookings from API when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      api.getMyBookings()
        .then((res) => {
          if (res.success && res.data) {
            const hosted = res.data.hosted || [];
            const joined = res.data.joined || [];
            const rawList = [...hosted, ...joined];

            const mapped: Booking[] = rawList.map((b: any) => ({
              id: b.id,
              venueId: b.ground_id || b.ground?.id || '',
              venueTitle: b.ground?.name || 'Спортивная площадка',
              sport: (b.ground?.type || 'football').toLowerCase() as any,
              city: (b.ground?.city || 'Темиртау') as CityName,
              address: b.ground?.address || '',
              date: b.booking_date || 'Сегодня',
              timeSlot: `${b.start_time || '18:00'} – ${b.end_time || '19:00'}`,
              qrCode: b.qr_code || `IGRAEM-${b.id?.slice(0, 5)}`,
              pinCode: b.pin_code || '4819',
              status: b.status === 'confirmed' ? 'active' : b.status === 'completed' ? 'completed' : 'upcoming',
              isOpened: false,
              canOpenNow: true,
            }));
            setBookings(mapped);
          }
        })
        .catch((err) => {
          console.warn('[App] Could not fetch my bookings from API:', err);
          setBookings([]);
        });
    } else {
      setBookings([]);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    api.setToken(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setBookings([]);
    setFavoriteIds([]);
  };

  const handleToggleFavorite = (venueId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(venueId) ? prev.filter((id) => id !== venueId) : [...prev, venueId]
    );
  };

  const handleCreateBooking = async (venue: Venue, date: string, slot: TimeSlot) => {
    const startTime = slot.time.split('–')[0]?.trim() || '18:00';
    const endTime = slot.time.split('–')[1]?.trim() || '19:00';

    let createdData: any = null;
    try {
      const res = await api.createBooking({
        ground_id: venue.id,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
      });

      if (res && res.success) {
        createdData = res.data;
      }
    } catch (err: any) {
      console.warn('[App] API booking fallback:', err);
    }

    const newBooking: Booking = {
      id: createdData?.id || `B-${Math.floor(1000 + Math.random() * 9000)}`,
      venueId: venue.id,
      venueTitle: venue.title,
      sport: venue.sport,
      city: venue.city,
      address: venue.address,
      date: date,
      timeSlot: slot.time,
      qrCode: createdData?.qr_code || `IGRAEM-${Math.floor(10000 + Math.random() * 90000)}`,
      pinCode: createdData?.pin_code || `${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'upcoming',
      isOpened: false,
      canOpenNow: true,
    };

    setBookings((prev) => [newBooking, ...prev]);
    setSelectedVenue(null);
    setCurrentBookingSuccess(newBooking);

    // Refresh grounds safely if API is live
    api.getGrounds().then((groundsRes) => {
      if (groundsRes && groundsRes.success && Array.isArray(groundsRes.data) && groundsRes.data.length > 0) {
        const mappedVenues: Venue[] = groundsRes.data.map((g: any) => ({
          id: g.id,
          title: g.name,
          sport: (g.type || g.sport_type || 'football').toLowerCase() as any,
          city: (g.city || 'Темиртау') as CityName,
          lat: g.latitude ? Number(g.latitude) : 50.060371,
          lng: g.longitude ? Number(g.longitude) : 72.993374,
          address: g.address || 'Темиртау',
          rating: g.rating ? Number(g.rating) : 0.0,
          images: g.images && g.images.length > 0 ? g.images : ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'],
          description: g.description || 'Спортивная площадка',
          amenities: ['Освещение', 'Искусственный газон', 'Электронный замок TTLock'],
          workingHours: '08:00 - 23:00',
          surface: 'Покрытие',
          slots: [
            { id: 's1', time: '17:00 – 18:00', isAvailable: true },
            { id: 's2', time: '18:00 – 19:00', isAvailable: true },
            { id: 's3', time: '19:00 – 20:00', isAvailable: true },
          ],
          occupiedSlots: g.occupied_slots || [],
        }));
        setVenues(mappedVenues);
      }
    }).catch(() => {});
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await api.cancelBooking(bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      
      const groundsRes = await api.getGrounds();
      if (groundsRes.success && Array.isArray(groundsRes.data)) {
        const mappedVenues: Venue[] = groundsRes.data.map((g: any) => ({
          id: g.id,
          title: g.name,
          sport: (g.type || g.sport_type || 'football').toLowerCase() as any,
          city: (g.city || 'Темиртау') as CityName,
          lat: g.latitude ? Number(g.latitude) : 50.060371,
          lng: g.longitude ? Number(g.longitude) : 72.993374,
          address: g.address || 'Темиртау',
          rating: g.rating ? Number(g.rating) : 0.0,
          images: g.images && g.images.length > 0 ? g.images : ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'],
          description: g.description || 'Спортивная площадка',
          amenities: ['Освещение', 'Искусственный газон', 'Электронный замок TTLock'],
          workingHours: '08:00 - 23:00',
          surface: 'Покрытие',
          slots: [
            { id: 's1', time: '17:00 – 18:00', isAvailable: true },
            { id: 's2', time: '18:00 – 19:00', isAvailable: true },
            { id: 's3', time: '19:00 – 20:00', isAvailable: true },
          ],
          occupiedSlots: g.occupied_slots || [],
        }));
        setVenues(mappedVenues);
      }
    } catch (err: any) {
      console.error('[App] cancelBooking error:', err);
    }
  };

  const handleFinishBooking = async (bookingId: string) => {
    const foundBooking = bookings.find((b) => b.id === bookingId);
    if (foundBooking) {
      setClosedVenueSport(foundBooking.sport);
    }

    try {
      await api.completeBooking(bookingId);
    } catch (err) {
      console.warn('[App] completeBooking backend error:', err);
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed' } : b))
    );
    setOpenedVenueBooking(null);
    setActiveTab('map');
    setIsVenueClosedModalOpen(true);

    try {
      const groundsRes = await api.getGrounds();
      if (groundsRes.success && Array.isArray(groundsRes.data)) {
        const mappedVenues: Venue[] = groundsRes.data.map((g: any) => ({
          id: g.id,
          title: g.name,
          sport: (g.type || g.sport_type || 'football').toLowerCase() as any,
          city: (g.city || 'Темиртау') as CityName,
          lat: g.latitude ? Number(g.latitude) : 50.060371,
          lng: g.longitude ? Number(g.longitude) : 72.993374,
          address: g.address || 'Темиртау',
          rating: g.rating ? Number(g.rating) : 0.0,
          images: g.images && g.images.length > 0 ? g.images : ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'],
          description: g.description || 'Спортивная площадка',
          amenities: ['Освещение', 'Искусственный газон', 'Электронный замок TTLock'],
          workingHours: '08:00 - 23:00',
          surface: 'Покрытие',
          slots: [
            { id: 's1', time: '17:00 – 18:00', isAvailable: true },
            { id: 's2', time: '18:00 – 19:00', isAvailable: true },
            { id: 's3', time: '19:00 – 20:00', isAvailable: true },
          ],
          occupiedSlots: g.occupied_slots || [],
        }));
        setVenues(mappedVenues);
      }
    } catch (e) {}
  };

  const handleOpenVenue = (booking: Booking) => {
    setCurrentBookingSuccess(null);
    setUnlockingBooking(booking);
  };

  const handleUnlockComplete = async () => {
    if (unlockingBooking) {
      const targetBooking = unlockingBooking;

      try {
        await api.unlockDoor({ bookingId: targetBooking.id, qrCode: targetBooking.qrCode });
      } catch (err) {
        console.warn('[App] Door unlock API call:', err);
      }

      setBookings((prev) =>
        prev.map((b) => (b.id === targetBooking.id ? { ...b, isOpened: true } : b))
      );
      setOpenedVenueBooking(targetBooking);
      setUnlockingBooking(null);
    }
  };

  const handleSelectVenueForBooking = (venueId: string) => {
    const found = venues.find((v) => v.id === venueId);
    if (found) {
      setSelectedVenue(found);
      setActiveTab('map');
    }
  };

  // Screen 1: Unauthenticated -> AuthScreen
  if (!isAuthenticated) {
    return (
      <div className="app-container border border-slate-200">
        <AuthScreen onSuccess={handleAuthSuccess} />
      </div>
    );
  }

  // Screen 6: Venue Opened Screen
  if (openedVenueBooking) {
    return (
      <div className="app-container border border-slate-200">
        <VenueOpenedScreen
          booking={openedVenueBooking}
          onBackToMap={() => {
            setOpenedVenueBooking(null);
            setActiveTab('map');
          }}
          onFinishBooking={handleFinishBooking}
        />
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setOpenedVenueBooking(null);
            setActiveTab(tab);
          }}
          bookingsCount={activeBookingsCount}
          favoritesCount={favoriteVenues.length}
          currentLang={currentLang}
        />
      </div>
    );
  }

  if (isBanned) {
    return (
      <div className="app-container border border-slate-200">
        <BannedUserScreen onUnbanForDemo={() => setIsBanned(false)} />
      </div>
    );
  }

  return (
    <div className="app-container border border-slate-200">
      <Header
        currentCity={currentCity}
        onSelectCity={setCurrentCity}
        currentLang={currentLang}
      />

      <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'map' && (
          <div key="tab-map" className="flex-1 w-full h-full flex flex-col justify-between min-h-0 relative animate-tab-view">
            <MapView
              currentCity={currentCity}
              venues={filteredVenues}
              selectedVenue={selectedVenue}
              onSelectVenue={setSelectedVenue}
              activeBooking={activeBooking}
              upcomingBooking={upcomingBooking}
              onOpenVenue={(b) => {
                if (b.isOpened || b.status === 'active') {
                  setOpenedVenueBooking(b);
                } else {
                  setCurrentBookingSuccess(b);
                }
              }}
              userCoords={userCoords}
              onUpdateUserCoords={setUserCoords}
            />

            <div className="shrink-0 w-full relative z-20 bg-white">
              <FilterBar
                selectedSport={selectedSport}
                onSelectSport={setSelectedSport}
                selectedDate={selectedDate}
                selectedTimeSlotsCount={selectedTimeSlots.length}
                onOpenDateModal={() => setIsDateModalOpen(true)}
                currentLang={currentLang}
              />
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div key="tab-bookings" className="flex-1 flex flex-col min-h-0 overflow-hidden animate-tab-view">
            <BookingsTab
              bookings={bookings}
              onOpenVenue={(b) => {
                if (b.isOpened || b.status === 'active') {
                  setOpenedVenueBooking(b);
                } else {
                  setCurrentBookingSuccess(b);
                }
              }}
              onSelectVenueForBooking={handleSelectVenueForBooking}
            />
          </div>
        )}

        {activeTab === 'requests' && (
          <div key="tab-requests" className="flex-1 flex flex-col min-h-0 overflow-y-auto animate-tab-view">
            <RequestsTab
              myRequests={myRequests}
              incomingVenueRequests={incomingVenueRequests}
              onAcceptIncomingRequest={handleAcceptIncomingRequest}
              onDeclineIncomingRequest={handleDeclineIncomingRequest}
              currentLang={currentLang}
            />
          </div>
        )}

        {activeTab === 'favorites' && (
          <div key="tab-favorites" className="flex-1 flex flex-col min-h-0 overflow-hidden animate-tab-view">
            <FavoritesTab
              favoriteVenues={favoriteVenues}
              onSelectVenue={(v) => {
                setSelectedVenue(v);
              }}
              onRemoveFavorite={handleToggleFavorite}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div key="tab-profile" className="flex-1 flex flex-col min-h-0 overflow-hidden animate-tab-view">
            <ProfileTab
              userProfile={userProfile}
              userPhone={userPhone}
              currentCity={currentCity}
              currentLang={currentLang}
              onSelectLang={setCurrentLang}
              onLogout={handleLogout}
              bookings={bookings}
              onBanUserDemo={() => setIsBanned(true)}
            />
          </div>
        )}

        {activeTab === 'sygrayem' && (
          <div key="tab-sygrayem" className="flex-1 flex flex-col min-h-0 overflow-hidden animate-tab-view">
            <SygrayemTab currentUserId={userProfile?.id} />
          </div>
        )}
      </main>

      <DateFilterModal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        selectedDate={selectedDate}
        selectedTimeSlots={selectedTimeSlots}
        onApply={(date, timeSlots) => {
          setSelectedDate(date);
          setSelectedTimeSlots(timeSlots);
        }}
      />

      <VenueCardModal
        venue={selectedVenue}
        userCoords={userCoords}
        onClose={() => setSelectedVenue(null)}
        onBook={handleCreateBooking}
        isFavorite={selectedVenue ? favoriteIds.includes(selectedVenue.id) : false}
        onToggleFavorite={handleToggleFavorite}
      />

      {currentBookingSuccess && (
        <BookingSuccessScreen
          booking={currentBookingSuccess}
          onClose={() => setCurrentBookingSuccess(null)}
          onGoToBookings={() => {
            setCurrentBookingSuccess(null);
            setActiveTab('bookings');
          }}
          onOpenVenue={handleOpenVenue}
          onCancelBooking={handleCancelBooking}
        />
      )}

      {unlockingBooking && (
        <UnlockLoadingScreen
          booking={unlockingBooking}
          onComplete={handleUnlockComplete}
        />
      )}

      <VenueClosedModal
        isOpen={isVenueClosedModalOpen}
        onClose={() => setIsVenueClosedModalOpen(false)}
        sport={closedVenueSport}
      />

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        bookingsCount={activeBookingsCount}
        requestsCount={totalPendingRequestsCount}
        favoritesCount={favoriteVenues.length}
        currentLang={currentLang}
      />
    </div>
  );
};

export default App;

