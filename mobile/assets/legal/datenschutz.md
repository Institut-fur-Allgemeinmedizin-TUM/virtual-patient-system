Diese Datenschutzerklärung informiert Sie gemäß Art. 13 und 14 der Datenschutz-Grundverordnung (DSGVO) über den Umgang mit personenbezogenen Daten bei der Nutzung des Virtuellen Patientensystems des Instituts für Allgemeinmedizin und Versorgungsforschung der Technischen Universität München.

## Verantwortlicher

Institut für Allgemeinmedizin und Versorgungsforschung\
TUM School of Medicine and Health\
Technische Universität München\
Orleansstraße 47\
81667 München\
E-Mail: allgemeinmedizin@mri.tum.de

## Datenschutzbeauftragte/r der TUM

Technische Universität München\
Datenschutzbeauftragte/r\
Arcisstraße 21\
80333 München\
E-Mail: beauftragter@datenschutz.tum.de



## Allgemeines zur Datenverarbeitung und Rechtsgrundlage

Das Virtuelle Patientensystem dient der Durchführung und Optimierung des digitalen Lehrbetriebs. Bei der Nutzung des Systems werden unvermeidbar auch personenbezogene bzw. personenbeziehbare Daten (z. B. IP-Adresse, Login-Token) verarbeitet.

Die Rechtsgrundlage für diese Verarbeitung ist **Art. 6 Abs. 1 lit. e DSGVO** in Verbindung mit **Art. 4 Abs. 1 des Bayerischen E-Government-Gesetzes (BayEGovG)** und den Aufgaben der Hochschule zur Durchführung des Lehrbetriebs gemäß dem Bayerischen Hochschulinnovationsgesetz (BayHIG). Die Verarbeitung ist erforderlich, um das System sicher bereitzustellen, den Authentifizierungsprozess zu ermöglichen und den studentischen Lehrbetrieb durchzuführen.



## Bereitstellung des Systems und Webhosting (Google Cloud)

Das System wird als Docker-Image bei einem externen Service Provider, der Google Cloud Platform (Google Cloud EMEA Limited, 70 Sir John Rogerson's Quay, Dublin 2, Irland; Mutterunternehmen: Google LLC, USA), gehostet.

Beim Zugriff auf das System werden technisch bedingt Zugriffsdaten erhoben und in Logfiles auf den Servern des Providers gespeichert.

| Merkmal                   | Beschreibung                                                                                                          |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------|
| **Verarbeitete Daten**    | IP-Adresse des zugreifenden Endgeräts, Datum und Uhrzeit des Abrufs, Browsertyp/-version, verwendetes Betriebssystem. |
| **Zweck**                 | Gewährleistung der Stabilität, Systemsicherheit und ordnungsgemäßen Bereitstellung der Anwendung (Docker-Hosting).    |
| **Serverstandort**        | Standardmäßig in der EU, eine Übermittlung in die USA (Google LLC) kann jedoch nicht ausgeschlossen werden.           |
| **Drittlandübermittlung** | Abgesichert durch das EU-US Data Privacy Framework bzw. Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c DSGVO.   |



## Authentifizierung (TUM-Login & User-Token)

Der Zugang zum System erfolgt über den zentralen TUM-Login. Hierbei wird ein spezifischer User-Token generiert und während der Sitzung verarbeitet.

| Merkmal                | Beschreibung                                                                                                                                                                                                         |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Art der Daten**      | Beim Login generierter User-Token, der technisch mit der Identität Ihres TUM-Accounts verknüpft ist (Pseudonymisierung).                                                                                             |
| **Rückverfolgbarkeit** | Für die Administratoren des Virtuellen Patientensystems ist der Token pseudonymisiert. Über das zentrale Identitätsmanagement der TUM ist eine Zuordnung zu Ihrer Person (Name, Matrikelnummer) theoretisch möglich. |
| **Zweck**              | Technische Sitzungsverwaltung, Autorisierung zur Nutzung des Lehrsystems und Zuordnung des Lernfortschritts.                                                                                                         |
| **Speicherdauer**      | Der Token wird für die Dauer der aktiven Sitzung im System gehalten und nach dem Ausloggen bzw. Schließen der Sitzung weiterhin für zwei Jahre in der Datenbank gespeichert.                                         |



## Einsatz des KI-Sprachmodells Google Gemini

Für die dynamische Generierung von Chatbot-Antworten innerhalb der virtuellen Patientengespräche wird das KI-Sprachmodell Google Gemini eingesetzt. Dies ist ein Dienst von Google Ireland Limited (Irland) bzw. Google LLC (USA).

An die Programmierschnittstelle (API) von Google werden die im Rahmen des Lehrgesprächs eingegebenen Freitexte übermittelt. **Bitte geben Sie in den Chatfenstern keine Klarnamen oder sonstigen direkt identifizierbaren Daten von sich oder Dritten ein.** Aufgrund der Übermittlung der IP-Adresse und des technischen Kontextes an Google ist dieser Vorgang datenschutzrechtlich relevant.

| Merkmal                   | Beschreibung                                                                                   |
|---------------------------|------------------------------------------------------------------------------------------------|
| **Anbieter**              | Google Ireland Limited / Google LLC                                                            |
| **Verarbeitete Daten**    | Eingegebene Gesprächsinhalte (Freitext) sowie die technisch notwendige IP-Adresse des Nutzers. |
| **Zweck**                 | Interaktive Generierung von KI-Antworten im virtuellen Patientengespräch.                      |
| **Serverstandort**        | USA und weltweite Google-Rechenzentren.                                                        |
| **Drittlandübermittlung** | EU-US Data Privacy Framework bzw. Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c DSGVO.  |

Weitere Informationen zum Datenschutz bei Google finden Sie unter: [https://policies.google.com/privacy](https://policies.google.com/privacy)



## Speicherung von Gesprächsprotokollen

Die während der Lehrsitzungen aufgezeichneten Gesprächstranskripte werden auf Servern der Google Cloud Platform gespeichert.

| Merkmal                  | Beschreibung                                                                                                           |
|--------------------------|------------------------------------------------------------------------------------------------------------------------|
| **Gespeicherte Inhalte** | Der pseudonyme User-Token (bzw. die sitzungsbezogene ID) und das vollständige Gesprächsprotokoll.                      |
| **Zweck**                | Qualitätssicherung, Evaluation der Lehrinhalte und kontinuierliche Weiterentwicklung des medizinischen Lehrprogramms.  |
| **Speicherdauer**        | Die Protokolle werden so lange vorgehalten, wie es für die Evaluation Projekts erforderlich ist, maximal aber 2 Jahre. |



## Cookies und Tracking

Das Virtuelle Patientensystem verwendet ausschließlich technisch notwendige Cookies (z. B. zur Speicherung des Session-Status). Es werden keine Tracking-Cookies eingesetzt und es findet keine Reichweitenmessung oder Web-Analyse (z. B. über Google Analytics) statt.


## Ihre Rechte als betroffene Person

Als von der Datenverarbeitung betroffene Person stehen Ihnen bei Vorliegen der gesetzlichen Voraussetzungen folgende Rechte nach der DSGVO zu:

* **Recht auf Auskunft** (Art. 15 DSGVO) über Ihre von uns verarbeiteten Daten.
* **Recht auf Berichtigung** (Art. 16 DSGVO) unrichtiger Daten.
* **Recht auf Löschung** (Art. 17 DSGVO) Ihrer Daten, sofern keine Aufbewahrungspflichten entgegenstehen.
* **Recht auf Einschränkung der Verarbeitung** (Art. 18 DSGVO).
* **Widerspruchsrecht** (Art. 21 DSGVO) gegen die Verarbeitung aus Gründen, die sich aus Ihrer besonderen Situation ergeben.

Da für eine Zuordnung der Daten (z. B. der Gesprächsprotokolle) zu Ihrer Person der Rückgriff auf das zentrale IT-System der TUM erforderlich ist, teilen Sie uns bei entsprechenden Anfragen bitte Ihre TUM-Kennung mit, damit geprüft werden kann, ob eine Zuordnung möglich ist.

Wenden Sie sich zur Ausübung Ihrer Rechte per E-Mail an: allgemeinmedizin@mri.tum.de

Sie haben zudem das Recht auf Beschwerde bei der zuständigen Aufsichtsbehörde:

**Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)**\
Promenade 18\
91522 Ansbach

Web: www.lda.bayern.de


## Aktualität dieser Datenschutzerklärung

Diese Datenschutzerklärung ist aktuell gültig (Stand: Juni 2026). Durch technische Weiterentwicklungen unseres Systems oder geänderte gesetzliche Rahmenbedingungen kann eine regelmäßige Anpassung erforderlich werden. Die jeweils aktuelle Fassung kann jederzeit auf dieser Seite abgerufen werden.