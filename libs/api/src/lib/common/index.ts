/**
 * The framework-free contracts live in `@music-collection/common/api`; this
 * barrel passes them on so the existing `@music-collection/api` imports keep
 * working, and adds the parts that still need Angular.
 */
export * from '@music-collection/common/api';

export * from './base/component';
export * from './base/directive';
export * from './entity/entity-util.service';
