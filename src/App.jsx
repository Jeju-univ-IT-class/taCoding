import React, { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, Star, Heart, MessageSquare, User, Home, MapPin, ChevronRight, Filter, ImageOff, Plus, Minus, Navigation, LogOut } from 'lucide-react';

// 제주도 특화 Mock Data (카테고리 필드 포함)
const REVIEWS = [
  {
    id: 1,
    user: "제주나그네",
    location: "서귀포 성산일출봉",
    category: "오름/숲",
    rating: 4.9,
    comment: "새벽 공기를 가르며 올라간 보람이 있네요. 성산일출봉 정상에서 바라보는 일출은 평생 잊지 못할 장관입니다.",
    image: "https://images.unsplash.com/photo-1549693578-d683be217e58?q=80&w=1000&auto=format&fit=crop",
    likes: 342,
    replies: 45,
    coords: { x: 85, y: 45 }
  },
  {
    id: 2,
    user: "바다아이",
    location: "제주시 협재 해수욕장",
    category: "해변",
    rating: 4.7,
    comment: "비양도가 손에 잡힐 듯 보이는 에메랄드빛 바다는 언제 봐도 감동적이에요. 투명한 물속으로 물고기들이 보일 정도로 깨끗합니다.",
    image: "https://images.unsplash.com/photo-1621274220348-4122ec030991?q=80&w=1000&auto=format&fit=crop",
    likes: 528,
    replies: 84,
    coords: { x: 15, y: 40 }
  },
  {
    id: 3,
    user: "숲속산책",
    location: "제주시 사려니숲길",
    category: "오름/숲",
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
    category: "테마파크",
    rating: 4.6,
    comment: "계절마다 다른 꽃들이 반겨주는 곳이에요. 겨울에 피는 동백꽃은 정말 사진 찍기 최고의 스팟입니다.",
    image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1000&auto=format&fit=crop",
    likes: 156,
    replies: 10,
    coords: { x: 30, y: 75 }
  }
];

const CATEGORIES = ["전체", "해변", "오름/숲", "맛집", "카페", "테마파크"];

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
  return <img src={src} alt={alt} className={className} onError={() => setError(true)} />;
};

function loadKakaoMap(appkey) {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) return resolve(window.kakao);
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=true`;
    script.async = true;
    script.onload = () => {
      if (window.kakao && window.kakao.maps) return resolve(window.kakao);
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (window.kakao && window.kakao.maps) {
          clearInterval(timer);
          return resolve(window.kakao);
        }
        if (attempts > 10) {
          clearInterval(timer);
          return reject(new Error('kakao.maps not available'));
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

  const [savedIds, setSavedIds] = useState(() => {
    const saved = localStorage.getItem('jeju-saved-ids');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('jeju-saved-ids', JSON.stringify(savedIds));
  }, [savedIds]);

  const toggleSave = (id, e) => {
    e.stopPropagation();
    setSavedIds(prev => 
      prev.includes(id) 
        ? prev.filter(savedId => savedId !== id) 
        : [...prev, id]
    );
  };

  const ReviewList = ({ items, emptyMessage }) => (
    <div className="px-4 space-y-6 pt-2">
      {items.length > 0 ? (
        items.map((review) => {
          const isSaved = savedIds.includes(review.id);
          return (
            <div key={review.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="relative h-64">
                <SafeImage src={review.image} alt={review.location} className="w-full h-full object-cover" />
                <button 
                  onClick={(e) => toggleSave(review.id, e)}
                  className={`absolute top-4 right-4 p-2 backdrop-blur-md rounded-full transition-colors ${isSaved ? 'bg-red-50 text-white' : 'bg-black/20 text-white hover:bg-black/40'}`}
                >
                  <Heart className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
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
                      <Heart className="w-4 h-4 mr-1 text-red-400" /> {review.likes + (isSaved ? 1 : 0)}
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
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Heart className="w-12 h-12 mb-4 opacity-10" />
          <p className="text-sm font-medium">{emptyMessage}</p>
        </div>
      )}
    </div>
  );

  const HomeView = () => {
    const filteredReviews = selectedCategory === "전체" 
      ? REVIEWS 
      : REVIEWS.filter(r => r.category === selectedCategory);

    return (
      <div className="pb-24">
        {/* 브랜드 헤더 영역 */}
        <div className="bg-white px-5 pt-6 pb-2 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <img src="/favicon.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#45a494] tracking-tight">고치가게</h1>
              {/* 요청하신 대로 'Jeju Guide'에서 'Jeju Wheel-Trip'으로 수정되었습니다 */}
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jeju Wheel-Trip</p>
            </div>
          </div>
          <button className="p-2 text-gray-300 hover:text-gray-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        {/* Search Header */}
        <div className="sticky top-0 bg-white z-10 p-4 pt-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="어디가 궁금하신가요?" 
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#45a494]/20 text-sm transition-all"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex overflow-x-auto p-4 gap-2 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                selectedCategory === cat ? 'bg-[#45a494] text-white shadow-md shadow-[#45a494]/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="px-4 mb-4 flex justify-between items-end">
          <h2 className="text-lg font-bold text-gray-800">지금 뜨는 고치가게 리뷰</h2>
          <span className="text-xs text-[#45a494] font-bold cursor-pointer">전체보기</span>
        </div>
        
        <ReviewList items={filteredReviews} emptyMessage="해당 카테고리의 리뷰가 없습니다." />
      </div>
    );
  };

  const SavedView = () => {
    const savedReviews = REVIEWS.filter(r => savedIds.includes(r.id));
    return (
      <div className="pb-24">
        <div className="p-6 border-b bg-white sticky top-0 z-10">
          <h2 className="text-2xl font-black text-gray-800">내가 찜한 장소</h2>
          <p className="text-xs text-gray-400 mt-1">총 {savedIds.length}개의 장소를 저장했습니다.</p>
        </div>
        <ReviewList items={savedReviews} emptyMessage="찜한 장소가 아직 없습니다. 하트를 눌러보세요!" />
      </div>
    );
  };

  const MapView = () => {
    const mapRef = useRef(null);
    useEffect(() => {
      const APP_KEY = '0c9feebe33a63b61c3364f8b447bf13a';
      let mounted = true;
      loadKakaoMap(APP_KEY).then((kakao) => {
        if (!mounted || !mapRef.current) return;
        const container = mapRef.current;
        const center = new kakao.maps.LatLng(33.4996, 126.5312);
        const map = new kakao.maps.Map(container, { center, level: 9 });
        REVIEWS.forEach((r, i) => {
          new kakao.maps.Marker({ 
            position: new kakao.maps.LatLng(33.4996 + (i - 1.5) * 0.05, 126.5312 + (i - 1.5) * 0.05),
            map: map 
          });
        });
      }).catch((e) => console.error('Map load failed', e));
      return () => { mounted = false; };
    }, []);

    return (
      <div className="h-full flex flex-col relative">
        <div ref={mapRef} className="flex-1" />
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg border border-white/20 flex gap-2">
            <Search className="w-5 h-5 text-gray-400 m-2" />
            <input type="text" placeholder="고치가게 주변 명소 검색" className="flex-1 bg-transparent text-sm focus:outline-none" />
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
          {activeTab === 'saved' && <SavedView />}
          {activeTab === 'profile' && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-gray-300" />
              </div>
              <h4 className="text-gray-800 font-bold mb-1">고치가게 로그인이 필요합니다</h4>
              <p className="text-sm">나의 여행 기록을 저장하고<br/>친구들과 공유해보세요!</p>
              <button className="mt-6 w-full bg-[#45a494] text-white py-3 rounded-xl font-bold shadow-lg shadow-[#45a494]/20">로그인 / 회원가입</button>
            </div>
          )}
        </main>

        <nav className="fixed bottom-0 w-full max-w-md bg-white/80 backdrop-blur-lg border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-[#45a494] scale-110' : 'text-gray-400'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold">홈</span>
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'map' ? 'text-[#45a494] scale-110' : 'text-gray-400'}`}
          >
            <MapIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold">탐색</span>
          </button>
          <div className="relative -top-5">
            <button className="w-14 h-14 bg-gradient-to-tr from-[#45a494] to-[#68c9b9] rounded-full shadow-lg shadow-[#45a494]/20 flex items-center justify-center text-white transform active:scale-95 transition-transform">
              <span className="text-3xl font-light">+</span>
            </button>
          </div>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'saved' ? 'text-red-500 scale-110' : 'text-gray-400'}`}
          >
            <Heart className={`w-6 h-6 ${activeTab === 'saved' ? 'fill-red-500' : ''}`} />
            <span className="text-[10px] font-bold">찜</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-[#45a494] scale-110' : 'text-gray-400'}`}
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold">마이</span>
          </button>
        </nav>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;