#!/bin/bash
# Skript zum Korrigieren aller SpendenBedarf und SpendenRueckmeldung Imports

# Findet alle .tsx Dateien und ersetzt die Imports
for file in app/admin/helfer/essensspenden/*.tsx; do
  # Überspringt die SpendenView.tsx selbst und die EssensspendenTabs.tsx, die die Komponente importiert
  if [[ "$file" != "app/admin/helfer/essensspenden/SpendenView.tsx" && "$file" != "app/admin/helfer/essensspenden/EssensspendenTabs.tsx" ]]; then
    # Ersetzt alle Imports der Form import { ... } from './SpendenView' durch import { ... } from './types'
    sed -i '' -E 's/import \{ ([^}]*)(SpendenBedarf|SpendenRueckmeldung|SpendenBedarfMitSumme|SpendenBedarfMitZuteilungen)([^}]*) \} from '\''\.\\/SpendenView'\'';/import { \1\2\3 } from '\''.\\/types'\'';/g' "$file"
  fi
done

echo "Alle Imports wurden korrigiert!"
