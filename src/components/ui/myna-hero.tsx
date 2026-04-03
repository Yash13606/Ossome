import * as React from "react";
import { Activity, ArrowRight, Shield, Terminal } from "lucide-react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function MynaHero() {
    const container = React.useRef(null);

    useGSAP(() => {
        const tl = gsap.timeline();

        // Brutalist text shatter / build sequence
        tl.from(".hero-word", {
            y: 100,
            opacity: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: "power4.out",
            filter: "blur(10px)",
        })
        .from(".hero-metadata", {
            opacity: 0,
            y: 20,
            duration: 0.5,
            stagger: 0.1,
        }, "-=0.2")
        .from(".cta-button", {
            opacity: 0,
            scale: 0.9,
            duration: 0.5,
            ease: "back.out(1.7)",
        }, "-=0.2");
    }, { scope: container });

    return (
        <div 
            ref={container} 
            className="relative min-h-[90vh] bg-black text-white overflow-hidden flex flex-col justify-center"
        >
            {/* Brutalist Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                 style={{ 
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px' 
                 }} 
            />

            {/* Glowing Accent Orbs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-flame/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/3" />

            <div className="container mx-auto px-6 lg:px-12 relative z-10">
                <main className="max-w-5xl mx-auto">
                    {/* Status Badge */}
                    <div className="hero-metadata inline-flex items-center gap-3 px-3 py-1.5 border-2 border-flame text-flame font-mono text-[10px] sm:text-sm uppercase tracking-widest mb-8 md:mb-12 bg-black shadow-[4px_4px_0px_0px_#ea580c]">
                        <span className="w-2 h-2 rounded-full bg-flame animate-pulse shadow-[0_0_8px_2px_#ea580c]"></span>
                        SYSTEM ACTIVE : DEVISE_GUARD
                    </div>

                    {/* Massive Brutalist Title */}
                    <div className="flex flex-col gap-2 font-mono uppercase font-black text-3xl xs:text-5xl sm:text-7xl lg:text-8xl tracking-tighter leading-none mb-8">
                        <div className="overflow-hidden"><div className="hero-word">INTENT-AWARE</div></div>
                        <div className="overflow-hidden"><div className="hero-word text-transparent bg-clip-text bg-gradient-to-r from-flame to-orange-400">AUTONOMOUS</div></div>
                        <div className="overflow-hidden flex items-center gap-4">
                            <div className="hero-word">FINANCIAL</div>
                        </div>
                        <div className="overflow-hidden"><div className="hero-word">PIPELINE.</div></div>
                    </div>

                    <p className="hero-metadata max-w-2xl text-lg md:text-2xl text-gray-400 font-mono leading-relaxed mb-12 md:mb-16 border-l-2 border-cyan-500 pl-6">
                        Enforce intent-aware execution using <span className="text-white">ArmorClaw</span> as the primary enforcement engine. 
                        A lightweight financial policy layer combined with a parallel <span className="text-white">Swarm Analyst</span>.
                    </p>

                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        {[
                            { icon: Shield, label: "Cryptographic", sub: "HMAC Tokens" },
                            { icon: Terminal, label: "ArmorClaw", sub: "Prompt Injection Block" },
                            { icon: Activity, label: "Swarm Analyst", sub: "6-Persona Core" },
                        ].map((feature, idx) => (
                            <div key={idx} className="hero-metadata flex items-start gap-4 border border-white/10 p-4 bg-white/[0.02] backdrop-blur-sm shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
                                <div className="p-3 bg-flame/10 text-flame border border-flame/30">
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <div className="font-mono">
                                    <div className="text-sm text-gray-400">{feature.sub}</div>
                                    <div className="text-white font-bold tracking-tight uppercase">{feature.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* brutalist CTA */}
                    <div className="cta-button">
                        <Link to="/dashboard" className="inline-block relative group">
                            <div className="absolute inset-0 bg-flame translate-x-1.5 translate-y-1.5 transition-transform group-hover:translate-x-3 group-hover:translate-y-3" />
                            <button className="relative bg-black border-2 border-white text-white px-8 py-5 font-mono text-lg font-bold tracking-[0.2em] flex items-center gap-4 hover:bg-white hover:text-black transition-colors duration-300">
                                INITIALIZE SWARM
                                <ArrowRight className="w-6 h-6 border-l border-current pl-2" />
                            </button>
                        </Link>
                    </div>

                </main>
            </div>
            
            {/* Scroll Indicator */}
            <div className="hero-metadata absolute bottom-8 right-8 font-mono text-xs text-gray-500 tracking-widest hidden md:flex items-center gap-4 rotate-90 transform origin-right">
                SCROLL TO INSPECT ARCHITECTURE 
                <div className="w-12 h-px bg-flame"></div>
            </div>
        </div>
    );
}
