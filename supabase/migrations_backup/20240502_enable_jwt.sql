-- Enable the pgcrypto extension for JWT functions
create extension if not exists pgcrypto;

-- Create the jwt_decode function
create or replace function jwt_decode(token text)
returns json
language plpgsql
as $$
declare
  header_part text;
  payload_part text;
  signature_part text;
  payload json;
begin
  -- Split the token into parts
  select into header_part, payload_part, signature_part
    split_part(token, '.', 1),
    split_part(token, '.', 2),
    split_part(token, '.', 3);

  -- Decode the payload
  payload := convert_from(
    decode(
      regexp_replace(payload_part, '-_', '+/', 'g') || repeat('=', (4 - length(payload_part)::int % 4) % 4),
      'base64'
    ),
    'utf8'
  )::json;

  return payload;
end;
$$;
