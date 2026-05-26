import { IEngine, EngineName } from './types';

export class EngineRegistry {
  private engines = new Map<EngineName, IEngine>();

  register(engine: IEngine): void {
    if (this.engines.has(engine.name)) {
      throw new Error(`Engine '${engine.name}' is already registered`);
    }
    this.engines.set(engine.name, engine);
  }

  unregister(name: EngineName): boolean {
    return this.engines.delete(name);
  }

  get(name: EngineName): IEngine | undefined {
    return this.engines.get(name);
  }

  has(name: EngineName): boolean {
    return this.engines.has(name);
  }

  getAll(): IEngine[] {
    return Array.from(this.engines.values());
  }

  getRegisteredNames(): EngineName[] {
    return Array.from(this.engines.keys());
  }

  validateDependencies(): void {
    for (const [name, engine] of this.engines) {
      for (const dep of engine.dependencies) {
        if (!this.engines.has(dep)) {
          throw new Error(`Engine '${name}' depends on unregistered engine '${dep}'`);
        }
      }
    }
  }

  clear(): void {
    this.engines.clear();
  }
}
