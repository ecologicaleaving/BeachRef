'use client'

import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildReturnUrl } from '@/lib/url-utils'

export default function FloatingNavigationButton() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleReturnToList = () => {
    const returnUrl = buildReturnUrl(searchParams)
    router.push(returnUrl)
  }

  return (
    <div className="fixed bottom-6 right-6 md:hidden z-50">
      <Button 
        variant="default" 
        size="lg" 
        className="rounded-full h-12 w-12 shadow-lg hover:shadow-xl transition-shadow duration-200"
        onClick={handleReturnToList}
        aria-label="Return to tournament list"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>
    </div>
  )
}