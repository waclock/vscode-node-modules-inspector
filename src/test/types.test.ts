import * as assert from 'assert';
import { DependencyType, LocationType } from '../types';

describe('Types', () => {
  describe('DependencyType', () => {
    it('should have correct enum values', () => {
      assert.strictEqual(DependencyType.Direct, 'direct');
      assert.strictEqual(DependencyType.Dev, 'dev');
      assert.strictEqual(DependencyType.Peer, 'peer');
      assert.strictEqual(DependencyType.Transitive, 'transitive');
    });
  });

  describe('LocationType', () => {
    it('should have correct enum values', () => {
      assert.strictEqual(LocationType.Hoisted, 'hoisted');
      assert.strictEqual(LocationType.Nested, 'nested');
      assert.strictEqual(LocationType.Workspace, 'workspace');
    });
  });
});
