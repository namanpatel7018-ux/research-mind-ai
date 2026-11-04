"""
ResearchMind AI — Application Data Transfer Objects (DTOs)
==========================================================
"""

from app.application.dto.auth_dto import (
    TokenDTO,
    UserOutDTO,
    SignupRequestOTPDTO,
    SignupVerifyOTPDTO,
    LoginRequestOTPDTO,
    LoginVerifyOTPDTO,
    UpdateProfileDTO,
    ChangePasswordDTO,
    LogoutDTO,
)
from app.application.dto.chat_dto import (
    ChatRequestDTO,
    ChatResponseDTO,
    CreateConversationDTO,
    UpdateConversationDTO,
)
from app.application.dto.research_dto import (
    DocumentUploadResponseDTO,
    DocumentFileItemDTO,
    SummarizeRequestDTO,
    CompareRequestDTO,
    LiteratureReviewRequestDTO,
    SaveAnswerRequestDTO,
    ConvertToPPTRequestDTO,
    GeneratePDFRequestDTO,
    GenerateQuizRequestDTO,
    GenerateQuizJSONRequestDTO,
    QuizAnswerItemDTO,
    QuizSubmitRequestDTO,
)

__all__ = [
    "TokenDTO",
    "UserOutDTO",
    "SignupRequestOTPDTO",
    "SignupVerifyOTPDTO",
    "LoginRequestOTPDTO",
    "LoginVerifyOTPDTO",
    "UpdateProfileDTO",
    "ChangePasswordDTO",
    "LogoutDTO",
    "ChatRequestDTO",
    "ChatResponseDTO",
    "CreateConversationDTO",
    "UpdateConversationDTO",
    "DocumentUploadResponseDTO",
    "DocumentFileItemDTO",
    "SummarizeRequestDTO",
    "CompareRequestDTO",
    "LiteratureReviewRequestDTO",
    "SaveAnswerRequestDTO",
    "ConvertToPPTRequestDTO",
    "GeneratePDFRequestDTO",
    "GenerateQuizRequestDTO",
    "GenerateQuizJSONRequestDTO",
    "QuizAnswerItemDTO",
    "QuizSubmitRequestDTO",
]
