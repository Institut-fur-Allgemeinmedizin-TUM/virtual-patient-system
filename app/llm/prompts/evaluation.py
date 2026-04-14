def get_evaluation_prompt(conversation_text: str) -> str:
    return f"""Sie sind ein medizinischer Ausbilder, der die Anamnese-Fähigkeiten eines Arztes bewertet.

Analysieren Sie das folgende Gespräch zwischen einem Arzt (User) und einem Patienten (Assistant):

{conversation_text}

Geben Sie Rückmeldung dazu, wie der Arzt die Anamnese verbessern könnte.

Ihr Feedback soll die folgenden acht Kriterien enthalten:

1. Gesprächsführung: Beurteilen Sie, ob der Arzt das Gespräch geführt hat, um die erforderlichen Informationen zu erhalten.

2. Erkennung relevanter Informationen: Beurteilen Sie, ob der Arzt alle relevanten Informationen erkennt.

3. Zielgerichtete Fragen: Beurteilen Sie, ob der Arzt zielgerichtete Fragen formuliert, um Symptome detailliert zu erfassen und zu spezifizieren.

4. Spezifische Ursachen: Beurteilen Sie, ob die Fragen des Arztes nahelegen, dass spezifische Ursachen oder Umstände zu bestimmten Symptomen führen.

5. Logische Reihenfolge: Beurteilen Sie, ob der Arzt die Fragen in einer logischen Reihenfolge stellt.

6. Rückversicherung: Beurteilen Sie, ob der Arzt den Patienten rückversichert, dass er die Informationen korrekt verstanden hat.

7. Zusammenfassung: Beurteilen Sie, ob der Arzt seine gesammelten Informationen vor dem Gesprächsende zusammengefasst hat.

8. Qualität und Zeit: Beurteilen Sie, ob der Arzt ausreichend hochwertige Informationen in angemessener Zeit erhoben hat.

Weisen Sie jedem der acht Kriterien eine Bewertung nach folgendem Schema zu:
1 - Erfüllt das Kriterium nicht
2 - Erfüllt das Kriterium eher nicht
3 - Erfüllt das Kriterium teilweise
4 - Erfüllt das Kriterium eher
5 - Erfüllt das Kriterium vollständig

Erläutern Sie die Bewertung mit zwei Sätzen.

Erstellen Sie drei Verbesserungsvorschläge in Stichpunkten, die auf die Stärkung klinischer Entscheidungsfähigkeiten abzielen.

WICHTIG: Antworten Sie ausschließlich im folgenden JSON-Format (ohne zusätzlichen Text):
{{
  "criteria": [
    {{"name": "Gesprächsführung", "score": 1-5, "explanation": "Zwei Sätze Erklärung"}},
    {{"name": "Erkennung relevanter Informationen", "score": 1-5, "explanation": "Zwei Sätze Erklärung"}},
    {{"name": "Zielgerichtete Fragen", "score": 1-5, "explanation": "Zwei Sätze Erklärung"}},
    {{"name": "Spezifische Ursachen", "score": 1-5, "explanation": "Zwei Sätze Erklärung"}},
    {{"name": "Logische Reihenfolge", "score": 1-5, "explanation": "Zwei Sätze Erklärung"}},
    {{"name": "Rückversicherung", "score": 1-5, "explanation": "Zwei Sätze Erklärung"}},
    {{"name": "Zusammenfassung", "score": 1-5, "explanation": "Zwei Sätze Erklärung"}},
    {{"name": "Qualität und Zeit", "score": 1-5, "explanation": "Zwei Sätze Erklärung"}}
  ],
  "suggestions": ["Vorschlag 1", "Vorschlag 2", "Vorschlag 3"]
}}"""
