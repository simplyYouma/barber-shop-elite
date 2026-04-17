import React, { useState, useEffect, useMemo } from 'react';

interface MorphingLogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    speed?: number;
    showOfficialFirst?: boolean;
    initialDelay?: number;
}

export const MorphingLogo: React.FC<MorphingLogoProps> = ({ 
    className = "", 
    size = 'md', 
    speed = 1200,
    showOfficialFirst = true,
    initialDelay = 1500
}) => {
    // [2...17]
    const otherLogos = useMemo(() => Array.from({ length: 16 }, (_, i) => i + 2), []);
    
    const [currentLogoIndex, setCurrentLogoIndex] = useState(1);
    const [isInitial, setIsInitial] = useState(showOfficialFirst);

    useEffect(() => {
        let interval: any;
        let timeout: any;

        if (showOfficialFirst && isInitial) {
            timeout = setTimeout(() => {
                setIsInitial(false);
                startCycling();
            }, initialDelay);
        } else {
            startCycling();
        }

        function startCycling() {
            interval = setInterval(() => {
                const nextRandom = otherLogos[Math.floor(Math.random() * otherLogos.length)];
                setCurrentLogoIndex(nextRandom);
            }, speed);
        }

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [otherLogos, speed, showOfficialFirst, initialDelay]);

    const sizeClasses = {
        sm: 'w-24 h-24',
        md: 'w-48 h-48 md:w-64 md:h-64',
        lg: 'w-64 h-64 md:w-80 md:h-80',
        xl: 'w-80 h-80 md:w-[400px] md:h-[400px]',
    };

    const logoPath = `/Coupes_BarberShop_PNG/coupe_${currentLogoIndex}.png`;

    return (
        <div className={`relative ${sizeClasses[size]} ${className}`}>
            <img 
                key={logoPath}
                src={logoPath} 
                alt="Elite Morphing Logo" 
                className={`w-full h-full object-contain mix-blend-multiply transition-all duration-300 ease-in-out ${
                    isInitial ? 'opacity-100 scale-100' : 'opacity-80 scale-95 animate-morph'
                }`}
            />
            
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />

            <style>{`
                @keyframes morph {
                    0% { transform: scale(0.95); opacity: 0.6; filter: blur(2px); }
                    100% { transform: scale(1); opacity: 0.8; filter: blur(0px); }
                }
                .animate-morph {
                    animation: morph 0.4s ease-out forwards;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                    100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                }
                .animate-shimmer {
                    animation: shimmer 3s infinite;
                }
            `}</style>
        </div>
    );
};
