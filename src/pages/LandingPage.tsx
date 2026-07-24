import ConversionElements from '../components/ConversionElements/ConversionElements'
import Navbar from '../components/Navbar/Navbar'
import Hero from '../components/Hero/Hero'
import ProblemSection from '../components/ProblemSection/ProblemSection'
import HowItWorks from '../components/HowItWorks/HowItWorks'
import SolutionSection from '../components/SolutionSection/SolutionSection'
import FeaturesSection from '../components/FeaturesSection/FeaturesSection'
import IntegrationsSection from '../components/IntegrationsSection/IntegrationsSection'
import Showcase from '../components/Showcase/Showcase'
import Testimonials from '../components/Testimonials/Testimonials'
import ROICalculator from '../components/ROICalculator/ROICalculator'
import WhySwitch from '../components/WhySwitch/WhySwitch'
import ComparisonSection from '../components/ComparisonSection/ComparisonSection'
import SecuritySection from '../components/SecuritySection/SecuritySection'
import PricingSection from '../components/PricingSection/PricingSection'
import FinalCTA from '../components/FinalCTA/FinalCTA'
import Footer from '../components/Footer/Footer'

export default function LandingPage() {
  return (
    <div className="landingBg">
      <ConversionElements />
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <SolutionSection />
        <FeaturesSection />
        <IntegrationsSection />
        <Showcase />
        <Testimonials />
        <ROICalculator />
        <WhySwitch />
        <ComparisonSection />
        <SecuritySection />
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
