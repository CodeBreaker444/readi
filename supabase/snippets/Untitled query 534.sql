DELETE FROM public.client
WHERE client_name LIKE 'Flow Client %'
  AND client_name ~ 'Flow Client \d+$';
