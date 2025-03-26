import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";

const prisma = new PrismaClient();

// CORS 헤더 설정을 위한 함수
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
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

// PATCH 요청 핸들러 - orderNumber로 거래 상태 업데이트
export async function PATCH(request: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    console.log("거래 상태 업데이트 API 호출됨");

    // 파라미터 검증
    const { orderNumber } = params;
    
    if (!orderNumber) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: "유효하지 않은 요청: orderNumber가 제공되지 않았습니다."
      }, { status: 400 }));
    }

    console.log(`요청된 orderNumber: ${orderNumber}`);

    // 요청 본문 파싱
    const body = await request.json();
    const { status } = body;

    if (!status || !['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: "유효하지 않은 상태값입니다."
      }, { status: 400 }));
    }

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
      where: { orderNumber }
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

    // 상태 변경에 따른 권한 체크
    if (status === 'CANCELLED') {
      // 취소는 구매자와 판매자 모두 가능
      if (!isBuyer && !isSeller) {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "이 거래 상태를 변경할 권한이 없습니다." },
          { status: 403 }
        ));
      }
    } else {
      // 다른 상태 변경은 판매자만 가능
      if (!isSeller) {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "판매자만 거래 상태를 변경할 수 있습니다." },
          { status: 403 }
        ));
      }
    }

    // 거래 상태 업데이트
    const updatedPurchase = await prisma.purchase.update({
      where: { orderNumber },
      data: { status }
    });

    console.log(`거래 상태 업데이트 완료: ${status}`);

    // 알림 생성 (옵션)
    if (status === 'COMPLETED') {
      // 구매자에게 알림
      await prisma.notification.create({
        data: {
          userId: purchase.buyerId,
          message: `주문 #${orderNumber} 거래가 완료되었습니다.`,
          type: 'PURCHASE_STATUS',
          isRead: false
        }
      });
    } else if (status === 'CANCELLED') {
      // 상대방에게 알림
      const targetUserId = isBuyer ? purchase.sellerId : purchase.buyerId;
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          message: `주문 #${orderNumber} 거래가 취소되었습니다.`,
          type: 'PURCHASE_STATUS',
          isRead: false
        }
      });
    }

    return addCorsHeaders(NextResponse.json({
      success: true,
      message: "거래 상태가 성공적으로 업데이트되었습니다.",
      purchase: updatedPurchase
    }));
    
  } catch (error) {
    console.error('거래 상태 업데이트 오류:', error);
    return addCorsHeaders(NextResponse.json(
      { success: false, message: "거래 상태 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  } finally {
    await prisma.$disconnect();
  }
} 