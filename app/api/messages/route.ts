import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";

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

// POST 요청 핸들러 - 메시지 전송
export async function POST(request: NextRequest) {
  try {
    console.log("메시지 전송 API 호출됨");

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

    // 요청 본문 파싱
    const body = await request.json();
    const { receiverId, message, orderNumber } = body;

    if (!receiverId || !message || !orderNumber) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: "필수 필드가 누락되었습니다: receiverId, message, orderNumber"
      }, { status: 400 }));
    }

    // 주문 번호로 구매 내역 조회 (메시지 권한 확인)
    const purchase = await prisma.purchase.findUnique({
      where: { orderNumber }
    });

    if (!purchase) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: "유효하지 않은 주문 번호입니다."
      }, { status: 400 }));
    }

    // 사용자가 이 거래의 구매자 또는 판매자인지 확인
    const isBuyer = authUser.id === purchase.buyerId;
    const isSeller = authUser.id === purchase.sellerId;

    if (!isBuyer && !isSeller) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: "이 거래에 대한 메시지 전송 권한이 없습니다."
      }, { status: 403 }));
    }

    // 수신자가 이 거래의 구매자 또는 판매자인지 확인
    const isReceiverBuyer = receiverId === purchase.buyerId;
    const isReceiverSeller = receiverId === purchase.sellerId;

    if (!isReceiverBuyer && !isReceiverSeller) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: "수신자가 이 거래의 당사자가 아닙니다."
      }, { status: 400 }));
    }

    // 메시지 생성
    const newMessage = await prisma.message.create({
      data: {
        senderId: authUser.id,
        receiverId,
        content: message,
        orderNumber
      }
    });

    console.log(`메시지 전송 완료: ID ${newMessage.id}`);

    // 알림 생성 (수신자에게)
    const sender = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { name: true }
    });

    await prisma.notification.create({
      data: {
        userId: receiverId,
        message: `${sender?.name || '사용자'}님으로부터 새 메시지가 도착했습니다: "${message.substring(0, 20)}${message.length > 20 ? '...' : ''}"`,
        type: 'MESSAGE',
        isRead: false,
        link: `/transaction/order/${orderNumber}`
      }
    });

    return addCorsHeaders(NextResponse.json({
      success: true,
      message: "메시지가 성공적으로 전송되었습니다.",
      data: newMessage
    }));
    
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    return addCorsHeaders(NextResponse.json(
      { success: false, message: "메시지 전송 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  } finally {
    await prisma.$disconnect();
  }
}

// GET 요청 핸들러 - 특정 주문에 대한 메시지 목록 조회
export async function GET(request: NextRequest) {
  try {
    console.log("메시지 목록 조회 API 호출됨");

    // URL 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const orderNumber = searchParams.get('orderNumber');

    if (!orderNumber) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: "필수 쿼리 파라미터가 누락되었습니다: orderNumber"
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

    // 주문 번호로 구매 내역 조회 (메시지 접근 권한 확인)
    const purchase = await prisma.purchase.findUnique({
      where: { orderNumber }
    });

    if (!purchase) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: "유효하지 않은 주문 번호입니다."
      }, { status: 400 }));
    }

    // 사용자가 이 거래의 구매자 또는 판매자인지 확인
    const isBuyer = authUser.id === purchase.buyerId;
    const isSeller = authUser.id === purchase.sellerId;

    if (!isBuyer && !isSeller) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: "이 거래에 대한 메시지 조회 권한이 없습니다."
      }, { status: 403 }));
    }

    // 메시지 목록 조회
    const messages = await prisma.message.findMany({
      where: {
        orderNumber,
        OR: [
          { senderId: authUser.id },
          { receiverId: authUser.id }
        ]
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        }
      }
    });

    console.log(`${messages.length}개의 메시지를 조회했습니다.`);

    // 읽지 않은 수신 메시지를 읽음 상태로 업데이트
    await prisma.message.updateMany({
      where: {
        orderNumber,
        receiverId: authUser.id,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    return addCorsHeaders(NextResponse.json({
      success: true,
      messages
    }));
    
  } catch (error) {
    console.error('메시지 목록 조회 오류:', error);
    return addCorsHeaders(NextResponse.json(
      { success: false, message: "메시지 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  } finally {
    await prisma.$disconnect();
  }
} 