-- Re-create the analytics function to match your ACTUAL schema
DROP FUNCTION IF EXISTS get_project_analytics();

CREATE OR REPLACE FUNCTION get_project_analytics()
RETURNS TABLE (
    project_id UUID,
    project_name TEXT, -- Mapping project_code to this for frontend compatibility
    client_name TEXT,
    status TEXT,
    clicks BIGINT, -- 'click' status
    completes BIGINT, -- 'complete' status
    terminates BIGINT, -- 'terminate' status
    quota_full BIGINT, -- 'quota' status
    conversion_rate NUMERIC
) LANGUAGE sql AS $$
    SELECT 
        p.id as project_id,
        p.project_code as project_name, -- Use project_code as the display name
        COALESCE(c.name, 'Unknown Client') as client_name,
        p.status,
        COUNT(r.id) FILTER (WHERE r.status = 'click') as clicks,
        COUNT(r.id) FILTER (WHERE r.status = 'complete') as completes,
        COUNT(r.id) FILTER (WHERE r.status = 'terminate') as terminates,
        COUNT(r.id) FILTER (WHERE r.status = 'quota') as quota_full,
        CASE 
            WHEN COUNT(r.id) FILTER (WHERE r.status = 'click') > 0 
            THEN ROUND((COUNT(r.id) FILTER (WHERE r.status = 'complete')::NUMERIC / COUNT(r.id) FILTER (WHERE r.status = 'click')::NUMERIC) * 100, 2)
            ELSE 0 
        END as conversion_rate
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN responses r ON r.project_id = p.id
    GROUP BY p.id, p.project_code, c.name, p.status;
$$;
