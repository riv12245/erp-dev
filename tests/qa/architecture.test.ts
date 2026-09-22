import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Architecture Validation Tests', () => {
  const SRC_DIR = join(process.cwd(), 'services/api/src');
  const PACKAGES_DIR = join(process.cwd(), 'packages');

  function getTsFiles(dir: string): string[] {
    try {
      const files = readdirSync(dir);
      const tsFiles: string[] = [];
      for (const file of files) {
        const fullPath = join(dir, file);
        if (file.endsWith('.ts') && !file.endsWith('.d.ts') && !file.endsWith('.test.ts')) {
          tsFiles.push(fullPath);
        }
      }
      return tsFiles;
    } catch {
      return [];
    }
  }

  it('should not have God Store (single store managing all entities)', () => {
    const files = getTsFiles(SRC_DIR);
    const allContent = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(allContent).not.toContain('class UniversalStore');
    expect(allContent).not.toContain('class GodStore');
    expect(allContent).not.toContain('class GlobalRepository');
  });

  it('should not have God Service (single service doing everything)', () => {
    const files = getTsFiles(SRC_DIR);
    const allContent = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(allContent).not.toContain('class UniversalService');
    expect(allContent).not.toContain('class GodService');
    expect(allContent).not.toContain('class MasterService');
  });

  it('should have bounded context directories', () => {
    const platformDir = join(SRC_DIR, 'platform');
    expect(platformDir).toBeTruthy();
    const platformFiles = getTsFiles(platformDir);
    expect(platformFiles.length).toBeGreaterThan(0);
  });

  it('should enforce import boundaries - domain entities should not import infrastructure', () => {
    const domainDir = join(SRC_DIR, 'platform/auth/domain');
    const domainFiles = getTsFiles(domainDir);
    domainFiles.forEach((file) => {
      const content = readFileSync(file, 'utf8');
      expect(content).not.toContain("from '../../infrastructure");
      expect(content).not.toContain("from '../infrastructure");
    });
  });

  it('should have domain entities in domain directory', () => {
    const domainDir = join(SRC_DIR, 'platform/auth/domain/entities');
    const files = getTsFiles(domainDir);
    expect(files.length).toBeGreaterThan(0);
  });

  it('should have repositories in domain directory', () => {
    const repoDir = join(SRC_DIR, 'platform/auth/domain/repositories');
    const files = getTsFiles(repoDir);
    expect(files.length).toBeGreaterThan(0);
  });

  it('should have services in domain directory', () => {
    const serviceDir = join(SRC_DIR, 'platform/auth/domain/services');
    const files = getTsFiles(serviceDir);
    expect(files.length).toBeGreaterThan(0);
  });
});
