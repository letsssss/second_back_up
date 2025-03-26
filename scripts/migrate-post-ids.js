/**
 * 이 스크립트는 다음을 수행합니다:
 * 1. Prisma 마이그레이션 실행 (Post ID를 Int에서 String으로 변경)
 * 2. Prisma 클라이언트 생성
 * 3. 기존 게시물의 ID를 12자리 랜덤 숫자로 변환
 * 
 * 실행 방법: node scripts/migrate-post-ids.js
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const prisma = new PrismaClient();

// 12자리 랜덤 숫자 ID 생성 함수
function generateRandom12DigitId() {
  const min = 100000000000; // 10^11
  const max = 999999999999; // 10^12-1
  return Math.floor(min + Math.random() * (max - min)).toString();
}

// 중복되지 않는 12자리 랜덤 ID 생성 함수
async function generateUniquePostId(maxAttempts = 5) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const id = generateRandom12DigitId();
    
    // 이미 존재하는 ID인지 확인
    const existingPost = await prisma.post.findUnique({
      where: { id }
    });
    
    if (!existingPost) {
      return id; // 중복되지 않는 ID 발견
    }
    
    attempts++;
  }
  
  throw new Error('고유한 ID 생성에 실패했습니다. 나중에 다시 시도해주세요.');
}

// 마이그레이션 실행 함수
async function runMigration() {
  try {
    console.log('Prisma 마이그레이션 시작...');
    execSync('npx prisma migrate dev --name change_post_id_to_string', { stdio: 'inherit' });
    console.log('Prisma 클라이언트 생성 중...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('마이그레이션 완료!');
  } catch (error) {
    console.error('마이그레이션 실패:', error);
    process.exit(1);
  }
}

// 기존 게시물 ID 변환 함수
async function migrateExistingPostIds() {
  try {
    console.log('기존 게시물 ID 변환 시작...');
    
    // 기존 게시물 조회
    const posts = await prisma.post.findMany();
    console.log(`총 ${posts.length}개의 게시물을 찾았습니다.`);
    
    // 각 게시물의 ID를 12자리 랜덤 숫자로 변환
    for (const post of posts) {
      const newId = await generateUniquePostId();
      
      // 관련 레코드 업데이트 (Notification, Purchase)
      await prisma.notification.updateMany({
        where: { postId: post.id },
        data: { postId: newId }
      });
      
      await prisma.purchase.updateMany({
        where: { postId: post.id },
        data: { postId: newId }
      });
      
      // 게시물 ID 업데이트
      await prisma.post.update({
        where: { id: post.id },
        data: { id: newId }
      });
      
      console.log(`게시물 ID ${post.id} -> ${newId} 변환 완료`);
    }
    
    console.log('모든 게시물 ID 변환 완료!');
  } catch (error) {
    console.error('게시물 ID 변환 실패:', error);
    process.exit(1);
  }
}

// 메인 함수
async function main() {
  try {
    // 마이그레이션 실행
    await runMigration();
    
    // 기존 게시물 ID 변환
    await migrateExistingPostIds();
    
    console.log('모든 작업이 성공적으로 완료되었습니다.');
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
main(); 