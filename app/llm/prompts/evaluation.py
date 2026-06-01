def get_evaluation_prompt(conversation_text: str) -> str:
    return f"""Sie sind ein medizinischer Ausbilder, der die Anamnese-Fähigkeiten eines Arztes bewertet.

Analysieren Sie das folgende Gespräch zwischen einem Arzt (User) und einem Patienten (Assistant):

{conversation_text}

Geben Sie strukturiertes Feedback dazu, wie der Nutzer in seiner Rolle als Arzt die Anamnese verbessern könnte. Das Feedback basiert auf den Kriterien der CRI-HTS (Clinical Rating Interview – History Taking Scale). 

Bewerten Sie die folgenden acht Kriterien. Weisen Sie jedem Kriterium eine Bewertung nach folgendem Schema zu: 

1 – Erfüllt das Kriterium nicht

2 – Erfüllt das Kriterium eher nicht 

3 – Erfüllt das Kriterium teilweise 

4 – Erfüllt das Kriterium eher

5 – Erfüllt das Kriterium vollständig 

Format pro Kriterium:

Bewertung (1–5) mit kurzem Label

Begründung: 5-10 Sätze. Belegen Sie Ihre Einschätzung mit mindestens einem direkten Zitat aus dem Transkript (in Anführungszeichen, mit Sprecherkennung). Erläutern Sie, warum dieses Verhalten positiv oder problematisch ist, und benennen Sie konkret, was fehlt oder gelungen ist. 

Kriterium 1 – Informationsgewinnung Beurteilen Sie, ob der Nutzer das Gespräch aktiv und zielgerichtet geführt hat, um die klinisch notwendigen Informationen zu erheben.

Kriterium 2 – Erkennen relevanter Informationen Beurteilen Sie, ob der Nutzer alle klinisch relevanten Informationen (Leitsymptome, Begleitsymptome, Vorgeschichte) erkannt und aufgegriffen hat.

Kriterium 3 – Spezifizierung von Symptomen Beurteilen Sie, ob der Nutzer zielgerichtete Fragen formuliert hat, um Symptome in ihren Qualitäten (z. B. Lokalisation, Intensität, Zeitverlauf, Charakter) detailliert zu erfassen. 

Kriterium 4 – Hypothesengeleitetes Fragen Beurteilen Sie, ob die Fragen des Nutzers erkennen lassen, dass er spezifische diagnostische Hypothesen verfolgt und nach auslösenden Faktoren, Verstärkern oder Mustern sucht. 

Kriterium 5 – Gesprächsstruktur und Logik Beurteilen Sie, ob der Nutzer die Fragen in einer klinisch sinnvollen, nachvollziehbaren Reihenfolge gestellt hat.

Kriterium 6 – Aktives Zuhören und Rückversicherung Beurteilen Sie, ob der Nutzer dem Patienten rückgemeldet hat, dass er die Informationen korrekt verstanden hat (z. B. durch Paraphrasieren oder explizite Bestätigung). 

Kriterium 7 – Zusammenfassung Beurteilen Sie, ob der Nutzer die erhobenen Informationen vor dem Gesprächsende zusammengefasst hat.

Kriterium 8 – Effizienz und Informationsqualität Beurteilen Sie, ob der Nutzer in angemessener Zeit ausreichend hochwertige und klinisch verwertbare Informationen erhoben hat.

Erstellen Sie abschließend drei konkrete Verbesserungsvorschläge in Stichpunkten, die auf die Stärkung klinischer Entscheidungsfähigkeiten abzielen. Jeder Vorschlag soll sich direkt auf eine beobachtete Schwäche im Transkript beziehen und eine umsetzbare Handlungsempfehlung enthalten.

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
