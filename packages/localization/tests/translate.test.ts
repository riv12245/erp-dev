import { describe, expect, it } from 'vitest';
import { translate, locales, dictionaries, currentLocale } from '../src/index.js';

describe('translation lookups', () => {
  it('resolves nested keys via dot paths', () => {
    expect(translate('en', 'common.save')).toBe('Save');
    expect(translate('en', 'common.appName')).toBe('ERP Platform');
    expect(translate('en', 'auth.login')).toBe('Sign in');
    expect(translate('en', 'nav.dashboard')).toBe('Dashboard');
  });

  it('falls back to the key when missing', () => {
    expect(translate('en', 'common.does.not.exist')).toBe('common.does.not.exist');
  });

  it('supports both locales', () => {
    expect(locales).toEqual(['en', 'es']);
    expect(dictionaries.es['common.loading']).toBeDefined();
    expect(dictionaries.es['auth.login']).toBeDefined();
  });

  it('interpolates named parameters', () => {
    const key = 'greeting {name}';
    expect(translate('en', key, { name: 'Ada' })).toBe('greeting Ada');
    expect(translate('en', key, { name: 42 })).toBe('greeting 42');
  });

  it('reports the current default locale', () => {
    expect(currentLocale()).toBe('en');
  });
});