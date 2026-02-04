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

  // 이메일로 사용자 조회 (클라이언트에서는 현재 사용자만)
  async findByEmail(email, includeInactive = false) {
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
    // 실제 계정 삭제는 서버(admin)에서만 수행하는 것을 권장
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
    
    let filteredData = data || [];
    if (tags && tags.length > 0) {
      const reviewIdsWithTags = await this.getReviewIdsByTags(tags);
      filteredData = filteredData.filter(r => reviewIdsWithTags.includes(r.id));
    }
    
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
    
    const { error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .eq('member_id', memberId);
    
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

// 게시물 관련 함수
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
    
    let filteredData = data || [];
    if (tags && tags.length > 0) {
      const postIdsWithTags = await this.getPostIdsByTags(tags);
      filteredData = filteredData.filter(p => postIdsWithTags.includes(p.id));
    }
    
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
    
    const { error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .eq('member_id', memberId);
    
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
      .maybeSingle();
    
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
    // 타입별로 다른 조인이 필요하므로, 필요시 서버 사이드 구현 권장
    throw new Error('Not implemented yet');
  }
};

// DB 접근 추상화 레이어
export default {
  // Supabase는 별도 init 불필요
  init: async () => Promise.resolve(),
  members,
  reviews,
  posts,
  places,
  wishlists
};

