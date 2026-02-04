# Supabase 마이그레이션 가이드

sql.js로 구현한 임시 DB를 Supabase로 마이그레이션하는 가이드입니다.

---

## 목차

1. [Supabase 프로젝트 설정](#1-supabase-프로젝트-설정)
2. [테이블 생성](#2-테이블-생성)
3. [RLS (Row Level Security) 설정](#3-rls-row-level-security-설정)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [Supabase 클라이언트 구현](#5-supabase-클라이언트-구현)
6. [마이그레이션 체크리스트](#6-마이그레이션-체크리스트)

---

## 1. Supabase 프로젝트 설정

### 1.1 Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: `jeju-reviews` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정
   - **Region**: 가장 가까운 지역 선택 (예: Northeast Asia (Seoul))
4. 프로젝트 생성 완료 대기 (약 2분)

### 1.2 프로젝트 정보 확인

프로젝트 대시보드에서 다음 정보를 확인하세요:
- **Project URL**: `https://xxxxx.supabase.co`
- **anon/public key**: API 키 (공개)
- **service_role key**: 서비스 키 (비공개, 서버에서만 사용)

---

## 2. 테이블 생성

### 2.1 SQL Editor에서 테이블 생성

Supabase 대시보드 → **SQL Editor** → **New Query**에서 다음 SQL을 실행하세요.

#### 2.1.1 프로필 테이블 (`profiles`)

**참고**: Supabase는 `auth.users` 테이블을 기본 인증 테이블로 제공합니다.  
추가 프로필 정보(닉네임, 프로필 이미지 등)는 `profiles` 테이블에 저장하고 `auth.users.id` (UUID)와 연결합니다.

```sql
-- 프로필 테이블 (auth.users와 1:1 관계)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname VARCHAR(50) NOT NULL,
  profile_image VARCHAR(512),
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_profiles_nickname ON profiles(nickname);
CREATE INDEX idx_profiles_status ON profiles(status);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 새 사용자 가입 시 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', 'User' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'USER'),
    'ACTIVE'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 2.1.2 장소 테이블 (`places`)

```sql
-- 장소 테이블
CREATE TABLE places (
  id BIGSERIAL PRIMARY KEY,
  region VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  name VARCHAR(255) NOT NULL,
  detail_info TEXT,
  disabled_info TEXT,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  data_quality VARCHAR(50),
  modified_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_places_region ON places(region);
CREATE INDEX idx_places_location ON places(latitude, longitude);
CREATE INDEX idx_places_name ON places(name);
CREATE INDEX idx_places_recommended ON places(is_recommended);
```

#### 2.1.3 리뷰 테이블 (`reviews`)

```sql
-- 리뷰 테이블
CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id BIGINT REFERENCES places(id) ON DELETE SET NULL,
  location VARCHAR(255) NOT NULL,
  rating DECIMAL(2,1) NOT NULL,
  comment TEXT NOT NULL,
  image_url VARCHAR(512),
  likes_count INT NOT NULL DEFAULT 0,
  replies_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_reviews_member ON reviews(member_id);
CREATE INDEX idx_reviews_place ON reviews(place_id);
CREATE INDEX idx_reviews_created ON reviews(created_at);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 2.1.4 리뷰-태그 테이블 (`review_tags`)

```sql
-- 리뷰-태그 테이블
CREATE TABLE review_tags (
  review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  PRIMARY KEY (review_id, tag)
);

CREATE INDEX idx_review_tags_tag ON review_tags(tag);
```

#### 2.1.5 게시물 테이블 (`posts`)

```sql
-- 게시물 테이블
CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(512),
  views_count INT NOT NULL DEFAULT 0,
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_posts_member ON posts(member_id);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_created ON posts(created_at);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 2.1.6 게시물-태그 테이블 (`post_tags`)

```sql
-- 게시물-태그 테이블
CREATE TABLE post_tags (
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  PRIMARY KEY (post_id, tag)
);

CREATE INDEX idx_post_tags_tag ON post_tags(tag);
```

#### 2.1.7 찜 테이블 (`wishlists`)

```sql
-- 찜 테이블
CREATE TABLE wishlists (
  id BIGSERIAL PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('REVIEW', 'POST', 'PLACE')),
  target_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(member_id, target_type, target_id)
);

-- 인덱스 생성
CREATE INDEX idx_wishlists_member ON wishlists(member_id);
CREATE INDEX idx_wishlists_target ON wishlists(target_type, target_id);
CREATE INDEX idx_wishlists_created ON wishlists(created_at);
```

---

## 3. RLS (Row Level Security) 설정

### 3.1 RLS 활성화

각 테이블에 RLS를 활성화하고 정책을 설정합니다.

```sql
-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
```

### 3.2 정책 설정

#### 3.2.1 프로필 테이블 정책

```sql
-- 모든 사용자가 자신의 프로필 조회 가능
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 모든 사용자가 활성 프로필 목록 조회 가능 (닉네임, 프로필 이미지만)
CREATE POLICY "Anyone can view active profiles"
  ON profiles FOR SELECT
  USING (status = 'ACTIVE');

-- 사용자가 자신의 프로필 수정 가능
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

#### 3.2.2 리뷰 테이블 정책

```sql
-- 모든 사용자가 리뷰 조회 가능
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

-- 로그인한 사용자가 리뷰 작성 가능
CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 작성자가 자신의 리뷰 수정/삭제 가능
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = member_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = member_id);
```

#### 3.2.3 게시물 테이블 정책

```sql
-- 모든 사용자가 게시물 조회 가능
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  USING (true);

-- 로그인한 사용자가 게시물 작성 가능
CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 작성자가 자신의 게시물 수정/삭제 가능
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = member_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = member_id);
```

#### 3.2.4 장소 테이블 정책

```sql
-- 모든 사용자가 장소 조회 가능
CREATE POLICY "Anyone can view places"
  ON places FOR SELECT
  USING (true);
```

#### 3.2.5 찜 테이블 정책

```sql
-- 사용자가 자신의 찜 목록 조회 가능
CREATE POLICY "Users can view own wishlists"
  ON wishlists FOR SELECT
  USING (auth.uid() = member_id);

-- 사용자가 자신의 찜 추가 가능
CREATE POLICY "Users can create own wishlists"
  ON wishlists FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- 사용자가 자신의 찜 삭제 가능
CREATE POLICY "Users can delete own wishlists"
  ON wishlists FOR DELETE
  USING (auth.uid() = member_id);
```

#### 3.2.6 태그 테이블 정책

```sql
-- 모든 사용자가 태그 조회 가능
CREATE POLICY "Anyone can view review_tags"
  ON review_tags FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view post_tags"
  ON post_tags FOR SELECT
  USING (true);
```

---

## 4. 환경 변수 설정

### 4.1 `.env` 파일 생성

프로젝트 루트에 `.env` 파일을 생성하세요:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4.2 `.env.example` 파일 생성 (선택)

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4.3 `.gitignore` 확인

`.env` 파일이 `.gitignore`에 포함되어 있는지 확인하세요.

---

## 5. Supabase 클라이언트 구현

### 5.1 패키지 설치

```bash
npm install @supabase/supabase-js
```

### 5.2 Supabase 클라이언트 생성

`src/services/supabase-client.js` 파일 생성:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 5.3 DB 서비스 구현 (`src/services/db-supabase.js`)

기존 `db-sqlite.js`와 동일한 인터페이스를 유지하면서 Supabase로 구현:

```javascript
import { supabase } from './supabase-client';

// 회원 관련 함수 (Supabase Auth 사용)
export const members = {
  // 회원가입 - Supabase Auth 사용
  async create({ email, password, nickname, profileImage = null }) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname,
          profile_image: profileImage,
          role: 'USER'
        }
      }
    });
    
    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error('EMAIL_EXISTS');
      }
      throw authError;
    }
    
    // 프로필 정보 조회 (트리거로 자동 생성됨)
    if (authData.user) {
      return await this.findById(authData.user.id);
    }
    
    throw new Error('Failed to create user');
  },

  // 로그인 - Supabase Auth 사용
  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('INVALID_CREDENTIALS');
      }
      throw error;
    }
    
    if (data.user) {
      return await this.findById(data.user.id);
    }
    
    return null;
  },

  // 현재 로그인한 사용자 조회
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return await this.findById(user.id);
  },

  // 이메일로 사용자 조회
  // 주의: 클라이언트에서는 이메일로 직접 조회 불가
  // 서버 사이드에서만 사용 가능 (Edge Function 또는 Backend API)
  async findByEmail(email, includeInactive = false) {
    // 클라이언트에서는 현재 사용자만 조회 가능
    // 다른 사용자 조회가 필요하면 서버 API를 통해야 함
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== email) return null;
    return await this.findById(user.id, includeInactive);
  },

  // ID로 사용자 조회 (profiles + auth.users)
  async findById(id, includeInactive = false) {
    // 프로필 정보 조회
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('id', id);
    
    if (!includeInactive) {
      query = query.eq('status', 'ACTIVE');
    }
    
    const { data: profile, error: profileError } = await query.single();
    
    if (profileError || !profile) return null;
    
    // 현재 로그인한 사용자인 경우에만 이메일 정보 조회 가능
    const { data: { user } } = await supabase.auth.getUser();
    const email = user && user.id === id ? user.email : null;
    
    return this.mapToMember({
      ...profile,
      email: email || '',
      email_verified: email ? user.email_confirmed_at !== null : false
    });
  },

  // 프로필 수정
  async update(id, { nickname, profileImage }) {
    const updates = {};
    if (nickname !== undefined) updates.nickname = nickname;
    if (profileImage !== undefined) updates.profile_image = profileImage;
    
    if (Object.keys(updates).length === 0) return this.findById(id);
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // 현재 로그인한 사용자인 경우에만 이메일 정보 조회 가능
    const { data: { user } } = await supabase.auth.getUser();
    const email = user && user.id === id ? user.email : '';
    const email_verified = user && user.id === id ? user.email_confirmed_at !== null : false;
    
    return this.mapToMember({
      ...data,
      email,
      email_verified
    });
  },

  // 비밀번호 변경 - Supabase Auth 사용
  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
  },

  // 회원 탈퇴 (soft delete)
  async delete(id) {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'WITHDRAWN' })
      .eq('id', id);
    
    if (error) throw error;
    
    // 실제 계정 삭제를 원하면:
    // await supabase.auth.admin.deleteUser(id);
  },

  // 로그아웃
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  mapToMember(data) {
    return {
      id: data.id,
      email: data.email || '',
      email_verified: data.email_verified || false,
      nickname: data.nickname,
      profileImage: data.profile_image,
      role: data.role,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
};

// 리뷰 관련 함수
export const reviews = {
  async create({ memberId, placeId = null, location, rating, comment, imageUrl = null, tags = [] }) {
    // 리뷰 생성
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        member_id: memberId,
        place_id: placeId,
        location,
        rating,
        comment,
        image_url: imageUrl
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // 태그 추가
    if (tags.length > 0) {
      const tagInserts = tags.map(tag => ({
        review_id: review.id,
        tag
      }));
      
      const { error: tagError } = await supabase
        .from('review_tags')
        .insert(tagInserts);
      
      if (tagError) throw tagError;
    }
    
    return this.findById(review.id);
  },

  async search({ keyword, tags, placeId, memberId, minRating, limit = 50, offset = 0 }) {
    let query = supabase
      .from('reviews')
      .select(`
        *,
        profiles!reviews_member_id_fkey(id, nickname, profile_image),
        places(id, name, region, latitude, longitude)
      `)
      .eq('profiles.status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (placeId) query = query.eq('place_id', placeId);
    if (memberId) query = query.eq('member_id', memberId);
    if (keyword) {
      query = query.or(`location.ilike.%${keyword}%,comment.ilike.%${keyword}%`);
    }
    if (minRating !== undefined) {
      query = query.gte('rating', minRating);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // 태그 필터링 (클라이언트 측에서 처리)
    let filteredData = data || [];
    if (tags && tags.length > 0) {
      const reviewIdsWithTags = await this.getReviewIdsByTags(tags);
      filteredData = filteredData.filter(r => reviewIdsWithTags.includes(r.id));
    }
    
    // 태그 조회
    const reviewsWithTags = await Promise.all(
      filteredData.map(async (review) => {
        const tags = await this.getTagsByReviewId(review.id);
        return {
          ...this.mapToReview(review),
          tags
        };
      })
    );
    
    return { reviews: reviewsWithTags, total: reviewsWithTags.length };
  },

  async findByTag(tag, { limit = 50, offset = 0 } = {}) {
    const { data, error } = await supabase
      .from('review_tags')
      .select('review_id')
      .eq('tag', tag)
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    const reviewIds = data.map(d => d.review_id);
    if (reviewIds.length === 0) return [];
    
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles!reviews_member_id_fkey(id, nickname)
      `)
      .in('id', reviewIds)
      .eq('profiles.status', 'ACTIVE')
      .order('created_at', { ascending: false });
    
    if (reviewsError) throw reviewsError;
    
    return Promise.all(
      (reviews || []).map(async (review) => {
        const tags = await this.getTagsByReviewId(review.id);
        return {
          ...this.mapToReview(review),
          tags
        };
      })
    );
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles!reviews_member_id_fkey(id, nickname, profile_image),
        places(id, name, region, latitude, longitude)
      `)
      .eq('id', id)
      .eq('profiles.status', 'ACTIVE')
      .single();
    
    if (error || !data) return null;
    
    const tags = await this.getTagsByReviewId(id);
    return {
      ...this.mapToReview(data),
      tags
    };
  },

  async update(id, memberId, { location, rating, comment, imageUrl }) {
    const updates = {};
    if (location !== undefined) updates.location = location;
    if (rating !== undefined) updates.rating = rating;
    if (comment !== undefined) updates.comment = comment;
    if (imageUrl !== undefined) updates.image_url = imageUrl;
    
    if (Object.keys(updates).length === 0) return this.findById(id);
    
    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .eq('member_id', memberId)
      .select()
      .single();
    
    if (error) throw error;
    return this.findById(id);
  },

  async delete(id, memberId) {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)
      .eq('member_id', memberId);
    
    if (error) throw error;
  },

  async getTagsByReviewId(reviewId) {
    const { data, error } = await supabase
      .from('review_tags')
      .select('tag')
      .eq('review_id', reviewId);
    
    if (error) return [];
    return data.map(d => d.tag);
  },

  async getReviewIdsByTags(tags) {
    const { data, error } = await supabase
      .from('review_tags')
      .select('review_id')
      .in('tag', tags);
    
    if (error) return [];
    
    // 모든 태그를 가진 리뷰 ID만 반환
    const reviewIdCounts = {};
    data.forEach(d => {
      reviewIdCounts[d.review_id] = (reviewIdCounts[d.review_id] || 0) + 1;
    });
    
    return Object.keys(reviewIdCounts)
      .filter(id => reviewIdCounts[id] === tags.length)
      .map(Number);
  },

  mapToReview(data) {
    return {
      id: data.id,
      member_id: data.member_id,
      place_id: data.place_id,
      location: data.location,
      rating: parseFloat(data.rating),
      comment: data.comment,
      image_url: data.image_url,
      likes_count: data.likes_count,
      replies_count: data.replies_count,
      created_at: data.created_at,
      updated_at: data.updated_at,
      author_nickname: data.profiles?.nickname,
      author_profile_image: data.profiles?.profile_image,
      place_name: data.places?.name,
      place_region: data.places?.region
    };
  }
};

// 게시물 관련 함수 (리뷰와 유사한 패턴)
export const posts = {
  async create({ memberId, category, title, content, imageUrl = null, tags = [] }) {
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        member_id: memberId,
        category,
        title,
        content,
        image_url: imageUrl
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // 태그 추가
    if (tags.length > 0) {
      const tagInserts = tags.map(tag => ({
        post_id: post.id,
        tag
      }));
      
      const { error: tagError } = await supabase
        .from('post_tags')
        .insert(tagInserts);
      
      if (tagError) throw tagError;
    }
    
    return this.findById(post.id);
  },

  async search({ keyword, tags, category, memberId, limit = 50, offset = 0 }) {
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_member_id_fkey(id, nickname, profile_image)
      `)
      .eq('profiles.status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (category) query = query.eq('category', category);
    if (memberId) query = query.eq('member_id', memberId);
    if (keyword) {
      query = query.or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // 태그 필터링 (클라이언트 측에서 처리)
    let filteredData = data || [];
    if (tags && tags.length > 0) {
      const postIdsWithTags = await this.getPostIdsByTags(tags);
      filteredData = filteredData.filter(p => postIdsWithTags.includes(p.id));
    }
    
    // 태그 조회
    const postsWithTags = await Promise.all(
      filteredData.map(async (post) => {
        const tags = await this.getTagsByPostId(post.id);
        return {
          ...this.mapToPost(post),
          tags
        };
      })
    );
    
    return { posts: postsWithTags, total: postsWithTags.length };
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_member_id_fkey(id, nickname, profile_image)
      `)
      .eq('id', id)
      .eq('profiles.status', 'ACTIVE')
      .single();
    
    if (error || !data) return null;
    
    const tags = await this.getTagsByPostId(id);
    return {
      ...this.mapToPost(data),
      tags
    };
  },

  async update(id, memberId, { title, content, imageUrl, category }) {
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (imageUrl !== undefined) updates.image_url = imageUrl;
    if (category !== undefined) updates.category = category;
    
    if (Object.keys(updates).length === 0) return this.findById(id);
    
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .eq('member_id', memberId)
      .select()
      .single();
    
    if (error) throw error;
    return this.findById(id);
  },

  async delete(id, memberId) {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('member_id', memberId);
    
    if (error) throw error;
  },

  async getTagsByPostId(postId) {
    const { data, error } = await supabase
      .from('post_tags')
      .select('tag')
      .eq('post_id', postId);
    
    if (error) return [];
    return data.map(d => d.tag);
  },

  async getPostIdsByTags(tags) {
    const { data, error } = await supabase
      .from('post_tags')
      .select('post_id')
      .in('tag', tags);
    
    if (error) return [];
    
    const postIdCounts = {};
    data.forEach(d => {
      postIdCounts[d.post_id] = (postIdCounts[d.post_id] || 0) + 1;
    });
    
    return Object.keys(postIdCounts)
      .filter(id => postIdCounts[id] === tags.length)
      .map(Number);
  },

  mapToPost(data) {
    return {
      id: data.id,
      member_id: data.member_id,
      category: data.category,
      title: data.title,
      content: data.content,
      image_url: data.image_url,
      views_count: data.views_count,
      likes_count: data.likes_count,
      comments_count: data.comments_count,
      created_at: data.created_at,
      updated_at: data.updated_at,
      author_nickname: data.profiles?.nickname,
      author_profile_image: data.profiles?.profile_image
    };
  }
};

// 장소 관련 함수
export const places = {
  async create({ region, latitude, longitude, name, detailInfo = null, disabledInfo = null, isRecommended = false, dataQuality = null, modifiedAt = null }) {
    const { data, error } = await supabase
      .from('places')
      .insert({
        region,
        latitude,
        longitude,
        name,
        detail_info: detailInfo,
        disabled_info: disabledInfo,
        is_recommended: isRecommended,
        data_quality: dataQuality,
        modified_at: modifiedAt
      })
      .select()
      .single();
    
    if (error) throw error;
    return this.mapToPlace(data);
  },

  async search({ region, keyword, isRecommended, limit = 50, offset = 0 }) {
    let query = supabase
      .from('places')
      .select('*')
      .order('name')
      .range(offset, offset + limit - 1);
    
    if (region) query = query.eq('region', region);
    if (keyword) {
      query = query.or(`name.ilike.%${keyword}%,detail_info.ilike.%${keyword}%`);
    }
    if (isRecommended !== undefined) {
      query = query.eq('is_recommended', isRecommended);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const { count } = await supabase
      .from('places')
      .select('*', { count: 'exact', head: true });
    
    return {
      places: (data || []).map(this.mapToPlace),
      total: count || 0
    };
  },

  async findByRegion(region) {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('region', region)
      .order('name');
    
    if (error) throw error;
    return (data || []).map(this.mapToPlace);
  },

  async findRecommended() {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('is_recommended', true)
      .order('region')
      .order('name');
    
    if (error) throw error;
    return (data || []).map(this.mapToPlace);
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return null;
    return this.mapToPlace(data);
  },

  mapToPlace(data) {
    return {
      id: data.id,
      region: data.region,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      name: data.name,
      detail_info: data.detail_info,
      disabled_info: data.disabled_info,
      is_recommended: data.is_recommended,
      data_quality: data.data_quality,
      modified_at: data.modified_at,
      created_at: data.created_at
    };
  }
};

// 찜 관련 함수
export const wishlists = {
  async add(memberId, targetType, targetId) {
    const { data, error } = await supabase
      .from('wishlists')
      .insert({
        member_id: memberId,
        target_type: targetType,
        target_id: targetId
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // UNIQUE violation
        throw new Error('ALREADY_WISHLISTED');
      }
      throw error;
    }
    
    return {
      id: data.id,
      member_id: data.member_id,
      target_type: data.target_type,
      target_id: data.target_id,
      created_at: data.created_at
    };
  },

  async remove(memberId, targetType, targetId) {
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('member_id', memberId)
      .eq('target_type', targetType)
      .eq('target_id', targetId);
    
    if (error) throw error;
  },

  async isWishlisted(memberId, targetType, targetId) {
    const { data, error } = await supabase
      .from('wishlists')
      .select('id')
      .eq('member_id', memberId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .limit(1)
      .single();
    
    return !error && data !== null;
  },

  async getWishlistIds(memberId, targetType) {
    const { data, error } = await supabase
      .from('wishlists')
      .select('target_id')
      .eq('member_id', memberId)
      .eq('target_type', targetType);
    
    if (error) return [];
    return data.map(d => d.target_id);
  },

  async getWishlist(memberId, targetType, { limit = 50, offset = 0 } = {}) {
    // 타입별로 다른 조인 필요
    // 구현 생략 (복잡하므로 필요시 추가)
    throw new Error('Not implemented yet');
  }
};

// DB 접근 추상화 레이어
export default {
  init: async () => {
    // Supabase는 초기화 불필요
    return Promise.resolve();
  },
  members,
  reviews,
  posts,
  places,
  wishlists
};
```

### 5.4 `db.js` 파일 교체

`src/services/db.js` 파일을 수정하여 Supabase 구현체를 사용:

```javascript
// Supabase 구현체 사용
export { default } from './db-supabase.js';
```

---

## 6. 마이그레이션 체크리스트

### 6.1 Supabase 설정

- [ ] Supabase 프로젝트 생성 완료
- [ ] 프로젝트 URL 및 API 키 확인
- [ ] `.env` 파일 생성 및 환경 변수 설정

### 6.2 테이블 생성

- [ ] `profiles` 테이블 생성 (auth.users와 연동)
- [ ] 프로필 자동 생성 트리거 설정
- [ ] `places` 테이블 생성
- [ ] `reviews` 테이블 생성 (member_id를 UUID로 변경)
- [ ] `review_tags` 테이블 생성
- [ ] `posts` 테이블 생성 (member_id를 UUID로 변경)
- [ ] `post_tags` 테이블 생성
- [ ] `wishlists` 테이블 생성 (member_id를 UUID로 변경)
- [ ] 모든 인덱스 생성 확인
- [ ] 트리거 함수 생성 확인

### 6.3 RLS 설정

- [ ] 모든 테이블에 RLS 활성화
- [ ] 프로필 테이블 정책 설정
- [ ] 리뷰 테이블 정책 설정 (auth.uid() 사용)
- [ ] 게시물 테이블 정책 설정 (auth.uid() 사용)
- [ ] 장소 테이블 정책 설정
- [ ] 찜 테이블 정책 설정 (auth.uid() 사용)
- [ ] 태그 테이블 정책 설정

### 6.4 코드 구현

- [ ] `@supabase/supabase-js` 패키지 설치
- [ ] `supabase-client.js` 생성
- [ ] `db-supabase.js` 구현 (Supabase Auth 사용)
  - [ ] 회원가입: `supabase.auth.signUp()` 사용
  - [ ] 로그인: `supabase.auth.signInWithPassword()` 사용
  - [ ] 현재 사용자: `supabase.auth.getUser()` 사용
  - [ ] 프로필 조회: `profiles` 테이블 사용
- [ ] `db.js` 파일 수정 (Supabase 구현체 사용)
- [ ] `main.jsx`에서 `db.init()` 호출 제거 (Supabase는 불필요)

### 6.5 테스트

- [ ] Supabase Auth 회원가입 테스트
- [ ] Supabase Auth 로그인 테스트
- [ ] 프로필 자동 생성 확인
- [ ] 프로필 조회/수정 테스트
- [ ] 리뷰 CRUD 테스트 (UUID member_id 사용)
- [ ] 게시물 CRUD 테스트 (UUID member_id 사용)
- [ ] 장소 검색 테스트
- [ ] 찜 기능 테스트 (UUID member_id 사용)
- [ ] RLS 정책 테스트 (auth.uid() 동작 확인)

### 6.6 정리

- [ ] `db-sqlite.js` 파일 제거 또는 백업
- [ ] `db-init.js` 파일 제거 또는 백업
- [ ] `sql.js` 패키지 제거 (`package.json`에서)
- [ ] `localStorage` 관련 코드 제거 (필요시)

---

## 7. 주의사항

### 7.1 인증 시스템

**Supabase Auth 사용 (필수)**

Supabase는 `auth.users` 테이블을 기본 인증 테이블로 제공합니다. 별도의 `members` 테이블을 만들지 않고 `auth.users`를 직접 사용합니다:

- `supabase.auth.signUp()` - 회원가입 (자동으로 auth.users에 생성)
- `supabase.auth.signInWithPassword()` - 로그인
- `supabase.auth.signOut()` - 로그아웃
- `supabase.auth.getUser()` - 현재 사용자 조회
- `supabase.auth.updateUser()` - 사용자 정보/비밀번호 변경

**프로필 정보는 `profiles` 테이블에 저장**

- `auth.users`: 이메일, 비밀번호, 인증 관련 정보 (Supabase가 관리)
- `profiles`: 닉네임, 프로필 이미지, 역할 등 추가 정보 (우리가 관리)

### 7.2 UUID 사용

Supabase의 `auth.users` 테이블은 **UUID**를 사용합니다. 따라서:

- ✅ `profiles.id`는 UUID 타입으로 `auth.users.id` 참조
- ✅ `reviews.member_id`, `posts.member_id`, `wishlists.member_id` 모두 UUID로 변경
- ✅ RLS 정책에서 `auth.uid()`는 UUID를 반환하므로 직접 비교 가능

### 7.3 프로필 자동 생성

새 사용자가 가입하면 `handle_new_user()` 트리거가 자동으로 `profiles` 테이블에 레코드를 생성합니다.  
닉네임이 없으면 기본값으로 `'User' + UUID 앞 8자리`를 사용합니다.

### 7.4 클라이언트 vs 서버 API

**클라이언트 측 (브라우저)**:
- `supabase.auth.signUp()` - 회원가입 ✅
- `supabase.auth.signInWithPassword()` - 로그인 ✅
- `supabase.auth.getUser()` - 현재 사용자 조회 ✅
- `supabase.auth.admin.*` - **사용 불가** ❌ (서버 전용)

**서버 측 (Edge Function 또는 Backend)**:
- `supabase.auth.admin.createUser()` - 사용자 생성 ✅
- `supabase.auth.admin.getUserById()` - ID로 사용자 조회 ✅
- `supabase.auth.admin.getUserByEmail()` - 이메일로 사용자 조회 ✅

클라이언트에서 다른 사용자의 이메일을 조회하려면 서버 API를 통해야 합니다.

### 7.3 데이터 마이그레이션

기존 sql.js DB의 데이터를 Supabase로 마이그레이션하려면:

**주의**: `auth.users`는 Supabase Auth를 통해 생성해야 하므로, 기존 회원 데이터는 다음 순서로 마이그레이션:

1. **회원 데이터 마이그레이션**:
   - 각 회원에 대해 `supabase.auth.admin.createUser()` 또는 `supabase.auth.signUp()` 호출
   - 이메일과 비밀번호로 `auth.users` 생성
   - 생성된 UUID를 사용하여 `profiles` 테이블에 프로필 정보 삽입

2. **다른 테이블 데이터 마이그레이션**:
   - `places`: 그대로 마이그레이션 (ID 유지)
   - `reviews`, `posts`, `wishlists`: `member_id`를 기존 BIGINT에서 새 UUID로 매핑 필요
   - 기존 BIGINT ID와 새 UUID 간 매핑 테이블 생성 권장

3. **마이그레이션 스크립트 예시**:
   ```javascript
   // 1. 회원 마이그레이션
   for (const member of oldMembers) {
     const { data: { user }, error } = await supabase.auth.admin.createUser({
       email: member.email,
       password: 'temporary_password', // 사용자가 변경하도록 안내
       email_confirm: true
     });
     
     if (user) {
       // 프로필 생성
       await supabase.from('profiles').insert({
         id: user.id,
         nickname: member.nickname,
         profile_image: member.profile_image,
         role: member.role,
         status: member.status
       });
       
       // ID 매핑 저장
       idMapping[member.id] = user.id;
     }
   }
   
   // 2. 리뷰 마이그레이션
   for (const review of oldReviews) {
     await supabase.from('reviews').insert({
       ...review,
       member_id: idMapping[review.member_id] // BIGINT → UUID 변환
     });
   }
   ```

---

## 8. 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase JavaScript 클라이언트](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)

---

이 가이드를 따라 Supabase 마이그레이션을 진행하세요. 문제가 발생하면 Supabase 대시보드의 로그를 확인하거나 공식 문서를 참고하세요.
