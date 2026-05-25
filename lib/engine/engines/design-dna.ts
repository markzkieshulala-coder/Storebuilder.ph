import { BaseEngine } from '../core/base-engine';
import { EngineName, EngineInput, EngineOutput } from '../core/types';

export interface DesignDNAArtifact {
  type: 'design-dna';
  colorPalette: ColorPalette;
  typography: TypographySystem;
  spacing: SpacingSystem;
  breakpoints: BreakpointConfig;
  motionTokens: MotionTokens;
  componentStyles: Record<string, ComponentStyle>;
  theme: 'light' | 'dark' | 'auto';
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  error: string;
  success: string;
}

export interface TypographySystem {
  fontFamily: string;
  scale: Record<string, { size: string; weight: number; lineHeight: string }>;
}

export interface SpacingSystem {
  unit: string;
  scale: Record<string, string>;
}

export interface BreakpointConfig {
  mobile: string;
  tablet: string;
  desktop: string;
  wide: string;
}

export interface MotionTokens {
  duration: Record<string, string>;
  easing: Record<string, string>;
  staggerDelay: string;
}

export interface ComponentStyle {
  base: Record<string, string | number>;
  variants: Record<string, Record<string, string | number>>;
}

export class DesignDNAEngine extends BaseEngine<unknown, DesignDNAArtifact> {
  readonly name: EngineName = 'design-dna';
  readonly version = '1.0.0';
  readonly dependencies: EngineName[] = ['planning'];

  async execute(input: EngineInput<unknown>): Promise<EngineOutput<DesignDNAArtifact>> {
    try {
      const prompt = input.context.input.userPrompt.toLowerCase();
      const isModern = prompt.includes('modern') || prompt.includes('minimal');
      const isPlayful = prompt.includes('playful') || prompt.includes('fun');
      const theme: 'light' | 'dark' | 'auto' = prompt.includes('dark') ? 'dark' : 'light';

      const artifact: DesignDNAArtifact = {
        type: 'design-dna',
        colorPalette: this.generatePalette(theme, isModern, isPlayful),
        typography: this.generateTypography(isModern),
        spacing: this.generateSpacing(),
        breakpoints: {
          mobile: '640px',
          tablet: '768px',
          desktop: '1024px',
          wide: '1280px',
        },
        motionTokens: {
          duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
          easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
          staggerDelay: '50ms',
        },
        componentStyles: {
          Button: {
            base: { borderRadius: '8px', padding: '12px 24px', fontWeight: 600 },
            variants: {
              primary: { background: 'var(--color-primary)', color: 'var(--color-surface)' },
              secondary: { background: 'transparent', border: '2px solid var(--color-primary)' },
            },
          },
        },
        theme,
      };

      const logs = [this.createLog('info', 'Design DNA generated', { theme }, 'design-dna')];
      return this.createSuccessOutput(artifact, logs);
    } catch (err) {
      return this.createFailureOutput(err instanceof Error ? err.message : String(err));
    }
  }

  private generatePalette(theme: 'light' | 'dark', isModern: boolean, isPlayful: boolean): ColorPalette {
    if (theme === 'dark') {
      return {
        primary: isModern ? '#60a5fa' : '#3b82f6',
        secondary: isPlayful ? '#f472b6' : '#818cf8',
        accent: isPlayful ? '#fbbf24' : '#34d399',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f8fafc',
        textMuted: '#94a3b8',
        border: '#334155',
        error: '#f87171',
        success: '#34d399',
      };
    }
    return {
      primary: isModern ? '#2563eb' : '#1d4ed8',
      secondary: isPlayful ? '#ec4899' : '#6366f1',
      accent: isPlayful ? '#f59e0b' : '#10b981',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#e2e8f0',
      error: '#ef4444',
      success: '#22c55e',
    };
  }

  private generateTypography(isModern: boolean): TypographySystem {
    const family = isModern
      ? 'system-ui, -apple-system, sans-serif'
      : 'Georgia, serif';
    return {
      fontFamily: family,
      scale: {
        h1: { size: '2.5rem', weight: 700, lineHeight: '1.2' },
        h2: { size: '2rem', weight: 600, lineHeight: '1.3' },
        body: { size: '1rem', weight: 400, lineHeight: '1.5' },
        small: { size: '0.875rem', weight: 400, lineHeight: '1.4' },
      },
    };
  }

  private generateSpacing(): SpacingSystem {
    return {
      unit: '4px',
      scale: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
    };
  }
}
