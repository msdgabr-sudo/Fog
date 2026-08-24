$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

throw @'
QiblaAstro security gate: standalone notification-permission custom-scheme injection is DISABLED.
POST_NOTIFICATIONS is requested contextually by the native Azkar reminder flow
when the user explicitly enables reminders. Do not restore an exported BROWSABLE
permission Activity merely to request this runtime permission.
'@
