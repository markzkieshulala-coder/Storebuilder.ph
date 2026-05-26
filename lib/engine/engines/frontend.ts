import { BaseEngine } from '../core/base-engine';
import { EngineName, EngineInput, EngineOutput } from '../core/types';

export interface FrontendArtifact {
  type: 'frontend';
  pages: PageOutput[];
  entryPoint: string;
  routerConfig: RouteConfig[];
  globalStyles: string;
  buildConfig: BuildConfiguration;
}

export interface PageOutput {
  id: string;
  route: string;
  template: string;
  imports: string[];
  hooks: string[];
  meta: PageMeta;
}

export interface PageMeta {
  title: string;
  description: string;
  ogImage?: string;
}

export interface RouteConfig {
  path: string;
  pageId: string;
  layout?: string;
  lazy?: boolean;
}

export interface BuildConfiguration {
  bundler: 'vite' | 'webpack' | 'rollup';
  target: string;
  outputDir: string;
  optimizations: string[];
}

export class FrontendEngine extends BaseEngine<unknown, FrontendArtifact> {
  readonly name: EngineName = 'frontend';
  readonly version = '1.0.0';
  readonly dependencies: EngineName[] = ['blueprint', 'component'];

  async execute(input: EngineInput<unknown>): Promise<EngineOutput<FrontendArtifact>> {
    const blueprint = input.context.getArtifact<{ pageBlueprints: Array<{ id: string; name: string; route: string; sections: Array<{ id: string; componentType: string }> }> }>('blueprint');
    const components = input.context.getArtifact<{ components: Array<{ id: string; name: string }> }>('component');

    if (!blueprint || !components) {
      return this.createFailureOutput('Missing blueprint or component artifacts');
    }

    try {
      const pages = blueprint.pageBlueprints.map((page) => {
        const sectionComponents = page.sections
          .map((s) => components.components.find((c) => c.name === s.componentType))
          .filter(Boolean);

        return {
          id: page.id,
          route: page.route,
          template: this.generatePageTemplate(page.name, sectionComponents),
          imports: sectionComponents.map((c: any) => `import { ${c.name} } from '@/components/${c.name}';`),
          hooks: ['useState', 'useEffect'],
          meta: {
            title: `${this.capitalize(page.name)} - Generated Site`,
            description: `Auto-generated ${page.name} page`,
          },
        };
      });

      const routeConfig = pages.map((page) => ({
        path: page.route,
        pageId: page.id,
        layout: 'MainLayout',
        lazy: page.route !== '/',
      }));

      const artifact: FrontendArtifact = {
        type: 'frontend',
        pages,
        entryPoint: 'src/main.tsx',
        routerConfig: routeConfig,
        globalStyles: this.generateGlobalStyles(),
        buildConfig: {
          bundler: 'vite',
          target: 'es2022',
          outputDir: 'dist',
          optimizations: ['tree-shaking', 'code-splitting', 'minify'],
        },
      };

      const logs = [this.createLog('info', `Frontend generated: ${pages.length} pages`, {}, 'frontend')];
      return this.createSuccessOutput(artifact, logs);
    } catch (err) {
      return this.createFailureOutput(err instanceof Error ? err.message : String(err));
    }
  }

  private generatePageTemplate(pageName: string, sections: any[]): string {
    const sectionRenders = sections.map((s) => `      <${s.name} />`).join('\n');
    return `export default function ${this.capitalize(pageName)}Page() {
  return (
    <main className="page-${pageName.toLowerCase()}">
${sectionRenders}
    </main>
  );
}`;
  }

  private generateGlobalStyles(): string {
    return `/* Design Tokens */
:root {
  --color-primary: #2563eb;
  --color-secondary: #6366f1;
  --font-family: system-ui, sans-serif;
  --spacing-unit: 4px;
}`;
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
