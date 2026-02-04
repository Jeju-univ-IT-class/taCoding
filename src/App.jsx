import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Map as MapIcon, Star, Heart, MessageSquare, User, Home, MapPin, ChevronRight, ChevronDown, Filter, ImageOff, Plus, Minus, Navigation, LogOut, Mail, Lock, Loader2, Camera, Edit2, Check, X, TrendingUp, TrendingDown, Accessibility, Bath, Car, Wrench, MoveVertical, Layers, CircleDot, Image as ImageIcon } from 'lucide-react';
import db from './services/db';

/**
 * [인증/회원 로직]
 * 기존 MockAuth 인터페이스를 유지하면서 Supabase 기반 `db.members`를 사용합니다.
 */
const MockAuth = {
  // 회원가입 → Supabase Auth + profiles
  async signUp({ email, password, nickname }) {
    try {
      const user = await db.members.create({ email, password, nickname });
      return { data: { user }, error: null };
    } catch (err) {
      console.error('SignUp error:', err);
      if (err?.message === 'EMAIL_EXISTS') {
        return { data: null, error: { message: '이미 가입된 이메일입니다.' } };
      }
      return { data: null, error: { message: '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' } };
    }
  },

  // 로그인 → Supabase Auth
  async signInWithPassword({ email, password }) {
    try {
      const user = await db.members.login({ email, password });
      if (!user) {
        return { data: null, error: { message: '이메일 또는 비밀번호가 일치하지 않습니다.' } };
      }
      return { data: { user }, error: null };
    } catch (err) {
      console.error('SignIn error:', err);
      if (err?.message === 'INVALID_CREDENTIALS') {
        return { data: null, error: { message: '이메일 또는 비밀번호가 일치하지 않습니다.' } };
      }
      return { data: null, error: { message: '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' } };
    }
  },

  // 프로필 수정 → profiles 테이블 업데이트
  async updateProfile(userId, updates) {
    try {
      const user = await db.members.update(userId, {
        nickname: updates.nickname,
        profileImage: updates.profileImage
      });
      return { data: { user }, error: null };
    } catch (err) {
      console.error('Update profile error:', err);
      return { data: null, error: { message: '프로필 수정 중 오류가 발생했습니다.' } };
    }
  },

  // 로그아웃 → Supabase Auth signOut
  async signOut() {
    try {
      await db.members.logout();
      return { error: null };
    } catch (err) {
      console.error('SignOut error:', err);
      return { error: { message: '로그아웃 중 오류가 발생했습니다.' } };
    }
  },

  // 현재 세션 조회 → supabase.auth.getUser + profiles
  async getSession() {
    try {
      const user = await db.members.getCurrentUser();
      return { data: { session: user } };
    } catch (err) {
      console.error('GetSession error:', err);
      return { data: { session: null } };
    }
  }
};

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
    replies: 45,
    tags: ["바다뷰", "일출맛집", "경사로완비"],
    isLiked: false,
    coords: { top: '48%', left: '85%' },
    details: "매표소 옆 전용 화장실 완비",
    regionKey: "35-해녀박물관"
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
    replies: 12,
    tags: ["바다뷰", "주차가능", "반려동물동반"],
    isLiked: false,
    coords: { top: '42%', left: '12%' },
    details: "협재 1주차장 옆 무장애 화장실 이용 권장",
    regionKey: "hyopjae-협재해수욕장"
  }
];

const REVIEWS = INITIAL_REVIEWS;

// 협재 해수욕장 무장애 데이터 경로 (영문 경로 사용 — 한글 경로 시 SPA/서버에서 CSV 대신 HTML이 올 수 있음)
const HYOPJAE_CSV = '/hyopjae/010-2.csv';
const HYOPJAE_IMAGES = '/hyopjae/images/';

// 한글 등 비ASCII 경로를 서버가 찾을 수 있도록 퍼센트 인코딩
function encodePathForUrl(path) {
  if (!path) return path;
  return path.split('/').map((seg, i) => (i === 0 ? seg : (seg ? encodeURIComponent(seg) : ''))).join('/');
}

// 지역별 CSV 목록 (Kakao Map 무장애여행 마커용)
// dbRegion: Supabase places.region 값 (현재는 숫자 코드 문자열 사용: '12','14',...)
const MAP_REGIONS = [
  { value: '12-법환포구',           label: '법환포구',       file: '/region_12.csv', dbRegion: '12' },
  { value: '14-토끼섬과하도포구',   label: '토끼섬과하도포구', file: '/region_14.csv', dbRegion: '14' },
  { value: '35-해녀박물관',         label: '해녀박물관',     file: '/region_35.csv', dbRegion: '35' },
  { value: '49-동문시장',           label: '동문시장',       file: '/region_49.csv', dbRegion: '49' },
  { value: '50-제주도립미술관',     label: '제주도립미술관', file: '/region_50.csv', dbRegion: '50' },
  // 협재 해수욕장은 Supabase places.region = '10' 으로 저장
  { value: 'hyopjae-협재해수욕장', label: '협재 해수욕장', file: HYOPJAE_CSV, format: 'hyopjae', imageBaseUrl: HYOPJAE_IMAGES, dbRegion: '10' },
];

// CSV에서 무장애/장애물 관련 뱃지로 쓸 키워드 (휠체어 이용자 장애물 우선, 그다음 시설)
const BADGE_KEYWORDS = [
  '계단', '오르막', '내리막', '자갈길', '턱', '경사', '비포장', '협소', '울퉁불퉁',
  '경사로', '휠체어', '화장실', '엘리베이터', '주차', '무장애', '슬로프', '리프트', '접근로', '전용화장실', '무장애화장실', '정비',
];

// 접근로 뱃지용 아이콘 (lucide-react에 Route 없음 → MapPin 사용)
const AccessRouteIcon = MapPin;

// 뱃지별 아이콘·색상 (홈 카드 무장애 뱃지 구분용)
const BADGE_STYLES = {
  계단:    { Icon: Layers,         className: 'bg-red-600/10 text-red-700 border-red-600/20' },
  오르막:  { Icon: TrendingUp,     className: 'bg-orange-600/10 text-orange-700 border-orange-600/20' },
  내리막:  { Icon: TrendingDown,   className: 'bg-rose-600/10 text-rose-700 border-rose-600/20' },
  자갈길:  { Icon: CircleDot,     className: 'bg-stone-600/10 text-stone-700 border-stone-600/20' },
  턱:     { Icon: Layers,         className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  경사:   { Icon: TrendingUp,     className: 'bg-amber-600/10 text-amber-700 border-amber-600/20' },
  비포장:  { Icon: CircleDot,     className: 'bg-amber-700/10 text-amber-800 border-amber-700/20' },
  협소:   { Icon: Minus,          className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  울퉁불퉁: { Icon: CircleDot,   className: 'bg-amber-700/10 text-amber-800 border-amber-700/20' },
  경사로:   { Icon: TrendingUp,   className: 'bg-teal-500/10 text-teal-700 border-teal-500/20' },
  휠체어:   { Icon: Accessibility, className: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  화장실:   { Icon: Bath,          className: 'bg-amber-500/10 text-amber-800 border-amber-500/20' },
  엘리베이터: { Icon: MoveVertical, className: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  주차:    { Icon: Car,           className: 'bg-slate-500/10 text-slate-700 border-slate-500/20' },
  무장애:  { Icon: Accessibility, className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' },
  슬로프:  { Icon: TrendingUp,    className: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
  리프트:  { Icon: MoveVertical,  className: 'bg-violet-500/10 text-violet-700 border-violet-500/20' },
  접근로:  { Icon: AccessRouteIcon, className: 'bg-sky-500/10 text-sky-700 border-sky-500/20' },
  전용화장실: { Icon: Bath,        className: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20' },
  무장애화장실: { Icon: Bath,     className: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20' },
  정비:    { Icon: Wrench,        className: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/20' },
};
function getBadgeStyle(badge) {
  return BADGE_STYLES[badge] || { Icon: MapPin, className: 'bg-[#45a494]/10 text-[#45a494] border-[#45a494]/20' };
}

// 뱃지별 지도 핀 색상 (hex) — 휠체어 이용자 장애물은 빨강·주황 계열로 구분
const BADGE_PIN_COLORS = {
  계단: '#b91c1c', 오르막: '#ea580c', 내리막: '#c2410c', 자갈길: '#57534e', 턱: '#dc2626', 경사: '#ca8a04', 비포장: '#a16207', 협소: '#e8590c', 울퉁불퉁: '#92400e',
  경사로: '#0d9488', 휠체어: '#2563eb', 화장실: '#d97706', 엘리베이터: '#7c3aed', 주차: '#475569',
  무장애: '#059669', 슬로프: '#ea580c', 리프트: '#6d28d9', 접근로: '#0284c7', 전용화장실: '#4f46e5',
  무장애화장실: '#0891b2', 정비: '#52525b',
};
const DEFAULT_PIN_COLOR = '#45a494';

function getPrimaryBadge(placeInfo) {
  const text = `${placeInfo.detailInfo || ''} ${placeInfo.disabledInfo || ''}`;
  for (const kw of BADGE_KEYWORDS) {
    if (text.includes(kw)) return kw;
  }
  return null;
}

function getPinColorForBadge(badge) {
  return (badge && BADGE_PIN_COLORS[badge]) || DEFAULT_PIN_COLOR;
}

// 지도 범례용 그룹 구성
const BADGE_LEGEND_GROUPS = [
  {
    title: '이동 시 주의 지형',
    items: ['계단', '오르막', '내리막', '자갈길', '턱', '경사', '비포장', '협소', '울퉁불퉁'],
  },
  {
    title: '편의 시설·무장애 정보',
    items: ['경사로', '휠체어', '화장실', '엘리베이터', '주차', '무장애', '슬로프', '리프트', '접근로', '전용화장실', '무장애화장실', '정비'],
  },
];

// 뱃지 색상의 핀 모양 SVG를 data URL로 생성 (원+삼각형 핀)
// isSelected 가 true이면 대비되는 흰색 외곽선을 추가해 강조
function createPinDataUrl(hexColor, width, height, isSelected = false) {
  const w = width || 48;
  const h = height || 52;
  const r = Math.min(w, h) * 0.32;
  const cx = w / 2;
  const cy = r + 3;
  const tipY = h - 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><filter id="sd" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/></filter></defs>
  <path d="M ${cx} ${tipY} L ${cx - r * 0.95} ${cy + r * 0.3} A ${r} ${r} 0 0 0 ${cx + r * 0.95} ${cy + r * 0.3} Z"
        fill="${hexColor}" ${isSelected ? 'stroke="white" stroke-width="3"' : ''} filter="url(#sd)"/>
  <circle cx="${cx}" cy="${cy - r * 0.15}" r="${r * 0.4}" fill="white" opacity="0.9"
          ${isSelected ? 'stroke="white" stroke-width="2"' : ''}/>
</svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

function parseRegionCsv(buffer, format) {
  const text = new TextDecoder('euc-kr').decode(buffer);
  const rows = text.trim().split(/\r?\n/);
  rows.shift();
  const places = [];
  rows.forEach((line) => {
    if (!line.trim()) return;
    const cols = line.split(',');
    if (format === 'hyopjae') {
      const lat = parseFloat(cols[1]); const lng = parseFloat(cols[2]);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;
      const name = (cols[4] || '').trim();
      const detailInfo = (cols[5] || '').trim();
      const imageFile = (cols[6] || '').trim();
      places.push({ lat, lng, name, detailInfo, disabledInfo: '', imageFile });
    } else {
      const name = (cols[2] || '').trim();
      const detailInfo = (cols[3] || '').trim();
      const disabledInfo = (cols[4] || '').trim();
      places.push({ name, detailInfo, disabledInfo });
    }
  });
  return places;
}

function extractBadgesFromPlaces(places) {
  const set = new Set();
  const combined = places.map((p) => `${p.detailInfo} ${p.disabledInfo}`).join(' ');
  BADGE_KEYWORDS.forEach((kw) => {
    if (combined.includes(kw)) set.add(kw);
  });
  return Array.from(set);
}

async function fetchRegionBadges(regionKey) {
  const region = MAP_REGIONS.find((r) => r.value === regionKey);
  if (!region) return [];
  try {
    const res = await fetch(encodePathForUrl(region.file), { cache: 'no-store' });
    if (!res.ok) return [];
    const buffer = await res.arrayBuffer();
    const places = parseRegionCsv(buffer, region.format);
    return extractBadgesFromPlaces(places);
  } catch {
    return [];
  }
}

function useRegionBadges() {
  const [regionBadges, setRegionBadges] = useState({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      MAP_REGIONS.map(async (r) => {
        const badges = await fetchRegionBadges(r.value);
        return { key: r.value, badges };
      })
    ).then((results) => {
      if (cancelled) return;
      const map = {};
      results.forEach(({ key, badges }) => { map[key] = badges; });
      setRegionBadges(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  const getBadgesForRegion = (regionKey) => (regionKey ? (regionBadges[regionKey] || []) : []);
  return { getBadgesForRegion, loading };
}

function loadKakaoMap(appkey) {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps?.LatLng) return resolve(window.kakao);
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => resolve(window.kakao));
      } else {
        resolve(window.kakao);
      }
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

const SafeImage = ({ src, alt, className }) => {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div className={`${className} bg-gray-100 flex flex-col items-center justify-center text-gray-400 gap-2`}>
        <ImageOff className="w-10 h-10 opacity-50" />
        <span className="text-[10px]">이미지 없음</span>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setError(true)} />;
};

// --- 서브 뷰 컴포넌트 ---

const HomeView = ({ searchQuery, setSearchQuery, selectedTag, setSelectedTag, tags, filteredReviews, favorites, toggleFavorite, getBadgesForRegion }) => (
  <div className="pb-24 animate-[fade-in_0.4s_ease-out]">
    <header className="sticky top-0 bg-white z-20 px-4 pt-8 pb-3 shadow-sm border-b border-gray-50 flex items-center gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0">
          <img src="/favicon.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-black text-[#45a494] tracking-tight leading-none">고치가게</h1>
          <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 whitespace-nowrap">Jeju Wheel-Trip</p>
        </div>
      </div>
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          type="text"
          placeholder="어디가 궁금하신가요?"
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[#45a494]/20 text-xs transition-all shadow-sm"
        />
      </div>
    </header>

    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-4 shrink-0 bg-white">
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => setSelectedTag(tag)}
          className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all
            ${selectedTag === tag ? 'bg-[#45a494] text-white shadow-lg shadow-[#45a494]/20 scale-105' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          {tag === '전체' ? tag : `#${tag}`}
        </button>
      ))}
    </div>

    <div className="p-4 space-y-6">
      {filteredReviews.length > 0 ? (
        filteredReviews.map((review) => (
          <div key={review.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="relative h-64">
              <SafeImage src={review.image} alt={review.location} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 flex gap-2">
                {(review.tags || []).map(tag => (
                  <span key={tag} className="px-3 py-1 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold rounded-full">#{tag}</span>
                ))}
              </div>
              <button 
                onClick={(e) => toggleFavorite(review.id, e)}
                className={`absolute top-4 right-4 p-2 backdrop-blur-md rounded-full transition-colors ${favorites.includes(review.id) ? 'bg-red-50 text-white shadow-sm' : 'bg-black/20 text-white'}`}
              >
                <Heart className={`w-5 h-5 ${favorites.includes(review.id) ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                <Star className="inline w-3 h-3 text-yellow-500 fill-yellow-500 mr-1" /> {review.rating || 5.0}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center text-[#45a494] text-xs font-semibold mb-1"><MapPin className="w-3 h-3 mr-1" />{review.location}</div>
              {review.regionKey && getBadgesForRegion && (() => {
                const badges = getBadgesForRegion(review.regionKey);
                if (badges.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {badges.map((badge) => {
                      const { Icon, className } = getBadgeStyle(badge);
                      return (
                        <span key={badge} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md border ${className}`}>
                          <Icon className="w-3 h-3 shrink-0" aria-hidden />
                          {badge}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
              <h3 className="font-bold text-lg">{review.user}님의 여행 기록</h3>
              <p className="text-gray-600 text-sm line-clamp-2 mt-2 leading-relaxed">{review.comment}</p>
            </div>
          </div>
        ))
      ) : (
        <div className="py-20 text-center text-gray-300 italic">검색 결과가 없습니다.</div>
      )}
    </div>
  </div>
);

const CreateReviewView = ({ onSave, onCancel }) => {
  const [location, setLocation] = useState("");
  const [comment, setComment] = useState("");
  const [image, setImage] = useState("");
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full animate-[fade-in_0.4s_ease-out] bg-white">
      <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
        <button onClick={onCancel} className="text-gray-400 p-2"><X /></button>
        <h2 className="text-lg font-black text-[#45a494]">새 리뷰 작성</h2>
        <button 
          onClick={() => onSave({ location, comment, image })}
          className="text-[#45a494] font-bold px-4 py-2 active:scale-95 transition-transform"
          disabled={!location || !comment}
        >
          등록
        </button>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto no-scrollbar pb-32">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-video bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
        >
          {image ? (
            <img src={image} className="w-full h-full object-cover" alt="Selected" />
          ) : (
            <>
              <ImageIcon className="text-gray-300 mb-2" size={40} />
              <p className="text-xs text-gray-400 font-bold">장소 사진을 추가해주세요</p>
            </>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
        </div>

        <div className="space-y-4">
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" placeholder="장소 명칭 (예: 성산일출봉)" 
              value={location} onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#45a494]/20"
            />
          </div>
          <textarea 
            placeholder="이곳에서의 여행은 어떠셨나요? 휠체어 접근성이나 팁을 공유해주세요."
            rows="6" value={comment} onChange={(e) => setComment(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#45a494]/20 resize-none"
          />
        </div>
      </div>
    </div>
  );
};

const AuthView = ({ isSignUpMode, setIsSignUpMode, email, setEmail, password, setPassword, nickname, setNickname, authLoading, authMessage, handleAuth }) => (
  <div className="p-8 flex flex-col h-full animate-[fade-in_0.4s_ease-out]">
    <div className="flex flex-col items-center mb-10 mt-8">
      <div className="w-20 h-20 rounded-3xl overflow-hidden bg-white mb-4 shrink-0">
        <img src="/favicon.png" alt="Logo" className="w-full h-full object-cover" />
      </div>
      <h2 className="text-2xl font-black text-[#45a494]">고치가게</h2>
      <p className="text-gray-400 text-xs mt-1 font-bold tracking-widest uppercase">{isSignUpMode ? "Join Us" : "Welcome Back"}</p>
    </div>
    <form onSubmit={handleAuth} className="space-y-4">
      {isSignUpMode && (
        <div className="relative">
          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#45a494]/20 text-sm transition-all" />
        </div>
      )}
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#45a494]/20 text-sm transition-all" />
      </div>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#45a494]/20 text-sm transition-all" />
      </div>
      {authMessage.text && <div className={`p-3 rounded-xl text-[11px] font-bold text-center ${authMessage.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{authMessage.text}</div>}
      <button type="submit" disabled={authLoading} className="w-full bg-[#45a494] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#45a494]/20 flex items-center justify-center transition-all active:scale-95">{authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUpMode ? "회원가입 하기" : "로그인")}</button>
    </form>
    <button onClick={() => setIsSignUpMode(!isSignUpMode)} className="mt-6 w-full text-sm font-bold text-gray-400 hover:text-[#45a494] transition-colors">{isSignUpMode ? "이미 계정이 있으신가요? 로그인" : "처음이신가요? 회원가입 하기"}</button>
  </div>
);

const ProfileView = ({ user, handleLogout, favoritesCount, onUpdateProfile, myReviews, onDeleteReview, onUpdateReview, setActiveTab }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState('main'); 
  const [newNickname, setNewNickname] = useState(user?.nickname || "");
  const [tempProfileImage, setTempProfileImage] = useState(user?.profileImage || "");
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editComment, setEditComment] = useState("");
  const fileInputRef = useRef(null);

  const handleAvatarClick = () => {
    if (!fileInputRef.current) return;
    // 편집 모드가 아니면 편집 모드로 전환 후 파일 선택창 오픈
    if (!isEditing) {
      setIsEditing(true);
      setNewNickname(user?.nickname || "");
      setTempProfileImage(user?.profileImage || "");
      setTimeout(() => fileInputRef.current?.click(), 0);
    } else {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempProfileImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    await onUpdateProfile({ nickname: newNickname, profileImage: tempProfileImage });
    setIsEditing(false);
  };

  if (viewMode === 'reviews') {
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-[fade-in_0.4s_ease-out]">
        <div className="p-6 bg-white border-b sticky top-0 z-10 flex items-center gap-4">
          <button onClick={() => setViewMode('main')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
          <h2 className="text-xl font-black text-gray-800">작성한 리뷰 ({myReviews.length})</h2>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto pb-20 no-scrollbar">
          {myReviews.length === 0 ? (
            <div className="py-20 text-center text-gray-300 italic">작성한 리뷰가 없습니다.</div>
          ) : (
            myReviews.map(review => (
              <div key={review.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div><h4 className="font-bold text-sm text-[#45a494]">{review.location}</h4></div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingReviewId(review.id); setEditComment(review.comment); }} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => onDeleteReview(review.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
                {editingReviewId === review.id ? (
                  <div className="space-y-2">
                    <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#45a494]/20" rows="3" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingReviewId(null)} className="flex-1 py-2 bg-slate-100 rounded-lg text-xs font-bold">취소</button>
                      <button onClick={() => { onUpdateReview(review.id, { comment: editComment }); setEditingReviewId(null); }} className="flex-1 py-2 bg-[#45a494] text-white rounded-lg text-xs font-bold shadow-sm">저장</button>
                    </div>
                  </div>
                ) : (<p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>)}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full animate-[fade-in_0.4s_ease-out] bg-white">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-black text-[#45a494] tracking-tight">My page</h2>
        <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
      </div>
      <div className="flex flex-col items-center">
        <div className="relative" onClick={handleAvatarClick}>
          <div className={`w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-xl overflow-hidden ${isEditing ? 'cursor-pointer' : ''}`}>
            {tempProfileImage ? <img src={tempProfileImage} alt="Profile" className="w-full h-full object-cover" /> : <User size={48} className="text-gray-300" />}
          </div>
          {isEditing && <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center mb-4 cursor-pointer"><Camera size={24} className="text-white opacity-90" /></div>}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>
        {isEditing ? (
          <div className="w-full space-y-4 px-4 mt-2 text-center">
            <input type="text" value={newNickname} onChange={(e) => setNewNickname(e.target.value)} className="w-full border-b-2 border-[#45a494] text-center font-black text-xl py-1 focus:outline-none" placeholder="새 닉네임" />
            <p className="text-[10px] text-gray-400">사진을 클릭하여 사진첩에서 선택할 수 있습니다.</p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setIsEditing(false); setNewNickname(user?.nickname || ""); setTempProfileImage(user?.profileImage || ""); }} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95">취소</button>
              <button onClick={handleSave} className="flex-[2] bg-[#45a494] text-white py-3 rounded-2xl text-xs font-bold shadow-lg shadow-[#45a494]/20 transition-all active:scale-95">변경 내용 저장</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-gray-800">{user?.nickname}</h3>
              <button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-300 hover:text-[#45a494] transition-colors"><Edit2 size={14} /></button>
            </div>
            <p className="text-gray-400 text-xs mb-8">{user?.email}</p>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 w-full mt-8">
        {/* '찜한 목록' 클릭 시 favorites 탭으로 이동하도록 버튼으로 수정 */}
        <button 
          onClick={() => setActiveTab('favorites')}
          className="bg-gray-50 p-5 rounded-3xl border border-gray-100 text-center active:bg-slate-100 transition-colors"
        >
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">찜한 목록</p>
          <p className="text-2xl font-black text-[#45a494]">{favoritesCount}</p>
        </button>
        <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">작성 리뷰</p>
          <p className="text-2xl font-black text-slate-600">{myReviews.length}</p>
        </div>
      </div>

      <div className="mt-auto pt-10 pb-4 text-center">
        <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[2px]">GochiGage Account System</p>
      </div>
    </div>
  );
};

// 이 레벨보다 축소(숫자 큼)되면 핀 아래 명칭 숨김 (1~14, 기본 8)
const LABEL_VISIBLE_MAX_LEVEL = 8;
// 이 레벨보다 더 축소되면 핀 자체도 숨김 (예: 13 → 14에서 숨김)
const PIN_VISIBLE_MAX_LEVEL = 13;

// 줌 레벨별 핀 크기 (레벨 1 = 가장 확대 = 조금 작게, 레벨 14 = 가장 축소 = 조금 크게)
function getMarkerSizeByLevel(level) {
  const l = Math.max(1, Math.min(14, Number(level) || 6));
  const t = (l - 1) / 13; // 0 at level 1, 1 at level 14
  const width = Math.round(48 + t * 16);   // 48 ~ 64 (축소 레벨에서 더 작게)
  const height = Math.round(52 + t * 17);   // 52 ~ 69
  const offsetX = Math.round(width * 0.5);
  const offsetY = height;
  return { width, height, offsetX, offsetY };
}

// Kakao Maps + 무장애여행 CSV 연동 지도 뷰 (맵 탭용)
function MapViewKakao() {
  const mapRef = useRef(null);
  const allMarkersRef = useRef([]);
  const currentInfoCardRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const kakaoRef = useRef(null);
  const currentLocationMarkerRef = useRef(null);
  const zoomListenerRef = useRef(null);
  const [selectedRegion, setSelectedRegion] = useState(MAP_REGIONS[0].value);
  const [mapReady, setMapReady] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [showLegend, setShowLegend] = useState(false);

  const handleZoomIn = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const level = map.getLevel();
    map.setLevel(Math.max(1, level - 1), { animate: true });
  };

  const handleZoomOut = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const level = map.getLevel();
    map.setLevel(Math.min(14, level + 1), { animate: true });
  };

  const handleCurrentLocation = () => {
    const map = mapInstanceRef.current;
    const kakao = kakaoRef.current;
    if (!map || !kakao) return;
    if (!navigator.geolocation) {
      setLocationError('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const loc = new kakao.maps.LatLng(lat, lng);
        map.setCenter(loc);
        map.setLevel(3, { animate: true });
        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setMap(null);
        }
        const marker = new kakao.maps.Marker({
          position: loc,
          map,
        });
        currentLocationMarkerRef.current = marker;
      },
      () => {
        setLocationError('위치를 가져올 수 없습니다. 권한을 확인해 주세요.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

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

      // 지도를 클릭하면 선택된 핀 강조/카드 상태 초기화
      kakao.maps.event.addListener(map, 'click', () => {
        if (currentInfoCardRef.current) {
          currentInfoCardRef.current.setMap(null);
          currentInfoCardRef.current = null;
        }
        if (selectedMarkerRef.current) {
          // 지도 클릭 시에는 zIndex 및 선택 상태만 초기화 (아이콘은 다음 줌 변경 시 갱신)
          const prevMarker = selectedMarkerRef.current;
          const prevItem = allMarkersRef.current.find((it) => it.marker === prevMarker);
          prevMarker.setZIndex(0);
          if (prevItem) {
            prevItem.isSelected = false;
          }
          selectedMarkerRef.current = null;
        }
      });

      requestAnimationFrame(() => { if (map.relayout) map.relayout(); setMapReady(true); });
    }).catch((e) => console.error('Kakao Maps 로드 실패', e));
    return () => {
      mounted = false;
      allMarkersRef.current.forEach((item) => { item.marker.setMap(null); item.labelOverlay.setMap(null); item.infoCardOverlay.setMap(null); });
      allMarkersRef.current = [];
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setMap(null);
        currentLocationMarkerRef.current = null;
      }
      mapInstanceRef.current = null;
      kakaoRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !kakaoRef.current) return;
    const region = MAP_REGIONS.find((r) => r.value === selectedRegion);
    if (!region) return;
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (zoomListenerRef.current) {
      try { zoomListenerRef.current(); } catch (_) { /* 리스너 제거 실패 시 무시 */ }
      zoomListenerRef.current = null;
    }
    allMarkersRef.current.forEach((item) => { item.marker.setMap(null); item.labelOverlay.setMap(null); item.infoCardOverlay.setMap(null); });
    allMarkersRef.current = [];
    if (currentInfoCardRef.current) { currentInfoCardRef.current.setMap(null); currentInfoCardRef.current = null; }
    const imageBaseUrl = region.imageBaseUrl || '';
    const createMarkerImageForLevel = (level, hexColor, isSelected = false) => {
      const s = getMarkerSizeByLevel(level);
      const url = createPinDataUrl(hexColor || DEFAULT_PIN_COLOR, s.width, s.height, isSelected);
      return new kakao.maps.MarkerImage(url, new kakao.maps.Size(s.width, s.height), { offset: new kakao.maps.Point(s.offsetX, s.offsetY) });
    };
    const createMarkerWithLabel = (position, placeInfo) => {
      const primaryBadge = getPrimaryBadge(placeInfo);
      const pinColor = getPinColorForBadge(primaryBadge);
      const markerOption = { position };
      markerOption.image = createMarkerImageForLevel(map.getLevel(), pinColor);
      const marker = new kakao.maps.Marker(markerOption);
      marker.setMap(map.getLevel() <= PIN_VISIBLE_MAX_LEVEL ? map : null);
      const overlayContent = '<div style="padding:5px 10px;background:#fff;border:1px solid #ddd;border-radius:4px;font-size:12px;white-space:nowrap;margin-top:8px;">' + placeInfo.name + '</div>';
      const customOverlay = new kakao.maps.CustomOverlay({ position, content: overlayContent, yAnchor: 0 });
      // 기본 상태에서는 명칭 라벨을 숨기고, 호버 시에만 노출
      customOverlay.setMap(null);
      let cardBody = '<div style="font-weight:700;margin-bottom:8px;">' + (placeInfo.name || '-') + '</div>';
      if (placeInfo.imageFile && imageBaseUrl) {
        cardBody += '<img src="' + encodePathForUrl(imageBaseUrl + placeInfo.imageFile) + '" alt="" style="width:100%;max-width:200px;border-radius:6px;margin-bottom:6px;display:block;" />';
      }
      cardBody += (placeInfo.detailInfo ? '<div style="color:#666;margin-bottom:4px;">' + placeInfo.detailInfo + '</div>' : '') + (placeInfo.disabledInfo ? '<div style="color:#666;margin-bottom:4px;">' + placeInfo.disabledInfo + '</div>' : '') + (placeInfo.modifiedAt ? '<div style="color:#888;font-size:11px;">기준일자 ' + placeInfo.modifiedAt + '</div>' : '');
      const cardHtml = '<div style="min-width:180px;max-width:260px;padding:12px 14px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;font-size:12px;line-height:1.5;white-space:pre-line;word-break:keep-all;">' + cardBody + '</div>';
      const infoCardOverlay = new kakao.maps.CustomOverlay({ position, content: cardHtml, yAnchor: 1.2, xAnchor: 0.5 });

      // 호버 시 명칭만 표시
      kakao.maps.event.addListener(marker, 'mouseover', () => {
        if (map.getLevel() <= LABEL_VISIBLE_MAX_LEVEL) {
          customOverlay.setMap(map);
        }
      });
      kakao.maps.event.addListener(marker, 'mouseout', () => {
        customOverlay.setMap(null);
      });

      // 클릭 시 해당 핀 강조 + 포커싱 + 세부 카드 표시
      kakao.maps.event.addListener(marker, 'click', () => {
        // 이전 선택 카드 제거
        if (currentInfoCardRef.current) {
          currentInfoCardRef.current.setMap(null);
        }
        infoCardOverlay.setMap(map);
        currentInfoCardRef.current = infoCardOverlay;

        // 이전 선택 핀 강조 해제
        if (selectedMarkerRef.current) {
          const prevMarker = selectedMarkerRef.current;
          const prevItem = allMarkersRef.current.find((it) => it.marker === prevMarker);
          prevMarker.setZIndex(0);
          if (prevItem) {
            const baseColorPrev = getPinColorForBadge(prevItem.primaryBadge);
            prevMarker.setImage(createMarkerImageForLevel(map.getLevel(), baseColorPrev, false));
            prevItem.isSelected = false;
          }
        }

        // 현재 선택 핀 강조 (테두리 있는 아이콘 + zIndex)
        marker.setZIndex(10);
        const baseColor = getPinColorForBadge(primaryBadge);
        marker.setImage(createMarkerImageForLevel(map.getLevel(), baseColor, true));
        selectedMarkerRef.current = marker;
        const thisItem = allMarkersRef.current.find((it) => it.marker === marker);
        if (thisItem) thisItem.isSelected = true;

        // 선택한 핀으로 지도 포커싱
        map.panTo(position);
        // 너무 과한 확대는 피하고, 조작감을 위해 레벨 3까지만 자동 확대
        const currentLevel = map.getLevel();
        if (currentLevel > 3) {
          map.setLevel(3);
        }
      });
      return { marker, labelOverlay: customOverlay, infoCardOverlay, position, primaryBadge, isSelected: false };
    };
    // Supabase places 테이블에서 선택된 region의 장소들을 불러와 마커 생성
    let cancelled = false;
    (async () => {
      try {
        const dbRegion = region.dbRegion || selectedRegion;
        const placeRows = await db.places.findByRegion(dbRegion);
        if (cancelled || !mapInstanceRef.current || !kakaoRef.current) return;

        if (!Array.isArray(placeRows) || placeRows.length === 0) {
          console.warn('선택된 지역에 Supabase places 데이터가 없습니다:', selectedRegion, dbRegion);
          return;
        }

        const allMarkers = [];
        placeRows.forEach((p, index) => {
          if (p.latitude == null || p.longitude == null) return;
          const lat = Number(p.latitude);
          const lng = Number(p.longitude);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return;
          const position = new kakao.maps.LatLng(lat, lng);
          const placeInfo = {
            name: p.name || '',
            detailInfo: p.detail_info || '',
            disabledInfo: p.disabled_info || '',
            modifiedAt: p.modified_at || '',
            imageFile: null,
          };
          if (index === 0) {
            map.setCenter(position);
            map.setLevel(6);
          }
          try {
            allMarkers.push(createMarkerWithLabel(position, placeInfo));
          } catch (e) {
            console.warn('마커 생성 스킵:', position, e);
          }
        });
        allMarkersRef.current = allMarkers;

        const updateMarkersSize = () => {
          const level = map.getLevel();
          const showLabels = level <= LABEL_VISIBLE_MAX_LEVEL;
          const showPins = level <= PIN_VISIBLE_MAX_LEVEL;
          allMarkersRef.current.forEach((item) => {
            const color = getPinColorForBadge(item.primaryBadge);
            item.marker.setImage(createMarkerImageForLevel(level, color, !!item.isSelected));
            item.marker.setMap(showPins ? map : null);
            // 라벨은 기본 상태에서는 숨기고, 호버 이벤트에서만 제어
            if (!showPins) {
              item.labelOverlay.setMap(null);
            }
          });
        };

        const listenerId = kakao.maps.event.addListener(map, 'zoom_changed', updateMarkersSize);
        zoomListenerRef.current = () => {
          const k = kakaoRef.current;
          if (k?.maps?.event?.removeListener) k.maps.event.removeListener(listenerId);
        };

        if (map.relayout) requestAnimationFrame(() => map.relayout());
      } catch (err) {
        console.error('Supabase places 로딩 실패:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRegion, mapReady]);

  const currentRegionLabel = MAP_REGIONS.find((r) => r.value === selectedRegion)?.label ?? selectedRegion;
  return (
    <div className="h-full flex flex-col min-h-[420px]">
      <div className="p-4 bg-white border-b z-10 flex flex-col gap-2">
        <div className="flex justify-between items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="주변 명소 검색" className="w-full bg-gray-100 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#45a494]/20" />
          </div>
          <button type="button" className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
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
                {MAP_REGIONS.map((r) => (
                  <button key={r.value} type="button" onClick={() => { setSelectedRegion(r.value); setDropdownOpen(false); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${selectedRegion === r.value ? 'bg-[#45a494]/10 text-[#45a494] font-medium' : 'text-gray-700'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden min-h-[320px] bg-gray-50 isolate">
        <div ref={mapRef} className="absolute inset-0 w-full z-0" style={{ minHeight: 320 }} />

        {/* 범례 토글 버튼 (좌상단) */}
        <button
          type="button"
          onClick={() => setShowLegend((v) => !v)}
          className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-white/95 border border-gray-200 shadow-sm text-[11px] font-bold text-gray-700 flex items-center gap-1.5 pointer-events-auto"
        >
          <Layers className="w-3 h-3 text-[#45a494]" />
          <span>범례</span>
          <ChevronDown
            className={`w-3 h-3 text-gray-400 transition-transform ${showLegend ? 'rotate-180' : ''}`}
          />
        </button>

        {/* 핀 색상 범례 패널 */}
        {showLegend && (
          <div className="absolute bottom-4 left-4 z-10 max-w-[70%] pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md px-3 py-2.5 text-[10px] text-gray-700">
              <p className="font-bold text-[11px] mb-1.5 flex items-center gap-1">
                <Layers className="w-3 h-3 text-gray-400" />
                색상별 의미
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {BADGE_LEGEND_GROUPS.map((group) => (
                  <div key={group.title} className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-gray-400 font-semibold">{group.title}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-gray-100 bg-gray-50/60"
                        >
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: BADGE_PIN_COLORS[badge] || DEFAULT_PIN_COLOR }}
                          />
                          <span className="text-[9px] font-medium whitespace-nowrap">{badge}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-8 right-4 flex flex-col gap-2 z-10 pointer-events-auto" aria-label="지도 컨트롤">
          <button type="button" onClick={handleCurrentLocation} className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-transform" aria-label="현재 위치로 이동">
            <Navigation className="w-5 h-5" />
          </button>
          <div className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
            <button type="button" onClick={handleZoomIn} className="w-10 h-10 flex items-center justify-center text-gray-600 border-b border-gray-100 hover:bg-gray-50 active:scale-95 transition-transform" aria-label="지도 확대">
              <Plus className="w-5 h-5" />
            </button>
            <button type="button" onClick={handleZoomOut} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-transform" aria-label="지도 축소">
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>
        {locationError && (
          <div className="absolute bottom-24 left-4 right-14 z-10 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 shadow-sm">
            {locationError}
          </div>
        )}
      </div>
    </div>
  );
}

// (내부용) 리뷰/맵/폼이 있는 단순 App - 상단 MockAuth/고치가게 App과 별도 구조용
const CATEGORIES = ["전체", "명소", "바다", "맛집", "카페", "기타"];

function SimpleApp() {
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [activeTab, setActiveTab] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  const [newReview, setNewReview] = useState({
    location: "",
    comment: "",
    category: "명소",
    customCategory: "",
    rating: 5,
    imagePreview: null
  });
  const fileInputRef = useRef(null);

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
          <div className="relative w-full h-[500px] bg-blue-50 rounded-[40px] border-4 border-white shadow-inner overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            {reviews.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedMapItem(item)}
                className="absolute p-2 bg-white rounded-full shadow-lg border-2 border-blue-500 transition-transform active:scale-90 z-10"
                style={{ top: item.coords?.top ?? '50%', left: item.coords?.left ?? '50%' }}
              >
                <MapPin size={20} className="text-blue-500 fill-current" />
              </button>
            ))}
            {selectedMapItem && (
              <div className="absolute bottom-5 left-5 right-5 bg-white p-4 rounded-3xl shadow-2xl flex gap-4 animate-in slide-in-from-bottom-5 z-20">
                <img src={selectedMapItem.image} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm">{selectedMapItem.location}</h4>
                  <p className="text-[10px] text-gray-400 line-clamp-1 italic">{selectedMapItem.category}</p>
                </div>
                <button type="button" onClick={() => setSelectedMapItem(null)} className="text-gray-300">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <h2 className="font-bold text-gray-400 text-xs tracking-widest uppercase">
                {searchQuery ? 'Search Results' : (activeTab === 'favorites' ? 'My Favorites' : 'Recommend')}
              </h2>
              <span className="text-[10px] font-black text-blue-500 bg-blue-100/50 px-2.5 py-1 rounded-full">
                {filteredReviews.length} PLACES
              </span>
            </div>
            {filteredReviews.length > 0 ? filteredReviews.map((item) => (
              <div key={item.id} className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative h-52">
                  <img src={item.image} className="w-full h-full object-cover" alt="" />
                  <button
                    type="button"
                    onClick={() => toggleLike(item.id)}
                    className="absolute top-4 right-4 p-2.5 bg-white/20 backdrop-blur-md rounded-2xl text-white transition-colors"
                  >
                    <Heart size={20} className={item.isLiked ? 'fill-red-500 text-red-500' : ''} />
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
                    {(item.tags || []).map((tag) => (
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
        <button type="button" onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-300'}`}>
          <Home size={22} /><span className="text-[10px] font-black tracking-tighter">홈</span>
        </button>
        <button onClick={() => setViewMode('reviews')} className="bg-gray-50 p-5 rounded-3xl border border-gray-100 text-center active:bg-slate-100 transition-colors">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">작성 리뷰</p>
          <p className="text-2xl font-black text-[#45a494]">{myReviews.length}</p>
        </button>
      </div>
    </div>
  );
};

// --- 메인 App 컴포넌트 ---

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("전체");
  const [reviews, setReviews] = useState(REVIEWS);
  const { getBadgesForRegion } = useRegionBadges();
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('gochigage-favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await MockAuth.getSession();
      if (data.session) setUser(data.session);
      setLoading(false);
    };
    checkSession();
  }, []);

  useEffect(() => {
    localStorage.setItem('gochigage-favorites', JSON.stringify(favorites));
    localStorage.setItem('gochigage-reviews', JSON.stringify(reviews));
  }, [favorites, reviews]);

  const toggleFavorite = (id, e) => {
    if (e) e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password || (isSignUpMode && !nickname)) {
      setAuthMessage({ type: "error", text: "모든 필드를 입력해주세요." });
      return;
    }
    setAuthLoading(true);
    const { data, error } = isSignUpMode 
      ? await MockAuth.signUp({ email, password, nickname })
      : await MockAuth.signInWithPassword({ email, password });
    if (error) setAuthMessage({ type: "error", text: error.message });
    else {
      if (isSignUpMode) { setAuthMessage({ type: "success", text: "가입 성공! 로그인해주세요." }); setIsSignUpMode(false); }
      else { setUser(data.user); setActiveTab('home'); }
    }
    setAuthLoading(false);
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    const { error } = await MockAuth.updateProfile(user.id, updates);
    if (!error) setUser({ ...user, ...updates });
  };

  const saveNewReview = (reviewData) => {
    if (!user) { setActiveTab('profile'); return; }
    const newReview = {
      id: Date.now(), userId: user.id, user: user.nickname, rating: 5.0,
      likes: 0, replies: 0, tags: ["신규리뷰"], ...reviewData
    };
    setReviews([newReview, ...reviews]);
    setActiveTab('home');
  };

  const tags = ['전체', ...new Set(reviews.flatMap((r) => r.tags || []))];
  const filteredReviews = reviews
    .filter((r) => selectedTag === '전체' || (r.tags || []).includes(selectedTag))
    .filter((r) => r.location.toLowerCase().includes(searchQuery.toLowerCase()) || r.user.toLowerCase().includes(searchQuery.toLowerCase()));
  const myReviews = reviews.filter(r => r.userId === user?.id || (r.userId === "admin" && user?.email === "admin@test.com"));

  // 지도 뷰 (팀원 로직 보존) - 상단에서 정의한 MAP_REGIONS와 동일한 데이터 사용
  const MapView = () => {
    const mapRef = useRef(null);
    const [selectedRegion, setSelectedRegion] = useState(MAP_REGIONS[0].value);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
      loadKakaoMap('cf864dc2f0d80f5ca499d30ea483efd6').then((kakao) => {
        if (!mapRef.current) return;
        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(33.450701, 126.570667),
          level: 3,
        });
        const region = MAP_REGIONS.find((r) => r.value === selectedRegion);
        if (!region) return;
        fetch(region.file)
          .then((r) => r.arrayBuffer())
          .then((buf) => {
            const text = new TextDecoder('euc-kr').decode(buf);
            const rows = text.trim().split(/\r?\n/);
            rows.shift();
            rows.forEach((line, i) => {
              const cols = line.split(',');
              const lat = parseFloat(cols[0]);
              const lng = parseFloat(cols[1]);
              if (!isNaN(lat) && !isNaN(lng)) {
                const pos = new kakao.maps.LatLng(lat, lng);
                if (i === 0) map.setCenter(pos);
                new kakao.maps.Marker({ position: pos, map });
              }
            });
          });
      });
    }, [selectedRegion]);

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-white border-b z-10 flex flex-col gap-2">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700"
            >
              <span>{MAP_REGIONS.find((r) => r.value === selectedRegion)?.label}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-20 max-h-48 overflow-y-auto no-scrollbar">
                {MAP_REGIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => {
                      setSelectedRegion(r.value);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 ${
                      selectedRegion === r.value ? 'text-[#45a494] font-bold' : ''
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 relative no-scrollbar">
          <div ref={mapRef} className="absolute inset-0 w-full h-full" />
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-white"><Loader2 className="w-8 h-8 text-[#45a494] animate-spin" /></div>;

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen font-sans">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative overflow-hidden">
        
        <main className="flex-1 overflow-y-auto no-scrollbar bg-white pb-20">
          {activeTab === 'home' && (
            <HomeView 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
              tags={tags}
              filteredReviews={filteredReviews}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              getBadgesForRegion={getBadgesForRegion}
            />
          )}
          
          {activeTab === 'profile' && (
            user ? (
              <ProfileView 
                user={user} 
                handleLogout={async () => { await MockAuth.signOut(); setUser(null); setActiveTab('home'); }} 
                favoritesCount={favorites.length} 
                onUpdateProfile={updateProfile} 
                myReviews={myReviews} 
                onDeleteReview={(id) => setReviews(r => r.filter(x => x.id !== id))} 
                onUpdateReview={(id, upd) => setReviews(r => r.map(x => x.id === id ? {...x, ...upd} : x))}
                setActiveTab={setActiveTab} // setActiveTab 함수 전달
              />
            ) : (
              <AuthView isSignUpMode={isSignUpMode} setIsSignUpMode={setIsSignUpMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} nickname={nickname} setNickname={setNickname} authLoading={authLoading} authMessage={authMessage} handleAuth={handleAuth} />
            )
          )}
          
          {activeTab === 'write' && <CreateReviewView onSave={saveNewReview} onCancel={() => setActiveTab('home')} />}
          
          {activeTab === 'favorites' && (
            <div className="animate-[fade-in_0.4s_ease-out]">
              <div className="p-6 bg-white sticky top-0 z-10">
                <h2 className="text-2xl font-black text-[#45a494] tracking-tight">내가 찜한 장소</h2>
              </div>
              <div className="px-6 py-2 border-b border-gray-100 bg-white">
                <p className="text-xs font-bold text-gray-400">총 {favorites.length}개의 찜</p>
              </div>
              <div className="p-4 space-y-6">
                {favorites.length === 0 ? (<div className="py-20 text-center text-gray-300 italic">찜한 장소가 없습니다.</div>) : (reviews.filter(r => favorites.includes(r.id)).map(review => (<div key={review.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-4"><div className="relative h-48"><SafeImage src={review.image} alt={review.location} className="w-full h-full object-cover" /><button onClick={() => toggleFavorite(review.id)} className="absolute top-4 right-4 p-2 bg-red-50 rounded-full"><Heart className="w-5 h-5 fill-red-500 text-red-500" /></button></div><div className="p-4"><h3 className="font-bold text-lg">{review.location}</h3></div></div>)))}
              </div>
            </div>
          )}
          {activeTab === 'map' && <MapViewKakao />}
        </main>

        <nav className="fixed bottom-0 w-full max-w-md bg-white/80 backdrop-blur-lg border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-[#45a494] scale-110 font-bold' : 'text-gray-400'}`}><Home className="w-6 h-6" /><span className="text-[10px]">홈</span></button>
          <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'map' ? 'text-[#45a494] scale-110 font-bold' : 'text-gray-400'}`}><MapIcon className="w-6 h-6" /><span className="text-[10px]">탐색</span></button>
          <div className="relative -top-5">
            <button 
              onClick={() => setActiveTab('write')}
              className="w-14 h-14 bg-gradient-to-tr from-[#45a494] to-[#68c9b9] rounded-full shadow-lg text-white flex items-center justify-center transform active:scale-95 transition-transform"
            >
              <span className="text-3xl font-light">+</span>
            </button>
          </div>
          <button onClick={() => setActiveTab('favorites')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'favorites' ? 'text-red-500 scale-110 font-bold' : 'text-gray-400'}`}><Heart className={`w-6 h-6 ${activeTab === 'favorites' ? 'fill-red-500' : ''}`} /><span className="text-[10px]">찜</span></button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-[#45a494] scale-110 font-bold' : 'text-gray-400'}`}><User className="w-6 h-6" /><span className="text-[10px]">마이</span></button>
        </nav>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
