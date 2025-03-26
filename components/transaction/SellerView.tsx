"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import axios from 'axios'
import { Calendar, MapPin, Clock, CreditCard, Play, ThumbsUp, CheckCircle, Send, X } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { TransactionStepper } from "@/components/transaction-stepper"
import { TicketingStatusCard } from "@/components/ticketing-status-card"

interface SellerViewProps {
  transaction: any;
}

const SellerView: React.FC<SellerViewProps> = ({ transaction }) => {
  // transaction이 없거나 빈 객체인 경우 렌더링하지 않음
  if (!transaction) {
    return <div className="p-6 bg-red-50 rounded-lg border border-red-100 text-red-700">거래 정보를 불러올 수 없습니다.</div>;
  }

  if (Object.keys(transaction).length === 0) {
    return <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-100 text-yellow-700">거래 정보가 비어 있습니다.</div>;
  }

  const router = useRouter()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 채팅 메시지 로드
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await axios.get(`/api/messages?orderNumber=${transaction.orderNumber}`);
        if (response.data.success && response.data.messages) {
          setMessages(response.data.messages);
        }
      } catch (error) {
        console.error('메시지 로드 오류:', error);
      }
    };
    
    loadMessages();
  }, [transaction.orderNumber]);

  // 채팅창이 열릴 때 스크롤을 맨 아래로 이동
  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom()
    }
  }, [isChatOpen, messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // 거래 단계 정의 - 4단계로 수정
  const transactionSteps = [
    {
      id: "payment",
      label: "결제 완료",
      icon: <CreditCard className="w-5 h-5" />,
      date: transaction?.createdAt
        ? new Date(transaction.createdAt).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
    },
    {
      id: "ticketing_started",
      label: "취켓팅 시작",
      icon: <Play className="w-5 h-5" />,
      date: transaction?.updatedAt
        ? new Date(transaction.updatedAt).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
    },
    {
      id: "ticketing_completed",
      label: "취켓팅 완료",
      icon: <CheckCircle className="w-5 h-5" />,
      date: transaction?.status === 'COMPLETED' || transaction?.status === 'CONFIRMED'
        ? new Date().toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
    },
    {
      id: "confirmed",
      label: "구매 확정",
      icon: <ThumbsUp className="w-5 h-5" />,
      date: transaction?.status === 'CONFIRMED'
        ? new Date().toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
    },
  ]

  // 현재 거래 단계를 결정하는 함수
  const getCurrentStep = () => {
    if (!transaction || !transaction.status) return 'payment';
    
    switch(transaction.status) {
      case 'PENDING': return 'payment';
      case 'PROCESSING': return 'ticketing_started';
      case 'COMPLETED': return 'ticketing_completed';
      case 'CONFIRMED': return 'confirmed';
      default: return 'ticketing_started';
    }
  }

  // 판매자용 액션 핸들러로 변경
  const handleAction = async () => {
    if (transaction?.status === 'PROCESSING') {
      // 취켓팅 완료 처리 로직
      try {
        // 실제로는 API 호출하여 상태 업데이트
        const response = await axios.put(`/api/transaction/status/${transaction?.orderNumber}`, {
          status: 'COMPLETED'
        });

        if (response.data.success) {
          alert("취켓팅 완료 처리되었습니다. 구매자의 구매 확정을 기다립니다.");
          // 페이지 새로고침으로 상태 업데이트
          window.location.reload();
        } else {
          throw new Error(response.data.message || '처리 중 오류가 발생했습니다.');
        }
      } catch (error) {
        console.error("Error updating transaction:", error);
        alert("처리 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } else if (transaction?.status === 'CONFIRMED') {
      // 거래 완료 후 리뷰 작성 페이지로 이동
      router.push(`/review/${transaction?.id}?role=seller`);
    }
  }

  const openChat = () => setIsChatOpen(true)
  const closeChat = () => setIsChatOpen(false)

  // 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      setIsSending(true);
      
      // API 요청
      await axios.post('/api/messages', {
        receiverId: transaction?.buyerId,
        message: newMessage,
        orderNumber: transaction?.orderNumber
      });
      
      // 메시지 추가
      const newMsg = {
        id: Date.now(),
        senderId: transaction?.sellerId || 0, // 기본값 제공
        message: newMessage,
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      alert('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }

  // 현재 단계에 따른 버튼 텍스트 결정 (판매자용)
  const getActionButtonText = () => {
    switch (transaction?.status) {
      case 'PROCESSING':
        return "취켓팅 성공 확정";
      case 'COMPLETED':
        return "구매자 확정 대기 중";
      case 'CONFIRMED':
        return "구매자 리뷰 작성";
      default:
        return "다음 단계로";
    }
  }

  // 버튼 활성화 여부 확인
  const isActionButtonEnabled = () => {
    return transaction?.status === 'PROCESSING' || transaction?.status === 'CONFIRMED';
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 transition-all duration-300 hover:shadow-md">
      <div className="p-6 md:p-8">
        <h2 className="text-xl font-bold mb-6">취켓팅 관리</h2>

        {/* 거래 진행 상태 스텝퍼 추가 */}
        <div className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
          <h3 className="text-lg font-semibold mb-6 text-gray-800">거래 진행 상태</h3>
          <TransactionStepper 
            currentStep={getCurrentStep()} 
            steps={transactionSteps} 
          />
        </div>

        {/* 취켓팅 정보 */}
        <TicketingStatusCard
          status={transaction?.status === 'COMPLETED' || transaction?.status === 'CONFIRMED' ? "completed" : "in_progress"}
          message={
            transaction?.status === 'COMPLETED' || transaction?.status === 'CONFIRMED'
              ? "취켓팅이 완료되었습니다. 구매자의 구매 확정을 기다리고 있습니다."
              : "취소표 발생 시 즉시 예매를 진행해 드립니다. 취소표를 발견하면 '취켓팅 성공 확정' 버튼을 눌러주세요."
          }
          updatedAt={
            transaction?.status === 'COMPLETED' || transaction?.status === 'CONFIRMED'
              ? new Date().toLocaleString()
              : transaction?.updatedAt
                ? (typeof transaction.updatedAt === 'object' 
                   ? (transaction.updatedAt instanceof Date 
                     ? transaction.updatedAt.toLocaleString() 
                     : JSON.stringify(transaction.updatedAt))
                   : String(transaction.updatedAt))
                : "진행중"
          }
        />

        {/* 판매자용 버튼 영역 */}
        <div className="mt-8 flex justify-end gap-4">
          <Button onClick={openChat} variant="outline" className="flex items-center gap-2 border-gray-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            구매자에게 메시지
          </Button>

          {/* 취켓팅 성공 확정 버튼 (취켓팅 시작 단계일 때만 활성화) */}
          {transaction?.status === 'PROCESSING' && (
            <Button
              onClick={handleAction}
              className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md"
            >
              취켓팅 성공 확정
            </Button>
          )}

          {/* 구매자 확정 대기 중 (취켓팅 완료 단계일 때) */}
          {transaction?.status === 'COMPLETED' && (
            <Button
              disabled
              className="bg-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-lg shadow-md cursor-not-allowed"
            >
              구매자 확정 대기 중
            </Button>
          )}

          {/* 구매자 리뷰 작성 (구매 확정 단계일 때) */}
          {transaction?.status === 'CONFIRMED' && (
            <Button
              onClick={handleAction}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md"
            >
              구매자 리뷰 작성
            </Button>
          )}
        </div>
      </div>

      {/* 1:1 채팅 인터페이스 */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
            {/* 채팅 헤더 */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src={transaction?.buyer?.profileImage || "/placeholder.svg"}
                    alt={transaction?.buyer?.name ? 
                      (typeof transaction.buyer.name === 'string' ? transaction.buyer.name : '구매자') 
                      : "구매자"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium">
                    {transaction?.buyer?.name ? 
                      (typeof transaction.buyer.name === 'string' ? transaction.buyer.name : '구매자') 
                      : "구매자"}
                  </h3>
                  <p className="text-xs text-gray-500">구매자</p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 채팅 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-4">
                {!messages || !Array.isArray(messages) || messages.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">메시지가 없습니다. 구매자에게 메시지를 보내보세요.</p>
                ) : (
                  messages.map((message, index) => {
                    if (!message) return null;
                    
                    const isSellerMessage = message.senderId && transaction?.sellerId && message.senderId === transaction.sellerId;
                    
                    return (
                      <div
                        key={message?.id || `msg-${index}`}
                        className={`flex ${isSellerMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isSellerMessage
                              ? "bg-teal-500 text-white rounded-tr-none"
                              : "bg-gray-200 text-gray-800 rounded-tl-none"
                          }`}
                        >
                          <p className="text-sm">
                            {message.message === null || message.message === undefined
                              ? ""
                              : typeof message.message === 'object'
                                ? JSON.stringify(message.message || {})
                                : String(message.message)
                            }
                          </p>
                          <p
                            className={`text-xs mt-1 ${isSellerMessage ? "text-teal-100" : "text-gray-500"}`}
                          >
                            {message.createdAt ? formatMessageTime(message.createdAt) : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 메시지 입력 영역 */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className={`p-2 rounded-full ${
                    isSending || !newMessage.trim()
                      ? "bg-gray-300 text-gray-500"
                      : "bg-teal-500 text-white hover:bg-teal-600"
                  } transition-colors`}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerView; 