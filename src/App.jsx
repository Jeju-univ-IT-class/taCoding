import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Map as MapIcon, Star, Heart, User, Home, MapPin, Plus, 
  LogOut, Mail, Lock, Loader2, X, Navigation, Camera, Edit2, Check, ChevronRight, Image as ImageIcon,
  Save, ArrowLeft
} from 'lucide-react';

/**
 * [인증 및 사용자 관리 로직 - Mock]
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

const INITIAL_REVIEWS = [
  {
    id: 101,
    user: "관리자",
    location: "제주도립미술관",
    rating: 5,
    comment: "장애인 주차구역이 입구와 가깝고 전시장 내부가 평탄하여 이동이 매우 쉽습니다.",
    image: "https://images.unsplash.com/photo-1549693578-d683be217e58?q=80&w=1000",
    likes: 128,
    isLiked: false,
    categories: ["휠체어", "엘리베이터"],
    createdAt: "2024-03-25T10:00:00Z",
    lat: 33.45291,
    lng: 126.48849
  },
  {
    id: 102,
    user: "제주조아",
    location: "서귀포 법환포구",
    rating: 4,
    comment: "잠녀상 공원 부근은 휠체어로 산책하기에 아주 좋습니다. 화장실도 깨끗해요.",
    image: null,
    likes: 85,
    isLiked: false,
    categories: ["장애인 화장실", "휠체어"],
    createdAt: "2024-03-24T15:30:00Z",
    lat: 33.236217,
    lng: 126.515118
  }
];

const USER_LOCATION = { lat: 33.499, lng: 126.531 };

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState("latest");
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [authMode, setAuthMode] = useState('signIn');
  const [authForm, setAuthForm] = useState({ email: "", password: "", nickname: "" });
  const [loading, setLoading] = useState(false);

  // 프로필 수정용 임시 상태
  const [editForm, setEditForm] = useState({ nickname: "", bio: "", profileImage: "" });
  const profilePhotoRef = useRef(null);

  // 리뷰 작성 상태
  const [newReview, setNewReview] = useState({ 
    location: "", 
    comment: "", 
    rating: 5, 
    categories: [], 
    image: null 
  });
  const fileInputRef = useRef(null);

  const categories = ["휠체어", "유모차", "장애인 화장실", "수유실", "엘리베이터"];

  const processedReviews = useMemo(() => {
    let result = [...reviews];
    if (activeTab === 'heart') result = result.filter(r => r.isLiked);
    if (selectedCategory) result = result.filter(r => r.categories?.includes(selectedCategory));
    
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(item => 
        item.location.toLowerCase().includes(query) || 
        item.comment.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "latest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "popular") return b.likes - a.likes;
      if (sortBy === "nearby") {
        const distA = getDistance(USER_LOCATION.lat, USER_LOCATION.lng, a.lat, a.lng);
        const distB = getDistance(USER_LOCATION.lat, USER_LOCATION.lng, b.lat, b.lng);
        return distA - distB;
      }
      return 0;
    });
    return result;
  }, [searchQuery, selectedCategory, reviews, activeTab, sortBy]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    let res = authMode === 'signIn' ? await MockAuth.signInWithPassword(authForm) : await MockAuth.signUp(authForm);
    setLoading(false);
    if (res.error) alert(res.error.message);
    else setUser(res.data.user);
  };

  // 프로필 수정 시작
  const startEditing = () => {
    setEditForm({ 
      nickname: user.nickname, 
      bio: user.bio || "", 
      profileImage: user.profileImage 
    });
    setIsEditingProfile(true);
  };

  // 프로필 사진 변경 핸들러
  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditForm(prev => ({ ...prev, profileImage: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  // 프로필 저장
  const handleSaveProfile = async () => {
    if (!editForm.nickname.trim()) return alert("닉네임은 필수입니다.");
    setLoading(true);
    const res = await MockAuth.updateProfile(user.id, editForm);
    setLoading(false);
    if (!res.error) {
      setUser({ ...user, ...editForm });
      setIsEditingProfile(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewReview(prev => ({ ...prev, image: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const toggleReviewCategory = (cat) => {
    setNewReview(prev => ({
      ...prev,
      categories: prev.categories.includes(cat) 
        ? prev.categories.filter(c => c !== cat) 
        : [...prev.categories, cat]
    }));
  };

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newReview.location || !newReview.comment) return alert("필수 항목을 입력해주세요.");
    
    const reviewToAdd = {
      id: Date.now(),
      user: user.nickname,
      ...newReview,
      likes: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      lat: USER_LOCATION.lat + (Math.random() - 0.5) * 0.1,
      lng: USER_LOCATION.lng + (Math.random() - 0.5) * 0.1
    };
    setReviews([reviewToAdd, ...reviews]);
    setIsModalOpen(false);
    setNewReview({ location: "", comment: "", rating: 5, categories: [], image: null });
  };

  const toggleLike = (id) => {
    setReviews(prev => prev.map(r => 
      r.id === id ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 } : r
    ));
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto h-screen bg-[#fcfdfc] flex flex-col items-center justify-center p-8 font-sans">
        <div className="w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center">
            <h1 className="text-4xl font-black text-[#45a494] tracking-tighter italic mb-2">JEJU EASY</h1>
            <p className="text-gray-400 text-sm font-medium">제주 무장애 여행의 시작</p>
          </div>
          <form onSubmit={handleAuth} className="bg-white p-8 rounded-[32px] shadow-2xl border border-gray-100 space-y-5">
            {authMode === 'signUp' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 ml-1">NICKNAME</label>
                <div className="relative">
                  <input type="text" placeholder="사용할 닉네임" className="w-full bg-gray-50 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none border border-gray-100" value={authForm.nickname} onChange={(e) => setAuthForm({...authForm, nickname: e.target.value})} required />
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#45a494]" />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-400 ml-1">EMAIL</label>
              <div className="relative">
                <input type="email" placeholder="example@jeju.com" className="w-full bg-gray-50 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none border border-gray-100" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} required />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#45a494]" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-400 ml-1">PASSWORD</label>
              <div className="relative">
                <input type="password" placeholder="••••••••" className="w-full bg-gray-50 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none border border-gray-100" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} required />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#45a494]" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#45a494] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center">
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (authMode === 'signIn' ? '로그인' : '가입하기')}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn')} className="w-full text-center text-xs text-[#45a494] font-bold">
            {authMode === 'signIn' ? '처음이신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-screen bg-white flex flex-col border-x border-gray-100 relative overflow-hidden shadow-2xl font-sans text-gray-800">
      
      {/* 헤더 영역 (홈/찜 탭인 경우만) */}
      {(activeTab === 'home' || activeTab === 'heart') && (
        <div className="bg-white p-5 pb-2 sticky top-0 z-30 border-b border-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-black text-[#45a494] tracking-tighter italic cursor-pointer" onClick={() => {setActiveTab('home'); setSelectedCategory(null);}}>JEJU EASY</h1>
            <button onClick={() => setActiveTab('profile')} className="w-9 h-9 rounded-full border border-gray-100 overflow-hidden shadow-sm">
              <img src={user.profileImage} alt="p" className="w-full h-full object-cover" />
            </button>
          </div>
          <div className="relative mb-4">
            <input 
              type="text" placeholder="어디로 떠나시나요?" 
              className="w-full bg-gray-100 rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none border-none focus:ring-2 focus:ring-[#45a494]/20"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
            <button onClick={() => setSelectedCategory(null)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${!selectedCategory ? 'bg-[#45a494] text-white shadow-md shadow-[#45a494]/20' : 'bg-gray-100 text-gray-500'}`}>전체</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-[#45a494] text-white shadow-md shadow-[#45a494]/20' : 'bg-gray-100 text-gray-500'}`}>{cat}</button>
            ))}
          </div>
          <div className="flex justify-between items-center py-2 border-t border-gray-50">
              <span className="text-[10px] font-black text-gray-300 tracking-widest uppercase">{activeTab === 'heart' ? '나의 찜 목록' : (selectedCategory || '전체 정보')}</span>
              <div className="flex gap-3">
                  {["nearby", "latest", "popular"].map(sort => (
                      <button key={sort} onClick={() => setSortBy(sort)} className={`text-[11px] font-bold ${sortBy === sort ? 'text-[#45a494]' : 'text-gray-300'}`}>
                        {sort === 'nearby' ? '가까운순' : sort === 'latest' ? '최신순' : '인기순'}
                      </button>
                  ))}
              </div>
          </div>
        </div>
      )}

      {/* 리스트 뷰 */}
      {(activeTab === 'home' || activeTab === 'heart') && (
        <div className="flex-1 overflow-y-auto p-5 pb-28 no-scrollbar bg-gray-50/30">
          <div className="space-y-6">
            {processedReviews.map(item => (
              <div key={item.id} className="bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                {item.image && (
                  <div className="relative h-48">
                    <img src={item.image} className="w-full h-full object-cover" alt={item.location} />
                    <button onClick={() => toggleLike(item.id)} className="absolute top-4 right-4 w-9 h-9 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm">
                      <Heart size={18} className={item.isLiked ? "text-red-500 fill-current" : "text-gray-400"} />
                    </button>
                    <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-bold flex items-center gap-1.5">
                      <Navigation size={10} className="fill-current" />
                      {getDistance(USER_LOCATION.lat, USER_LOCATION.lng, item.lat, item.lng).toFixed(1)}km
                    </div>
                  </div>
                )}
                <div className="p-5">
                  {!item.image && (
                    <div className="flex justify-between items-center mb-3">
                        <div className="bg-gray-50 px-2 py-1 rounded-lg text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
                            <Navigation size={10} /> {getDistance(USER_LOCATION.lat, USER_LOCATION.lng, item.lat, item.lng).toFixed(1)}km
                        </div>
                        <button onClick={() => toggleLike(item.id)} className="text-gray-300"><Heart size={18} className={item.isLiked ? "text-red-500 fill-current" : ""} /></button>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-base">{item.location}</h3>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={12} fill="currentColor" />
                      <span className="text-xs font-bold">{item.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">{item.comment}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-wrap gap-1.5">
                      {item.categories?.map(cat => (
                        <span key={cat} className="text-[9px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded-md border border-gray-100 font-bold">#{cat}</span>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-gray-300 flex items-center gap-1"><Heart size={10} fill="currentColor" /> {item.likes}</span>
                  </div>
                </div>
              </div>
            ))}
            {processedReviews.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-300 text-sm font-bold">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 지도 탭 */}
      {activeTab === 'map' && (
        <div className="flex-1 bg-gray-100 relative">
          <div className="absolute inset-0 bg-[#f0f2f0] flex items-center justify-center opacity-40" style={{backgroundImage: 'radial-gradient(#45a494 0.5px, transparent 0.5px)', backgroundSize: '20px 20px'}}></div>
          {reviews.map(r => (
            <div key={r.id} className="absolute flex flex-col items-center" style={{top: `${50 + (USER_LOCATION.lat - r.lat)*1000}%`, left: `${50 + (r.lng - USER_LOCATION.lng)*500}%`}}>
                <div className="bg-white px-2 py-1 rounded-lg shadow-lg border border-gray-100 text-[9px] font-black mb-1">{r.location}</div>
                <MapPin className="text-[#45a494] fill-white" size={24} />
            </div>
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg"></div>
        </div>
      )}

      {/* 마이페이지 탭 (일반 및 수정 모드 통합) */}
      {activeTab === 'profile' && (
        <div className="flex-1 bg-white overflow-y-auto no-scrollbar flex flex-col">
          {isEditingProfile ? (
            <div className="p-8 space-y-8 animate-in slide-in-from-right-10 duration-300">
               <div className="flex items-center gap-4 mb-2">
                  <button onClick={() => setIsEditingProfile(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><ArrowLeft size={20}/></button>
                  <h2 className="text-xl font-black">프로필 수정</h2>
               </div>

               <div className="flex flex-col items-center">
                  <div className="relative group cursor-pointer" onClick={() => profilePhotoRef.current.click()}>
                    <img src={editForm.profileImage} className="w-28 h-28 rounded-[40px] object-cover ring-4 ring-[#45a494]/10" alt="p" />
                    <div className="absolute inset-0 bg-black/20 rounded-[40px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white" size={24} />
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-9 h-9 bg-[#45a494] text-white rounded-2xl border-2 border-white flex items-center justify-center shadow-lg"><Camera size={16}/></button>
                    <input type="file" hidden ref={profilePhotoRef} onChange={handleProfilePhotoChange} accept="image/*" />
                  </div>
                  <p className="mt-4 text-[11px] font-bold text-gray-300 uppercase tracking-widest">사진을 눌러 변경하세요</p>
               </div>

               <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 ml-1">NICKNAME</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-[#45a494]/20" 
                      value={editForm.nickname} 
                      onChange={(e) => setEditForm({...editForm, nickname: e.target.value})} 
                      placeholder="이름을 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 ml-1">BIO</label>
                    <textarea 
                      className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-medium border-none outline-none h-24 resize-none focus:ring-2 focus:ring-[#45a494]/20" 
                      value={editForm.bio} 
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})} 
                      placeholder="나를 소개하는 한마디"
                    />
                  </div>
               </div>

               <button 
                onClick={handleSaveProfile} 
                disabled={loading}
                className="w-full bg-[#45a494] text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
               >
                 {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> 저장하기</>}
               </button>
            </div>
          ) : (
            <div className="p-8 animate-in fade-in duration-300">
               <div className="text-center mb-10 mt-5">
                  <div className="relative inline-block mb-4">
                    <img src={user.profileImage} className="w-24 h-24 rounded-[32px] object-cover ring-4 ring-gray-50" alt="p" />
                  </div>
                  <h2 className="text-xl font-black">{user.nickname}</h2>
                  <p className="text-sm text-gray-400 mt-1">{user.bio || "소개가 없습니다."}</p>
               </div>
               <div className="space-y-4">
                  <button onClick={startEditing} className="w-full p-5 bg-gray-50 rounded-3xl flex justify-between items-center group">
                     <div className="flex items-center gap-4 text-gray-600 font-bold text-sm"><Edit2 size={18} /> 프로필 수정</div>
                     <ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button onClick={() => setUser(null)} className="w-full p-5 bg-red-50/50 rounded-3xl flex justify-between items-center group">
                     <div className="flex items-center gap-4 text-red-400 font-bold text-sm"><LogOut size={18} /> 로그아웃</div>
                     <ChevronRight size={18} className="text-red-200 group-hover:translate-x-1 transition-transform" />
                  </button>
               </div>
            </div>
          )}
        </div>
      )}

      {/* 하단 네비게이션 */}
      {!isEditingProfile && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex justify-around py-4 pb-10 z-40 shadow-inner">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-[#45a494]' : 'text-gray-300'}`}><Home size={22} /><span className="text-[10px] font-bold">홈</span></button>
          <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-[#45a494]' : 'text-gray-300'}`}><MapIcon size={22} /><span className="text-[10px] font-bold">지도</span></button>
          <button onClick={() => setIsModalOpen(true)} className="w-14 h-14 bg-[#45a494] rounded-[22px] -mt-10 flex items-center justify-center text-white shadow-xl shadow-[#45a494]/30 active:scale-90 transition-all border-4 border-white"><Plus size={28} /></button>
          <button onClick={() => setActiveTab('heart')} className={`flex flex-col items-center gap-1 ${activeTab === 'heart' ? 'text-[#45a494]' : 'text-gray-300'}`}><Heart size={22} /><span className="text-[10px] font-bold">찜</span></button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-[#45a494]' : 'text-gray-300'}`}><User size={22} /><span className="text-[10px] font-bold">마이</span></button>
        </div>
      )}

      {/* 리뷰 작성 모달 (기존과 동일) */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end animate-in fade-in duration-300">
          <div className="w-full bg-white rounded-t-[40px] p-8 max-h-[90%] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-20 duration-500">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">무장애 경험 공유</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400"><X /></button>
            </div>
            <form onSubmit={handleAddReview} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-gray-400 ml-1">PHOTO (선택)</label>
                 <div onClick={() => fileInputRef.current.click()} className="w-full aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative">
                    {newReview.image ? (
                        <img src={newReview.image} className="w-full h-full object-cover" alt="p" />
                    ) : (
                        <>
                            <ImageIcon className="text-gray-300 mb-1" size={32} />
                            <span className="text-[10px] text-gray-400 font-bold">이미지를 첨부해 주세요</span>
                        </>
                    )}
                    <input type="file" hidden ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-gray-400 ml-1">LOCATION</label>
                 <input type="text" className="w-full bg-gray-50 rounded-xl p-4 text-sm border-none outline-none focus:ring-2 focus:ring-[#45a494]/20" placeholder="방문하신 장소 이름" value={newReview.location} onChange={(e) => setNewReview({...newReview, location: e.target.value})} />
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase">Rating & Category</label>
                 <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} size={20} className={star <= newReview.rating ? "text-yellow-400 fill-current" : "text-gray-200"} onClick={() => setNewReview({...newReview, rating: star})} />
                        ))}
                    </div>
                    <span className="text-xs font-bold text-gray-400">{newReview.rating}.0 점</span>
                 </div>
                 <div className="flex flex-wrap gap-1.5 mt-2">
                    {categories.map(cat => (
                        <button key={cat} type="button" onClick={() => toggleReviewCategory(cat)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${newReview.categories.includes(cat) ? 'bg-[#45a494] text-white border-[#45a494]' : 'bg-white text-gray-400 border-gray-100'}`}>#{cat}</button>
                    ))}
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-gray-400 ml-1">COMMENT</label>
                 <textarea className="w-full bg-gray-50 rounded-xl p-4 text-sm border-none outline-none h-28 resize-none focus:ring-2 focus:ring-[#45a494]/20" placeholder="시설 이용 중 좋았던 점이나 아쉬웠던 점을 적어주세요." value={newReview.comment} onChange={(e) => setNewReview({...newReview, comment: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-[#45a494] text-white font-black py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all">작성 완료</button>
            </form>
          </div>
        </div>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
