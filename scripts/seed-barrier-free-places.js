/**
 * 무장애여행정보.csv → Supabase barrier_free_places 시드
 *
 * 사용법:
 * 1. CSV 파일을 UTF-8로 저장했는지 확인 (한글이 깨지면 엑셀/메모장에서 UTF-8로 다시 저장)
 * 2. node scripts/seed-barrier-free-places.js
 * 3. 생성된 scripts/seed-barrier-free-places.sql 을 Supabase 대시보드 → SQL Editor에서 실행
 *
 * 또는 Supabase API로 직접 넣기 (RLS 우회용 service_role 키 필요):
 *   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed-barrier-free-places.js --api
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', '무장애여행정보.csv');
const SQL_OUT_PATH = path.join(__dirname, 'seed-barrier-free-places.sql');

// CSV 한 줄 파싱 (쉼표 구분, 따옴표 안의 쉼표는 미지원)
function parseCsvLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\r' && !inQuotes)) {
      parts.push(current.trim());
      current = '';
      if (c === '\r') break;
    } else {
      current += c;
    }
  }
  parts.push(current.trim());
  return parts;
}

function escapeSql(str) {
  if (str == null || str === '') return '';
  return String(str).replace(/'/g, "''");
}

function main() {
  const useApi = process.argv.includes('--api');
  let raw;
  try {
    raw = fs.readFileSync(CSV_PATH, 'utf8');
  } catch (e) {
    console.error('CSV 파일을 읽을 수 없습니다. 경로:', CSV_PATH);
    console.error('한글 인코딩이 깨지면 CSV를 UTF-8로 저장한 뒤 다시 실행하세요.');
    process.exit(1);
  }

  const lines = raw.split(/\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error('CSV에 헤더 외 데이터가 없습니다.');
    process.exit(1);
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    // 컬럼: 이름(0), 주소(1), 위도(2), 경도(3)
    const name = (cols[0] || '').trim();
    const address = (cols[1] || '').trim();
    const lat = parseFloat(cols[2]);
    const lng = parseFloat(cols[3]);
    if (!name || Number.isNaN(lat) || Number.isNaN(lng)) continue;
    rows.push({ name, address, lat, lng });
  }

  console.log(`파싱된 행: ${rows.length}개`);

  if (useApi) {
    runApiSeed(rows);
    return;
  }

  // SQL 파일 생성
  const sqlLines = [
    '-- 무장애 여행 정보 시드 (barrier_free_places)',
    '-- 기존 데이터 삭제 후 삽입하려면 아래 주석 해제',
    '-- TRUNCATE barrier_free_places RESTART IDENTITY;',
    ''
  ];
  for (const r of rows) {
    const nameEsc = escapeSql(r.name);
    const addressEsc = escapeSql(r.address);
    sqlLines.push(
      `INSERT INTO barrier_free_places (name, address, latitude, longitude) VALUES ('${nameEsc}', '${addressEsc}', ${r.lat}, ${r.lng});`
    );
  }
  fs.writeFileSync(SQL_OUT_PATH, sqlLines.join('\n'), 'utf8');
  console.log(`생성됨: ${SQL_OUT_PATH}`);
  console.log('Supabase 대시보드 → SQL Editor에서 이 파일 내용을 실행하세요.');
}

async function runApiSeed(rows) {
  try {
    require('dotenv').config();
  } catch (_) {}
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('.env에 VITE_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY(또는 VITE_SUPABASE_ANON_KEY)를 설정하세요.');
    console.error('RLS로 INSERT가 막혀 있으면 service_role 키를 사용해야 합니다.');
    process.exit(1);
  }
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(url, key);
  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => ({
      name: r.name,
      address: r.address || null,
      latitude: r.lat,
      longitude: r.lng
    }));
    const { error } = await supabase.from('barrier_free_places').insert(chunk);
    if (error) {
      console.error('INSERT 실패:', error.message);
      process.exit(1);
    }
    console.log(`삽입: ${i + chunk.length}/${rows.length}`);
  }
  console.log('시드 완료.');
}

main();
