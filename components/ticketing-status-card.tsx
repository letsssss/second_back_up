import React from 'react';
import { InfoIcon } from 'lucide-react';

interface TicketingStatusCardProps {
  status: 'in_progress' | 'completed';
  message: string;
  updatedAt?: string;
}

export const TicketingStatusCard: React.FC<TicketingStatusCardProps> = ({ 
  status, 
  message, 
  updatedAt 
}) => {
  return (
    <div className={`
      border rounded-lg p-5 transition-all duration-300 hover:shadow-md
      ${status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}
    `}>
      <div className="flex items-start">
        <div className="flex-shrink-0 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm">
          <InfoIcon className={`h-6 w-6 ${status === 'completed' ? 'text-green-500' : 'text-blue-500'}`} />
        </div>
        <div className="ml-4">
          <h3 className={`text-base font-semibold ${status === 'completed' ? 'text-green-800' : 'text-blue-800'}`}>
            {status === 'completed' ? '취켓팅 완료' : '취켓팅 진행 중'}
          </h3>
          <div className={`mt-2 text-sm ${status === 'completed' ? 'text-green-700' : 'text-blue-700'}`}>
            <p>{message}</p>
          </div>
          <div className="mt-3 flex items-center">
            <div className="flex-grow h-0.5 rounded-full bg-gray-100">
              <div 
                className={`h-0.5 rounded-full ${status === 'completed' ? 'bg-green-200' : 'bg-blue-200'}`} 
                style={{ width: status === 'completed' ? '100%' : '60%' }}
              ></div>
            </div>
            <p className="ml-2 text-xs text-gray-500 whitespace-nowrap">
              {status === 'completed' ? '완료됨' : '진행중'}
            </p>
          </div>
          {updatedAt && (
            <p className="mt-2 text-xs text-gray-500">
              최근 업데이트: {updatedAt}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

