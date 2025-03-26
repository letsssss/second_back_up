import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 판매자에게 알림 보내기
export async function createSellerNotification(userId: number, postId: string, title: string, quantity: number, totalPrice: number, orderNumber: string) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      console.error('알림 생성 실패: 게시물을 찾을 수 없음', postId);
      return null;
    }

    // 판매자에게 알림 생성
    const notification = await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: 'TICKET_REQUEST',
        message: `구매자가 "${title}"의 결제를 완료하여 취켓팅이 시작되었습니다. (${quantity}매, ${totalPrice.toLocaleString()}원)`,
        isRead: false,
        link: `/transaction/order/${orderNumber}` // orderNumber 기반 URL로 변경
      },
    });

    console.log('판매자 알림 생성 성공:', notification.id);
    return notification;
  } catch (error) {
    console.error('판매자 알림 생성 중 오류:', error);
    return null;
  }
}

// 구매자에게 알림 보내기
export async function createBuyerNotification(buyerId: number, postId: string, title: string, status: string, orderNumber: string) {
  try {
    let message = '';
    let type = 'PURCHASE_STATUS';
    
    switch (status) {
      case 'PENDING':
        message = `"${title}" 티켓 구매 신청이 완료되었습니다. 판매자가 취켓팅을 시작합니다.`;
        break;
      case 'PROCESSING':
        message = `"${title}" 티켓 취켓팅이 시작되었습니다.`;
        break;
      case 'COMPLETED':
        message = `"${title}" 티켓 취켓팅이 완료되었습니다. 구매를 확정해주세요.`;
        break;
      case 'CONFIRMED':
        message = `"${title}" 티켓 구매가 확정되었습니다.`;
        break;
      default:
        message = `"${title}" 티켓 구매 상태가 업데이트되었습니다.`;
    }

    // 구매자에게 알림 생성
    const notification = await prisma.notification.create({
      data: {
        userId: buyerId,
        type,
        message,
        isRead: false,
        link: `/transaction/order/${orderNumber}` // orderNumber 기반 URL로 변경
      },
    });

    console.log('구매자 알림 생성 성공:', notification.id);
    return notification;
  } catch (error) {
    console.error('구매자 알림 생성 중 오류:', error);
    return null;
  }
}

// 거래 상태 업데이트 시 알림 생성
export async function createStatusUpdateNotification(buyerId: number, sellerId: number, postId: string, title: string, status: string, orderNumber: string) {
  try {
    // 상태에 따른 메시지 생성
    let message = '';
    
    switch (status) {
      case 'PROCESSING':
        message = `"${title}" 티켓의 취켓팅이 시작되었습니다.`;
        break;
      case 'COMPLETED':
        message = `"${title}" 티켓의 취켓팅이 완료되었습니다.`;
        break;
      case 'CANCELLED':
        message = `"${title}" 티켓 구매가 취소되었습니다.`;
        break;
      case 'CONFIRMED':
        message = `"${title}" 티켓 구매가 확정되었습니다.`;
        break;
      default:
        message = `"${title}" 티켓 구매 상태가 업데이트되었습니다.`;
    }

    // 구매자에게 알림 생성
    const buyerNotification = await prisma.notification.create({
      data: {
        userId: buyerId,
        type: 'PURCHASE_STATUS',
        message,
        isRead: false,
        link: `/transaction/order/${orderNumber}` // orderNumber 기반 URL로 변경
      },
    });

    console.log('구매자 상태 업데이트 알림 생성 성공:', buyerNotification.id);

    // 판매자에게도 알림 생성 (취소인 경우만)
    if (status === 'CANCELLED') {
      const sellerNotification = await prisma.notification.create({
        data: {
          userId: sellerId,
          type: 'PURCHASE_STATUS',
          message: `"${title}" 티켓 구매가 취소되었습니다.`,
          isRead: false,
          link: `/transaction/order/${orderNumber}` // orderNumber 기반 URL로 변경
        },
      });
      console.log('판매자 취소 알림 생성 성공:', sellerNotification.id);
      return [buyerNotification, sellerNotification];
    }

    return [buyerNotification];
  } catch (error) {
    console.error('상태 업데이트 알림 생성 중 오류:', error);
    return null;
  }
} 