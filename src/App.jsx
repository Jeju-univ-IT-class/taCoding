import React, { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, Star, Heart, MessageSquare, User, Home, MapPin, ChevronRight, ChevronDown, Filter, ImageOff, Plus, Minus, Navigation } from 'lucide-react';
import db from './services/db';

// ============================================================================
// 섹션 1: 상수 및 유틸리티 함수 (컴포넌트 외부)
// ============================================================================
// 디자인 팀이 수정 가능한 영역 (스타일, 레이아웃 관련)
import React, { useState, useMemo } from 'react';
import { Search, Map as MapIcon, Star, Heart, User, Home, MapPin, Plus, XCircle, X, Navigation, Info, MessageSquare } from 'lucide-react';

// 초기 데이터 (검색 및 지도 테스트용)
const INITIAL_REVIEWS = [
  {
    id: 1,
    user: "제주나그네",
    location: "성산일출봉",
    category: "명소",
    rating: 4.9,
    comment: "새벽 공기를 가르며 올라간 보람이 있네요. 휠체어 전용 경사로가 잘 되어 있어 정상 근처까지 접근이 가능합니다.",
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
    rating: 4.7,
    comment: "에메랄드빛 바다를 배경으로 휠체어 산책로가 아주 잘 조성되어 있습니다. 비양도 경치가 일품이에요.",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000",
    likes: 215,
    isLiked: false,
    tags: ["에메랄드", "카페", "산책로"],
    coords: { top: '42%', left: '12%' },
    details: "협재 1주차장 옆 무장애 화장실 이용 권장"
  },
  {
    id: 3,
    user: "시장매니아",
    location: "제주 동문수산시장",
    category: "맛집",
    rating: 4.5,
    comment: "8번 입구 야시장 쪽은 사람이 많지만 길이 잘 닦여 있습니다. 상인회 건물 1층 화장실을 이용하면 편리합니다.",
    image: "https://images.unsplash.com/photo-1562601579-599dec554e8d?q=80&w=800",
    likes: 567,
    isLiked: false,
    tags: ["동문시장", "야시장"],
    coords: { top: '25%', left: '48%' },
    details: "시장 내 통로 평탄화 작업 완료"
  }
];

const CATEGORIES = ["전체", "명소", "바다", "맛집", "카페"];

export default function App() {
  // 상태 관리 (기존 기능 유지)
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [activeTab, setActiveTab] = useState('home'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  
  // 새 리뷰 작성을 위한 상태
  const [newReview, setNewReview] = useState({ 
    location: "", 
    comment: "", 
    category: "명소" 
  });

  // 검색어 하이라이트 컴포넌트
  const HighlightText = ({ text, highlight }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 rounded-sm">{part}</mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // 모든 기능이 통합된 필터링 로직 (검색 + 카테고리 + 찜목록)
  const filteredReviews = useMemo(() => {
    return reviews.filter(item => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        item.location.toLowerCase().includes(query) || 
        item.comment.toLowerCase().includes(query) ||
        item.tags?.some(t => t.toLowerCase().includes(query));
      
      const matchesCategory = selectedCategory === "전체" || item.category === selectedCategory;
      const matchesTab = activeTab === 'favorites' ? item.isLiked : true;
      
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [searchQuery, selectedCategory, activeTab, reviews]);

  // 좋아요 토글
  const toggleLike = (id) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, isLiked: !r.isLiked } : r));
  };

  // 새 리뷰 등록 함수
  const handleAddReview = (e) => {
    e.preventDefault();
    const reviewToAdd = {
      id: Date.now(),
      user: "나의 계정",
      location: newReview.location,
      category: newReview.category,
      rating: 5.0,
      comment: newReview.comment,
      image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000",
      likes: 0,
      isLiked: false,
      tags: ["신규", newReview.category],
      coords: { top: '50%', left: '50%' },
      details: "방금 등록된 따끈따끈한 장소입니다!"
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

// ============================================================================
// 섹션 2: 상태 변수
// ============================================================================
// DB 팀과 디자인 팀 모두 사용하는 상태

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTag, setSelectedTag] = useState('전체');
  const [favorites, setFavorites] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [dbReady, setDbReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ============================================================================
  // 섹션 3: DB 로직 (DB 팀이 관리하는 영역)
  // ============================================================================
  // 이 섹션은 DB 팀이 수정하며, 디자인 팀은 수정하지 않음

  // DB 초기화
  useEffect(() => {
    const initDb = async () => {
      try {
        await db.init();
        setDbReady(true);
      } catch (error) {
        console.error('DB 초기화 실패:', error);
      }
    };
    
    initDb();
  }, []);

  // 리뷰 로드
  useEffect(() => {
    if (!dbReady) return;
    
    const loadData = async () => {
      try {
        const result = await db.reviews.search({ limit: 100 });
        if (result.reviews && result.reviews.length > 0) {
          const formattedReviews = result.reviews.map(r => ({
            id: r.id,
            user: r.author_nickname || '익명',
            location: r.location,
            rating: r.rating,
            comment: r.comment,
            image: r.image_url || '',
            likes: r.likes_count || 0,
            replies: r.replies_count || 0,
            tags: r.tags || [],
            coords: { x: 50, y: 50 }
          }));
          setReviews(formattedReviews);
        }
      } catch (error) {
        console.error('리뷰 로드 실패:', error);
      }
    };
    
    loadData();
  }, [dbReady]);

  // 찜하기 토글 함수 (DB 연동)
  const toggleFavorite = async (id) => {
    if (!currentUser) {
      // 로그인되지 않은 경우 로컬 상태만 업데이트
      setFavorites(prev => 
        prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]
      );
      return;
    }
    
    const currentUserId = currentUser.id;
    
    try {
      const isWishlisted = await db.wishlists.isWishlisted(currentUserId, 'REVIEW', id);
      
      if (isWishlisted) {
        await db.wishlists.remove(currentUserId, 'REVIEW', id);
        setFavorites(prev => prev.filter(favId => favId !== id));
      } else {
        await db.wishlists.add(currentUserId, 'REVIEW', id);
        setFavorites(prev => [...prev, id]);
      }
    } catch (error) {
      console.error('찜하기 실패:', error);
      // 에러 발생 시 로컬 상태만 업데이트
      setFavorites(prev => 
        prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]
      );
    }
  };

  // 찜 목록 로드 (로그인된 사용자만)
  useEffect(() => {
    const loadFavorites = async () => {
      if (!dbReady || !currentUser) return;
      
      try {
        const wishlistIds = await db.wishlists.getWishlistIds(currentUser.id, 'REVIEW');
        setFavorites(wishlistIds);
      } catch (error) {
        console.error('찜 목록 로드 실패:', error);
      }
    };
    
    loadFavorites();
  }, [dbReady, currentUser]);

  // ============================================================================
  // 섹션 4: 데이터 변환 헬퍼 함수
  // ============================================================================
  // DB 데이터를 UI에서 사용할 형식으로 변환

  const tags = ['전체', ...new Set(reviews.flatMap((r) => r.tags || []))];

  // ============================================================================
  // 섹션 5: 내부 컴포넌트 (디자인 팀이 수정 가능한 영역)
  // ============================================================================
  // 이 섹션은 디자인 팀이 주로 수정하며, DB 팀은 데이터 바인딩만 확인
  const HomeView = () => (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          {selectedTag === '전체' ? '지금 뜨는 리뷰' : `${selectedTag} 추천 장소`}
        </h2>
        <span className="text-xs font-bold text-slate-400">전체보기</span>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${selectedTag === tag ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            {tag === '전체' ? tag : `#${tag}`}
          </button>
        ))}
      </div>
      {reviews.filter((r) => selectedTag === '전체' || (r.tags || []).includes(selectedTag)).map((review) => (
        <div key={review.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center text-blue-600 text-xs font-semibold">
              <MapPin className="w-3 h-3 mr-1" />
              {review.location}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleFavorite(review.id); }}
              className="p-1 rounded-full hover:bg-slate-100 transition-colors"
              aria-label={favorites.includes(review.id) ? '찜 해제' : '찜하기'}
            >
              <Heart className={`w-5 h-5 ${favorites.includes(review.id) ? 'fill-red-400 text-red-400' : 'text-gray-300'}`} />
            </button>
          </div>
          <h3 className="font-bold text-lg">{review.user}님의 여행 기록</h3>
          <p className="text-gray-600 text-sm mt-2 line-clamp-3">{review.comment}</p>
          <div className="flex items-center gap-4 mt-4 text-gray-400 text-xs">
            <span className="flex items-center"><Heart className="w-4 h-4 mr-1 text-red-400" /> {review.likes}</span>
            <span className="flex items-center"><MessageSquare className="w-4 h-4 mr-1" /> {review.replies}</span>
            <button className="text-blue-600 font-bold ml-auto">전체보기 <ChevronRight className="w-4 h-4 inline" /></button>
          </div>
        </div>
      ))}
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

    useEffect(() => {
      const APP_KEY = 'cf864dc2f0d80f5ca499d30ea483efd6';
      let mounted = true;
      loadKakaoMap(APP_KEY).then((kakao) => {
        if (!mounted) return;
        const container = mapRef.current;
        if (!container) return;
        kakaoRef.current = kakao;
        const map = new kakao.maps.Map(container, { center: new kakao.maps.LatLng(33.450701, 126.570667), level: 3 });
        mapInstanceRef.current = map;
        requestAnimationFrame(() => { if (map.relayout) map.relayout(); setMapReady(true); });
      }).catch((e) => console.error('Kakao Maps 로드 실패', e));
      return () => {
        mounted = false;
        allMarkersRef.current.forEach((item) => { item.marker.setMap(null); item.labelOverlay.setMap(null); item.infoCardOverlay.setMap(null); });
        allMarkersRef.current = []; mapInstanceRef.current = null; kakaoRef.current = null;
      };
    }, []);

    setReviews([reviewToAdd, ...reviews]); // 목록 맨 앞에 추가
    setNewReview({ location: "", comment: "", category: "명소" });
    setIsModalOpen(false);
    setActiveTab('home'); // 등록 후 홈으로 이동
  };

  // ============================================================================
  // 섹션 6: 메인 JSX 렌더링 (디자인 팀이 수정 가능한 영역)
  // ============================================================================
  // 이 섹션은 디자인 팀이 주로 수정하며, DB 팀은 데이터 바인딩만 확인
  // 주의: {reviews}, {favorites}, {currentUser}, {toggleFavorite} 등은 DB 팀이 제공하는 데이터/함수

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 상단 헤더 */}
      <header className="px-6 py-4 bg-white flex items-center justify-between border-b border-slate-100 shrink-0">
        <h1 className="text-2xl font-black tracking-tight text-blue-600">Jeju Reviews</h1>
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">{currentUser.nickname}</span>
            </div>
          )}
          <button className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
            <Search className="w-5 h-5 text-slate-600" />
          </button>
        </div>
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
    <div className="max-w-md mx-auto h-screen bg-white flex flex-col border-x border-gray-100 relative overflow-hidden shadow-2xl font-sans text-gray-900">
      
      {/* 상단 헤더 & 검색 & 카테고리 */}
      <div className="bg-white p-5 border-b sticky top-0 z-10 shrink-0">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-2xl font-black text-blue-600 tracking-tighter italic uppercase">Jeju Able</h1>
          <div className="flex gap-3 text-gray-400"><User size={20} /></div>
        </div>

        {activeTab === 'home' && (
          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="장소명, 태그, 키워드 검색"
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
            {reviews.filter((r) => selectedTag === '전체' || (r.tags || []).includes(selectedTag)).map((review) => (
            <div key={review.id} className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center text-blue-600 text-xs font-semibold">
                  <MapPin className="w-3 h-3 mr-1" />
                  {review.location}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(review.id); }}
                  className="p-1 rounded-full hover:bg-slate-100 transition-colors"
                  aria-label={favorites.includes(review.id) ? '찜 해제' : '찜하기'}
            
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

      {/* 메인 리스트 영역 */}
      <div className="flex-1 overflow-y-auto p-5 pb-28 no-scrollbar bg-gray-50/50">
        {activeTab === 'map' ? (
          /* 지도 탭 (기능 유지) */
          <div className="relative w-full h-[500px] bg-blue-50 rounded-[40px] border-4 border-white shadow-inner overflow-hidden">
             <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
             {reviews.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedMapItem(item)}
                  className="absolute p-2 bg-white rounded-full shadow-lg border-2 border-blue-500 transition-transform active:scale-90 z-10"
                  style={{ top: item.coords.top, left: item.coords.left }}
                >
                  <MapPin size={20} className="text-blue-500 fill-current" />
                </button>
              </div>
            ) : (
              reviews.filter((r) => favorites.includes(r.id)).map((review) => (
                <div key={review.id} className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center text-blue-600 text-xs font-semibold">
                      <MapPin className="w-3 h-3 mr-1" />
                      {review.location}
             ))}
             {selectedMapItem && (
               <div className="absolute bottom-5 left-5 right-5 bg-white p-4 rounded-3xl shadow-2xl flex gap-4 animate-in slide-in-from-bottom-5">
                 <img src={selectedMapItem.image} className="w-16 h-16 rounded-2xl object-cover" />
                 <div>
                   <h4 className="font-bold">{selectedMapItem.location}</h4>
                   <p className="text-[10px] text-gray-500 line-clamp-1">{selectedMapItem.comment}</p>
                 </div>
                 <X size={16} className="ml-auto text-gray-300" onClick={() => setSelectedMapItem(null)} />
               </div>
             )}
          </div>
        ) : (
          /* 홈/찜목록 리스트 */
          <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
               <h2 className="font-bold text-gray-400 text-sm">
                 {searchQuery ? `'${searchQuery}' 결과` : (activeTab === 'favorites' ? '찜한 장소' : '추천 리뷰')}
               </h2>
               <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">
                 {filteredReviews.length}곳 탐색됨
               </span>
            </div>
            
            {filteredReviews.length > 0 ? filteredReviews.map(item => (
              <div key={item.id} className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative h-48">
                  <img src={item.image} className="w-full h-full object-cover" alt="" />
                  <button 
                    onClick={() => toggleLike(item.id)}
                    className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-2xl text-white"
                  >
                    <Heart size={20} className={item.isLiked ? "fill-red-500 text-red-500" : ""} />
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-extrabold text-xl">
                      <HighlightText text={item.location} highlight={searchQuery} />
                    </h3>
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                      <Star size={12} className="text-yellow-400 fill-current" />
                      <span className="text-[11px] font-bold text-yellow-700">{item.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    <HighlightText text={item.comment} highlight={searchQuery} />
                  </p>
                  <div className="flex gap-2">
                    {item.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-xl">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 text-gray-300">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="p-6">
            {currentUser ? (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{currentUser.nickname}</h3>
                    <p className="text-sm text-gray-500">{currentUser.email || '이메일 없음'}</p>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">사용자 ID</span>
                    <span className="text-sm font-semibold text-gray-900">{currentUser.id}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">이메일</span>
                    <span className="text-sm font-semibold text-gray-900">{currentUser.email || '없음'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">상태</span>
                    <span className={`text-sm font-semibold px-2 py-1 rounded ${
                      currentUser.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {currentUser.status === 'ACTIVE' ? '활성' : currentUser.status}
                    </span>
                  </div>
                  {currentUser.created_at && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">가입일</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {new Date(currentUser.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                </div>
                
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <User className="w-10 h-10 text-gray-300" />
                </div>
                <h4 className="text-gray-800 font-bold mb-1">로그인이 필요합니다</h4>
                <p className="text-sm">나의 여행 기록을 저장하고<br/>친구들과 공유해보세요!</p>
                <button className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold">로그인 / 회원가입</button>
              </div>
            )}
          </div>
        )}
      </main>
      </div>

      {/* 하단 네비게이션 & + 버튼 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t flex justify-around py-4 pb-10 z-20">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-300'}`}>
          <Home size={22} /><span className="text-[10px] font-black tracking-tight">탐색</span>
        </button>
        <button onClick={() => setActiveTab('favorites')} className={`flex flex-col items-center gap-1 ${activeTab === 'favorites' ? 'text-blue-600' : 'text-gray-300'}`}>
          <Heart size={22} className={activeTab === 'favorites' ? "fill-current" : ""} /><span className="text-[10px] font-black tracking-tight">찜목록</span>
        </button>
        
        {/* 중앙 추가 버튼 */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl -mt-8 flex items-center justify-center text-white shadow-xl active:scale-90 transition-all"
        >
          <Plus size={30} strokeWidth={3} />
        </button>
        
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-blue-600' : 'text-gray-300'}`}>
          <MapIcon size={22} /><span className="text-[10px] font-black tracking-tight">지도</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-300'}`}>
          <User size={22} /><span className="text-[10px] font-black tracking-tight">내정보</span>
        </button>
      </div>

      {/* 리뷰 작성 모달 (부드러운 슬라이딩 애니메이션) */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">새로운 리뷰 작성</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-blue-500 uppercase ml-1">Location</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 rounded-2xl p-4 border-2 border-transparent focus:border-blue-500/20 focus:bg-white outline-none font-bold transition-all"
                  placeholder="장소 이름을 입력하세요"
                  value={newReview.location}
                  onChange={(e) => setNewReview({...newReview, location: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-blue-500 uppercase ml-1">Category</label>
                <div className="flex gap-2">
                  {CATEGORIES.slice(1).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewReview({...newReview, category: cat})}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${newReview.category === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-blue-500 uppercase ml-1">Comment</label>
                <textarea 
                  className="w-full bg-gray-50 rounded-2xl p-4 border-2 border-transparent focus:border-blue-500/20 focus:bg-white outline-none h-32 resize-none transition-all"
                  placeholder="무장애 시설(경사로, 전용 화장실 등)은 어땠나요?"
                  value={newReview.comment}
                  onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all mt-4"
              >
                리뷰 등록하기
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
        .animate-in { animation: slide-in-bottom 0.3s ease-out; }
      `}</style>
    </div>
  );
}