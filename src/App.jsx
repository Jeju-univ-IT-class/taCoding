import React, { useState, useMemo } from 'react';
import { Search, Map as MapIcon, Star, Heart, MessageSquare, User, Home, MapPin, Plus, XCircle } from 'lucide-react';

// 제주도 리뷰 데이터
const REVIEWS = [
  {
    id: 1,
    user: "제주나그네",
    location: "서귀포 성산일출봉",
    rating: 4.9,
    comment: "새벽 공기를 가르며 올라간 보람이 있네요. 성산일출봉 정상에서 바라보는 일출은 평생 잊지 못할 장관입니다.",
    image: "https://images.unsplash.com/photo-1549693578-d683be217e58?q=80&w=1000",
    likes: 342,
    tags: ["바다뷰", "일출맛집"]
  },
  {
    id: 2,
    user: "바다아이",
    location: "제주시 협재 해수욕장",
    rating: 4.7,
    comment: "비양도가 손에 잡힐 듯 보이는 에메랄드빛 바다는 언제 봐도 감동적이에요. 주변에 예쁜 카페들이 많아 좋습니다.",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000",
    likes: 215,
    tags: ["에메랄드", "카페"]
  },
  {
    id: 3,
    user: "시장구경",
    location: "제주 동문수산시장",
    rating: 4.5,
    comment: "야시장 먹거리가 정말 다양해요. 전복김밥과 흑돼지 강정은 꼭 드셔보세요!",
    image: "https://images.unsplash.com/photo-1562601579-599dec554e8d?q=80&w=1000",
    likes: 567,
    tags: ["동문시장", "먹거리"]
  }
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState(""); // 검색어 상태

  // 검색 로직: 검색어에 포함된 장소나 코멘트만 필터링
  const filteredReviews = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return REVIEWS;
    return REVIEWS.filter(item => 
      item.location.toLowerCase().includes(query) || 
      item.comment.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="max-w-md mx-auto h-screen bg-white flex flex-col border-x border-gray-100 relative overflow-hidden shadow-2xl">
      {/* 상단 검색바 구역 */}
      <div className="bg-white p-5 border-b sticky top-0 z-10">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-bold text-blue-600 tracking-tighter italic">JEJU ABLE</h1>
          <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="relative">
          <input 
            type="text" 
            placeholder="어떤 장소를 찾으시나요?" 
            className="w-full bg-gray-100 rounded-2xl py-3.5 pl-11 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2">
              <XCircle className="w-4 h-4 text-gray-300 fill-current" />
            </button>
          )}
        </div>
      </div>

      {/* 리스트 구역 */}
      <div className="flex-1 overflow-y-auto p-5 pb-24 no-scrollbar">
        <p className="text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-widest">
          {searchQuery ? `검색 결과 ${filteredReviews.length}건` : "추천 리뷰"}
        </p>

        <div className="space-y-6">
          {filteredReviews.length > 0 ? (
            filteredReviews.map(item => (
              <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <img src={item.image} className="w-full h-44 object-cover" alt={item.location} />
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800">{item.location}</h3>
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-lg">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="text-xs font-bold text-yellow-700">{item.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{item.comment}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-gray-400 font-medium">
              찾으시는 결과가 없어요 😢
            </div>
          )}
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t flex justify-around py-4 pb-8">
        <Home className="w-6 h-6 text-blue-600" />
        <MapIcon className="w-6 h-6 text-gray-300" />
        <div className="w-12 h-12 bg-blue-600 rounded-2xl -mt-6 flex items-center justify-center text-white text-2xl font-light shadow-lg shadow-blue-200">+</div>
        <Heart className="w-6 h-6 text-gray-300" />
        <User className="w-6 h-6 text-gray-300" />
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}