import { Routes, Route } from 'react-router-dom'
import { LandingPage } from '@/pages/landing-page'
import { AIBuilder } from '@/pages/ai-builder'
import { SignIn1 } from '@/components/ui/modern-stunning-sign-in'
import { PipelineDashboard } from '@/components/dashboard/pipeline-dashboard'

function App() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/builder" element={<AIBuilder />} />
            <Route path="/signin" element={<SignIn1 />} />
            <Route path="/dashboard" element={<PipelineDashboard />} />
        </Routes>
    )
}

export default App
