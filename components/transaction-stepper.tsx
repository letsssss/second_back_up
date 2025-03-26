import React from 'react';
import { Check } from "lucide-react"

interface Step {
  id: string;
  label: string;
  icon: React.ReactNode;
  date?: string;
}

interface TransactionStepperProps {
  currentStep: string;
  steps: Step[];
}

export const TransactionStepper: React.FC<TransactionStepperProps> = ({ currentStep, steps }) => {
  // 현재 단계의 인덱스 찾기
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className="w-full py-6">
      <div className="relative flex items-start justify-between">
        {/* 배경 라인 */}
        <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-gray-200 rounded-full"></div>
        
        {/* 진행 라인 */}
        <div 
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-blue-500 rounded-full transition-all duration-500 ease-in-out" 
          style={{ width: currentIndex >= 0 ? `${(currentIndex / (steps.length - 1)) * 100}%` : '0%' }}
        ></div>
        
        {/* 각 단계 표시 */}
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center relative z-10 mt-0 px-1">
              <div 
                className={`z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-blue-500 border-blue-500 text-white shadow-md' 
                    : isCurrent 
                      ? 'bg-white border-blue-500 text-blue-500 ring-4 ring-blue-100 shadow-lg' 
                      : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-6 h-6" /> : step.icon}
              </div>
              <div className="mt-3 text-center">
                <p className={`text-sm font-medium ${isCompleted || isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs mt-1 text-gray-600">
                    {step.date}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

