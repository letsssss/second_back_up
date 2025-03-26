"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Calendar, MapPin, Clock, CreditCard, Play, ThumbsUp, CheckCircle, Star } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import dynamic from 'next/dynamic'
import axios from 'axios'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// Confetti를 동적으로 불러오기 (서버 사이드 렌더링 오류 방지)
const ReactConfetti = dynamic(() => import('react-confetti'), { 
  ssr: false,
  loading: () => null
})

import { Button } from "@/components/ui/button"
import { TransactionStepper } from "@/components/transaction-stepper"
import { TicketingStatusCard } from "@/components/ticketing-status-card"
import { ChatInterface } from "@/components/ChatInterface"
import { useChat } from "@/hooks/useChat"

// 거래 및 단계 관련 타입 정의
interface StepDates {
  payment: string;
  ticketing_started: string;
  ticketing_completed: string | null;
  confirmed: string | null;
}

interface Ticket {
  title: string;
  date: string;
  time: string;
  venue: string;
  seat: string;
  image: string;
}

interface User {
  id: string;
  name: string;
  profileImage: string;
}

interface TransactionData {
  id: string;
  type: string;
  status: string;
  currentStep: string;
  stepDates: StepDates;
  ticket: Ticket;
  price: number;
  paymentMethod: string;
  paymentStatus: string;
  ticketingStatus: string;
  ticketingInfo: string;
  seller?: User; // 판매자 정보 (구매자 화면인 경우)
  buyer?: User;  // 구매자 정보 (판매자 화면인 경우)
}

export default function TransactionRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = params?.id as string
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const redirectToOrderNumberPage = async () => {
      try {
        setIsLoading(true)
        setErrorMessage(null)
        
        // 기존 ID(postId)로 구매 정보를 찾아 orderNumber를 얻음
        const response = await axios.get(`/api/purchases/by-post/${id}`)
        
        // 디버깅을 위한 응답 로깅
        console.log("API 응답:", JSON.stringify(response.data, null, 2))
        
        if (response.data.success && response.data.purchase) {
          // orderNumber가 있으면 새 URL로 리디렉션
          console.log("리디렉션 URL:", `/transaction/order/${response.data.purchase.orderNumber}`)
          router.push(`/transaction/order/${response.data.purchase.orderNumber}`)
        } else {
          // 구매 정보가 없으면 마이페이지로 리디렉션
          console.error('해당 게시물 ID로 구매 정보를 찾을 수 없습니다.')
          setErrorMessage('해당 게시물 ID로 구매 정보를 찾을 수 없습니다. 마이페이지로 이동합니다.')
          setIsLoading(false)
          setTimeout(() => {
            router.push('/mypage')
          }, 3000)
        }
      } catch (error: any) {
        console.error('리디렉션 중 오류 발생:', error)
        console.error('에러 상세:', error.response?.data || error.message)
        setErrorMessage('리디렉션 중 오류가 발생했습니다. 마이페이지로 이동합니다.')
        setIsLoading(false)
        setTimeout(() => {
          router.push('/mypage')
        }, 3000)
      }
    }

    if (id) {
      redirectToOrderNumberPage()
    }
  }, [id, router])

  return (
    <div className="min-h-screen flex flex-col justify-center items-center">
      {isLoading ? (
        <>
          <LoadingSpinner />
          <p className="mt-4">리디렉션 중입니다...</p>
        </>
      ) : (
        <>
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            <p>{errorMessage}</p>
          </div>
          <button
            onClick={() => router.push('/mypage')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            마이페이지로 이동
          </button>
        </>
      )}
    </div>
  )
}

