# SAP2000 Local Bridge Connector

Prompt 15A-MAC adds the first EngPlatform SAP2000 connector surface as a read-only browser-side integration. It consumes the local SAP2000 bridge HTTP API and does not call SAP2000 COM/OAPI directly.

## Current Scope

- The connector is read-only.
- It supports bridge health, bridge info, SAP2000 status, connect-to-running, open approved smoke model, model units, metadata lists, and audit records.
- It does not expose analysis, result extraction, launch, patch/apply, create, modify, delete, assign, save, or write-back controls.
- The default bridge base URL is `http://127.0.0.1:8765`.
- `NEXT_PUBLIC_SAP2000_BRIDGE_URL` can override that default for the web app, and the UI also allows Marty to edit the base URL at runtime.

## Environment Split

- Marty develops EngPlatform on the Mac at home with mocked bridge responses only.
- The real SAP2000 bridge and SAP2000 27.1.0 installation are on the Windows office machine.
- On the Mac, `http://127.0.0.1:8765` points to the Mac, not the Windows office bridge.
- Runtime smoke testing against real SAP2000 must happen later on the Windows office machine.

## Verified Windows Smoke Model

- Bridge URL on the Windows office machine: `http://127.0.0.1:8765`
- Adapter: `comtypes`
- Model path: `C:\SAP2000BridgeWorkspace\smoke_frame_2point.sdb`
- Units: `kN_m_C`, length `m`, force `kN`, moment `kN-m`, temperature `C`
- Counts: joints `2`, frames `1`, materials `3`, sections `1`, load patterns `1`, load cases `2`, load combinations `0`

## Networking Notes

Do not bind the SAP2000 bridge to `0.0.0.0` for this MVP. The bridge is intended to stay local to the Windows office machine where SAP2000 is running.

If the EngPlatform backend runs in Docker, do not assume `127.0.0.1` inside the container reaches the Windows host. For the current MVP, prefer browser-to-localhost usage on the Windows office machine or a later approved local proxy strategy.

If browser CORS blocks the Windows runtime smoke, handle that in Prompt 15D-WIN with a strict CORS allowlist rather than broad network exposure.
