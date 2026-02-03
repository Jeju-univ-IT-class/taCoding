import React, { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, Star, Heart, MessageSquare, User, Home, MapPin, ChevronRight, Filter, ImageOff, Plus, Minus, Navigation } from 'lucide-react';

// 제주도 특화 Mock Data (tags 데이터 추가 버전)
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
    tags: ["바다뷰", "일출맛집"],
    coords: { x: 85, y: 45 }
  },
  {
    id: 2,
    user: "바다아이",
    location: "제주시 협재 해수욕장",
    rating: 4.7,
    comment: "비양도가 손에 잡힐 듯 보이는 에메랄드빛 바다는 언제 봐도 감동적이에요. 주변에 예쁜 카페들이 많아 좋습니다.",
    image: "https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?q=80&w=1000&auto=format&fit=crop",
    likes: 215,
    replies: 12,
    tags: ["바다뷰", "주차가능", "반려동물동반"],
    coords: { x: 25, y: 35 }
  },
  {
    id: 3,
    user: "고기러버",
    location: "칠돈가",
    rating: 4.8,
    comment: "제주도 하면 흑돼지, 흑돼지 하면 칠돈가죠! 육즙이 살아있고 직원분들이 직접 구워주셔서 정말 편해요.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000&auto=format&fit=crop",
    likes: 189,
    replies: 28,
    tags: ["주차가능"], // 직접 추가하신 부분 반영!
    coords: { x: 45, y: 40 }
  }
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTag, setSelectedTag] = useState('전체'); // 현재 선택된 필터 태그
  const [favorites, setFavorites] = useState([]); // 찜 목록 상태

  // 찜하기 토글 함수
  const toggleFavorite = (id) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]
    );
  };

  // 화면에 보여줄 태그 리스트
  const tags = ["전체", "바다뷰", "주차가능", "반려동물동반", "일출맛집"];

  // 필터링 로직: 태그 필터 + 검색어 필터를 모두 적용
  const filteredReviews = REVIEWS.filter(review => {
    // 1. 태그 필터 확인
    const matchesTag = selectedTag === '전체' || (review.tags && review.tags.includes(selectedTag));
    
    // 2. 검색어 필터 확인
    const matchesLocation = review.location.includes(searchQuery);
    const matchesTags = review.tags.some(tag => tag.includes(searchQuery));
    const matchesSearch = matchesLocation || matchesTags;
    
    // 3. 두 조건을 모두 만족해야 함
    return matchesTag && (searchQuery === '' || matchesSearch);
  });
  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* 상단 헤더 */}
      <header className="px-6 py-4 bg-white flex items-center justify-between border-b border-slate-100 shrink-0">
        <h1 className="text-2xl font-black tracking-tight text-blue-600">Jeju Reviews</h1>
        <button className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
          <Search className="w-5 h-5 text-slate-600" />
        </button>
      </header>

      {/* 필터 탭 영역 (3단계) */}
      <div className="bg-white px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-100 shrink-0">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all
              ${selectedTag === tag 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {tag === '전체' ? tag : `#${tag}`}
          </button>
        ))}
      </div>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {activeTab === 'home' && (
          <div className="p-4 space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                {selectedTag === '전체' ? '지금 뜨는 리뷰' : `${selectedTag} 추천 장소`}
              </h2>
              <span className="text-xs font-bold text-slate-400">전체보기</span>
            </div>

            {/* 리뷰 카드 목록 (4단계: filteredReviews 사용) */}
            <div className="space-y-4">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 group">
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={review.image} 
                        alt={review.location} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute top-4 left-4 flex gap-2">
                        {review.tags.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <button 
                        onClick={() => toggleFavorite(review.id)}
                        className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm hover:bg-white transition-colors"
                      >
                        <Heart className={`w-5 h-5 ${favorites.includes(review.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                      </button>
                    </div>

                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="text-xs font-black uppercase tracking-wider">{review.location}</span>
                          </div>
                          <h3 className="font-bold text-lg">{review.user}의 일기</h3>
                        </div>
                        <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="ml-1 text-sm font-bold text-yellow-700">{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
                        {review.comment}
                      </p>
                      <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Heart className="w-4 h-4" />
                          <span className="text-xs font-bold">{review.likes + (favorites.includes(review.id) ? 1 : 0)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-xs font-bold">{review.replies}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center space-y-3">
                  <ImageOff className="w-12 h-12 text-slate-200 mx-auto" />
                  <p className="text-slate-400 font-medium">해당 태그의 리뷰가 아직 없어요!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md h-16 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 px-8 flex items-center justify-between z-50">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold">홈</span>
        </button>
        <button 
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'map' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
        >
          <MapIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold">지도</span>
        </button>
        <div className="relative -top-8">
          <button className="w-14 h-14 bg-blue-600 rounded-full shadow-lg shadow-blue-200 flex items-center justify-center text-white transform active:scale-95 transition-transform border-4 border-white">
            <Plus className="w-8 h-8" />
          </button>
        </div>
        <button 
          onClick={() => setActiveTab('favorites')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'favorites' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
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
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
