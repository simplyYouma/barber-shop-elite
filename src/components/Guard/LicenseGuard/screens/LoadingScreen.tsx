import React from 'react';
import { MeshBackground } from '@/components/Guard/LicenseGuard/components/MeshBackground';
import { MorphingLogo } from '@/components/Common/MorphingLogo';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center font-sans overflow-hidden" style={{ fontFamily: 'var(--yumi-font-sans)' }}>
            <MeshBackground />

            <div className="relative z-10 flex flex-col items-center">
                <MorphingLogo size="lg" className="mb-12" />

                <div className="flex flex-col items-center gap-6">
                    {/* Indicateur de progression premium */}
                    <div className="relative w-48 h-[1px] bg-black/5 overflow-hidden">
                        <div className="absolute inset-0 bg-black animate-progress-line" />
                    </div>
                    
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-800 uppercase tracking-[0.5em] mb-2">
                           Initialisation
                        </p>
                        <p className="text-[8px] font-bold text-luxury uppercase tracking-[0.2em] opacity-40">
                            Barber Shop Management
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes progress-line {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-progress-line {
                    animation: progress-line 2s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
                }
            `}</style>
        </div>
    );
};
