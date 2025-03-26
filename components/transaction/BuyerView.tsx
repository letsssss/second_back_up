import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { Send, User } from 'lucide-react';

interface BuyerViewProps {
  transaction: any;
}

const BuyerView: React.FC<BuyerViewProps> = ({ transaction }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: number, senderId: number, message: string, createdAt: Date}>>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // 채팅 메시지 로드
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await axios.get(`/api/messages?orderNumber=${transaction.orderNumber}`);
        if (response.data.success && response.data.messages) {
          setChatMessages(response.data.messages);
        }
      } catch (error) {
        console.error('메시지 로드 오류:', error);
      }
    };
    
    loadMessages();
  }, [transaction.orderNumber]);
  
  // 새 메시지가 추가되면 스크롤을 맨 아래로 이동
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // 판매자 정보
  const seller = transaction.seller || { name: '판매자 정보 없음' };

  // 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    try {
      setIsSending(true);
      
      // API 요청 (실제 메시지 전송 API로 대체 필요)
      await axios.post('/api/messages', {
        receiverId: transaction.sellerId,
        message,
        orderNumber: transaction.orderNumber
      });
      
      // 임시로 메시지 추가 (실제로는 서버에서 응답을 받아서 처리)
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        senderId: transaction.buyerId,
        message,
        createdAt: new Date()
      }]);
      
      setMessage('');
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      alert('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSending(false);
    }
  };

  // 메시지 시간 포맷팅
  const formatMessageTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // 메시지 그룹화 (날짜별)
  const groupMessagesByDate = () => {
    const groups: {[key: string]: typeof chatMessages} = {};
    
    chatMessages.forEach(msg => {
      const date = new Date(msg.createdAt).toLocaleDateString('ko-KR');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(msg);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 transition-all duration-300 hover:shadow-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">판매자와의 대화</h2>
          <div className="text-sm text-gray-500">주문번호: {transaction.orderNumber}</div>
        </div>
        
        {/* 채팅 섹션 */}
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <div className="bg-blue-50 px-4 py-3 border-b flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              {seller.profileImage ? (
                <Image 
                  src={seller.profileImage} 
                  alt={seller.name} 
                  width={32} 
                  height={32} 
                  className="rounded-full" 
                />
              ) : (
                <User className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-blue-800">{seller.name}</h3>
              <p className="text-xs text-blue-600">취켓팅 판매자</p>
            </div>
          </div>
          
          <div 
            ref={chatContainerRef}
            className="p-4 h-96 overflow-y-auto bg-gray-50"
          >
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full mb-4 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <line x1="9" y1="10" x2="15" y2="10" />
                    <line x1="12" y1="7" x2="12" y2="13" />
                  </svg>
                </div>
                <p className="text-center">아직 대화 내용이 없습니다.<br />판매자에게 메시지를 보내보세요.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(messageGroups).map(([date, messages]) => (
                  <div key={date} className="space-y-3">
                    <div className="flex justify-center">
                      <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">{date}</span>
                    </div>
                    {messages.map(msg => (
                      <div 
                        key={msg.id}
                        className={`flex ${msg.senderId === transaction.buyerId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`p-3 rounded-2xl max-w-xs ${
                            msg.senderId === transaction.buyerId 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white border border-gray-200'
                          }`}
                        >
                          <p className={msg.senderId === transaction.buyerId ? 'text-white' : 'text-gray-800'}>
                            {msg.message}
                          </p>
                          <p className={`text-xs mt-1 text-right ${
                            msg.senderId === transaction.buyerId ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatMessageTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t bg-white">
            <div className="flex items-center">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-4 py-3 bg-gray-50 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && !isSending && message.trim() && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                disabled={isSending || !message.trim()}
                className={`px-5 py-3 rounded-r-lg transition-all ${
                  isSending || !message.trim()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 text-center">
              취켓팅 관련 문의사항은 판매자에게 직접 메시지를 보내주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerView; 