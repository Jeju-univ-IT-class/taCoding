import React, { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, Star, Heart, MessageSquare, User, Home, MapPin, ChevronRight, ChevronDown, Filter, ImageOff, Plus, Minus, Navigation, LogOut, Mail, Lock, Loader2, Camera, Edit2, Check, X, Trash2, ChevronLeft, Image as ImageIcon } from 'lucide-react';

/**
 * [임시 데이터베이스 로직]
 */
const MockAuth = {
  async signUp({ email, password, nickname }) {
    await new Promise(res => setTimeout(res, 800));
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    if (users.find(u => u.email === email)) {
      return { error: { message: "이미 가입된 이메일입니다." } };
    }
    const newUser = { 
      id: Math.random().toString(36).substr(2, 9), 
      email, 
      password, 
      nickname: nickname || email.split('@')[0],
      profileImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200",
      bio: "제주 무장애 여행을 사랑합니다."
    };
    localStorage.setItem('mock_users', JSON.stringify([...users, newUser]));
    return { data: { user: newUser }, error: null };
  },
  async signInWithPassword({ email, password }) {
    await new Promise(res => setTimeout(res, 800));
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { error: { message: "이메일 또는 비밀번호가 일치하지 않습니다." } };
    return { data: { user }, error: null };
  },
  async updateProfile(userId, updates) {
    await new Promise(res => setTimeout(res, 500));
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const updatedUsers = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    localStorage.setItem('mock_users', JSON.stringify(updatedUsers));
    return { data: updates, error: null };
  }
};

const REGIONS = [
  { value: '12-법환포구', label: '법환포구', file: '/region_12.csv' },
  { value: '14-토끼섬과하도포구', label: '토끼섬과하도포구', file: '/region_14.csv' },
  { value: '35-해녀박물관', label: '해녀박물관', file: '/region_35.csv' },
  { value: '49-동문시장', label: '동문시장', file: '/region_49.csv' },
  { value: '50-제주도립미술관', label: '제주도립미술관', file: '/region_50.csv' },
];

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

const HomeView = ({ searchQuery, setSearchQuery, selectedTag, setSelectedTag, tags, filteredReviews, favorites, toggleFavorite }) => (
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
        <div className="relative" onClick={() => isEditing && fileInputRef.current?.click()}>
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
  
  const [reviews, setReviews] = useState(() => {
    const saved = localStorage.getItem('gochigage-reviews');
    return saved ? JSON.parse(saved) : [
      { id: 1, userId: "admin", user: "제주나그네", location: "서귀포 성산일출봉", rating: 4.9, comment: "새벽 공기를 가르며 올라간 보람이 있네요.", image: "https://images.unsplash.com/photo-1549693578-d683be217e58?q=80&w=1000&auto=format&fit=crop", tags: ["바다뷰", "일출맛집"] },
      { id: 2, userId: "admin", user: "바다아이", location: "제주시 협재 해수욕장", rating: 4.7, comment: "비양도가 손에 잡힐 듯 보이는 에메랄드빛 바다.", image: "https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?q=80&w=1000&auto=format&fit=crop", tags: ["바다뷰", "주차가능"] }
    ];
  });

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

  // 지도 뷰 (팀원 로직 보존)
  const MapView = () => {
    const mapRef = useRef(null);
    const [selectedRegion, setSelectedRegion] = useState(REGIONS[0].value);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
      loadKakaoMap('cf864dc2f0d80f5ca499d30ea483efd6').then((kakao) => {
        if (!mapRef.current) return;
        const map = new kakao.maps.Map(mapRef.current, { center: new kakao.maps.LatLng(33.450701, 126.570667), level: 3 });
        const region = REGIONS.find((r) => r.value === selectedRegion);
        fetch(region.file).then(r => r.arrayBuffer()).then(buf => {
          const text = new TextDecoder('euc-kr').decode(buf);
          const rows = text.trim().split(/\r?\n/); rows.shift();
          rows.forEach((line, i) => {
            const cols = line.split(',');
            const lat = parseFloat(cols[0]); const lng = parseFloat(cols[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              const pos = new kakao.maps.LatLng(lat, lng);
              if (i === 0) map.setCenter(pos);
              new kakao.maps.Marker({ position: pos, map: map });
            }
          });
        });
      });
    }, [selectedRegion]);

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-white border-b z-10 flex flex-col gap-2">
          <div className="relative">
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="w-full flex items-center justify-between px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700">
              <span>{REGIONS.find(r => r.value === selectedRegion)?.label}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-20 max-h-48 overflow-y-auto no-scrollbar">
                {REGIONS.map((r) => (
                  <button key={r.value} onClick={() => { setSelectedRegion(r.value); setDropdownOpen(false); }} className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 ${selectedRegion === r.value ? 'text-[#45a494] font-bold' : ''}`}>{r.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 relative no-scrollbar"><div ref={mapRef} className="absolute inset-0 w-full h-full" /></div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-white"><Loader2 className="w-8 h-8 text-[#45a494] animate-spin" /></div>;

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen font-sans">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative overflow-hidden">
        
        <main className="flex-1 overflow-y-auto no-scrollbar bg-white pb-20">
          {activeTab === 'home' && <HomeView searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedTag={selectedTag} setSelectedTag={setSelectedTag} tags={tags} filteredReviews={filteredReviews} favorites={favorites} toggleFavorite={toggleFavorite} />}
          
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
          {activeTab === 'map' && <MapView />}
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
