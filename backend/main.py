"""Runnable public interface-only FastAPI service.

This is deliberately not the production diagnosis engine. The private
implementation is withheld pending publication and release review.
"""

from __future__ import annotations

import json
from typing import Iterator

from fastapi import FastAPI
from fastapi.responses import JSONResponse, StreamingResponse

from api_contract import DiagnosisRequest, HealthResponse, PublicBoundaryResponse


app = FastAPI(
    title="UAV Fault Diagnosis — Public Interface",
    version="public-showcase-1.0",
    description="Research interface only; core reasoning is withheld.",
)


def _boundary_response() -> PublicBoundaryResponse:
    return PublicBoundaryResponse(
        message=(
            "This public repository documents the interface only. The complete "
            "diagnosis engine and research implementation are withheld pending "
            "publication and release review."
        )
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(ok=True, service="uav-diagnosis-public-interface", mode="showcase")


@app.post("/chat", response_model=PublicBoundaryResponse)
def chat(_: DiagnosisRequest) -> JSONResponse:
    return JSONResponse(status_code=501, content=_boundary_response().model_dump())


@app.post("/chat/stream")
def chat_stream(_: DiagnosisRequest) -> StreamingResponse:
    payload = json.dumps(_boundary_response().model_dump(), ensure_ascii=False)

    def events() -> Iterator[str]:
        yield f"data: {payload}\n\n"
        yield "data: {\"type\":\"done\"}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", status_code=501)
