class BoutsError(Exception):
    pass


class BoutsApiError(BoutsError):
    def __init__(self, message: str, code: str, status: int, request_id: str = ""):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status
        self.request_id = request_id


class BoutsAuthError(BoutsApiError):
    pass


class BoutsRateLimitError(BoutsApiError):
    pass


class BoutsTimeoutError(BoutsError):
    pass


class BoutsNotFoundError(BoutsApiError):
    pass
