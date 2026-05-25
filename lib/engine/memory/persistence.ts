import { ISharedContext } from '../core/types';

export interface IPersistenceAdapter {
  save(pipelineId: string, context: ISharedContext): Promise<void>;
  load(pipelineId: string): Promise<ISharedContext | null>;
  exists(pipelineId: string): Promise<boolean>;
  delete(pipelineId: string): Promise<boolean>;
  list(): Promise<string[]>;
}

export class InMemoryPersistenceAdapter implements IPersistenceAdapter {
  private store = new Map<string, ISharedContext>();

  async save(pipelineId: string, context: ISharedContext): Promise<void> {
    this.store.set(pipelineId, JSON.parse(JSON.stringify(context)));
  }

  async load(pipelineId: string): Promise<ISharedContext | null> {
    const data = this.store.get(pipelineId);
    return data ? JSON.parse(JSON.stringify(data)) : null;
  }

  async exists(pipelineId: string): Promise<boolean> {
    return this.store.has(pipelineId);
  }

  async delete(pipelineId: string): Promise<boolean> {
    return this.store.delete(pipelineId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

export class FileSystemPersistenceAdapter implements IPersistenceAdapter {
  constructor(
    private basePath: string,
    private fs = require('fs').promises,
    private path = require('path')
  ) {}

  private getFilePath(pipelineId: string): string {
    return this.path.join(this.basePath, `${pipelineId}.json`);
  }

  async save(pipelineId: string, context: ISharedContext): Promise<void> {
    await this.fs.mkdir(this.basePath, { recursive: true });
    const filePath = this.getFilePath(pipelineId);
    await this.fs.writeFile(filePath, JSON.stringify(context, null, 2), 'utf-8');
  }

  async load(pipelineId: string): Promise<ISharedContext | null> {
    try {
      const filePath = this.getFilePath(pipelineId);
      const data = await this.fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as ISharedContext;
    } catch {
      return null;
    }
  }

  async exists(pipelineId: string): Promise<boolean> {
    try {
      await this.fs.access(this.getFilePath(pipelineId));
      return true;
    } catch {
      return false;
    }
  }

  async delete(pipelineId: string): Promise<boolean> {
    try {
      await this.fs.unlink(this.getFilePath(pipelineId));
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<string[]> {
    try {
      const files = await this.fs.readdir(this.basePath);
      return files
        .filter((f: string) => f.endsWith('.json'))
        .map((f: string) => f.replace('.json', ''));
    } catch {
      return [];
    }
  }
}

export class MemoryManager {
  private adapter: IPersistenceAdapter;

  constructor(adapter?: IPersistenceAdapter) {
    this.adapter = adapter || new InMemoryPersistenceAdapter();
  }

  setAdapter(adapter: IPersistenceAdapter): void {
    this.adapter = adapter;
  }

  async persist(context: ISharedContext): Promise<void> {
    await this.adapter.save(context.pipelineId, context);
  }

  async restore(pipelineId: string): Promise<ISharedContext | null> {
    return this.adapter.load(pipelineId);
  }

  async checkExists(pipelineId: string): Promise<boolean> {
    return this.adapter.exists(pipelineId);
  }

  async remove(pipelineId: string): Promise<boolean> {
    return this.adapter.delete(pipelineId);
  }

  async listPersisted(): Promise<string[]> {
    return this.adapter.list();
  }
}
