// DB 초기화 및 스키마 생성
// SQLite 문법에 맞게 변환 (AUTO_INCREMENT -> AUTOINCREMENT, DATETIME -> TEXT 등)

export async function initDatabase(db) {
  // 1. 회원 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      profile_image TEXT,
      role TEXT NOT NULL DEFAULT 'USER',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_members_email ON members(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_members_status ON members(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_members_nickname ON members(nickname)`);

  // 2. 장소 테이블 (리뷰보다 먼저 생성해야 FK 참조 가능)
  db.run(`
    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      name TEXT NOT NULL,
      detail_info TEXT,
      disabled_info TEXT,
      is_recommended INTEGER NOT NULL DEFAULT 0,
      data_quality TEXT,
      modified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_places_region ON places(region)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_places_location ON places(latitude, longitude)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_places_name ON places(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_places_recommended ON places(is_recommended)`);

  // 3. 리뷰 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      place_id INTEGER,
      location TEXT NOT NULL,
      rating REAL NOT NULL,
      comment TEXT NOT NULL,
      image_url TEXT,
      likes_count INTEGER NOT NULL DEFAULT 0,
      replies_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE SET NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_member ON reviews(member_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_place ON reviews(place_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating)`);

  // 4. 리뷰-태그 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS review_tags (
      review_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (review_id, tag),
      FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_review_tags_tag ON review_tags(tag)`);

  // 5. 게시물 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'GENERAL',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      views_count INTEGER NOT NULL DEFAULT 0,
      likes_count INTEGER NOT NULL DEFAULT 0,
      comments_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_posts_member ON posts(member_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at)`);

  // 6. 게시물-태그 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS post_tags (
      post_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (post_id, tag),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag)`);

  // 7. 찜 테이블 (확장 버전)
  db.run(`
    CREATE TABLE IF NOT EXISTS wishlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(member_id, target_type, target_id),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_wishlists_member ON wishlists(member_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wishlists_target ON wishlists(target_type, target_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wishlists_created ON wishlists(created_at)`);

  // Mock 데이터는 제거됨 - Supabase 마이그레이션 후 실제 데이터 사용
}
