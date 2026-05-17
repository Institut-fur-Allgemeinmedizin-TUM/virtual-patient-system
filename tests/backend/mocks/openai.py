class FakeTranscriptResult:
    def __init__(self, text: str):
        self.text = text


class FakeTranscriptions:
    def __init__(self, text: str = "Hallo Welt", error: Exception | None = None):
        self._text = text
        self._error = error

    def create(self, **_kwargs):
        if self._error:
            raise self._error
        return FakeTranscriptResult(self._text)


class FakeOpenAIClient:
    def __init__(self, text: str = "Hallo Welt", error: Exception | None = None):
        self.audio = type(
            "Audio", (), {"transcriptions": FakeTranscriptions(text=text, error=error)}
        )()
