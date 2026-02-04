import initSqlJs from 'sql.js';
import { initDatabase } from './db-init.js';

let db = null;
let SQL = null;

// DB를 IndexedDB에 저장 (안전한 방식으로 변환)
function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    // Uint8Array를 base64로 안전하게 변환 (스택 오버플로우 방지)
    const binary = [];
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
      binary.push(String.fromCharCode(data[i]));
    }
    const buffer = btoa(binary.join(''));
    localStorage.setItem('jeju_reviews_db', buffer);
  } catch (e) {
    console.error('DB 저장 실패:', e);
    // 저장 실패해도 앱은 계속 동작
  }
}

// 저장 디바운싱 (너무 자주 저장하지 않도록)
let saveTimeout = null;
function saveDatabaseDebounced() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveDatabase();
  }, 500); // 500ms 후 저장
}

// DB 초기화 (앱 시작 시 한 번만 호출)
export async function init() {
  if (db) return; // 이미 초기화됨

  try {
    SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`
    });

    // IndexedDB에서 기존 DB 로드 시도
    const savedDb = localStorage.getItem('jeju_reviews_db');
    if (savedDb) {
      const buffer = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
      await initDatabase(db);
      saveDatabase(); // 초기 생성 후 저장
    }
  } catch (e) {
    console.error('DB 초기화 실패:', e);
    throw e;
  }
}

// 헬퍼 함수: 쿼리 결과를 객체 배열로 변환
function resultToObjects(result, columns) {
  if (result.length === 0 || result[0].values.length === 0) return [];
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

// 헬퍼 함수: 단일 행 조회
function resultToObject(result, columns) {
  if (result.length === 0 || result[0].values.length === 0) return null;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  return obj;
}

// 회원 관련 함수
export const members = {
  async create({ email, passwordHash, nickname, profileImage = null }) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    try {
      db.run(
        'INSERT INTO members (email, password_hash, nickname, profile_image) VALUES (?, ?, ?, ?)',
        [email, passwordHash, nickname, profileImage]
      );
      saveDatabaseDebounced();
      
      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0]?.values[0][0];
      
      return this.findById(id);
    } catch (e) {
      if (e.message.includes('UNIQUE constraint')) {
        throw new Error('EMAIL_EXISTS');
      }
      throw e;
    }
  },

  async findByEmail(email, includeInactive = false) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    let query = 'SELECT id, email, password_hash, nickname, profile_image, role, status, created_at FROM members WHERE email = ?';
    const params = [email];
    
    if (!includeInactive) {
      query += ' AND status = ?';
      params.push('ACTIVE');
    }
    
    const result = db.exec(query, params);
    
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    return {
      id: row[0],
      email: row[1],
      passwordHash: row[2],
      nickname: row[3],
      profileImage: row[4],
      role: row[5],
      status: row[6],
      created_at: row[7]
    };
  },

  async findById(id, includeInactive = false) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    let query = 'SELECT id, email, nickname, profile_image, role, status, created_at FROM members WHERE id = ?';
    const params = [id];
    
    if (!includeInactive) {
      query += ' AND status = ?';
      params.push('ACTIVE');
    }
    
    const result = db.exec(query, params);
    
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    return {
      id: row[0],
      email: row[1],
      nickname: row[2],
      profileImage: row[3],
      role: row[4],
      status: row[5],
      created_at: row[6]
    };
  },

  async update(id, { nickname, profileImage }) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const updates = [];
    const params = [];
    
    if (nickname !== undefined) {
      updates.push('nickname = ?');
      params.push(nickname);
    }
    if (profileImage !== undefined) {
      updates.push('profile_image = ?');
      params.push(profileImage);
    }
    
    if (updates.length === 0) return this.findById(id);
    
    updates.push("updated_at = datetime('now')");
    params.push(id);
    
    db.run(
      `UPDATE members SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    saveDatabaseDebounced();
    
    return this.findById(id);
  },

  async updatePassword(id, newPasswordHash) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    db.run(
      "UPDATE members SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      [newPasswordHash, id]
    );
    saveDatabaseDebounced();
  },

  async delete(id) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    db.run(
      "UPDATE members SET status = 'WITHDRAWN', updated_at = datetime('now') WHERE id = ?",
      [id]
    );
    saveDatabaseDebounced();
  }
};

// 리뷰 관련 함수
export const reviews = {
  async create({ memberId, placeId = null, location, rating, comment, imageUrl = null, tags = [] }) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    db.run(
      'INSERT INTO reviews (member_id, place_id, location, rating, comment, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [memberId, placeId, location, rating, comment, imageUrl]
    );
    
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0]?.values[0][0];
    
    // 태그 추가
    if (tags.length > 0) {
      for (const tag of tags) {
        db.run('INSERT INTO review_tags (review_id, tag) VALUES (?, ?)', [id, tag]);
      }
    }
    
    saveDatabaseDebounced();
    return this.findById(id);
  },

  async search({ keyword, tags, placeId, memberId, minRating, limit = 50, offset = 0 }) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    let query = `
      SELECT r.id, r.member_id, r.place_id, r.location, r.rating, r.comment, r.image_url,
             r.likes_count, r.replies_count, r.created_at,
             m.nickname AS author_nickname, m.profile_image AS author_profile_image,
             p.name AS place_name, p.region AS place_region
      FROM reviews r
      JOIN members m ON r.member_id = m.id
      LEFT JOIN places p ON r.place_id = p.id
      WHERE m.status = 'ACTIVE'
    `;
    const params = [];
    
    if (placeId) {
      query += ' AND r.place_id = ?';
      params.push(placeId);
    }
    
    if (memberId) {
      query += ' AND r.member_id = ?';
      params.push(memberId);
    }
    
    if (keyword) {
      query += ' AND (r.location LIKE ? OR r.comment LIKE ?)';
      const keywordParam = `%${keyword}%`;
      params.push(keywordParam, keywordParam);
    }
    
    if (minRating !== undefined) {
      query += ' AND r.rating >= ?';
      params.push(minRating);
    }
    
    if (tags && tags.length > 0) {
      query += ` AND r.id IN (
        SELECT review_id FROM review_tags WHERE tag IN (${tags.map(() => '?').join(',')})
        GROUP BY review_id
        HAVING COUNT(DISTINCT tag) = ?
      )`;
      params.push(...tags, tags.length);
    }
    
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const result = db.exec(query, params);
    
    if (result.length === 0) {
      return { reviews: [], total: 0 };
    }
    
    const reviews = resultToObjects(result, [
      'id', 'member_id', 'place_id', 'location', 'rating', 'comment', 'image_url',
      'likes_count', 'replies_count', 'created_at',
      'author_nickname', 'author_profile_image', 'place_name', 'place_region'
    ]);
    
    // 태그 조회
    for (const review of reviews) {
      const tagResult = db.exec(
        'SELECT tag FROM review_tags WHERE review_id = ?',
        [review.id]
      );
      review.tags = tagResult.length > 0 
        ? tagResult[0].values.map(row => row[0])
        : [];
    }
    
    // 전체 개수 조회
    let countQuery = 'SELECT COUNT(*) as count FROM reviews r JOIN members m ON r.member_id = m.id WHERE m.status = ?';
    const countParams = ['ACTIVE'];
    
    if (placeId) {
      countQuery += ' AND r.place_id = ?';
      countParams.push(placeId);
    }
    if (memberId) {
      countQuery += ' AND r.member_id = ?';
      countParams.push(memberId);
    }
    if (keyword) {
      countQuery += ' AND (r.location LIKE ? OR r.comment LIKE ?)';
      const keywordParam = `%${keyword}%`;
      countParams.push(keywordParam, keywordParam);
    }
    if (minRating !== undefined) {
      countQuery += ' AND r.rating >= ?';
      countParams.push(minRating);
    }
    if (tags && tags.length > 0) {
      countQuery += ` AND r.id IN (
        SELECT review_id FROM review_tags WHERE tag IN (${tags.map(() => '?').join(',')})
        GROUP BY review_id
        HAVING COUNT(DISTINCT tag) = ?
      )`;
      countParams.push(...tags, tags.length);
    }
    
    const countResult = db.exec(countQuery, countParams);
    const total = countResult[0]?.values[0][0] || 0;
    
    return { reviews, total };
  },

  async findByTag(tag, { limit = 50, offset = 0 } = {}) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const result = db.exec(
      `SELECT r.id, r.member_id, r.location, r.rating, r.comment, r.image_url,
              r.likes_count, r.replies_count, r.created_at,
              m.nickname AS author_nickname
       FROM reviews r
       JOIN members m ON r.member_id = m.id
       JOIN review_tags rt ON r.id = rt.review_id
       WHERE rt.tag = ? AND m.status = 'ACTIVE'
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [tag, limit, offset]
    );
    
    const reviews = resultToObjects(result, [
      'id', 'member_id', 'location', 'rating', 'comment', 'image_url',
      'likes_count', 'replies_count', 'created_at', 'author_nickname'
    ]);
    
    // 태그 조회
    for (const review of reviews) {
      const tagResult = db.exec(
        'SELECT tag FROM review_tags WHERE review_id = ?',
        [review.id]
      );
      review.tags = tagResult.length > 0 
        ? tagResult[0].values.map(row => row[0])
        : [];
    }
    
    return reviews;
  },

  async findById(id) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const result = db.exec(
      `SELECT r.id, r.member_id, r.place_id, r.location, r.rating, r.comment, r.image_url,
              r.likes_count, r.replies_count, r.created_at, r.updated_at,
              m.nickname AS author_nickname, m.profile_image AS author_profile_image,
              p.name AS place_name, p.region AS place_region, p.latitude, p.longitude
       FROM reviews r
       JOIN members m ON r.member_id = m.id
       LEFT JOIN places p ON r.place_id = p.id
       WHERE r.id = ? AND m.status = 'ACTIVE'`,
      [id]
    );
    
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    const review = {
      id: row[0],
      member_id: row[1],
      place_id: row[2],
      location: row[3],
      rating: row[4],
      comment: row[5],
      image_url: row[6],
      likes_count: row[7],
      replies_count: row[8],
      created_at: row[9],
      updated_at: row[10],
      author: {
        nickname: row[11],
        profile_image: row[12]
      },
      place: row[13] ? {
        name: row[13],
        region: row[14],
        latitude: row[15],
        longitude: row[16]
      } : null
    };
    
    // 태그 조회
    const tagResult = db.exec(
      'SELECT tag FROM review_tags WHERE review_id = ?',
      [review.id]
    );
    review.tags = tagResult.length > 0 
      ? tagResult[0].values.map(row => row[0])
      : [];
    
    return review;
  },

  async update(id, memberId, { location, rating, comment, imageUrl }) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const updates = [];
    const params = [];
    
    if (location !== undefined) {
      updates.push('location = ?');
      params.push(location);
    }
    if (rating !== undefined) {
      updates.push('rating = ?');
      params.push(rating);
    }
    if (comment !== undefined) {
      updates.push('comment = ?');
      params.push(comment);
    }
    if (imageUrl !== undefined) {
      updates.push('image_url = ?');
      params.push(imageUrl);
    }
    
    if (updates.length === 0) return this.findById(id);
    
    updates.push("updated_at = datetime('now')");
    params.push(id, memberId);
    
    db.run(
      `UPDATE reviews SET ${updates.join(', ')} WHERE id = ? AND member_id = ?`,
      params
    );
    saveDatabaseDebounced();
    
    return this.findById(id);
  },

  async delete(id, memberId) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    db.run('DELETE FROM reviews WHERE id = ? AND member_id = ?', [id, memberId]);
    saveDatabaseDebounced();
  }
};

// 게시물 관련 함수
export const posts = {
  async create({ memberId, category = 'GENERAL', title, content, imageUrl = null, tags = [] }) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    db.run(
      'INSERT INTO posts (member_id, category, title, content, image_url) VALUES (?, ?, ?, ?, ?)',
      [memberId, category, title, content, imageUrl]
    );
    
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0]?.values[0][0];
    
    // 태그 추가
    if (tags.length > 0) {
      for (const tag of tags) {
        db.run('INSERT INTO post_tags (post_id, tag) VALUES (?, ?)', [id, tag]);
      }
    }
    
    saveDatabaseDebounced();
    return this.findById(id);
  },

  async search({ keyword, category, memberId, limit = 50, offset = 0 }) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    let query = `
      SELECT p.id, p.member_id, p.category, p.title, p.content, p.image_url,
             p.views_count, p.likes_count, p.comments_count, p.created_at,
             m.nickname AS author_nickname, m.profile_image AS author_profile_image
      FROM posts p
      JOIN members m ON p.member_id = m.id
      WHERE m.status = 'ACTIVE'
    `;
    const params = [];
    
    if (category) {
      query += ' AND p.category = ?';
      params.push(category);
    }
    
    if (memberId) {
      query += ' AND p.member_id = ?';
      params.push(memberId);
    }
    
    if (keyword) {
      query += ' AND (p.title LIKE ? OR p.content LIKE ?)';
      const keywordParam = `%${keyword}%`;
      params.push(keywordParam, keywordParam);
    }
    
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const result = db.exec(query, params);
    
    if (result.length === 0) {
      return { posts: [], total: 0 };
    }
    
    const posts = resultToObjects(result, [
      'id', 'member_id', 'category', 'title', 'content', 'image_url',
      'views_count', 'likes_count', 'comments_count', 'created_at',
      'author_nickname', 'author_profile_image'
    ]);
    
    // 태그 조회
    for (const post of posts) {
      const tagResult = db.exec(
        'SELECT tag FROM post_tags WHERE post_id = ?',
        [post.id]
      );
      post.tags = tagResult.length > 0 
        ? tagResult[0].values.map(row => row[0])
        : [];
    }
    
    // 전체 개수 조회
    let countQuery = 'SELECT COUNT(*) as count FROM posts p JOIN members m ON p.member_id = m.id WHERE m.status = ?';
    const countParams = ['ACTIVE'];
    
    if (category) {
      countQuery += ' AND p.category = ?';
      countParams.push(category);
    }
    if (memberId) {
      countQuery += ' AND p.member_id = ?';
      countParams.push(memberId);
    }
    if (keyword) {
      countQuery += ' AND (p.title LIKE ? OR p.content LIKE ?)';
      const keywordParam = `%${keyword}%`;
      countParams.push(keywordParam, keywordParam);
    }
    
    const countResult = db.exec(countQuery, countParams);
    const total = countResult[0]?.values[0][0] || 0;
    
    return { posts, total };
  },

  async findByCategory(category, { limit = 50, offset = 0 } = {}) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const result = db.exec(
      `SELECT p.id, p.member_id, p.category, p.title, p.content, p.image_url,
              p.views_count, p.likes_count, p.comments_count, p.created_at,
              m.nickname AS author_nickname
       FROM posts p
       JOIN members m ON p.member_id = m.id
       WHERE p.category = ? AND m.status = 'ACTIVE'
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [category, limit, offset]
    );
    
    const posts = resultToObjects(result, [
      'id', 'member_id', 'category', 'title', 'content', 'image_url',
      'views_count', 'likes_count', 'comments_count', 'created_at', 'author_nickname'
    ]);
    
    // 태그 조회
    for (const post of posts) {
      const tagResult = db.exec(
        'SELECT tag FROM post_tags WHERE post_id = ?',
        [post.id]
      );
      post.tags = tagResult.length > 0 
        ? tagResult[0].values.map(row => row[0])
        : [];
    }
    
    return posts;
  },

  async findById(id) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const result = db.exec(
      `SELECT p.id, p.member_id, p.category, p.title, p.content, p.image_url,
              p.views_count, p.likes_count, p.comments_count, p.created_at, p.updated_at,
              m.nickname AS author_nickname, m.profile_image AS author_profile_image
       FROM posts p
       JOIN members m ON p.member_id = m.id
       WHERE p.id = ? AND m.status = 'ACTIVE'`,
      [id]
    );
    
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    const post = {
      id: row[0],
      member_id: row[1],
      category: row[2],
      title: row[3],
      content: row[4],
      image_url: row[5],
      views_count: row[6],
      likes_count: row[7],
      comments_count: row[8],
      created_at: row[9],
      updated_at: row[10],
      author: {
        nickname: row[11],
        profile_image: row[12]
      }
    };
    
    // 태그 조회
    const tagResult = db.exec(
      'SELECT tag FROM post_tags WHERE post_id = ?',
      [post.id]
    );
    post.tags = tagResult.length > 0 
      ? tagResult[0].values.map(row => row[0])
      : [];
    
    return post;
  },

  async incrementViews(id) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    db.run('UPDATE posts SET views_count = views_count + 1 WHERE id = ?', [id]);
    saveDatabaseDebounced();
  },

  async update(id, memberId, { title, content, imageUrl, category }) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const updates = [];
    const params = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    if (imageUrl !== undefined) {
      updates.push('image_url = ?');
      params.push(imageUrl);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    
    if (updates.length === 0) return this.findById(id);
    
    updates.push("updated_at = datetime('now')");
    params.push(id, memberId);
    
    db.run(
      `UPDATE posts SET ${updates.join(', ')} WHERE id = ? AND member_id = ?`,
      params
    );
    saveDatabaseDebounced();
    
    return this.findById(id);
  },

  async delete(id, memberId) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    db.run('DELETE FROM posts WHERE id = ? AND member_id = ?', [id, memberId]);
    saveDatabaseDebounced();
  }
};

// 장소 관련 함수
export const places = {
  async create({ region, latitude, longitude, name, detailInfo = null, disabledInfo = null, isRecommended = false, dataQuality = null, modifiedAt = null }) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    db.run(
      'INSERT INTO places (region, latitude, longitude, name, detail_info, disabled_info, is_recommended, data_quality, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [region, latitude, longitude, name, detailInfo, disabledInfo, isRecommended ? 1 : 0, dataQuality, modifiedAt]
    );
    
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0]?.values[0][0];
    
    saveDatabaseDebounced();
    return this.findById(id);
  },

  async search({ region, keyword, isRecommended, limit = 50, offset = 0 }) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    let query = `
      SELECT id, region, latitude, longitude, name, detail_info, disabled_info,
             is_recommended, data_quality, modified_at
      FROM places
      WHERE 1=1
    `;
    const params = [];
    
    if (region) {
      query += ' AND region = ?';
      params.push(region);
    }
    
    if (keyword) {
      query += ' AND (name LIKE ? OR detail_info LIKE ?)';
      const keywordParam = `%${keyword}%`;
      params.push(keywordParam, keywordParam);
    }
    
    if (isRecommended !== undefined) {
      query += ' AND is_recommended = ?';
      params.push(isRecommended ? 1 : 0);
    }
    
    query += ' ORDER BY name LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const result = db.exec(query, params);
    
    if (result.length === 0) {
      return { places: [], total: 0 };
    }
    
    const places = resultToObjects(result, [
      'id', 'region', 'latitude', 'longitude', 'name', 'detail_info', 'disabled_info',
      'is_recommended', 'data_quality', 'modified_at'
    ]).map(p => ({
      ...p,
      is_recommended: p.is_recommended === 1
    }));
    
    // 전체 개수 조회
    let countQuery = 'SELECT COUNT(*) as count FROM places WHERE 1=1';
    const countParams = [];
    
    if (region) {
      countQuery += ' AND region = ?';
      countParams.push(region);
    }
    if (keyword) {
      countQuery += ' AND (name LIKE ? OR detail_info LIKE ?)';
      const keywordParam = `%${keyword}%`;
      countParams.push(keywordParam, keywordParam);
    }
    if (isRecommended !== undefined) {
      countQuery += ' AND is_recommended = ?';
      countParams.push(isRecommended ? 1 : 0);
    }
    
    const countResult = db.exec(countQuery, countParams);
    const total = countResult[0]?.values[0][0] || 0;
    
    return { places, total };
  },

  async findByRegion(region) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const result = db.exec(
      'SELECT id, region, latitude, longitude, name, detail_info, disabled_info, is_recommended, data_quality, modified_at FROM places WHERE region = ? ORDER BY name',
      [region]
    );
    
    return resultToObjects(result, [
      'id', 'region', 'latitude', 'longitude', 'name', 'detail_info', 'disabled_info',
      'is_recommended', 'data_quality', 'modified_at'
    ]).map(p => ({
      ...p,
      is_recommended: p.is_recommended === 1
    }));
  },

  async findRecommended() {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const result = db.exec(
      'SELECT id, region, latitude, longitude, name, detail_info, disabled_info, is_recommended, data_quality, modified_at FROM places WHERE is_recommended = 1 ORDER BY region, name'
    );
    
    return resultToObjects(result, [
      'id', 'region', 'latitude', 'longitude', 'name', 'detail_info', 'disabled_info',
      'is_recommended', 'data_quality', 'modified_at'
    ]).map(p => ({
      ...p,
      is_recommended: p.is_recommended === 1
    }));
  },

  async findById(id) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const result = db.exec(
      'SELECT id, region, latitude, longitude, name, detail_info, disabled_info, is_recommended, data_quality, modified_at, created_at FROM places WHERE id = ?',
      [id]
    );
    
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    return {
      id: row[0],
      region: row[1],
      latitude: row[2],
      longitude: row[3],
      name: row[4],
      detail_info: row[5],
      disabled_info: row[6],
      is_recommended: row[7] === 1,
      data_quality: row[8],
      modified_at: row[9],
      created_at: row[10]
    };
  }
};

// 찜 관련 함수
export const wishlists = {
  async add(memberId, targetType, targetId) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    try {
      db.run(
        'INSERT INTO wishlists (member_id, target_type, target_id) VALUES (?, ?, ?)',
        [memberId, targetType, targetId]
      );
      saveDatabaseDebounced();
      
      const result = db.exec(
        'SELECT id, member_id, target_type, target_id, created_at FROM wishlists WHERE member_id = ? AND target_type = ? AND target_id = ?',
        [memberId, targetType, targetId]
      );
      
      const row = result[0].values[0];
      return {
        id: row[0],
        member_id: row[1],
        target_type: row[2],
        target_id: row[3],
        created_at: row[4]
      };
    } catch (e) {
      if (e.message.includes('UNIQUE constraint')) {
        throw new Error('ALREADY_WISHLISTED');
      }
      throw e;
    }
  },

  async remove(memberId, targetType, targetId) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    db.run(
      'DELETE FROM wishlists WHERE member_id = ? AND target_type = ? AND target_id = ?',
      [memberId, targetType, targetId]
    );
    saveDatabaseDebounced();
  },

  async isWishlisted(memberId, targetType, targetId) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const result = db.exec(
      'SELECT 1 FROM wishlists WHERE member_id = ? AND target_type = ? AND target_id = ? LIMIT 1',
      [memberId, targetType, targetId]
    );
    
    return result.length > 0 && result[0].values.length > 0;
  },

  async getWishlistIds(memberId, targetType) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    const result = db.exec(
      'SELECT target_id FROM wishlists WHERE member_id = ? AND target_type = ?',
      [memberId, targetType]
    );
    
    if (result.length === 0) return [];
    return result[0].values.map(row => row[0]);
  },

  async getWishlist(memberId, targetType, { limit = 50, offset = 0 } = {}) {
    if (!db) throw new Error('DB not initialized. Call db.init() first.');
    
    if (targetType === 'REVIEW') {
      const result = db.exec(
        `SELECT w.id, w.created_at AS wishlisted_at,
                r.id AS review_id, r.member_id, r.location, r.rating, r.comment, r.image_url,
                r.likes_count, r.replies_count, r.created_at,
                m.nickname AS author_nickname, m.profile_image AS author_profile_image
         FROM wishlists w
         JOIN reviews r ON w.target_id = r.id
         JOIN members m ON r.member_id = m.id
         WHERE w.member_id = ? AND w.target_type = 'REVIEW' AND m.status = 'ACTIVE'
         ORDER BY w.created_at DESC
         LIMIT ? OFFSET ?`,
        [memberId, limit, offset]
      );
      
      const wishlists = resultToObjects(result, [
        'id', 'wishlisted_at', 'review_id', 'member_id', 'location', 'rating', 'comment', 'image_url',
        'likes_count', 'replies_count', 'created_at', 'author_nickname', 'author_profile_image'
      ]);
      
      // 태그 조회
      for (const item of wishlists) {
        const tagResult = db.exec(
          'SELECT tag FROM review_tags WHERE review_id = ?',
          [item.review_id]
        );
        item.review = {
          id: item.review_id,
          member_id: item.member_id,
          location: item.location,
          rating: item.rating,
          comment: item.comment,
          image_url: item.image_url,
          likes_count: item.likes_count,
          replies_count: item.replies_count,
          created_at: item.created_at,
          author: {
            nickname: item.author_nickname,
            profile_image: item.author_profile_image
          },
          tags: tagResult.length > 0 
            ? tagResult[0].values.map(row => row[0])
            : []
        };
        delete item.review_id;
        delete item.member_id;
        delete item.location;
        delete item.rating;
        delete item.comment;
        delete item.image_url;
        delete item.likes_count;
        delete item.replies_count;
        delete item.created_at;
        delete item.author_nickname;
        delete item.author_profile_image;
      }
      
      const countResult = db.exec(
        'SELECT COUNT(*) as count FROM wishlists WHERE member_id = ? AND target_type = ?',
        [memberId, targetType]
      );
      const total = countResult[0]?.values[0][0] || 0;
      
      return { wishlists, total };
    } else if (targetType === 'POST') {
      const result = db.exec(
        `SELECT w.id, w.created_at AS wishlisted_at,
                p.id AS post_id, p.member_id, p.category, p.title, p.content, p.image_url,
                p.views_count, p.likes_count, p.comments_count, p.created_at,
                m.nickname AS author_nickname, m.profile_image AS author_profile_image
         FROM wishlists w
         JOIN posts p ON w.target_id = p.id
         JOIN members m ON p.member_id = m.id
         WHERE w.member_id = ? AND w.target_type = 'POST' AND m.status = 'ACTIVE'
         ORDER BY w.created_at DESC
         LIMIT ? OFFSET ?`,
        [memberId, limit, offset]
      );
      
      const wishlists = resultToObjects(result, [
        'id', 'wishlisted_at', 'post_id', 'member_id', 'category', 'title', 'content', 'image_url',
        'views_count', 'likes_count', 'comments_count', 'created_at', 'author_nickname', 'author_profile_image'
      ]);
      
      // 태그 조회
      for (const item of wishlists) {
        const tagResult = db.exec(
          'SELECT tag FROM post_tags WHERE post_id = ?',
          [item.post_id]
        );
        item.post = {
          id: item.post_id,
          member_id: item.member_id,
          category: item.category,
          title: item.title,
          content: item.content,
          image_url: item.image_url,
          views_count: item.views_count,
          likes_count: item.likes_count,
          comments_count: item.comments_count,
          created_at: item.created_at,
          author: {
            nickname: item.author_nickname,
            profile_image: item.author_profile_image
          },
          tags: tagResult.length > 0 
            ? tagResult[0].values.map(row => row[0])
            : []
        };
        delete item.post_id;
        delete item.member_id;
        delete item.category;
        delete item.title;
        delete item.content;
        delete item.image_url;
        delete item.views_count;
        delete item.likes_count;
        delete item.comments_count;
        delete item.created_at;
        delete item.author_nickname;
        delete item.author_profile_image;
      }
      
      const countResult = db.exec(
        'SELECT COUNT(*) as count FROM wishlists WHERE member_id = ? AND target_type = ?',
        [memberId, targetType]
      );
      const total = countResult[0]?.values[0][0] || 0;
      
      return { wishlists, total };
    } else if (targetType === 'PLACE') {
      const result = db.exec(
        `SELECT w.id, w.created_at AS wishlisted_at,
                pl.id AS place_id, pl.region, pl.latitude, pl.longitude, pl.name,
                pl.detail_info, pl.disabled_info, pl.is_recommended
         FROM wishlists w
         JOIN places pl ON w.target_id = pl.id
         WHERE w.member_id = ? AND w.target_type = 'PLACE'
         ORDER BY w.created_at DESC
         LIMIT ? OFFSET ?`,
        [memberId, limit, offset]
      );
      
      const wishlists = resultToObjects(result, [
        'id', 'wishlisted_at', 'place_id', 'region', 'latitude', 'longitude', 'name',
        'detail_info', 'disabled_info', 'is_recommended'
      ]).map(item => {
        item.place = {
          id: item.place_id,
          region: item.region,
          latitude: item.latitude,
          longitude: item.longitude,
          name: item.name,
          detail_info: item.detail_info,
          disabled_info: item.disabled_info,
          is_recommended: item.is_recommended === 1
        };
        delete item.place_id;
        delete item.region;
        delete item.latitude;
        delete item.longitude;
        delete item.name;
        delete item.detail_info;
        delete item.disabled_info;
        delete item.is_recommended;
        return item;
      });
      
      const countResult = db.exec(
        'SELECT COUNT(*) as count FROM wishlists WHERE member_id = ? AND target_type = ?',
        [memberId, targetType]
      );
      const total = countResult[0]?.values[0][0] || 0;
      
      return { wishlists, total };
    }
    
    throw new Error(`Invalid target_type: ${targetType}`);
  }
};

// DB 접근 추상화 레이어 (다른 팀원이 사용, Supabase 마이그레이션용)
export default {
  init,
  members,
  reviews,
  posts,
  places,
  wishlists
};
