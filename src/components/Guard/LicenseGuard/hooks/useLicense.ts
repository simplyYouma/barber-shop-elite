import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { LicenseState, Notification } from '../types';
import { guardTheme } from '../theme';

// ============================================================
// CONFIGURATION HUB
// ============================================================
const YUMI_HUB_API = import.meta.env.VITE_YUMI_HUB_URL || "http://localhost:4000/api/verify";
const YUMI_PROJECT_ID = (import.meta.env.VITE_YUMI_PROJECT_ID || "").replace(/"/g, "");

export function useLicense() {
    const [state, setState] = useState<LicenseState>({
        isLicensed: null,
        isRevoked: false,
        isExpired: false,
        isClockFraud: false,
        machineId: '',
        isSyncWarning: false,
        isSyncRequired: false,
        lastSyncDate: null,
    });

    const [activeNotif, setActiveNotif] = useState<Notification | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [syncError, setSyncError] = useState(false);

    // --- Actions ---

    /**
     * Centralized verification with Yumi Hub.
     * Handles Banning (200 OK with valid:false/reason:BANNED).
     */
    const verifyWithHub = useCallback(async (hwid: string) => {
        if (!YUMI_PROJECT_ID) return;
        
        try {
            const res = await fetch(YUMI_HUB_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hwid, project_id: YUMI_PROJECT_ID }),
                cache: 'no-store'
            });
            
            if (res.ok) {
                const data = await res.json();
                const now = Date.now();
                localStorage.setItem('yumi_last_sync', now.toString());
                
                setState(prev => ({ ...prev, lastSyncDate: now }));

                // --- 1. Revocation/Expiration Check ---
                if (!data.valid) {
                    if (data.status === 'revoked' || data.reason === "BANNED") {
                        localStorage.setItem(`revoked_${hwid}`, 'true');
                        setState(prev => ({ ...prev, isRevoked: true, isLicensed: false }));
                    } else if (data.reason === "EXPIRED") {
                        setState(prev => ({ ...prev, isExpired: true, isLicensed: false }));
                    } else if (data.reason === "NOT_FOUND") {
                        console.warn("[LicenseGuard] License unknown. Performing remote wipe.");
                        await invoke('save_license_key', { key: '' });
                        window.location.reload();
                    } else {
                        setState(prev => ({ ...prev, isLicensed: false }));
                    }
                    return;
                }
                
                // --- 2. POSITIVE CHECKS ---
                setState(prev => ({ 
                    ...prev, 
                    isRevoked: false, 
                    isExpired: false, 
                    isLicensed: true,
                    isSyncWarning: false,
                    isSyncRequired: false 
                }));
                localStorage.removeItem(`revoked_${hwid}`);

                // --- 3. Unified Notifications ---
                if (data.notifications && data.notifications.length > 0) {
                    const latest = data.notifications[0];
                    const dismissed = JSON.parse(localStorage.getItem('yumi_dismissed_notifs') || '[]');
                    if (!dismissed.includes(latest.id)) {
                        setActiveNotif(latest);
                    }
                }

                // --- 4. Auto-Update License Key ---
                if (data.licenseKey) {
                    const localKey = await invoke<string>('get_license_key');
                    if (data.licenseKey !== localKey) {
                        await invoke('save_license_key', { key: data.licenseKey });
                        window.location.reload();
                    }
                }
            }
        } catch (e) {
            console.error("[LicenseGuard] Connection failed:", e);
            setSyncError(true);
        } finally {
            setIsValidating(false);
        }
    }, []);

    const dismissNotification = useCallback(() => {
        if (!activeNotif) return;
        const dismissed = JSON.parse(localStorage.getItem('yumi_dismissed_notifs') || '[]');
        dismissed.push(activeNotif.id);
        localStorage.setItem('yumi_dismissed_notifs', JSON.stringify(dismissed));
        setActiveNotif(null);
    }, [activeNotif]);

    /**
     * Manual Activation with Signature Verification.
     */
    const activateLicense = useCallback(async (key: string) => {
        setIsValidating(true);
        try {
            let sigToVerify = key.trim().split(' ').join('');
            let msgToVerify = state.machineId.trim().toUpperCase();
            
            console.log("[LicenseGuard] Tentative d'activation pour le projet:", YUMI_PROJECT_ID);

            const parts = sigToVerify.includes('.') ? sigToVerify.split('.') : [];
            
            if (parts.length === 2) {
                const expiry = parseInt(parts[0], 16);
                msgToVerify = `${YUMI_PROJECT_ID}|${msgToVerify}|${expiry}`;
                console.log("[LicenseGuard] MESSAGE V2.5 CONSTRUIT:", msgToVerify);
                sigToVerify = parts[1];
            }
            
            // --- DUAL-PATH VERIFICATION (v2.5 + v1 Legacy) ---
            const hwid = state.machineId.trim().toUpperCase();
            
            // 1. Try Elite v2.5 (Project Specific: ProjectID|HWID|EXPIRY)
            let valid = await invoke('verify_license', { machineId: msgToVerify, licenseKey: sigToVerify });
            
            // 2. Try Legacy v1 (Global: HWID|EXPIRY) if v2.5 fails
            if (!valid && parts.length === 2) {
                const expiry = parseInt(parts[0], 16);
                const legacyMsg = `${hwid}|${expiry}`;
                console.log("[LicenseGuard] FALLBACK LEGACY:", { legacyMsg });
                valid = await invoke('verify_license', { machineId: legacyMsg, licenseKey: parts[1] });
            }

            if (valid) {
                await invoke('save_license_key', { key: key.trim() });
                window.location.reload();
                return { success: true };
            }
            return { success: false, message: "Signature cryptographique invalide pour ce PC/Projet." };
        } catch (e: any) {
            console.error("[LicenseGuard] Error:", e);
            return { success: false, message: `Erreur système : ${e.toString()}` };
        } finally {
            setIsValidating(false);
        }
    }, [state.machineId]);

    // --- LifeCycle ---

    useEffect(() => {
        const init = async () => {
            // -- 1. Web Preview Check --
            if (!('__TAURI_INTERNALS__' in window)) {
                console.warn("[LicenseGuard] Web Mode: Pass-through activated.");
                setState(prev => ({ ...prev, isLicensed: true }));
                return;
            }

            try {
                // -- 2. Hardware ID --
                const rawHwid: string = await invoke('get_machine_id');
                const hwid = rawHwid.trim().toUpperCase();
                setState(prev => ({ ...prev, machineId: hwid }));

                // -- 3. Local Revocation --
                if (localStorage.getItem(`revoked_${hwid}`) === 'true') {
                    setState(prev => ({ ...prev, isRevoked: true, isLicensed: false }));
                }

                // -- 4. Existing License --
                const savedLicense = await invoke<string>('get_license_key');
                if (!savedLicense) {
                    setState(prev => ({ ...prev, isLicensed: false }));
                    return;
                }

                // -- 5. Anti-Tapping & Sync Check --
                const now = Date.now();
                const lastSync = Number(localStorage.getItem('yumi_last_sync') || '0');
                const lastSeen = Number(localStorage.getItem('yumi_last_seen') || '0');
                localStorage.setItem('yumi_last_seen', now.toString());

                // Clock Fraud Detection
                if (now < lastSeen - 300000) {
                    setState(prev => ({ ...prev, isClockFraud: true, isLicensed: false }));
                    return;
                }

                // Sync Requirement (Persistent Offline Lockout)
                const minsSinceSync = (now - lastSync) / (1000 * 60);
                if (lastSync > 0 && minsSinceSync > guardTheme.config.syncLockMins) {
                    setState(prev => ({ ...prev, isSyncRequired: true, isLicensed: false }));
                    return;
                }
                
                // Sync Warning (Grace Period)
                if (lastSync > 0 && minsSinceSync > guardTheme.config.syncWarningMins) {
                    setState(prev => ({ ...prev, isSyncWarning: true }));
                }

                // -- 6. Crypto Verification --
                const parts = savedLicense.split('.');
                let msgToVerify = hwid;
                let sigToVerify = savedLicense;

                if (parts.length === 2) {
                    const expiry = parseInt(parts[0], 16);
                    if (now > expiry) {
                        setState(prev => ({ ...prev, isExpired: true, isLicensed: false }));
                        // We do NOT return here anymore. 
                        // Proceeding to verify_license and Hub sync allows automatic renewal detection.
                    }
                    msgToVerify = `${YUMI_PROJECT_ID}|${hwid}|${expiry}`;
                    sigToVerify = parts[1];
                }

                // --- DUAL-PATH VERIFICATION (v2.5 + v1 Legacy) ---
                console.log("[LicenseGuard] BOOT CHECK - Verifying saved key:", { msgToVerify, sigToVerify });
                let valid = await invoke('verify_license', { machineId: msgToVerify, licenseKey: sigToVerify });
                
                if (!valid && parts.length === 2) {
                    const legacyMsg = `${hwid}|${parseInt(parts[0], 16)}`;
                    console.log("[LicenseGuard] BOOT CHECK - Falling back to Legacy:", { legacyMsg });
                    valid = await invoke('verify_license', { machineId: legacyMsg, licenseKey: parts[1] });
                }

                console.log("[LicenseGuard] BOOT CHECK RESULT:", valid);

                if (valid) {
                    setState(prev => ({ ...prev, isLicensed: true }));
                    
                    // -- 7. Background Cycles --
                    verifyWithHub(hwid);
                    const hubInt = setInterval(() => verifyWithHub(hwid), 20 * 60 * 1000); // 20 mins
                    
                    return () => clearInterval(hubInt);
                } else {
                    setState(prev => ({ ...prev, isLicensed: false }));
                }
            } catch (e) {
                console.error("[LicenseGuard] Critical Init Error:", e);
                setState(prev => ({ ...prev, isLicensed: false }));
            }
        };

        const cleanupPromise = init();
        return () => { cleanupPromise.then(cb => cb && cb()); };
    }, [verifyWithHub]);

    return {
        ...state,
        activeNotif,
        isValidating,
        syncError,
        setSyncError,
        verifyWithHub,
        activateLicense,
        dismissNotification
    };
}
