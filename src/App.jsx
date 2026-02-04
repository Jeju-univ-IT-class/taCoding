import React, { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, Star, Heart, MessageSquare, User, Home, MapPin, ChevronRight, ChevronDown, Filter, ImageOff, Plus, Minus, Navigation, LogOut, Mail, Lock, Loader2, Camera, Edit2, Check, X } from 'lucide-react';

/**
 * [임시 데이터베이스 로직]
 * 닉네임(nickname)과 프로필 이미지(profileImage) 필드를 지원합니다.
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
      profileImage: "" 
    };
    localStorage.setItem('mock_users', JSON.stringify([...users, newUser]));
    return { data: { user: newUser }, error: null };
  },
  async signInWithPassword({ email, password }) {
    await new Promise(res => setTimeout(res, 800));
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return { error: { message: "이메일 또는 비밀번호가 일치하지 않습니다." } };
    }
    localStorage.setItem('mock_session', JSON.stringify(user));
    return { data: { user }, error: null };
  },
  async updateProfile(userId, updates) {
    await new Promise(res => setTimeout(res, 500));
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const updatedUsers = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    localStorage.setItem('mock_users', JSON.stringify(updatedUsers));
    
    const session = JSON.parse(localStorage.getItem('mock_session'));
    if (session && session.id === userId) {
      localStorage.setItem('mock_session', JSON.stringify({ ...session, ...updates }));
    }
    return { error: null };
  },
  async signOut() {
    localStorage.removeItem('mock_session');
    return { error: null };
  },
  async getSession() {
    const session = localStorage.getItem('mock_session');
    return { data: { session: session ? JSON.parse(session) : null } };
  }
};

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
  }
];

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

// --- 하위 컴포넌트들을 App 외부로 분리 ---

const HomeView = ({ searchQuery, setSearchQuery, selectedTag, setSelectedTag, tags, filteredReviews, favorites, toggleFavorite }) => (
  <div className="pb-24 animate-[fade-in_0.4s_ease-out]">
    <header className="sticky top-0 bg-white z-20 px-4 pt-8 pb-3 shadow-sm border-b border-gray-50 flex items-center gap-3">
      <div className="flex items-center gap-2 shrink-0">
        {/* 로고: border 및 shadow 없음 상태 유지 */}
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
            ${selectedTag === tag 
              ? 'bg-[#45a494] text-white shadow-lg shadow-[#45a494]/20 scale-105' 
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          {tag === '전체' ? tag : `#${tag}`}
        </button>
      ))}
    </div>

    <div className="p-4 space-y-6">
      {/* "지금 뜨는 리뷰" 텍스트 제거 상태 유지 */}
      {filteredReviews.length > 0 ? (
        filteredReviews.map((review) => (
          <div key={review.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="relative h-64">
              <SafeImage src={review.image} alt={review.location} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 flex gap-2">
                {review.tags.map(tag => (
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
                <Star className="inline w-3 h-3 text-yellow-500 fill-yellow-500 mr-1" /> {review.rating}
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

const AuthView = ({ isSignUpMode, setIsSignUpMode, email, setEmail, password, setPassword, nickname, setNickname, authLoading, authMessage, handleAuth }) => (
  <div className="p-8 flex flex-col h-full animate-[fade-in_0.4s_ease-out]">
    <div className="flex flex-col items-center mb-10 mt-8">
      {/* 로고: border 및 shadow 없음 상태 유지 */}
      <div className="w-20 h-20 rounded-3xl overflow-hidden bg-white mb-4 shrink-0">
        <img src="/favicon.png" alt="Logo" className="w-full h-full object-cover" />
      </div>
      <h2 className="text-2xl font-black text-[#45a494]">고치가게</h2>
      <p className="text-gray-400 text-xs mt-1 font-bold tracking-widest uppercase">
        {isSignUpMode ? "Join Us" : "Welcome Back"}
      </p>
    </div>

    <form onSubmit={handleAuth} className="space-y-4">
      {isSignUpMode && (
        <div className="relative">
          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" placeholder="닉네임" value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#45a494]/20 text-sm"
          />
        </div>
      )}
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="email" placeholder="이메일" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#45a494]/20 text-sm"
        />
      </div>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="password" placeholder="비밀번호" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#45a494]/20 text-sm"
        />
      </div>

      {authMessage.text && (
        <div className={`p-3 rounded-xl text-[11px] font-bold text-center ${authMessage.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
          {authMessage.text}
        </div>
      )}

      <button 
        type="submit"
        disabled={authLoading}
        className="w-full bg-[#45a494] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#45a494]/20 flex items-center justify-center transition-all active:scale-95"
      >
        {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUpMode ? "회원가입 하기" : "로그인")}
      </button>
    </form>

    <button 
      onClick={() => { setIsSignUpMode(!isSignUpMode); }}
      className="mt-6 text-sm font-bold text-gray-400 hover:text-[#45a494] transition-colors"
    >
      {isSignUpMode ? "이미 계정이 있으신가요? 로그인" : "처음이신가요? 회원가입 하기"}
    </button>
  </div>
);

const ProfileView = ({ user, handleLogout, favoritesCount, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState(user?.nickname || "");
  const [tempProfileImage, setTempProfileImage] = useState(user?.profileImage || "");
  const fileInputRef = useRef(null);

  const handleFileClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    await onUpdateProfile({ nickname: newNickname, profileImage: tempProfileImage });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNewNickname(user?.nickname || "");
    setTempProfileImage(user?.profileImage || "");
    setIsEditing(false);
  };

  return (
    <div className="p-6 flex flex-col h-full animate-[fade-in_0.4s_ease-out] bg-white">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-black text-[#45a494] tracking-tight">My page</h2>
        <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative group" onClick={handleFileClick}>
          <div className={`w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-xl overflow-hidden ${isEditing ? 'cursor-pointer' : ''}`}>
            {tempProfileImage ? (
              <img src={tempProfileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-gray-300" />
            )}
          </div>
          {isEditing && (
            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center mb-4 cursor-pointer">
              <Camera size={24} className="text-white opacity-90" />
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
          />
        </div>

        {isEditing ? (
          <div className="w-full space-y-4 px-4 mt-2">
            <div className="flex flex-col items-center gap-1">
              <input 
                type="text" 
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                className="w-full border-b-2 border-[#45a494] text-center font-black text-xl py-1 focus:outline-none"
                placeholder="새 닉네임"
              />
              <p className="text-[10px] text-gray-400 mt-1">사진을 클릭하여 변경할 수 있습니다.</p>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button onClick={handleCancel} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform">
                <X size={14} /> 취소
              </button>
              <button onClick={handleSave} className="flex-[2] bg-[#45a494] text-white py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 shadow-lg shadow-[#45a494]/20 active:scale-95 transition-transform">
                <Check size={14} /> 변경 내용 저장
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-gray-800">{user?.nickname}</h3>
              <button onClick={() => setIsEditing(true)} className="p-1.5 bg-gray-50 rounded-lg text-gray-300 hover:text-[#45a494] transition-colors">
                <Edit2 size={14} />
              </button>
            </div>
            <p className="text-gray-400 text-xs mb-8">{user?.email}</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 w-full mt-8">
        <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">찜한 목록</p>
          <p className="text-2xl font-black text-[#45a494]">{favoritesCount}</p>
        </div>
        <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">작성 리뷰</p>
          <p className="text-2xl font-black text-slate-300">0</p>
        </div>
      </div>

      <div className="mt-auto pt-10 pb-4 text-center">
        <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[2px]">GochiGage Account System</p>
      </div>
    </div>
  );
};

// --- 메인 App 컴포넌트 ---

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("전체");
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
  }, [favorites]);

  const toggleFavorite = (id, e) => {
    if (e) e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]
    );
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password || (isSignUpMode && !nickname)) {
      setAuthMessage({ type: "error", text: "모든 필드를 입력해주세요." });
      return;
    }
    setAuthLoading(true);
    setAuthMessage({ type: "", text: "" });

    const { data, error } = isSignUpMode 
      ? await MockAuth.signUp({ email, password, nickname })
      : await MockAuth.signInWithPassword({ email, password });

    if (error) {
      setAuthMessage({ type: "error", text: error.message });
    } else {
      if (isSignUpMode) {
        setAuthMessage({ type: "success", text: "회원가입 성공! 이제 로그인해주세요." });
        setIsSignUpMode(false);
      } else {
        setUser(data.user);
        setActiveTab('home');
        setEmail("");
        setPassword("");
        setNickname("");
      }
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await MockAuth.signOut();
    setUser(null);
    setActiveTab('home');
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    const { error } = await MockAuth.updateProfile(user.id, updates);
    if (!error) {
      setUser({ ...user, ...updates });
    }
  };

  const tags = ['전체', ...new Set(REVIEWS.flatMap((r) => r.tags || []))];

  const filteredReviews = REVIEWS
    .filter((r) => selectedTag === '전체' || (r.tags || []).includes(selectedTag))
    .filter((r) => 
      r.location.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    );

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <Loader2 className="w-8 h-8 text-[#45a494] animate-spin" />
    </div>
  );

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
            />
          )}
          
          {activeTab === 'profile' && (
            user ? (
              <ProfileView 
                user={user} 
                handleLogout={handleLogout} 
                favoritesCount={favorites.length} 
                onUpdateProfile={updateProfile}
              />
            ) : (
              <AuthView 
                isSignUpMode={isSignUpMode}
                setIsSignUpMode={setIsSignUpMode}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                nickname={nickname}
                setNickname={setNickname}
                authLoading={authLoading}
                authMessage={authMessage}
                handleAuth={handleAuth}
              />
            )
          )}
          
          {activeTab === 'favorites' && (
            <div className="animate-[fade-in_0.4s_ease-out]">
              <div className="p-6 bg-white sticky top-0 z-10">
                {/* 제목 색상 변경: text-[#45a494] */}
                <h2 className="text-2xl font-black text-[#45a494] tracking-tight">내가 찜한 장소</h2>
              </div>
              
              <div className="px-6 py-2 border-b border-gray-100 bg-white">
                {/* 문구 변경 및 위치 이동: 총 n개의 찜 */}
                <p className="text-xs font-bold text-gray-400">총 {favorites.length}개의 찜</p>
              </div>

              <div className="p-4 space-y-6">
                {favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                    <Heart size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-bold">찜한 장소가 아직 없습니다.</p>
                  </div>
                ) : (
                  REVIEWS.filter(r => favorites.includes(r.id)).map(review => (
                    <div key={review.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-4">
                      <div className="relative h-48">
                        <SafeImage src={review.image} alt={review.location} className="w-full h-full object-cover" />
                        <button onClick={() => toggleFavorite(review.id)} className="absolute top-4 right-4 p-2 bg-red-50 rounded-full">
                          <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                        </button>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg">{review.location}</h3>
                        <p className="text-xs text-gray-400">{review.user}님의 기록</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'map' && (
             <div className="h-full flex flex-col items-center justify-center text-gray-300 italic py-40">
                <MapIcon size={48} className="mb-4 opacity-20" />
                <p>지도 기능을 준비 중입니다.</p>
             </div>
          )}
        </main>

        <nav className="fixed bottom-0 w-full max-w-md bg-white/80 backdrop-blur-lg border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-[#45a494] scale-110 font-bold' : 'text-gray-400'}`}>
            <Home className="w-6 h-6" /><span className="text-[10px]">홈</span>
          </button>
          <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'map' ? 'text-[#45a494] scale-110 font-bold' : 'text-gray-400'}`}>
            <MapIcon className="w-6 h-6" /><span className="text-[10px]">탐색</span>
          </button>
          <div className="relative -top-5">
            <button className="w-14 h-14 bg-gradient-to-tr from-[#45a494] to-[#68c9b9] rounded-full shadow-lg shadow-[#45a494]/30 flex items-center justify-center text-white"><Plus /></button>
          </div>
          <button onClick={() => setActiveTab('favorites')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'favorites' ? 'text-red-500 scale-110 font-bold' : 'text-gray-400'}`}>
            <Heart className={`w-6 h-6 ${activeTab === 'favorites' ? 'fill-red-500' : ''}`} /><span className="text-[10px]">찜</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-[#45a494] scale-110 font-bold' : 'text-gray-400'}`}>
            <User className="w-6 h-6" /> <span className="text-[10px]">마이</span>
          </button>
        </nav>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default App;