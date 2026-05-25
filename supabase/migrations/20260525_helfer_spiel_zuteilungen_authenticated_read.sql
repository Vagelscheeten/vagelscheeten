CREATE POLICY "authenticated_can_read"
ON helfer_spiel_zuteilungen
FOR SELECT
TO authenticated
USING (true);

COMMENT ON POLICY "authenticated_can_read" ON helfer_spiel_zuteilungen IS
'Eingeloggte Admin-Nutzer dürfen die Zuteilungen lesen. Schreiboperationen laufen weiterhin ausschließlich über die Server-Route /api/helfer/spiel-zuteilungen mit Service-Role.';
