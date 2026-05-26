import { BaseEngine } from '../core/base-engine';
import { EngineName, EngineInput, EngineOutput } from '../core/types';

export interface FinalRenderingArtifact {
  type: 'final-rendering';
  outputPath: string;
  files: RenderedFile[];
  manifest: BuildManifest;
  deploymentConfig: DeploymentConfig;
  generatedAt: string;
  pipelineVersion: string;
}

export interface RenderedFile {
  path: string;
  content: string;
  type: 'typescript' | 'tsx' | 'css' | 'json' | 'html' | 'config';
  sizeBytes: number;
}

export interface BuildManifest {
  entryPoints: string[];
  chunks: Array<{ name: string; files: string[] }>;
  assets: string[];
  dependencies: string[];
}

export interface DeploymentConfig {
  platform: 'static' | 'vercel' | 'netlify' | 'docker';
  buildCommand: string;
  outputDir: string;
  environmentVariables: Record<string, string>;
}

export class FinalRenderingEngine extends BaseEngine<unknown, FinalRenderingArtifact> {
  readonly name: EngineName = 'final-rendering';
  readonly version = '1.0.0';
  readonly dependencies: EngineName[] = ['frontend', 'motion', 'validation', 'scoring'];

  async execute(input: EngineInput<unknown>): Promise<EngineOutput<FinalRenderingArtifact>> {
    const frontend = input.context.getArtifact<{ pages: Array<{ id: string; route: string; template: string; imports: string[]; meta?: { title?: string } }>; entryPoint: string; globalStyles: string; buildConfig: { bundler: string; outputDir: string } }>('frontend');
    const motion = input.context.getArtifact<{ cssVariables: Record<string, string>; globalTransitions: unknown[] }>('motion');
    const scoring = input.context.getArtifact<{ overall: number; recommendations: string[] }>('scoring');
    const design = input.context.getArtifact<{ colorPalette: Record<string, string>; typography: { fontFamily: string }; spacing: { scale: Record<string, string> } }>('design-dna');

    if (!frontend || !design) {
      return this.createFailureOutput('Missing required artifacts for final rendering');
    }

    try {
      const files: RenderedFile[] = [];

      // Render pages
      for (const page of frontend.pages) {
        files.push({
          path: `src/pages/${page.id}.tsx`,
          content: this.renderPage(page, frontend.entryPoint),
          type: 'tsx',
          sizeBytes: 0,
        });
      }

      // Render styles
      files.push({
        path: 'src/styles/globals.css',
        content: this.renderGlobalStyles(design, motion),
        type: 'css',
        sizeBytes: 0,
      });

      // Render entry point
      files.push({
        path: frontend.entryPoint,
        content: this.renderEntryPoint(frontend.pages),
        type: 'tsx',
        sizeBytes: 0,
      });

      // Render config
      files.push({
        path: 'vite.config.ts',
        content: this.renderViteConfig(),
        type: 'config',
        sizeBytes: 0,
      });

      // Render package.json
      files.push({
        path: 'package.json',
        content: this.renderPackageJson(),
        type: 'json',
        sizeBytes: 0,
      });

      // Render index.html
      files.push({
        path: 'index.html',
        content: this.renderIndexHtml(frontend.pages[0]?.meta?.title || 'Generated App'),
        type: 'html',
        sizeBytes: 0,
      });

      // Calculate sizes
      for (const file of files) {
        file.sizeBytes = Buffer.byteLength(file.content, 'utf-8');
      }

      const artifact: FinalRenderingArtifact = {
        type: 'final-rendering',
        outputPath: './generated-output',
        files,
        manifest: {
          entryPoints: [frontend.entryPoint],
          chunks: frontend.pages.map((p) => ({ name: p.id, files: [`src/pages/${p.id}.tsx`] })),
          assets: ['src/styles/globals.css'],
          dependencies: ['react', 'react-dom', 'react-router-dom'],
        },
        deploymentConfig: {
          platform: 'static',
          buildCommand: 'npm run build',
          outputDir: frontend.buildConfig.outputDir,
          environmentVariables: {
            NODE_ENV: 'production',
            VITE_APP_VERSION: '1.0.0',
          },
        },
        generatedAt: new Date().toISOString(),
        pipelineVersion: '1.0.0',
      };

      const logs = [
        this.createLog('info', `Final rendering complete: ${files.length} files`, { totalSize: files.reduce((s, f) => s + f.sizeBytes, 0) }, 'final-rendering'),
      ];

      if (scoring) {
        logs.push(this.createLog('info', `Pipeline score: ${scoring.overall}/100`, {}, 'final-rendering'));
      }

      return this.createSuccessOutput(artifact, logs);
    } catch (err) {
      return this.createFailureOutput(err instanceof Error ? err.message : String(err));
    }
  }

  private renderPage(page: any, entryPoint: string): string {
    const imports = page.imports.join('\n');
    return `${imports}
import { useEffect } from 'react';

export default function ${this.capitalize(page.id)}Page() {
  useEffect(() => {
    document.title = '${page.meta?.title || page.id}';
  }, []);

  return (
${page.template.split('\n').map((l: string) => '    ' + l).join('\n')}
  );
}`;
  }

  private renderGlobalStyles(design: any, motion: any): string {
    const palette = design.colorPalette;
    const vars = Object.entries(palette)
      .map(([k, v]) => `  --color-${this.kebabCase(k)}: ${v};`)
      .join('\n');

    const motionVars = motion?.cssVariables
      ? Object.entries(motion.cssVariables).map(([k, v]) => `  ${k}: ${v};`).join('\n')
      : '';

    return `:root {
${vars}
${motionVars}
  --font-family: ${design.typography.fontFamily};
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  background: var(--color-background);
  color: var(--color-text);
}
`;
  }

  private renderEntryPoint(pages: any[]): string {
    const imports = pages.map((p) => `const ${this.capitalize(p.id)}Page = lazy(() => import('./pages/${p.id}'));`).join('\n');
    return `import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/globals.css';

${imports}

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <BrowserRouter>
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
${pages.map((p) => `        <Route path="${p.route}" element={<${this.capitalize(p.id)}Page />} />`).join('\n')}
      </Routes>
    </Suspense>
  </BrowserRouter>
);`;
  }

  private renderViteConfig(): string {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});`;
  }

  private renderPackageJson(): string {
    return JSON.stringify({
      name: 'generated-app',
      version: '1.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
      dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0', 'react-router-dom': '^6.20.0' },
      devDependencies: { '@types/react': '^18.2.0', '@types/react-dom': '^18.2.0', typescript: '^5.0.0', vite: '^5.0.0', '@vitejs/plugin-react': '^4.0.0' },
    }, null, 2);
  }

  private renderIndexHtml(title: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private kebabCase(s: string): string {
    return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
