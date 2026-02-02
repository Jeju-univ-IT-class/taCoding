import React, { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, Star, Heart, MessageSquare, User, Home, MapPin, ChevronRight, Filter, ImageOff, Plus, Minus, Navigation } from 'lucide-react';

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

// Kakao Maps SDK 동적 로더
function loadKakaoMap(appkey) {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) return resolve(window.kakao);
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=true`;
    script.async = true;
    script.onload = () => {
      if (window.kakao && window.kakao.maps) return resolve(window.kakao);
      // fallback: wait a short time for the kakao.maps namespace to become available
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (window.kakao && window.kakao.maps) {
          clearInterval(timer);
          return resolve(window.kakao);
        }
        if (attempts > 10) {
          clearInterval(timer);
          return reject(new Error('kakao.maps not available after script load'));
        }
      }, 200);
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

  // 지도 뷰 (Kakao Maps 연동)
  const MapView = () => {
    const mapRef = useRef(null);

    useEffect(() => {
      const APP_KEY = '0c9feebe33a63b61c3364f8b447bf13a';
      let kakaoMap = null;
      let markers = [];
      let mounted = true;

      loadKakaoMap(APP_KEY).then((kakao) => {
        if (!mounted) return;
        const container = mapRef.current;
        if (!container) return;
        const center = new kakao.maps.LatLng(33.4996, 126.5312);
        kakaoMap = new kakao.maps.Map(container, { center, level: 9 });

        // 중앙 마커
        const centerMarker = new kakao.maps.Marker({ position: center });
        centerMarker.setMap(kakaoMap);
        markers.push(centerMarker);

        // REVIEWS 기반 간단한 마커 배치 (데모용 약간 위치 보정)
        REVIEWS.forEach((r, i) => {
          const lat = 33.4996 + (i - 1.5) * 0.02;
          const lng = 126.5312 + (i - 1.5) * 0.02;
          const marker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(lat, lng) });
          marker.setMap(kakaoMap);
          markers.push(marker);
        });
      }).catch((e) => {
        console.error('Kakao Maps 로드 실패', e);
      });

      return () => {
        mounted = false;
        if (markers.length) markers.forEach((m) => m.setMap(null));
      };
    }, []);

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-white border-b flex justify-between items-center z-10">
        <div className="flex-1 mr-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="주변 명소 검색" 
              className="w-full bg-gray-100 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none"
            />
          </div>
        </div>
        <button className="p-2 bg-gray-100 rounded-lg">
          <Filter className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      
        {/* Map container */}
        <div className="flex-1 relative overflow-hidden" onClick={() => setSelectedPlace(null)}>
          <div ref={mapRef} className="absolute inset-0" style={{ minHeight: 300 }} />

          {/* Map Controls (UI only) */}
          <div className="absolute bottom-32 right-4 flex flex-col gap-2">
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

          {/* Selected Place Overlay Card (kept for UX parity) */}
          {selectedPlace && (
            <div className="absolute bottom-6 left-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-white rounded-2xl shadow-2xl p-3 flex gap-4 border border-blue-50">
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  <SafeImage src={selectedPlace.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">{selectedPlace.location}</h4>
                    <div className="flex items-center mt-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 mr-1" />
                      <span className="text-xs font-bold text-gray-700">{selectedPlace.rating}</span>
                      <span className="mx-1 text-gray-300 text-[10px]">•</span>
                      <span className="text-[10px] text-gray-500">리뷰 {selectedPlace.replies}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-blue-600 font-semibold">{selectedPlace.user}님의 추천</span>
                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold">
                      상세보기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
