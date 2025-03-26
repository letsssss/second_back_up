"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';
import BuyerView from '@/components/transaction/BuyerView';
import SellerView from '@/components/transaction/SellerView';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';
import { ArrowLeft, Calendar, Clock, MapPin, CreditCard, Play, CheckCircle, ThumbsUp } from 'lucide-react';

// 트랜잭션 상태에 따른 배지 컬러 설정
const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
};

// 트랜잭션 상태 한글화
const statusLabels: Record<string, string> = {
  PENDING: '처리 중',
  COMPLETED: '완료됨',
  CANCELLED: '취소됨',
  PROCESSING: '진행 중',
};

export default function TransactionPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = params?.orderNumber as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [userRole, setUserRole] = useState<'buyer' | 'seller' | null>(null);

  useEffect(() => {
    const fetchTransactionData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/transaction/order/${orderNumber}`);
        
        if (response.data.success) {
          setTransactionData(response.data.purchase);
          setUserRole(response.data.userRole);
        } else {
          setError(response.data.message || '거래 정보를 불러오는데 실패했습니다.');
        }
      } catch (error: any) {
        console.error('거래 데이터 로딩 오류:', error);
        if (error.response?.status === 404) {
          setError('해당 주문 번호의 거래를 찾을 수 없습니다.');
        } else if (error.response?.status === 403) {
          setError('이 거래에 대한 접근 권한이 없습니다.');
          setTimeout(() => {
            router.push('/mypage');
          }, 3000);
        } else {
          setError('거래 정보를 불러오는데 오류가 발생했습니다. 나중에 다시 시도해주세요.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (orderNumber) {
      fetchTransactionData();
    }
  }, [orderNumber, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <LoadingSpinner />
        <p className="ml-2">거래 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <ErrorMessage message={error} />
        <button
          onClick={() => router.push('/mypage')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          마이페이지로 돌아가기
        </button>
      </div>
    );
  }

  if (!transactionData || !userRole) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <ErrorMessage message="거래 정보가 유효하지 않습니다." />
      </div>
    );
  }

  // 거래 진행 상태에 따른 프로그레스 바 너비 계산
  const getProgressWidth = () => {
    switch (transactionData.status) {
      case 'PENDING': return '0%';
      case 'PROCESSING': return '33.3333%';
      case 'COMPLETED': return '66.6666%';
      case 'CONFIRMED': return '100%';
      default: return '33.3333%';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <Link href="/mypage" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>대시보드로 돌아가기</span>
          </Link>
          <h1 className="text-3xl font-bold mt-4">거래 상세</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 transition-all duration-300 hover:shadow-md">
          <div className="p-6 md:p-8">
            <div className="mb-8">
              <div>
                <span className="text-sm text-gray-500 mb-1 block">티켓 정보</span>
                <h2 className="text-2xl font-bold text-gray-900">{transactionData.ticketTitle || '213312'}</h2>
              </div>
            </div>
            
            <div className="mb-10 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="text-lg font-semibold mb-6 text-gray-800">거래 진행 상태</h3>
              <div className="w-full py-6">
                <div className="relative flex items-start justify-between">
                  <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-gray-200 rounded-full"></div>
                  <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-blue-500 rounded-full transition-all duration-500 ease-in-out" style={{ width: getProgressWidth() }}></div>
                  
                  {/* 결제 완료 단계 */}
                  <div className="flex flex-col items-center relative z-10 mt-0">
                    <div className={`z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${transactionData.status !== 'PENDING' ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white border-gray-300 text-gray-400'}`}>
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="mt-3 text-center">
                      <p className={`text-sm font-medium ${transactionData.status !== 'PENDING' ? 'text-blue-600' : 'text-gray-500'}`}>결제 완료</p>
                      <p className="text-xs mt-1 text-gray-600">
                        {transactionData.createdAt ? new Date(transactionData.createdAt).toLocaleDateString('ko-KR') : 'Invalid Date'}
                      </p>
                    </div>
                  </div>
                  
                  {/* 취켓팅 시작 단계 */}
                  <div className="flex flex-col items-center relative z-10 mt-0">
                    <div className={`z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${transactionData.status === 'PROCESSING' ? 'bg-white border-blue-500 text-blue-500 ring-4 ring-blue-100 shadow-lg' : (transactionData.status === 'COMPLETED' || transactionData.status === 'CONFIRMED' ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white border-gray-300 text-gray-400')}`}>
                      <Play className="w-5 h-5" />
                    </div>
                    <div className="mt-3 text-center">
                      <p className={`text-sm font-medium ${(transactionData.status === 'PROCESSING' || transactionData.status === 'COMPLETED' || transactionData.status === 'CONFIRMED') ? 'text-blue-600' : 'text-gray-500'}`}>취켓팅 시작</p>
                      <p className="text-xs mt-1 text-gray-600">
                        {transactionData.updatedAt ? new Date(transactionData.updatedAt).toLocaleDateString('ko-KR') : 'Invalid Date'}
                      </p>
                    </div>
                  </div>
                  
                  {/* 취켓팅 완료 단계 */}
                  <div className="flex flex-col items-center relative z-10 mt-0">
                    <div className={`z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${transactionData.status === 'COMPLETED' || transactionData.status === 'CONFIRMED' ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white border-gray-300 text-gray-400'}`}>
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="mt-3 text-center">
                      <p className={`text-sm font-medium ${transactionData.status === 'COMPLETED' || transactionData.status === 'CONFIRMED' ? 'text-blue-600' : 'text-gray-500'}`}>취켓팅 완료</p>
                    </div>
                  </div>
                  
                  {/* 구매 확정 단계 */}
                  <div className="flex flex-col items-center relative z-10 mt-0">
                    <div className={`z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${transactionData.status === 'CONFIRMED' ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white border-gray-300 text-gray-400'}`}>
                      <ThumbsUp className="w-5 h-5" />
                    </div>
                    <div className="mt-3 text-center">
                      <p className={`text-sm font-medium ${transactionData.status === 'CONFIRMED' ? 'text-blue-600' : 'text-gray-500'}`}>구매 확정</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/3">
                <div className="relative h-60 md:h-full w-full rounded-xl overflow-hidden shadow-sm">
                  <Image 
                    src={transactionData.imageUrl || "/placeholder.svg"} 
                    alt={transactionData.ticketTitle || '213312'} 
                    fill 
                    style={{ objectFit: 'cover' }}
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>
              
              <div className="md:w-2/3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 mr-3 text-blue-500" />
                    <div>
                      <span className="text-xs text-gray-500 block">공연 날짜</span>
                      <span className="font-medium">{transactionData.eventDate ? new Date(transactionData.eventDate).toLocaleDateString('ko-KR') : '날짜 정보 없음'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <Clock className="h-5 w-5 mr-3 text-blue-500" />
                    <div>
                      <span className="text-xs text-gray-500 block">공연 시간</span>
                      <span className="font-medium">19:00</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 mr-3 text-blue-500" />
                    <div>
                      <span className="text-xs text-gray-500 block">공연 장소</span>
                      <span className="font-medium">{transactionData.eventVenue || '공연장'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <CreditCard className="h-5 w-5 mr-3 text-blue-500" />
                    <div>
                      <span className="text-xs text-gray-500 block">결제 금액</span>
                      <span className="font-medium">{transactionData.totalPrice ? transactionData.totalPrice.toLocaleString() : '312,213'}원</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-full mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                        <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
                        <path d="M15 3v6h6" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs text-blue-600 block">좌석 정보</span>
                      <span className="font-medium text-blue-800">{transactionData.selectedSeats || '213213'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-10 border-t pt-8">
              <h3 className="text-xl font-semibold mb-6 text-gray-800">결제 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">결제 방법</span>
                  <span className="font-medium">{transactionData.paymentMethod || '계좌이체'}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">결제 상태</span>
                  <span className="font-medium text-green-600">결제 완료</span>
                </div>
              </div>
            </div>
            
            <div className="mt-10 border-t pt-8">
              <h3 className="text-xl font-semibold mb-6 text-gray-800">취켓팅 정보</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 transition-all duration-300 hover:shadow-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-alert h-6 w-6 text-blue-500">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" x2="12" y1="8" y2="12" />
                      <line x1="12" x2="12.01" y1="16" y2="16" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-base font-semibold text-blue-800">취켓팅 진행 중</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>취소표 발생 시 알림을 보내드립니다. 취소표 발생 시 빠르게 예매를 진행해 드립니다.</p>
                    </div>
                    <div className="mt-3 flex items-center">
                      <div className="flex-grow h-0.5 rounded-full bg-gray-100">
                        <div className="h-0.5 rounded-full bg-blue-200" style={{ width: '60%' }}></div>
                      </div>
                      <p className="ml-2 text-xs text-gray-500 whitespace-nowrap">진행중</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">취켓팅 상태</span>
                  <span className="font-medium text-blue-600">취켓팅 진행중</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">판매자 정보</span>
                  <Link href={`/profile/${transactionData.sellerId}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2">
                    <Image 
                      src={transactionData.seller?.profileImage || "/placeholder.svg"} 
                      alt={transactionData.seller?.name || '판매자'} 
                      width={24} 
                      height={24} 
                      className="rounded-full" 
                    />
                    {transactionData.seller?.name || '김진성'}
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="mt-10 flex justify-end gap-4">
              {userRole === 'buyer' ? (
                <>
                  <button 
                    type="button" 
                    className="px-6 py-3 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    판매자에게 메시지
                  </button>
                  
                  <div className="flex flex-col gap-2 items-end">
                    <button 
                      type="button" 
                      className={`px-6 py-3 rounded-lg text-sm font-medium ${
                        transactionData.status === 'COMPLETED' 
                          ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md' 
                          : 'bg-gray-400 text-white cursor-not-allowed'
                      } transition-colors`}
                      disabled={transactionData.status !== 'COMPLETED'}
                    >
                      구매 확정하기
                    </button>
                    {transactionData.status !== 'COMPLETED' && (
                      <p className="text-sm text-gray-500">판매자가 취켓팅 완료 버튼을 누른 후 구매 확정 버튼이 활성화됩니다.</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button 
                    type="button" 
                    className="px-6 py-3 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    구매자에게 메시지
                  </button>
                  
                  <div className="flex flex-col gap-2 items-end">
                    <button 
                      type="button" 
                      className={`px-6 py-3 rounded-md text-sm font-medium ${
                        transactionData.status === 'PROCESSING' 
                          ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md' 
                          : 'bg-gray-400 text-white cursor-not-allowed'
                      } transition-colors`}
                      disabled={transactionData.status !== 'PROCESSING'}
                    >
                      취켓팅 완료
                    </button>
                    {transactionData.status !== 'PROCESSING' && (
                      <p className="text-sm text-gray-500">취켓팅 진행 중일 때만 완료 버튼이 활성화됩니다.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* 역할별 뷰 렌더링 */}
        <Suspense fallback={<LoadingSpinner />}>
          {userRole === 'buyer' && transactionData && Object.keys(transactionData).length > 0 && (
            <BuyerView transaction={transactionData} />
          )}
          {userRole === 'seller' && transactionData && typeof transactionData === 'object' && Object.keys(transactionData).length > 0 && (
            <SellerView transaction={transactionData} />
          )}
        </Suspense>
      </main>
    </div>
  );
} 