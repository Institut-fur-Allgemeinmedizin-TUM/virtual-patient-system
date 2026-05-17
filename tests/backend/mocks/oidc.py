class FakeTokenResponse:
    def __init__(self, payload: dict, should_raise: Exception | None = None):
        self._payload = payload
        self._should_raise = should_raise

    def raise_for_status(self):
        if self._should_raise:
            raise self._should_raise

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, response: FakeTokenResponse):
        self._response = response

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, _url: str, data: dict):
        return self._response
