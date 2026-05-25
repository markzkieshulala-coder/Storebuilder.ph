import { BaseEngine } from '../core/base-engine';
import { EngineName, EngineInput, EngineOutput } from '../core/types';

export interface MotionArtifact {
  type: 'motion';
  globalTransitions: TransitionConfig[];
  pageTransitions: Record<string, TransitionConfig[]>;
  componentAnimations: Record<string, AnimationConfig[]>;
  scrollAnimations: ScrollAnimation[];
  prefersReducedMotion: boolean;
  cssVariables: Record<string, string>;
}

export interface TransitionConfig {
  id: string;
  target: string;
  trigger: string;
  properties: Array<{ prop: string; from: string; to: string; duration: string; easing: string }>;
  stagger?: { children: string; delay: string };
}

export interface AnimationConfig {
  id: string;
  name: string;
  keyframes: Array<{ offset: number; properties: Record<string, string> }>;
  duration: string;
  easing: string;
  fillMode: string;
  iterationCount?: string;
}

export interface ScrollAnimation {
  id: string;
  targetSelector: string;
  trigger: 'enter' | 'exit' | 'progress';
  effects: Array<{ property: string; start: string; end: string }>;
}

export class MotionEngine extends BaseEngine<unknown, MotionArtifact> {
  readonly name: EngineName = 'motion';
  readonly version = '1.0.0';
  readonly dependencies: EngineName[] = ['component', 'design-dna'];

  async execute(input: EngineInput<unknown>): Promise<EngineOutput<MotionArtifact>> {
    const components = input.context.getArtifact<{ components: Array<{ id: string; name: string }> }>('component');
    const design = input.context.getArtifact<{ motionTokens: { duration: Record<string, string>; easing: Record<string, string> } }>('design-dna');
    const plan = input.context.getArtifact<{ estimatedComplexity: 'low' | 'medium' | 'high' }>('planning');

    if (!components || !design) {
      return this.createFailureOutput('Missing component or design-dna artifacts');
    }

    try {
      const complexity = plan?.estimatedComplexity || 'medium';
      const motionLevel = this.resolveMotionLevel(complexity);

      const componentAnimations: Record<string, AnimationConfig[]> = {};
      for (const component of components.components) {
        componentAnimations[component.id] = this.generateComponentAnimations(component.name, motionLevel, design.motionTokens);
      }

      const artifact: MotionArtifact = {
        type: 'motion',
        globalTransitions: this.generateGlobalTransitions(design.motionTokens),
        pageTransitions: {
          default: [
            {
              id: 'page-fade',
              target: 'main',
              trigger: 'mount',
              properties: [{ prop: 'opacity', from: '0', to: '1', duration: design.motionTokens.duration.normal, easing: design.motionTokens.easing.default }],
            },
          ],
        },
        componentAnimations,
        scrollAnimations: this.generateScrollAnimations(motionLevel),
        prefersReducedMotion: true,
        cssVariables: {
          '--motion-duration-fast': design.motionTokens.duration.fast,
          '--motion-duration-normal': design.motionTokens.duration.normal,
          '--motion-easing-default': design.motionTokens.easing.default,
        },
      };

      const logs = [this.createLog('info', `Motion system generated: ${Object.keys(componentAnimations).length} component animations`, { level: motionLevel }, 'motion')];
      return this.createSuccessOutput(artifact, logs);
    } catch (err) {
      return this.createFailureOutput(err instanceof Error ? err.message : String(err));
    }
  }

  private resolveMotionLevel(complexity: 'low' | 'medium' | 'high'): 'minimal' | 'balanced' | 'rich' {
    switch (complexity) {
      case 'low': return 'minimal';
      case 'high': return 'rich';
      default: return 'balanced';
    }
  }

  private generateGlobalTransitions(tokens: { duration: Record<string, string>; easing: Record<string, string> }): TransitionConfig[] {
    return [
      {
        id: 'modal-open',
        target: '[data-modal]',
        trigger: 'state-change',
        properties: [
          { prop: 'opacity', from: '0', to: '1', duration: tokens.duration.normal, easing: tokens.easing.default },
          { prop: 'transform', from: 'scale(0.95)', to: 'scale(1)', duration: tokens.duration.normal, easing: tokens.easing.default },
        ],
      },
    ];
  }

  private generateComponentAnimations(componentName: string, level: 'minimal' | 'balanced' | 'rich', tokens: { duration: Record<string, string>; easing: Record<string, string> }): AnimationConfig[] {
    const animations: AnimationConfig[] = [];

    if (level !== 'minimal') {
      animations.push({
        id: `${componentName.toLowerCase()}-fade-in`,
        name: `${componentName}FadeIn`,
        keyframes: [
          { offset: 0, properties: { opacity: '0', transform: 'translateY(8px)' } },
          { offset: 1, properties: { opacity: '1', transform: 'translateY(0)' } },
        ],
        duration: tokens.duration.normal,
        easing: tokens.easing.default,
        fillMode: 'both',
      });
    }

    if (level === 'rich') {
      animations.push({
        id: `${componentName.toLowerCase()}-pulse`,
        name: `${componentName}Pulse`,
        keyframes: [
          { offset: 0, properties: { transform: 'scale(1)' } },
          { offset: 0.5, properties: { transform: 'scale(1.02)' } },
          { offset: 1, properties: { transform: 'scale(1)' } },
        ],
        duration: tokens.duration.slow,
        easing: 'ease-in-out',
        fillMode: 'both',
        iterationCount: 'infinite',
      });
    }

    return animations;
  }

  private generateScrollAnimations(level: 'minimal' | 'balanced' | 'rich'): ScrollAnimation[] {
    if (level === 'minimal') return [];
    return [
      {
        id: 'section-reveal',
        targetSelector: 'section',
        trigger: 'enter',
        effects: [{ property: 'opacity', start: '0', end: '1' }, { property: 'translateY', start: '20px', end: '0' }],
      },
    ];
  }
}
