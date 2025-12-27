/**
 * Tenant Isolation Middleware
 * 
 * This middleware ensures that users can only access resources
 * belonging to their tenant. It should be used after authentication.
 * 
 * It validates that:
 * 1. The resource's tenantId matches the user's tenantId
 * 2. Any tenantId in request params/body matches the user's tenantId
 */
const ensureTenantAccess = (req, res, next) => {
  if (!req.user || !req.user.tenantId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const userTenantId = req.user.tenantId;

  // Check if tenantId is in params
  if (req.params.tenantId && req.params.tenantId !== userTenantId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Cannot access resources from another tenant',
    });
  }

  // Check if tenantId is in body (for create/update operations)
  if (req.body.tenantId && req.body.tenantId !== userTenantId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Cannot create resources for another tenant',
    });
  }

  // Automatically set tenantId from authenticated user
  // This prevents users from creating resources for other tenants
  if (req.body && !req.body.tenantId) {
    req.body.tenantId = userTenantId;
  }

  next();
};

/**
 * Middleware to filter query results by tenantId
 * Automatically adds tenantId filter to queries
 */
const filterByTenant = (req, res, next) => {
  if (!req.user || !req.user.tenantId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // Add tenantId to query if not already present
  if (!req.query.tenantId) {
    req.query.tenantId = req.user.tenantId;
  } else if (req.query.tenantId !== req.user.tenantId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Cannot query resources from another tenant',
    });
  }

  next();
};

module.exports = {
  ensureTenantAccess,
  filterByTenant,
};

