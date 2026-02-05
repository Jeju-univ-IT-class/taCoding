-- 무장애 여행 정보 테이블 (탐색 탭 스크롤 목록 데이터)
-- CSV 컬럼: 이름, 주소, 위도, 경도

CREATE TABLE IF NOT EXISTS barrier_free_places (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_barrier_free_places_name ON barrier_free_places(name);
CREATE INDEX IF NOT EXISTS idx_barrier_free_places_location ON barrier_free_places(latitude, longitude);

-- updated_at 자동 갱신 (함수는 이미 있을 수 있음)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_barrier_free_places_updated_at ON barrier_free_places;
CREATE TRIGGER update_barrier_free_places_updated_at
  BEFORE UPDATE ON barrier_free_places
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE barrier_free_places ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 조회 가능 (탐색 탭 목록용)
CREATE POLICY "Anyone can view barrier_free_places"
  ON barrier_free_places FOR SELECT
  USING (true);

-- 로그인 사용자만 생성/수정/삭제 (CRUD)
-- 시드/임포트 시에는 Supabase 대시 SQL Editor 또는 service_role 키로 INSERT 하세요.
CREATE POLICY "Authenticated can insert barrier_free_places"
  ON barrier_free_places FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update barrier_free_places"
  ON barrier_free_places FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete barrier_free_places"
  ON barrier_free_places FOR DELETE
  USING (auth.uid() IS NOT NULL);
