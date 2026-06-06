const PermissionService = require('./permissionService');

/**
 * Core — Permissions
 *
 * Registers the shared PermissionService singleton and exposes the
 * checkPermission / checkAllPermissions middleware factories so that
 * every module can import them without knowing the concrete binding.
 */

module.exports = {
  register(container) {
    container.singleton('PermissionService', (c) =>
      new PermissionService(c.make('prisma')),
    );
  },

  boot(_app, _container) {
    
  },
};
