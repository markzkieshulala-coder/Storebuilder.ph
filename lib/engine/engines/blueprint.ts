import { BaseEngine } from '../core/base-engine';
import { EngineName, EngineInput, EngineOutput } from '../core/types';

export interface BlueprintArtifact {
  type: 'blueprint';
  pageBlueprints: PageBlueprint[];
  sharedComponents: string[];
  dataModel: Record<string, DataModel>;
  apiContracts: ApiContract[];
}

export interface PageBlueprint {
  id: string;
  name: string;
  route: string;
  sections: SectionBlueprint[];
  stateManagement: string[];
}

export interface SectionBlueprint {
  id: string;
  componentType: string;
  dataBinding?: string;
  events: string[];
}

export interface DataModel {
  fields: Record<string, string>;
  relations?: string[];
}

export interface ApiContract {
  endpoint: string;
  method: string;
  requestSchema: Record<string, string>;
  responseSchema: Record<string, string>;
}

export class BlueprintEngine extends BaseEngine<unknown, BlueprintArtifact> {
  readonly name: EngineName = 'blueprint';
  readonly version = '1.0.0';
  readonly dependencies: EngineName[] = ['planning'];

  async execute(input: EngineInput<unknown>): Promise<EngineOutput<BlueprintArtifact>> {
    const plan = input.context.getArtifact<{ pages: string[]; features: string[] }>('planning');

    if (!plan) {
      return this.createFailureOutput('Missing planning artifact');
    }

    try {
      const pageBlueprints = plan.pages.map((page) => this.buildPageBlueprint(page, plan.features));
      const sharedComponents = this.inferSharedComponents(plan.features);
      const dataModel = this.buildDataModel(plan.features);
      const apiContracts = this.buildApiContracts(plan.features);

      const artifact: BlueprintArtifact = {
        type: 'blueprint',
        pageBlueprints,
        sharedComponents,
        dataModel,
        apiContracts,
      };

      const logs = [this.createLog('info', `Blueprint generated for ${pageBlueprints.length} pages`, {}, 'blueprint')];
      return this.createSuccessOutput(artifact, logs);
    } catch (err) {
      return this.createFailureOutput(err instanceof Error ? err.message : String(err));
    }
  }

  private buildPageBlueprint(page: string, features: string[]): PageBlueprint {
    const sections: SectionBlueprint[] = [];
    if (page === 'home') {
      sections.push({ id: 'hero', componentType: 'HeroSection', events: ['cta_click'] });
      if (features.includes('gallery')) sections.push({ id: 'gallery', componentType: 'GallerySection', events: ['image_click'] });
    }
    if (page === 'shop') {
      sections.push({ id: 'product-grid', componentType: 'ProductGrid', dataBinding: 'products', events: ['add_to_cart'] });
    }

    return {
      id: `page-${page}`,
      name: page,
      route: page === 'home' ? '/' : `/${page}`,
      sections,
      stateManagement: ['React.Context'],
    };
  }

  private inferSharedComponents(features: string[]): string[] {
    const shared = ['Header', 'Footer', 'Layout'];
    if (features.includes('auth')) shared.push('AuthModal');
    if (features.includes('search')) shared.push('SearchBar');
    return shared;
  }

  private buildDataModel(features: string[]): Record<string, DataModel> {
    const model: Record<string, DataModel> = {};
    if (features.includes('shop')) {
      model.Product = { fields: { id: 'string', name: 'string', price: 'number', image: 'string' } };
      model.CartItem = { fields: { productId: 'string', quantity: 'number' } };
    }
    if (features.includes('auth')) {
      model.User = { fields: { id: 'string', email: 'string', name: 'string' } };
    }
    return model;
  }

  private buildApiContracts(features: string[]): ApiContract[] {
    const contracts: ApiContract[] = [];
    if (features.includes('shop')) {
      contracts.push({ endpoint: '/api/products', method: 'GET', requestSchema: {}, responseSchema: { items: 'Product[]' } });
    }
    if (features.includes('auth')) {
      contracts.push({ endpoint: '/api/auth/login', method: 'POST', requestSchema: { email: 'string', password: 'string' }, responseSchema: { token: 'string', user: 'User' } });
    }
    return contracts;
  }
}
