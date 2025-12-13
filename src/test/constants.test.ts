import * as assert from 'assert';
import { DEPENDENCY_TYPE_INFO, LOCATION_TYPE_INFO } from '../constants';
import { DependencyType, LocationType } from '../types';

describe('Constants', () => {
  describe('DEPENDENCY_TYPE_INFO', () => {
    it('should have info for all dependency types', () => {
      assert.ok(DEPENDENCY_TYPE_INFO[DependencyType.Direct]);
      assert.ok(DEPENDENCY_TYPE_INFO[DependencyType.Dev]);
      assert.ok(DEPENDENCY_TYPE_INFO[DependencyType.Peer]);
      assert.ok(DEPENDENCY_TYPE_INFO[DependencyType.Transitive]);
    });

    it('should have required properties for each type', () => {
      for (const type of Object.values(DependencyType)) {
        const info = DEPENDENCY_TYPE_INFO[type];
        assert.ok(info.icon, `${type} should have icon`);
        assert.ok(info.label, `${type} should have label`);
        assert.ok(info.description, `${type} should have description`);
      }
    });

    it('should use distinct icons for each type', () => {
      const icons = Object.values(DEPENDENCY_TYPE_INFO).map(i => i.icon);
      const uniqueIcons = new Set(icons);
      assert.strictEqual(icons.length, uniqueIcons.size, 'Each dependency type should have a unique icon');
    });
  });

  describe('LOCATION_TYPE_INFO', () => {
    it('should have info for all location types', () => {
      assert.ok(LOCATION_TYPE_INFO[LocationType.Hoisted]);
      assert.ok(LOCATION_TYPE_INFO[LocationType.Nested]);
      assert.ok(LOCATION_TYPE_INFO[LocationType.Workspace]);
    });

    it('should have required properties for each type', () => {
      for (const type of Object.values(LocationType)) {
        const info = LOCATION_TYPE_INFO[type];
        assert.ok(info.icon, `${type} should have icon`);
        assert.ok(info.label, `${type} should have label`);
        assert.ok(info.description, `${type} should have description`);
      }
    });

    it('should mark nested as a warning with yellow color', () => {
      assert.strictEqual(LOCATION_TYPE_INFO[LocationType.Nested].color, 'charts.yellow');
    });
  });
});
