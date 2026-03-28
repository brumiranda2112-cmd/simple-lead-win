import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface BrandingConfig {
  companyName: string;
  crmLabel: string;
  logoUrl: string;       // sidebar icon
  fullLogoUrl: string;   // login page logo
  faviconUrl: string;
  loginBgUrl: string;    // login background image
  // HSL values (without hsl() wrapper), e.g. "25 95% 53%"
  primaryColor: string;
  accentColor: string;
  sidebarBg: string;
  cardBg: string;
  backgroundColor: string;
}

const DEFAULTS: BrandingConfig = {
  companyName: 'KHRÓNOS',
  crmLabel: 'CRM',
  logoUrl: '',
  fullLogoUrl: '',
  faviconUrl: '/favicon.png',
  loginBgUrl: '',
  primaryColor: '25 95% 53%',
  accentColor: '25 80% 16%',
  sidebarBg: '228 14% 6%',
  cardBg: '228 12% 10%',
  backgroundColor: '228 14% 7%',
};

const STORAGE_KEY = 'crm_branding';

interface BrandingContextType {
  branding: BrandingConfig;
  updateBranding: (patch: Partial<BrandingConfig>) => void;
  resetBranding: () => void;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULTS,
  updateBranding: () => {},
  resetBranding: () => {},
});

export function useBranding() {
  return useContext(BrandingContext);
}

function loadBranding(): BrandingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function applyCSS(config: BrandingConfig) {
  const root = document.documentElement;
  root.style.setProperty('--primary', config.primaryColor);
  root.style.setProperty('--accent', config.accentColor);
  root.style.setProperty('--ring', config.primaryColor);
  root.style.setProperty('--sidebar-primary', config.primaryColor);
  root.style.setProperty('--sidebar-ring', config.primaryColor);
  root.style.setProperty('--sidebar-background', config.sidebarBg);
  root.style.setProperty('--card', config.cardBg);
  root.style.setProperty('--card-foreground', '210 40% 96%');
  root.style.setProperty('--popover', config.cardBg);
  root.style.setProperty('--background', config.backgroundColor);

  // Favicon
  const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
  if (link && config.faviconUrl) link.href = config.faviconUrl;

  // Title
  document.title = `${config.companyName} ${config.crmLabel}`;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(loadBranding);

  useEffect(() => {
    applyCSS(branding);
  }, [branding]);

  const updateBranding = useCallback((patch: Partial<BrandingConfig>) => {
    setBranding(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage full – still apply in-memory
      }
      return next;
    });
  }, []);

  const resetBranding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBranding(DEFAULTS);
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, updateBranding, resetBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export { DEFAULTS as BRANDING_DEFAULTS };
