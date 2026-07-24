/**
 * Admin router — thin re-export.
 *
 * All admin logic has moved to backend/src/routes/admin/index.js.
 * This file exists only so backend/src/index.js's import path
 * (`import adminRouter from './routes/admin.js'`) keeps working unchanged.
 */
export { default } from './admin/index.js';

