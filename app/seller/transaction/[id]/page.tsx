"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function SellerTransactionRedirect() {
  const params = useParams()
  const router = useRouter()
  const transactionId = params?.id as string

  useEffect(() => {
    if (transactionId) {
      // 구매 정보를 찾아 orderNumber를 얻어서 리다이렉트
      async function redirectToOrderPage() {
        try {
          // 판매자는 postId로 접근하므로, API를 통해 해당 postId에 연결된 orderNumber를 찾음
          const response = await fetch(`/api/purchases/by-post/${transactionId}`)
          const data = await response.json()
          
          if (data.success && data.purchase) {
            // orderNumber가 있으면 새 URL로 리디렉션
            router.push(`/transaction/order/${data.purchase.orderNumber}`)
          } else {
            // 구매 정보가 없으면 마이페이지로 리다이렉션
            console.error('해당 게시물 ID로 구매 정보를 찾을 수 없습니다.')
            setTimeout(() => {
              router.push('/mypage')
            }, 2000)
          }
        } catch (error) {
          console.error('리디렉션 중 오류 발생:', error)
          setTimeout(() => {
            router.push('/mypage')
          }, 2000)
        }
      }
      
      redirectToOrderPage()
    }
  }, [transactionId, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-lg font-semibold">리다이렉트 중...</div>
        <div className="text-muted-foreground">잠시만 기다려주세요. 거래 페이지로 이동합니다.</div>
      </div>
    </div>
  )
}

