import { BaseEngine } from '../core/base-engine';
import { EngineName, EngineInput, EngineOutput } from '../core/types';

export interface ComponentArtifact {
  type: 'components';
  components: UIComponent[];
  sharedProps: Record<string, PropDefinition>;
  composabilityGraph: Record<string, string[]>;
}

export interface UIComponent {
  id: string;
  name: string;
  type: 'atom' | 'molecule' | 'organism' | 'template' | 'page';
  props: PropDefinition[];
  state: StateDefinition[];
  children?: string[];
  sourceCode?: string;
  dependencies: string[];
  tests?: string;
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface StateDefinition {
  name: string;
  type: string;
  initialValue?: unknown;
  source?: 'internal' | 'props' | 'context';
}

export class ComponentEngine extends BaseEngine<unknown, ComponentArtifact> {
  readonly name: EngineName = 'component';
  readonly version = '1.0.0';
  readonly dependencies: EngineName[] = ['blueprint', 'design-dna'];

  async execute(input: EngineInput<unknown>): Promise<EngineOutput<ComponentArtifact>> {
    const blueprint = input.context.getArtifact<{ pageBlueprints: Array<{ sections: Array<{ id: string; componentType: string; dataBinding?: string; events: string[] }> }>; sharedComponents: string[] }>('blueprint');
    const design = input.context.getArtifact<{ theme: string }>('design-dna');

    if (!blueprint || !design) {
      return this.createFailureOutput('Missing blueprint or design-dna artifacts');
    }

    try {
      const components: UIComponent[] = [];
      const composabilityGraph: Record<string, string[]> = {};

      // Generate atom components
      const atoms = this.generateAtoms();
      components.push(...atoms);

      // Generate molecules from blueprint sections
      for (const page of blueprint.pageBlueprints) {
        for (const section of page.sections) {
          const molecule = this.sectionToComponent(section);
          components.push(molecule);
          composabilityGraph[molecule.id] = atoms.map((a) => a.id);
        }
      }

      // Generate shared organisms
      for (const shared of blueprint.sharedComponents) {
        const org = this.createOrganism(shared);
        components.push(org);
      }

      const artifact: ComponentArtifact = {
        type: 'components',
        components,
        sharedProps: {
          className: { name: 'className', type: 'string', required: false },
          style: { name: 'style', type: 'CSSProperties', required: false },
          id: { name: 'id', type: 'string', required: false },
        },
        composabilityGraph,
      };

      const logs = [this.createLog('info', `Generated ${components.length} components`, { atoms: atoms.length }, 'component')];
      return this.createSuccessOutput(artifact, logs);
    } catch (err) {
      return this.createFailureOutput(err instanceof Error ? err.message : String(err));
    }
  }

  private generateAtoms(): UIComponent[] {
    return [
      {
        id: 'atom-button',
        name: 'Button',
        type: 'atom',
        props: [
          { name: 'children', type: 'ReactNode', required: true },
          { name: 'variant', type: "'primary' | 'secondary'", required: false, defaultValue: 'primary' },
          { name: 'onClick', type: '() => void', required: false },
        ],
        state: [],
        dependencies: [],
      },
      {
        id: 'atom-text',
        name: 'Text',
        type: 'atom',
        props: [
          { name: 'children', type: 'ReactNode', required: true },
          { name: 'variant', type: "'h1' | 'h2' | 'body' | 'small'", required: false, defaultValue: 'body' },
        ],
        state: [],
        dependencies: [],
      },
      {
        id: 'atom-image',
        name: 'Image',
        type: 'atom',
        props: [
          { name: 'src', type: 'string', required: true },
          { name: 'alt', type: 'string', required: true },
          { name: 'lazy', type: 'boolean', required: false, defaultValue: true },
        ],
        state: [],
        dependencies: [],
      },
    ];
  }

  private sectionToComponent(section: { id: string; componentType: string; dataBinding?: string; events: string[] }): UIComponent {
    const props: PropDefinition[] = [
      { name: 'data', type: section.dataBinding ? `${section.dataBinding}[]` : 'unknown', required: !!section.dataBinding },
    ];
    for (const event of section.events) {
      props.push({ name: `on${this.capitalize(event)}`, type: '() => void', required: false });
    }

    return {
      id: `mol-${section.id}`,
      name: section.componentType,
      type: 'molecule',
      props,
      state: section.dataBinding ? [{ name: 'items', type: `${section.dataBinding}[]`, initialValue: [], source: 'props' }] : [],
      dependencies: ['atom-button', 'atom-text', 'atom-image'],
    };
  }

  private createOrganism(name: string): UIComponent {
    return {
      id: `org-${name.toLowerCase()}`,
      name,
      type: 'organism',
      props: [],
      state: [],
      dependencies: ['mol-navigation'],
    };
  }

  private capitalize(s: string): string {
    return s.replace(/(^|_)([a-z])/g, (_, _sep, letter) => letter.toUpperCase());
  }
}
