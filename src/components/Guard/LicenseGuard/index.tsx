import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Internal Modules
import { useLicense } from './hooks/useLicense';
import { HubNotification } from './components/HubNotification';
import { SyncWarning } from './components/SyncWarning';

// Screens
import { guardTheme } from './theme';
import { LoadingScreen } from './screens/LoadingScreen';
import { ActivationScreen } from './screens/ActivationScreen';
import { BannedScreen } from './screens/BannedScreen';
import { ExpiredScreen } from './screens/ExpiredScreen';
import { ClockFraudScreen } from './screens/ClockFraudScreen';
import { SyncRequiredScreen } from './screens/SyncRequiredScreen';

interface LicenseGuardProps {
    children: React.ReactNode;
}

/**
 * LicenseGuard Orchestrator — Standard Template
 * 
 * Manages the security lifecycle and displays appropriate blocking screens.
 */
export const LicenseGuard: React.FC<LicenseGuardProps> = ({ children }) => {
    const license = useLicense();
    const [isBannerDismissed, setIsBannerDismissed] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [forcedLoading, setForcedLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setForcedLoading(false), 2500);
        return () => clearTimeout(timer);
    }, []);

    // --- Developer Shortcuts ---
    useEffect(() => {
        let buffer = '';
        let timeout: any;
        const handleKeyDown = (e: KeyboardEvent) => {
            clearTimeout(timeout);
            buffer += e.key.toLowerCase();
            if (buffer.endsWith('yumi')) {
                setShowManual(true);
                setTimeout(() => setShowManual(false), 10000);
                buffer = '';
            }
            timeout = setTimeout(() => { buffer = ''; }, 2000);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Handling States
    if (license.isLicensed === null || forcedLoading) return <LoadingScreen />;
    
    // Theme wrapper for screens
    const ThemeWrapper = ({ children }: { children: React.ReactNode }) => (
        <div style={{ 
            '--yumi-primary': guardTheme.colors.primary,
            '--yumi-font-serif': guardTheme.fonts.serif,
            '--yumi-font-sans': guardTheme.fonts.sans,
        } as any} className="font-sans">
            {children}
        </div>
    );

    if (license.isClockFraud) return <ThemeWrapper><ClockFraudScreen machineId={license.machineId} onRetry={() => window.location.reload()} /></ThemeWrapper>;
    if (license.isRevoked) return <ThemeWrapper><BannedScreen machineId={license.machineId} /></ThemeWrapper>;
    
    if (license.isSyncRequired) {
        return (
            <ThemeWrapper>
                <SyncRequiredScreen 
                    isValidating={license.isValidating} 
                    syncError={license.syncError}
                    onSync={async () => {
                        license.setSyncError(false);
                        const oldSync = localStorage.getItem('yumi_last_sync');
                        await license.verifyWithHub(license.machineId);
                        if (localStorage.getItem('yumi_last_sync') !== oldSync) {
                            window.location.reload();
                        } else {
                            license.setSyncError(true);
                        }
                    }}
                />
            </ThemeWrapper>
        );
    }

    if (license.isExpired) {
        return <ThemeWrapper><ExpiredScreen machineId={license.machineId} onReset={async () => { await invoke('save_license_key', { key: '' }); window.location.reload(); }} /></ThemeWrapper>;
    }

    if (!license.isLicensed) {
        return <ThemeWrapper><ActivationScreen machineId={license.machineId} isValidating={license.isValidating} onActivate={license.activateLicense} /></ThemeWrapper>;
    }

    return (
        <div className="relative isolate" style={{ '--yumi-primary': guardTheme.colors.primary } as any}>
            {/* Sync Warning */}
            {license.isSyncWarning && !isBannerDismissed && <SyncWarning onDismiss={() => setIsBannerDismissed(true)} />}

            {/* Broadcast Notifications */}
            {license.activeNotif && <HubNotification notification={license.activeNotif} onDismiss={license.dismissNotification} />}

            {/* Dev Mode Button (Trigger: 'yumi' keys) */}
            {showManual && (
                <div className="fixed top-4 right-4 z-[200] animate-bounce">
                     <button 
                        onClick={async () => { await invoke('save_license_key', { key: '' }); window.location.reload(); }}
                        className="bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-lg"
                     >
                        RESET LICENCE (DEV)
                     </button>
                </div>
            )}

            {children}
        </div>
    );
};
