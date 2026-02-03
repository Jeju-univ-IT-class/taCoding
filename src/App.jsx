import React, { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, Star, Heart, MessageSquare, User, Home, MapPin, ChevronRight, ChevronDown, Filter, ImageOff, Plus, Minus, Navigation } from 'lucide-react';

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

  const tags = ['전체', ...new Set(REVIEWS.flatMap((r) => r.tags || []))];
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
      {REVIEWS.filter((r) => selectedTag === '전체' || (r.tags || []).includes(selectedTag)).map((review) => (
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

    useEffect(() => {
      if (!mapReady || !mapInstanceRef.current || !kakaoRef.current) return;
      const region = REGIONS.find((r) => r.value === selectedRegion);
      if (!region) return;
      const kakao = kakaoRef.current;
      const map = mapInstanceRef.current;
      allMarkersRef.current.forEach((item) => { item.marker.setMap(null); item.labelOverlay.setMap(null); item.infoCardOverlay.setMap(null); });
      allMarkersRef.current = [];
      if (currentInfoCardRef.current) { currentInfoCardRef.current.setMap(null); currentInfoCardRef.current = null; }
      const customMarkerImage = { url: 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png', size: new kakao.maps.Size(64, 69), offset: new kakao.maps.Point(27, 69) };
      const createMarkerWithLabel = (position, placeInfo) => {
        const markerOption = { position };
        if (customMarkerImage?.url) markerOption.image = new kakao.maps.MarkerImage(customMarkerImage.url, customMarkerImage.size, { offset: customMarkerImage.offset });
        const marker = new kakao.maps.Marker(markerOption);
        marker.setMap(map);
        const overlayContent = '<div style="padding:5px 10px;background:#fff;border:1px solid #ddd;border-radius:4px;font-size:12px;white-space:nowrap;margin-top:8px;">' + placeInfo.name + '</div>';
        const customOverlay = new kakao.maps.CustomOverlay({ position, content: overlayContent, yAnchor: 0 });
        customOverlay.setMap(map);
        const cardHtml = '<div style="min-width:180px;max-width:260px;padding:12px 14px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;font-size:12px;">' + '<div style="font-weight:700;margin-bottom:8px;">' + (placeInfo.name || '-') + '</div>' + (placeInfo.detailInfo ? '<div style="color:#666;margin-bottom:4px;">' + placeInfo.detailInfo + '</div>' : '') + (placeInfo.disabledInfo ? '<div style="color:#666;margin-bottom:4px;">' + placeInfo.disabledInfo + '</div>' : '') + (placeInfo.modifiedAt ? '<div style="color:#888;font-size:11px;">기준일자 ' + placeInfo.modifiedAt + '</div>' : '') + '</div>';
        const infoCardOverlay = new kakao.maps.CustomOverlay({ position, content: cardHtml, yAnchor: 1.2, xAnchor: 0.5 });
        kakao.maps.event.addListener(marker, 'mouseover', () => { if (currentInfoCardRef.current) currentInfoCardRef.current.setMap(null); infoCardOverlay.setMap(map); currentInfoCardRef.current = infoCardOverlay; });
        kakao.maps.event.addListener(marker, 'mouseout', () => { infoCardOverlay.setMap(null); if (currentInfoCardRef.current === infoCardOverlay) currentInfoCardRef.current = null; });
        return { marker, labelOverlay: customOverlay, infoCardOverlay, position };
      };
      fetch(region.file).then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.arrayBuffer(); })
        .then((buffer) => {
          if (!mapInstanceRef.current || !kakaoRef.current) return;
          const text = new TextDecoder('euc-kr').decode(buffer);
          const rows = text.trim().split(/\r?\n/); rows.shift();
          const allMarkers = [];
          rows.forEach((line, index) => {
            if (!line.trim()) return;
            const cols = line.split(',');
            const lat = parseFloat(cols[0]); const lng = parseFloat(cols[1]);
            if (Number.isNaN(lat) || Number.isNaN(lng)) return;
            const position = new kakao.maps.LatLng(lat, lng);
            const placeInfo = { name: (cols[2] || '').trim(), detailInfo: (cols[3] || '').trim(), disabledInfo: (cols[4] || '').trim(), modifiedAt: (cols[7] || '').trim() };
            if (index === 0) { map.setCenter(position); map.setLevel(6); }
            allMarkers.push(createMarkerWithLabel(position, placeInfo));
          });
          allMarkersRef.current = allMarkers;
          if (map.relayout) requestAnimationFrame(() => map.relayout());
        }).catch((err) => console.error('CSV 로딩 실패:', err));
    }, [selectedRegion, mapReady]);

    const currentRegionLabel = REGIONS.find((r) => r.value === selectedRegion)?.label ?? selectedRegion;
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-white border-b z-10 flex flex-col gap-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="주변 명소 검색" className="w-full bg-gray-100 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none" />
            </div>
            <button className="p-2 bg-gray-100 rounded-lg flex-shrink-0"><Filter className="w-4 h-4 text-gray-600" /></button>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setDropdownOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              <span>{currentRegionLabel}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} aria-hidden="true" />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 max-h-48 overflow-y-auto">
                  {REGIONS.map((r) => (
                    <button key={r.value} type="button" onClick={() => { setSelectedRegion(r.value); setDropdownOpen(false); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${selectedRegion === r.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 relative overflow-hidden min-h-[320px]">
          <div ref={mapRef} className="absolute inset-0 w-full" style={{ minHeight: 320 }} />
          <div className="absolute bottom-8 right-4 flex flex-col gap-2">
            <button className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-600"><Navigation className="w-5 h-5" /></button>
            <div className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
              <button className="w-10 h-10 flex items-center justify-center text-gray-600 border-b border-gray-100"><Plus className="w-5 h-5" /></button>
              <button className="w-10 h-10 flex items-center justify-center text-gray-600"><Minus className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
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
            {REVIEWS.filter((r) => selectedTag === '전체' || (r.tags || []).includes(selectedTag)).map((review) => (
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
                >
                  <Heart className={`w-5 h-5 ${favorites.includes(review.id) ? 'fill-red-400 text-red-400' : 'text-gray-300'}`} />
                </button>
              </div>
              <h3 className="font-bold text-lg">{review.user}님의 여행 기록</h3>
              <p className="text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed mt-2">
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
            ))}
          </div>
        )}
        {activeTab === 'map' && <MapView />}
        {activeTab === 'favorites' && (
          <div className="p-4 space-y-6 animate-[fade-in_0.4s_ease-out]">
            <h2 className="text-lg font-bold flex items-center gap-2 px-2">
              <Heart className="w-5 h-5 text-red-400 fill-red-400" />
              찜한 장소 ({favorites.length}개)
            </h2>
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Heart className="w-16 h-16 text-gray-200 mb-4" />
                <p className="font-medium text-gray-700">아직 찜한 장소가 없어요</p>
                <p className="text-sm mt-1">홈에서 마음에 드는 장소의 하트를 눌러 보관해보세요</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm"
                >
                  리뷰 둘러보기
                </button>
              </div>
            ) : (
              REVIEWS.filter((r) => favorites.includes(r.id)).map((review) => (
                <div key={review.id} className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center text-blue-600 text-xs font-semibold">
                      <MapPin className="w-3 h-3 mr-1" />
                      {review.location}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(review.id)}
                      className="p-1 rounded-full hover:bg-slate-100 transition-colors"
                      aria-label="찜 해제"
                    >
                      <Heart className="w-5 h-5 fill-red-400 text-red-400" />
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
              ))
            )}
          </div>
        )}
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

      {/* 하단 탭 메뉴 */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-lg border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20">
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
          <span className="text-[10px] font-bold">탐색</span>
        </button>
        <div className="relative -top-5">
          <button className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-full shadow-lg shadow-blue-200 flex items-center justify-center text-white transform active:scale-95 transition-transform">
            <span className="text-3xl font-light">+</span>
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
      </nav>
    </div>
  );
}
