import * as assert from 'assert';
import { buildRegistryUrl } from '../utils';

describe('Registry', () => {
  describe('buildRegistryUrl', () => {
    it('should replace {package} placeholder for simple packages', () => {
      const url = buildRegistryUrl('lodash', 'https://npm.example.com/{package}/');
      assert.strictEqual(url, 'https://npm.example.com/lodash/');
    });

    it('should URL-encode package names', () => {
      const url = buildRegistryUrl('some-package', 'https://npm.example.com/{package}');
      assert.strictEqual(url, 'https://npm.example.com/some-package');
    });

    it('should handle scoped packages with {package} placeholder', () => {
      const url = buildRegistryUrl('@scope/name', 'https://npm.example.com/{package}/');
      assert.strictEqual(url, 'https://npm.example.com/%40scope%2Fname/');
    });

    it('should replace {scope} and {name} for scoped packages', () => {
      const url = buildRegistryUrl('@myorg/mypackage', 'https://npm.example.com/{scope}/{name}');
      assert.strictEqual(url, 'https://npm.example.com/%40myorg/mypackage');
    });

    it('should handle {scope} placeholder for non-scoped packages', () => {
      const url = buildRegistryUrl('lodash', 'https://npm.example.com/{scope}/{name}');
      assert.strictEqual(url, 'https://npm.example.com//lodash');
    });

    it('should handle multiple placeholder occurrences', () => {
      const url = buildRegistryUrl('lodash', 'https://npm.example.com/{package}?name={package}');
      assert.strictEqual(url, 'https://npm.example.com/lodash?name=lodash');
    });

    it('should handle complex URL patterns', () => {
      const url = buildRegistryUrl('@company/lib', 'https://artifacts.example.com/npm-local/{package}/-/{name}-latest.tgz');
      assert.strictEqual(url, 'https://artifacts.example.com/npm-local/%40company%2Flib/-/lib-latest.tgz');
    });
  });
});
