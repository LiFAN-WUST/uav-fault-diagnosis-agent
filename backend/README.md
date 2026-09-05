# Public backend boundary

The complete diagnosis backend is retained in the private archive. This
directory contains only a small, runnable interface-only service and typed
request/response models so that the public repository documents the shape of
the system without publishing the unpublished reasoning implementation.

The `/chat` and `/chat/stream` endpoints return a transparent `501` response
explaining that the core engine is withheld. This is intentional and must not
be presented as a diagnosis result.
