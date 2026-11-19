# tunnel

## ADDED Requirements

### Requirement: HTTPS access via agent.trytir.com
The VPS SHALL serve the OpenChamber UI at `https://agent.trytir.com` through a native `cloudflared` tunnel to `http://localhost:3000`, protected by UI password.

#### Scenario: Staff opens the domain
- **WHEN** a browser requests `https://agent.trytir.com`
- **THEN** it responds 200 with the OpenChamber login

### Requirement: Survives reboot
The tunnel and the OpenChamber service SHALL be systemd-enabled so both return after reboot.

#### Scenario: VPS reboots
- **WHEN** the VPS restarts
- **THEN** `https://agent.trytir.com` serves the UI again without manual steps
