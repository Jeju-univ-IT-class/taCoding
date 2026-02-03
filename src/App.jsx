import React, { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, Star, Heart, MessageSquare, User, Home, MapPin, ChevronRight, ChevronDown, Filter, ImageOff, Plus, Minus, Navigation } from 'lucide-react';

// 제주도 특화 Mock Data
const REVIEWS = [
  {
    id: 1,
    user: "제주나그네",
    location: "서귀포 성산일출봉",
    rating: 4.9,
    comment: "새벽 공기를 가르며 올라간 보람이 있네요. 성산일출봉 정상에서 바라보는 일출은 평생 잊지 못할 장관입니다.",
    image: "https://images.unsplash.com/photo-1549693578-d683be217e58?q=80&w=1000&auto=format&fit=crop",
    likes: 342,
    replies: 45,
    coords: { x: 85, y: 45 } // 지도상 위치 (백분율)
  },
  {
    id: 2,
    user: "바다아이",
    location: "제주시 협재 해수욕장",
    rating: 4.7,
    comment: "비양도가 손에 잡힐 듯 보이는 에메랄드빛 바다는 언제 봐도 감동적이에요. 투명한 물속으로 물고기들이 보일 정도로 깨끗하고, 주변에 예쁜 카페들이 많아 하루 종일 머물기 좋습니다. 특히 일몰 시간에 방문하시는 것을 강력 추천드려요!",
    image: "https://images.unsplash.com/photo-1621274220348-4122ec030991?q=80&w=1000&auto=format&fit=crop",
    likes: 528,
    replies: 84,
    coords: { x: 15, y: 40 }
  },
  {
    id: 3,
    user: "숲속산책",
    location: "제주시 사려니숲길",
    rating: 4.8,
    comment: "안개 낀 날 방문했는데 몽환적인 분위기가 정말 최고였어요. 삼나무 향기를 맡으며 걷는 것만으로도 힐링이 됩니다.",
    image: "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1000&auto=format&fit=crop",
    likes: 189,
    replies: 22,
    coords: { x: 55, y: 50 }
  },
  {
    id: 4,
    user: "감귤러버",
    location: "서귀포 카멜리아 힐",
    rating: 4.6,
    comment: "계절마다 다른 꽃들이 반겨주는 곳이에요. 겨울에 피는 동백꽃은 정말 사진 찍기 최고의 스팟입니다.",
    image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1000&auto=format&fit=crop",
    likes: 156,
    replies: 10,
    coords: { x: 30, y: 75 }
  }
];

const CATEGORIES = ["전체", "해변", "오름/숲", "맛집", "카페", "테마파크"];

// 이미지 로딩 실패 처리를 위한 컴포넌트
const SafeImage = ({ src, alt, className }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`${className} bg-gray-100 flex flex-col items-center justify-center text-gray-400 gap-2`}>
        <ImageOff className="w-10 h-10 opacity-50" />
        <span className="text-[10px]">이미지 없음</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      onError={() => setError(true)} 
    />
  );
};

// 지역별 CSV 목록 - ASCII 파일명 사용 (macOS/Windows/Linux 호환)
// (위도,경도,장소명칭,장소상세정보,무장애관광정보,추천코스여부,데이터품질점검결과,데이터기준일자)
const REGIONS = [
  { value: '12-법환포구', label: '법환포구', file: '/region_12.csv' },
  { value: '14-토끼섬과하도포구', label: '토끼섬과하도포구', file: '/region_14.csv' },
  { value: '35-해녀박물관', label: '해녀박물관', file: '/region_35.csv' },
  { value: '49-동문시장', label: '동문시장', file: '/region_49.csv' },
  { value: '50-제주도립미술관', label: '제주도립미술관', file: '/region_50.csv' },
];

// Kakao Maps SDK 동적 로더 (kakao.maps.load 콜백으로 LatLng 등 API 준비 완료 후 resolve)
function loadKakaoMap(appkey) {
  return new Promise((resolve, reject) => {
    const initMap = () => {
      if (window.kakao?.maps?.LatLng) return resolve(window.kakao);
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => resolve(window.kakao));
        return;
      }
      reject(new Error('kakao.maps not available'));
    };

    if (window.kakao?.maps?.LatLng) return resolve(window.kakao);
    if (window.kakao?.maps?.load) {
      window.kakao.maps.load(() => resolve(window.kakao));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => resolve(window.kakao));
      } else {
        initMap();
      }
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedPlace, setSelectedPlace] = useState(null);

  // 메인 피드 컴포넌트
  const HomeView = () => (
    <div className="pb-24">
      {/* Search Header */}
      <div className="sticky top-0 bg-white z-10 p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="제주의 어디로 떠나고 싶으신가요?" 
            className="w-full bg-gray-100 rounded-full py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex overflow-x-auto p-4 gap-2 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Review Feed */}
      <div className="px-4 space-y-6">
        <div className="flex justify-between items-end">
          <h2 className="text-xl font-bold text-gray-800">지금 뜨는 제주 리뷰</h2>
          <span className="text-xs text-blue-600 font-medium cursor-pointer">더보기</span>
        </div>
        
        {REVIEWS.map((review) => (
          <div key={review.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="relative h-64">
              <SafeImage src={review.image} alt={review.location} className="w-full h-full object-cover" />
              <button className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors">
                <Heart className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 flex items-center bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 mr-1" />
                <span className="text-xs font-bold text-gray-800">{review.rating}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center text-blue-600 text-xs font-semibold mb-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {review.location}
                  </div>
                  <h3 className="font-bold text-lg">{review.user}님의 여행 기록</h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed">
                {review.comment}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-gray-400">
                <div className="flex gap-4">
                  <span className="flex items-center text-xs">
                    <Heart className="w-4 h-4 mr-1 text-red-400" /> {review.likes}
                  </span>
                  <span className="flex items-center text-xs">
                    <MessageSquare className="w-4 h-4 mr-1" /> {review.replies}
                  </span>
                </div>
                <button className="text-xs font-bold text-blue-600 flex items-center hover:underline">
                  전체보기 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 지도 뷰 (Kakao Maps + 무장애여행 CSV 연동)
  const MapView = () => {
    const mapRef = useRef(null);
    const allMarkersRef = useRef([]);
    const currentInfoCardRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const kakaoRef = useRef(null);
    const [selectedRegion, setSelectedRegion] = useState(REGIONS[0].value);
    const [mapReady, setMapReady] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // 지도 초기화 (1회)
    useEffect(() => {
      const APP_KEY = 'cf864dc2f0d80f5ca499d30ea483efd6';
      let mounted = true;

      loadKakaoMap(APP_KEY).then((kakao) => {
        if (!mounted) return;
        const container = mapRef.current;
        if (!container) return;

        kakaoRef.current = kakao;
        const options = {
          center: new kakao.maps.LatLng(33.450701, 126.570667),
          level: 3
        };
        const map = new kakao.maps.Map(container, options);
        mapInstanceRef.current = map;
        requestAnimationFrame(() => {
          if (map.relayout) map.relayout();
          setMapReady(true);
        });
      }).catch((e) => console.error('Kakao Maps 로드 실패', e));

      return () => {
        mounted = false;
        allMarkersRef.current.forEach((item) => {
          item.marker.setMap(null);
          item.labelOverlay.setMap(null);
          item.infoCardOverlay.setMap(null);
        });
        allMarkersRef.current = [];
        mapInstanceRef.current = null;
        kakaoRef.current = null;
      };
    }, []);

    // 선택된 지역에 맞는 CSV 로드
    useEffect(() => {
      if (!mapReady || !mapInstanceRef.current || !kakaoRef.current) return;

      const region = REGIONS.find((r) => r.value === selectedRegion);
      if (!region) return;

      const kakao = kakaoRef.current;
      const map = mapInstanceRef.current;

      // 기존 마커 제거
      allMarkersRef.current.forEach((item) => {
        item.marker.setMap(null);
        item.labelOverlay.setMap(null);
        item.infoCardOverlay.setMap(null);
      });
      allMarkersRef.current = [];
      if (currentInfoCardRef.current) {
        currentInfoCardRef.current.setMap(null);
        currentInfoCardRef.current = null;
      }

      const customMarkerImage = {
        url: 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png',
        size: new kakao.maps.Size(64, 69),
        offset: new kakao.maps.Point(27, 69)
      };

      const createMarkerWithLabel = (position, placeInfo) => {
        const name = placeInfo.name;
        const markerOption = { position };
        if (customMarkerImage?.url) {
          const markerImage = new kakao.maps.MarkerImage(
            customMarkerImage.url, customMarkerImage.size, { offset: customMarkerImage.offset }
          );
          markerOption.image = markerImage;
        }
        const marker = new kakao.maps.Marker(markerOption);
        marker.setMap(map);

        const overlayContent = '<div style="padding:5px 10px;background:#fff;border:1px solid #ddd;border-radius:4px;font-size:12px;white-space:nowrap;margin-top:8px;">' + name + '</div>';
        const customOverlay = new kakao.maps.CustomOverlay({ position, content: overlayContent, yAnchor: 0 });
        customOverlay.setMap(map);

        const cardHtml = '<div class="info-card" style="min-width:180px;max-width:260px;padding:12px 14px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;font-size:12px;line-height:1.5;box-shadow:0 2px 8px rgba(0,0,0,0.12);">' +
          '<div style="font-weight:700;margin-bottom:8px;font-size:13px;color:#333;">' + (placeInfo.name || '-') + '</div>' +
          (placeInfo.detailInfo ? '<div style="color:#666;margin-bottom:4px;">' + placeInfo.detailInfo + '</div>' : '') +
          (placeInfo.disabledInfo ? '<div style="color:#666;margin-bottom:4px;">' + placeInfo.disabledInfo + '</div>' : '') +
          (placeInfo.modifiedAt ? '<div style="color:#888;font-size:11px;">기준일자 ' + placeInfo.modifiedAt + '</div>' : '') +
          '</div>';

        const infoCardOverlay = new kakao.maps.CustomOverlay({ position, content: cardHtml, yAnchor: 1.2, xAnchor: 0.5 });

        kakao.maps.event.addListener(marker, 'mouseover', () => {
          if (currentInfoCardRef.current) currentInfoCardRef.current.setMap(null);
          infoCardOverlay.setMap(map);
          currentInfoCardRef.current = infoCardOverlay;
        });
        kakao.maps.event.addListener(marker, 'mouseout', () => {
          infoCardOverlay.setMap(null);
          if (currentInfoCardRef.current === infoCardOverlay) currentInfoCardRef.current = null;
        });

        return { marker, labelOverlay: customOverlay, infoCardOverlay, position };
      };

      fetch(region.file)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buffer) => {
          if (!mapInstanceRef.current || !kakaoRef.current) return;
          const decoder = new TextDecoder('euc-kr');
          const text = decoder.decode(buffer);
          const rows = text.trim().split(/\r?\n/);
          rows.shift();

          const allMarkers = [];

          rows.forEach((line, index) => {
            if (!line.trim()) return;
            const cols = line.split(',');
            const lat = parseFloat(cols[0]);
            const lng = parseFloat(cols[1]);
            const name = (cols[2] || '').trim();
            const detailInfo = (cols[3] || '').trim();
            const disabledInfo = (cols[4] || '').trim();
            const modifiedAt = (cols[7] || '').trim();

            if (Number.isNaN(lat) || Number.isNaN(lng)) return;

            const position = new kakao.maps.LatLng(lat, lng);
            const placeInfo = { name, detailInfo, disabledInfo, modifiedAt };

            if (index === 0) {
              map.setCenter(position);
              map.setLevel(6);
            }

            const markerItem = createMarkerWithLabel(position, placeInfo);
            allMarkers.push(markerItem);
          });

          allMarkersRef.current = allMarkers;

          if (map.relayout) {
            requestAnimationFrame(() => map.relayout());
          }
        })
        .catch((err) => console.error('CSV 로딩 실패:', err));
    }, [selectedRegion, mapReady]);

    const currentRegionLabel = REGIONS.find((r) => r.value === selectedRegion)?.label ?? selectedRegion;

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-white border-b z-10 flex flex-col gap-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="주변 명소 검색" 
                className="w-full bg-gray-100 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none"
              />
            </div>
            <button className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span>{currentRegionLabel}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} aria-hidden="true" />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 max-h-48 overflow-y-auto">
                  {REGIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setSelectedRegion(r.value);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${selectedRegion === r.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden min-h-[320px]" onClick={() => setSelectedPlace(null)}>
          <div ref={mapRef} className="absolute inset-0 w-full" style={{ minHeight: 320 }} />

          <div className="absolute bottom-8 right-4 flex flex-col gap-2">
            <button className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-600 active:bg-gray-50">
              <Navigation className="w-5 h-5" />
            </button>
            <div className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
              <button className="w-10 h-10 flex items-center justify-center text-gray-600 border-b border-gray-100 active:bg-gray-50">
                <Plus className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center text-gray-600 active:bg-gray-50">
                <Minus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative overflow-hidden">
        
        <main className="flex-1 overflow-y-auto no-scrollbar bg-white">
          {activeTab === 'home' && <HomeView />}
          {activeTab === 'map' && <MapView />}
          {activeTab === 'profile' && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-gray-300" />
              </div>
              <h4 className="text-gray-800 font-bold mb-1">로그인이 필요합니다</h4>
              <p className="text-sm">나의 여행 기록을 저장하고<br/>친구들과 공유해보세요!</p>
              <button className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold">로그인 / 회원가입</button>
            </div>
          )}
        </main>

        <nav className="fixed bottom-0 w-full max-w-md bg-white/80 backdrop-blur-lg border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold">홈</span>
          </button>
          <button 
            onClick={() => {
              setActiveTab('map');
              setSelectedPlace(null);
            }}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'map' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
          >
            <MapIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold">탐색</span>
          </button>
          <div className="relative -top-5">
            <button className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-full shadow-lg shadow-blue-200 flex items-center justify-center text-white transform active:scale-95 transition-transform">
              <span className="text-3xl font-light">+</span>
            </button>
          </div>
          <button 
            className="flex flex-col items-center gap-1 text-gray-400"
          >
            <Heart className="w-6 h-6" />
            <span className="text-[10px] font-bold">찜</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold">마이</span>
          </button>
        </nav>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-bottom-4 {
          from { transform: translateY(1rem); }
          to { transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.3s ease-out, slide-in-from-bottom-4 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;
