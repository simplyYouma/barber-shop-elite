/**
 * YUMI SECURITY GUARD — Theme Configuration
 * Version Élite Harmonisée
 */

export const guardTheme = {
    colors: {
        // Support project-specific accent colors via VITE_ACCENT_COLOR
        primary: import.meta.env.VITE_ACCENT_COLOR || "#000000", 
        slate: {
            900: "#0f172a",
            800: "#1e293b",
            400: "#94a3b8",
            50: "#f8fafc",
        },
        white: "#ffffff",
    },
    fonts: {
        // Support project-specific typography
        serif: import.meta.env.VITE_FONT_SERIF || '"Playfair Display", serif',
        sans: import.meta.env.VITE_FONT_SANS || '"Outfit", sans-serif',
    },
    config: {
        // Nom du projet (priorité à l'environnement, sinon placeholder)
        projectName: (import.meta.env.VITE_PROJECT_NAME || "BARBER SHOP").toUpperCase(),
        
        // Configuration de la période de grace
        syncWarningMins: 41760, // 29 jours (Alerte douce)
        syncLockMins: 43200,    // 30 jours (Blocage strict)
    }
};
