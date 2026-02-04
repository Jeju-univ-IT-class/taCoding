import React, { useState, useMemo, useRef } from 'react';
import { Search, Map as MapIcon, Star, Heart, User, Home, MapPin, Plus, XCircle, X, Navigation, Info, Camera, ChevronRight, MessageSquare } from 'lucide-react';

// 초기 데이터 (검색, 지도, 태그 테스트용)
const INITIAL_REVIEWS = [
  {
    id: 1,
    user: "제주나그네",
    location: "성산일출봉",
    category: "명소",
    rating: 5,
    comment: "새벽 공기를 가르며 올라간 보람이 있네요. 휠체어 전용 경사로가 잘 되어 있어 접근이 가능합니다.",
    image: "https://images.unsplash.com/photo-1549693578-d683be217e58?q=80&w=1000",
    likes: 342,
    isLiked: false,
    tags: ["바다뷰", "일출맛집", "경사로완비"],
    coords: { top: '48%', left: '85%' },
    details: "매표소 옆 전용 화장실 완비"
  },
  {
    id: 2,
    user: "바다아이",
    location: "협재 해수욕장",
    category: "바다",
    rating: 4,
    comment: "에메랄드빛 바다를 배경으로 휠체어 산책로가 아주 잘 조성되어 있습니다. 비양도 경치가 일품이에요.",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000",
    likes: 215,
    isLiked: false,
    tags: ["에메랄드", "카페", "산책로"],
    coords: { top: '42%', left: '12%' },
    details: "협재 1주차장 옆 무장애 화장실 이용 권장"
  }
];

const CATEGORIES = ["전체", "명소", "바다", "맛집", "카페", "기타"];

export default function App() {
  // 상태 관리
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [activeTab, setActiveTab] = useState('home'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  
  // 새 리뷰 작성을 위한 상세 상태
  const [newReview, setNewReview] = useState({ 
    location: "", 
    comment: "", 
    category: "명소",
    customCategory: "",
    rating: 5,
    imagePreview: null
  });

  const fileInputRef = useRef(null);

  // 검색어 하이라이트 컴포넌트
  const HighlightText = ({ text, highlight }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 rounded-sm font-bold">{part}</mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // 이미지 선택 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewReview(prev => ({
        ...prev,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  // 모든 기능 통합 필터링 로직
  const filteredReviews = useMemo(() => {
    return reviews.filter(item => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        item.location.toLowerCase().includes(query) || 
        item.comment.toLowerCase().includes(query) ||
        item.tags.some(t => t.toLowerCase().includes(query));
      
      const matchesCategory = selectedCategory === "전체" || item.category === selectedCategory;
      const matchesTab = activeTab === 'favorites' ? item.isLiked : true;
      
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [searchQuery, selectedCategory, activeTab, reviews]);

  // 좋아요 토글
  const toggleLike = (id) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, isLiked: !r.isLiked } : r));
  };

  // 리뷰 등록 실행
  const handleAddReview = (e) => {
    e.preventDefault();
    const finalCategory = newReview.category === "기타" ? newReview.customCategory : newReview.category;
    
    const reviewToAdd = {
      id: Date.now(),
      user: "나의 계정",
      location: newReview.location,
      category: finalCategory || "기타",
      rating: newReview.rating,
      comment: newReview.comment,
      image: newReview.imagePreview || "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000",
      likes: 0,
      isLiked: false,
      tags: ["신규", finalCategory],
      coords: { top: '50%', left: '50%' },
      details: "새로 등록된 장소입니다."
    };

    setReviews([reviewToAdd, ...reviews]);
    setNewReview({ location: "", comment: "", category: "명소", customCategory: "", rating: 5, imagePreview: null });
    setIsModalOpen(false);
    setActiveTab('home');
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-white flex flex-col border-x border-gray-100 relative overflow-hidden shadow-2xl font-sans text-gray-900">
      
      {/* 상단 헤더 & 검색 & 카테고리 */}
      <div className="bg-white p-5 border-b sticky top-0 z-10 shrink-0">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-2xl font-black text-blue-600 tracking-tighter italic uppercase">Jeju Able</h1>
          <div className="flex gap-3 text-gray-400"><User size={22} /></div>
        </div>

        {activeTab === 'home' && (
          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="장소, 키워드, 태그 검색"
                className="w-full bg-gray-100 rounded-2xl py-3.5 pl-11 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searchQuery && (
                <XCircle 
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 cursor-pointer" 
                  onClick={() => setSearchQuery("")}
                />
              )}
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-5 pb-28 no-scrollbar bg-gray-50/50">
        {activeTab === 'map' ? (
          /* 지도 기능 통합 */
          <div className="relative w-full h-[500px] bg-blue-50 rounded-[40px] border-4 border-white shadow-inner overflow-hidden">
             <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
             {reviews.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedMapItem(item)}
                  className="absolute p-2 bg-white rounded-full shadow-lg border-2 border-blue-500 transition-transform active:scale-90 z-10"
                  style={{ top: item.coords.top, left: item.coords.left }}
                >
                  <MapPin size={20} className="text-blue-500 fill-current" />
                </button>
             ))}
             {selectedMapItem && (
               <div className="absolute bottom-5 left-5 right-5 bg-white p-4 rounded-3xl shadow-2xl flex gap-4 animate-in slide-in-from-bottom-5 z-20">
                 <img src={selectedMapItem.image} className="w-16 h-16 rounded-2xl object-cover" />
                 <div className="flex-1">
                   <h4 className="font-bold text-sm">{selectedMapItem.location}</h4>
                   <p className="text-[10px] text-gray-400 line-clamp-1 italic">{selectedMapItem.category}</p>
                 </div>
                 <X size={16} className="text-gray-300" onClick={() => setSelectedMapItem(null)} />
               </div>
             )}
          </div>
        ) : (
          /* 리스트 기능 통합 (검색어 하이라이트 포함) */
          <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
               <h2 className="font-bold text-gray-400 text-xs tracking-widest uppercase">
                 {searchQuery ? 'Search Results' : (activeTab === 'favorites' ? 'My Favorites' : 'Recommend')}
               </h2>
               <span className="text-[10px] font-black text-blue-500 bg-blue-100/50 px-2.5 py-1 rounded-full">
                 {filteredReviews.length} PLACES
               </span>
            </div>
            
            {filteredReviews.length > 0 ? filteredReviews.map(item => (
              <div key={item.id} className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative h-52">
                  <img src={item.image} className="w-full h-full object-cover" alt="" />
                  <button 
                    onClick={() => toggleLike(item.id)}
                    className="absolute top-4 right-4 p-2.5 bg-white/20 backdrop-blur-md rounded-2xl text-white transition-colors"
                  >
                    <Heart size={20} className={item.isLiked ? "fill-red-500 text-red-500" : ""} />
                  </button>
                  <div className="absolute bottom-4 left-4 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5 text-white">
                    <Star size={12} className="text-yellow-400 fill-current" />
                    <span className="text-xs font-black">{item.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-extrabold text-xl mb-2 text-gray-800">
                    <HighlightText text={item.location} highlight={searchQuery} />
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">
                    <HighlightText text={item.comment} highlight={searchQuery} />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-gray-200">
                <Search size={48} className="mx-auto mb-4 text-gray-100" />
                <p className="font-bold text-gray-300">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 바 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t flex justify-around py-4 pb-10 z-20">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-300'}`}>
          <Home size={22} /><span className="text-[10px] font-black tracking-tighter">홈</span>
        </button>
        <button onClick={() => setActiveTab('favorites')} className={`flex flex-col items-center gap-1 ${activeTab === 'favorites' ? 'text-blue-600' : 'text-gray-300'}`}>
          <Heart size={22} className={activeTab === 'favorites' ? "fill-current" : ""} /><span className="text-[10px] font-black tracking-tighter">찜</span>
        </button>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl -mt-8 flex items-center justify-center text-white shadow-xl active:scale-90 transition-all border-4 border-white"
        >
          <Plus size={30} strokeWidth={3} />
        </button>
        
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-blue-600' : 'text-gray-300'}`}>
          <MapIcon size={22} /><span className="text-[10px] font-black tracking-tighter">지도</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-300'}`}>
          <User size={22} /><span className="text-[10px] font-black tracking-tighter">마이</span>
        </button>
      </div>

      {/* 확장된 리뷰 작성 모달 */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-[40px] p-8 shadow-2xl overflow-y-auto max-h-[92%] animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">상세 리뷰 작성</h2>
                <p className="text-[11px] font-bold text-blue-500 mt-1 uppercase tracking-widest">Share your experience</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-gray-50 rounded-full text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-6 pb-6">
              {/* 1. 사진 첨부 */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Photo Attachment</label>
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="w-full h-44 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-100 transition-all active:scale-[0.98]"
                >
                  {newReview.imagePreview ? (
                    <img src={newReview.imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <Camera size={32} className="text-blue-500 mb-2 opacity-40" />
                      <span className="text-xs text-gray-400 font-bold">사진을 추가해 주세요</span>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              </div>

              {/* 2. 별점 선택 */}
              <div className="space-y-2 text-center py-2 bg-gray-50/50 rounded-3xl border border-gray-100">
                <label className="text-[11px] font-black text-gray-400 uppercase">Rating Score</label>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button 
                      key={num} 
                      type="button" 
                      onClick={() => setNewReview({...newReview, rating: num})}
                      className="transition-transform active:scale-75"
                    >
                      <Star size={36} className={num <= newReview.rating ? "text-yellow-400 fill-current" : "text-gray-200"} />
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. 장소명 입력 */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Location Name</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 rounded-2xl p-4 outline-none font-extrabold focus:bg-white border-2 border-transparent focus:border-blue-500/10 transition-all text-gray-800"
                  placeholder="어디를 방문하셨나요?"
                  value={newReview.location}
                  onChange={(e) => setNewReview({...newReview, location: e.target.value})}
                  required
                />
              </div>

              {/* 4. 카테고리 & 기타 */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.slice(1).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewReview({...newReview, category: cat})}
                      className={`py-3 rounded-2xl text-[11px] font-extrabold transition-all border-2 ${newReview.category === cat ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {newReview.category === "기타" && (
                  <input 
                    type="text" 
                    className="w-full bg-blue-50/50 rounded-2xl p-4 mt-2 outline-none text-sm font-bold border-2 border-blue-100 animate-in slide-in-from-top-2"
                    placeholder="직접 입력 (예: 미술관, 오름)"
                    value={newReview.customCategory}
                    onChange={(e) => setNewReview({...newReview, customCategory: e.target.value})}
                    required
                  />
                )}
              </div>

              {/* 5. 후기 내용 */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Your Review</label>
                <textarea 
                  className="w-full bg-gray-50 rounded-2xl p-5 h-32 outline-none resize-none focus:bg-white border-2 border-transparent focus:border-blue-500/10 transition-all text-sm leading-relaxed"
                  placeholder="무장애 시설 정보(경사로, 휠체어 대여 등)와 함께 솔직한 경험을 공유해 주세요."
                  value={newReview.comment}
                  onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
              >
                리뷰 업로드하기
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slide-in-bottom {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-in { animation: slide-in-bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}