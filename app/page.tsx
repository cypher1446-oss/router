import FluenceNav from '@/components/FluenceNav'
import FluenceHero from '@/components/FluenceHero'
import FluenceBento from '@/components/FluenceBento'
import FluenceFooter from '@/components/FluenceFooter'
import ProcessSection from '@/components/ProcessSection'
import TestimonialsSection from '@/components/TestimonialsSection'
import LeadGeneration from '@/components/LeadGeneration'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f9fb] selection:bg-indigo-100 selection:text-indigo-900">
      <FluenceNav />
      <FluenceHero />
      <FluenceBento />
      <ProcessSection />
      <TestimonialsSection />
      <LeadGeneration />
      <FluenceFooter />
    </main>
  )
}
