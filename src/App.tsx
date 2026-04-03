import * as React from 'react'
import { Routes, Route } from 'react-router-dom'
import { LandingPage } from '@/pages/landing-page'
import { AIBuilder } from '@/pages/ai-builder'
import { SignIn1 } from '@/components/ui/modern-stunning-sign-in'
import { PipelineDashboard } from '@/components/dashboard/pipeline-dashboard'
import { LoginView } from '@/components/auth/login-view'

function App() {
    const [isLoggedIn, setIsLoggedIn] = React.useState(false)

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/builder" element={<AIBuilder />} />
            <Route path="/signin" element={<SignIn1 />} />
            <Route 
                path="/dashboard" 
                element={
                    isLoggedIn ? (
                        <PipelineDashboard />
                    ) : (
                        <LoginView onLogin={() => setIsLoggedIn(true)} />
                    )
                } 
            />
        </Routes>
    )
}

export default App
