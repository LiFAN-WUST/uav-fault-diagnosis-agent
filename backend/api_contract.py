"""Public request/response types for the UAV diagnosis interface.

The private agent implementation is intentionally not part of this public
showcase. These models document the stable boundary used by the UI.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class DiagnosisRequest(BaseModel):
    question: str = Field(min_length=1, description="UAV symptom description")
    csv_content: str = ""
    log_content: str = ""
    image_base64: str = ""
    session_id: str = ""


class HealthResponse(BaseModel):
    ok: bool
    service: str
    mode: str


class PublicBoundaryResponse(BaseModel):
    ok: bool = False
    code: str = "PUBLIC_INTERFACE_ONLY"
    message: str
