-- =====================================================
-- FINATRADES AWS DATABASE DIAGNOSTIC SCRIPT
-- Run this on AWS to find exactly what's wrong
-- =====================================================

-- 1. Check if required tables exist
SELECT 'CHECKING TABLES...' as step;

SELECT 'employees' as table_name, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') as exists
UNION ALL
SELECT 'role_permissions', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions')
UNION ALL
SELECT 'admin_roles', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_roles')
UNION ALL
SELECT 'admin_components', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_components')
UNION ALL
SELECT 'role_component_permissions', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'role_component_permissions')
UNION ALL
SELECT 'user_role_assignments', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_role_assignments')
UNION ALL
SELECT 'task_definitions', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'task_definitions')
UNION ALL
SELECT 'approval_queue', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_queue')
UNION ALL
SELECT 'treasury_cash_vault', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'treasury_cash_vault')
UNION ALL
SELECT 'treasury_gold_vault', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'treasury_gold_vault')
UNION ALL
SELECT 'workflow_audit_logs', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_audit_logs')
UNION ALL
SELECT 'workflow_audit_summaries', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_audit_summaries');

-- 2. Check employees table structure
SELECT 'EMPLOYEES TABLE COLUMNS:' as step;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees' ORDER BY ordinal_position;

-- 3. Check user_role_assignments structure
SELECT 'USER_ROLE_ASSIGNMENTS COLUMNS:' as step;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_role_assignments' ORDER BY ordinal_position;

-- 4. Check admin_roles structure  
SELECT 'ADMIN_ROLES COLUMNS:' as step;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admin_roles' ORDER BY ordinal_position;

-- 5. Check required enums exist
SELECT 'CHECKING ENUMS...' as step;
SELECT 'employee_role' as enum_name, EXISTS(SELECT 1 FROM pg_type WHERE typname = 'employee_role') as exists
UNION ALL
SELECT 'employee_status', EXISTS(SELECT 1 FROM pg_type WHERE typname = 'employee_status')
UNION ALL
SELECT 'risk_level', EXISTS(SELECT 1 FROM pg_type WHERE typname = 'risk_level')
UNION ALL
SELECT 'approval_status', EXISTS(SELECT 1 FROM pg_type WHERE typname = 'approval_status');

-- 6. Check users table has new columns
SELECT 'USERS TABLE NEW COLUMNS:' as step;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('custom_finatrades_id', 'finatrades_id_otp', 'finatrades_id_otp_expiry', 'finatrades_id_otp_attempts')
ORDER BY column_name;

-- 7. Try to query employees table
SELECT 'TESTING EMPLOYEES QUERY:' as step;
SELECT COUNT(*) as employee_count FROM employees;

-- 8. Try to query user_role_assignments
SELECT 'TESTING USER_ROLE_ASSIGNMENTS QUERY:' as step;
SELECT COUNT(*) as role_assignment_count FROM user_role_assignments;

-- 9. Try to query admin_roles
SELECT 'TESTING ADMIN_ROLES QUERY:' as step;
SELECT COUNT(*) as admin_role_count FROM admin_roles;

-- 10. Check role_permissions data
SELECT 'ROLE_PERMISSIONS DATA:' as step;
SELECT role, length(permissions::text) as permissions_length FROM role_permissions;

SELECT 'DIAGNOSIS COMPLETE' as step;
