class FakeLLMMessage:
    def __init__(self, text: str, usage_metadata: dict | None = None):
        self.text = text
        self.usage_metadata = usage_metadata or {"input_tokens": 3, "total_tokens": 7}


class FakeAgent:
    def __init__(self, message_text: str):
        self._message_text = message_text

    def invoke(self, _payload: dict) -> dict:
        return {"messages": [FakeLLMMessage(self._message_text)]}


def fake_create_agent_with_text(message_text: str):
    def _factory(*_args, **_kwargs):
        return FakeAgent(message_text)

    return _factory
