update articles
set status = 'pending',
    processing_error = null
where status in ('active', 'failed', 'processing');