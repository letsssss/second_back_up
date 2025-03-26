import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { convertBigIntToString } from "@/lib/utils";

const prisma = new PrismaClient();

// CORS 헤더 설정을 위한 함수
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 캐시 방지 헤더
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

// OPTIONS 메서드 처리
export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

// GET 요청 핸들러 - postId로 구매 정보 조회
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("postId로 구매 정보 조회 API 호출됨");

    // 파라미터 검증
    const { id } = params;
    
    if (!id) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: "유효하지 않은 요청: postId가 제공되지 않았습니다."
      }, { status: 400 }));
    }

    console.log(`요청된 postId: ${id}`);

    // 현재 인증된 사용자 정보 가져오기
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      console.log("인증된 사용자를 찾을 수 없음");
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "인증되지 않은 사용자입니다." },
        { status: 401 }
      ));
    }

    console.log("인증된 사용자 ID:", authUser.id);
    // ID를 숫자로 변환
    const userId = Number(authUser.id);
    
    if (isNaN(userId)) {
      console.log("사용자 ID를 숫자로 변환할 수 없음:", authUser.id);
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "유효하지 않은 사용자 ID 형식입니다." },
        { status: 400 }
      ));
    }

    // 직접 Purchase 테이블 쿼리로 조회 (정수를 사용하여 비교)
    console.log("쿼리 실행 전: postId =", id, "userId =", userId);
    
    let purchases;
    try {
      purchases = await prisma.$queryRaw`
        SELECT * FROM Purchase 
        WHERE postId = ${id} 
        AND (buyerId = ${userId} OR sellerId = ${userId})
        LIMIT 1
      `;

      console.log("쿼리 결과:", purchases);
    } catch (queryError) {
      console.error('SQL 쿼리 실행 중 오류:', queryError);
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "데이터베이스 쿼리 실행 중 오류가 발생했습니다." },
        { status: 500 }
      ));
    }
    
    // 배열 형태로 반환되므로 첫 번째 요소 확인
    if (!purchases || (Array.isArray(purchases) && purchases.length === 0)) {
      console.log(`postId ${id}에 해당하는 구매 정보를 찾을 수 없음`);
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "해당 게시물 ID의 구매 정보를 찾을 수 없습니다." },
        { status: 200 }
      ));
    }

    // 첫 번째 구매 내역 사용
    const purchase = Array.isArray(purchases) ? purchases[0] : purchases;

    // 응답 형태 변환 및 BigInt 처리
    const formattedPurchase = convertBigIntToString(purchase);

    return addCorsHeaders(NextResponse.json({
      success: true,
      purchase: formattedPurchase
    }));
    
  } catch (error) {
    console.error('구매 정보 조회 오류:', error);
    return addCorsHeaders(NextResponse.json(
      { success: false, message: "구매 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  } finally {
    await prisma.$disconnect();
  }
} 