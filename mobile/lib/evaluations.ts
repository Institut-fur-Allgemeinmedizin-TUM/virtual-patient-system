export function mapEvalauationKeyToLabel(key: string): string {
  const mapping: Record<string, string> = {
    criterion1: 'Gesprächsführung',
    criterion2: 'Erkennung relevanter Informationen',
    criterion3: 'Zielgerichtete Fragen',
    criterion4: 'Spezifische Ursachen',
    criterion5: 'Logische Reihenfolge',
    criterion6: 'Rückversicherung',
    criterion7: 'Zusammenfassung',
    criterion8: 'Qualität und Zeit',
  };
  return mapping[key] || key;
}
