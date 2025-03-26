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

// GET 요청 핸들러 - orderNumber로 거래 정보 조회
export async function GET(request: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    console.log("거래 정보 조회 API 호출됨 (orderNumber 기반)");

    // 파라미터 검증
    const { orderNumber } = params;
    
    if (!orderNumber) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: "유효하지 않은 요청: orderNumber가 제공되지 않았습니다."
      }, { status: 400 }));
    }

    console.log(`요청된 orderNumber: ${orderNumber}`);

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

    // orderNumber로 구매 정보 조회
    const purchase = await prisma.purchase.findUnique({
      where: { orderNumber },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true
          }
        },
        post: true
      }
    });

    if (!purchase) {
      console.log(`orderNumber ${orderNumber}에 해당하는 구매 정보를 찾을 수 없음`);
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "해당 주문 번호의 구매 정보를 찾을 수 없습니다." },
        { status: 404 }
      ));
    }

    // 사용자 권한 확인 (구매자 또는 판매자만 접근 가능)
    const isBuyer = authUser.id === purchase.buyerId;
    const isSeller = authUser.id === purchase.sellerId;

    if (!isBuyer && !isSeller) {
      console.log("권한 없음: 사용자는 해당 거래의 구매자 또는 판매자가 아님");
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "이 거래에 대한 접근 권한이 없습니다." },
        { status: 403 }
      ));
    }

    // 사용자 역할 판단
    const userRole = isBuyer ? 'buyer' : 'seller';
    console.log(`사용자 역할: ${userRole}`);

    // 응답 형태 변환 및 BigInt 처리
    const formattedPurchase = convertBigIntToString(purchase);

    return addCorsHeaders(NextResponse.json({
      success: true,
      purchase: formattedPurchase,
      userRole
    }));
    
  } catch (error) {
    console.error('거래 정보 조회 오류:', error);
    return addCorsHeaders(NextResponse.json(
      { success: false, message: "거래 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  } finally {
    await prisma.$disconnect();
  }
} 