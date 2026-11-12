# Ubiquiti UniFi Specifications List

**Vendor ID:** `3`

All device specifications must come from official Ubiquiti sources. Use current product specifications and currently listed models where identifiable. Record the exact SKU/model and official source URL for every device included in the final JSON catalog.

## Official Sources

- Official Website: https://ui.com/
- Official Tech Specs: https://techspecs.ui.com/
- Cloud Gateways: https://techspecs.ui.com/unifi/cloud-gateways
- Switching: https://techspecs.ui.com/unifi/switching
- WiFi: https://techspecs.ui.com/unifi/wifi

## Inclusion Policy

- Include indoor devices within the project scope.
- Exclude outdoor devices unless separately approved.
- Prefer current models listed in Ubiquiti's official Tech Specs catalog.
- Older models may be retained only when their inclusion is approved and their lifecycle status can be supported by an official source.
- Record EOS/EOL information only when supported by an official Ubiquiti source.
- Do not assume undocumented specifications or convert marketing claims into unsupported technical values.
- Record unavailable, conflicting, or ambiguous specifications for review.
- Use `vendor_id: 3` for all Ubiquiti device records.
- Keep physical port layouts separate from default WAN/LAN assignments.
- Use `null` for unknown optional numeric values where the schema allows it. Do not use `0` to represent an unknown value.
- Keep exact product specifications and source URLs in the research notes until they have been checked against the device schema.
- Do not create final JSON records using unverified or unsupported required values.

---

# Routers / Gateways

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways

## Independent Gateways

### Gateway Enterprise — UXG-Enterprise

**Official source:** https://techspecs.ui.com/unifi/accessories/uxg-enterprise

- General throughput: 25 Gbps
- Firewall routing throughput: 23.5 Gbps
- IDS/IPS throughput: 12.5 Gbps
- Default WAN ports: 2
- Default LAN ports: 4
- Maximum power consumption: 82 W
- Rack mount: 1U
- High availability: Shadow Mode (VRRP)
- VPN: Supported; throughput varies by protocol and use case.
- SFP layout: 2 × 10G SFP+ and 2 × 25G SFP28
- Concurrent sessions: Conflicting official figures of 1 million and 10 million; requires verification.

**Schema review:**
- The current schema supports only one `sfp_form_factor` per device and cannot accurately represent the mixed SFP+ and SFP28 layout.
- VPN throughput is protocol- and use-case-specific. Do not enter one of the individual VPN figures as a generic VPN throughput without an agreed mapping.
- Keep general throughput, firewall routing throughput, and IDS/IPS throughput as separate specifications.

### Gateway Pro — UXG-Pro

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/uxg-pro

- Default WAN ports: 2 (1 × 10G SFP+ and 1 × GbE RJ45)
- Default LAN ports: 2 (1 × 10G SFP+ and 1 × GbE RJ45)
- Maximum WAN port count: 3
- IDS/IPS throughput: 3.5 Gbps
- Maximum power consumption: 30 W
- Rack mount: 1U
- SFP layout: 2 × 10G SFP+
- VPN: Supported (WireGuard, OpenVPN, L2TP and IPsec)
- General maximum throughput: Not specified on the current Tech Specs page.
- VPN throughput: Not specified.
- Redundancy: DC Power Backup is documented; do not treat this as gateway high availability.

### Gateway Max — UXG-Max

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/uxg-max

- Physical ports: 5 × 2.5 GbE RJ45
- Default WAN ports: 1 × 2.5 GbE RJ45
- Remaining physical ports after default WAN assignment: 4
- Maximum WAN port count: 4
- IDS/IPS throughput: 2.3 Gbps
- Maximum power consumption: 9.6 W
- Form factor: Compact desktop
- VPN: Supported (IPsec, OpenVPN, WireGuard, L2TP and Teleport)
- General maximum throughput: Not specified.
- VPN throughput: Not specified.
- SFP ports: None documented.
- Rack mount: No.

## Cloud Gateways

### Dream Machine Beast — UDM-Beast

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/udm-beast

- Default WAN ports: 2 (1 × 25G SFP28 and 1 × 10 GbE RJ45)
- Maximum WAN port count: 8
- Physical port layout:
  - 2 × 1 GbE RJ45
  - 8 × 10 GbE RJ45
  - 2 × 10G SFP+
  - 2 × 25G SFP28
- IDS/IPS throughput: 25 Gbps
- Maximum power consumption: 100 W
- Rack mount: 1U
- High availability: Shadow Mode (VRRP) and Gateway Failover
- VPN: Supported (IPsec, OpenVPN, WireGuard, L2TP and Teleport)
- General maximum throughput: Not separately specified.
- VPN throughput: Not specified.
- Concurrent sessions: Not specified.

**Schema review:** Mixed SFP+ and SFP28 port types cannot be accurately represented by the current single `sfp_form_factor` field.

### Dream Machine Pro Max — UDM-Pro-Max

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/udm-pro-max

- Default WAN ports: 2 (1 × 10G SFP+ and 1 × 2.5 GbE RJ45)
- Maximum WAN port count: 8
- Physical port layout:
  - 8 × 1 GbE RJ45
  - 1 × 2.5 GbE RJ45
  - 2 × 10G SFP+
- IDS/IPS throughput: 5 Gbps
- Maximum power consumption: 60 W
- Rack mount: 1U
- High availability: Shadow Mode (VRRP) and Gateway Failover
- Redundancy: DC Power Backup
- VPN: Supported (IPsec, OpenVPN, WireGuard, L2TP and Teleport)
- General maximum throughput: Not separately specified.
- VPN throughput: Not specified.
- Concurrent sessions: Not specified.

### Dream Machine Pro — UDM-Pro

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/udm-pro

- Default WAN ports: 2 (1 × 10G SFP+ and 1 × GbE RJ45)
- Maximum WAN port count: 8
- Physical port layout:
  - 9 × 1 GbE RJ45
  - 2 × 10G SFP+
- IDS/IPS throughput: 3.5 Gbps
- Rack mount: 1U
- High availability: Shadow Mode (VRRP) and Gateway Failover
- Redundancy: DC Power Backup
- VPN: Supported (IPsec, OpenVPN, WireGuard, L2TP and Teleport)
- General maximum throughput: Not separately specified.
- VPN throughput: Not specified.
- Concurrent sessions: Not specified.
- Maximum power consumption: Verify against the current official product page before catalog entry.

### Dream Machine Special Edition — UDM-SE

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/udm-se

- Default WAN ports: 2 (1 × 10G SFP+ and 1 × 2.5 GbE RJ45)
- Maximum WAN port count: 8
- Physical port layout:
  - 8 × 1 GbE RJ45
  - 1 × 2.5 GbE RJ45
  - 2 × 10G SFP+
- IDS/IPS throughput: 3.5 Gbps
- Maximum power consumption: 50 W (excluding PoE output)
- PoE budget: 180 W
- Rack mount: 1U
- High availability: Shadow Mode (VRRP) and Gateway Failover
- Redundancy: DC Power Backup
- VPN: Supported.
- General maximum throughput: Not separately specified.
- VPN throughput: Not specified.

### Cloud Gateway Industrial — UCG-Industrial

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/ucg-industrial

- Default WAN ports: 3 (1 × 10G SFP+, 1 × 10 GbE RJ45 and 1 × 2.5 GbE RJ45)
- Maximum WAN port count: 5
- Physical port layout:
  - 4 × 2.5 GbE RJ45 (2 PoE+++ and 2 PoE+)
  - 1 × 10 GbE RJ45 (PoE+++)
  - 1 × 10G SFP+
- IDS/IPS throughput: 5 Gbps
- Maximum power consumption: 28 W (excluding PoE output)
- PoE budget: 270 W with DC input; 75 W with ATX power
- Form factor: Wall-mounted or compact desktop; rack-mount accessory sold separately
- VPN: Supported.
- Integrated Wi-Fi: Wi-Fi 7.

**Schema review:** This gateway includes an integrated switch and Wi-Fi. Confirm whether its integrated functions should be represented only as a gateway/router record or require additional subtype records. Do not create a separate AP record automatically.

### Cloud Gateway Fiber — UCG-Fiber

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/ucg-fiber

- Default WAN ports: 2 (1 × 10G SFP+ and 1 × 10 GbE RJ45)
- Maximum WAN port count: 6
- Physical port layout:
  - 4 × 2.5 GbE RJ45
  - 1 × 10 GbE RJ45
  - 2 × 10G SFP+
- IDS/IPS throughput: 5 Gbps
- Maximum power consumption: 29.4 W (excluding PoE output)
- PoE budget: 30 W
- Form factor: Compact desktop
- VPN: Supported.

### Cloud Gateway Max — UCG-Max

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/ucg-max

- Default WAN ports: 1 × 2.5 GbE RJ45
- Maximum WAN port count: 4
- Physical port layout: 5 × 2.5 GbE RJ45
- IDS/IPS throughput: 2.3 Gbps
- Maximum power consumption: 16.1 W
- Form factor: Compact desktop
- VPN: Supported.
- SFP ports: None documented.

### Cloud Gateway Ultra — UCG-Ultra

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/ucg-ultra

- Default WAN ports: 1 × 2.5 GbE RJ45
- Maximum WAN port count: 4
- Physical port layout:
  - 4 × 1 GbE RJ45
  - 1 × 2.5 GbE RJ45
- IDS/IPS throughput: 1 Gbps
- Maximum power consumption: 6.2 W
- Form factor: Compact desktop
- VPN: Supported.
- SFP ports: None documented.

### UniFi Express 7 — UX7

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/ux7

- Default WAN ports: 1 × 10 GbE RJ45
- Maximum WAN port count: 1
- Physical port layout:
  - 1 × 2.5 GbE RJ45
  - 1 × 10 GbE RJ45
- IDS/IPS throughput: 2.3 Gbps
- Maximum power consumption: 22 W
- Form factor: Compact desktop
- Integrated Wi-Fi: Wi-Fi 7
- VPN: Supported.
- SFP ports: None documented.

### Dream Router 5G Max — UDR-5G-Max

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/udr-5g-max

- Default WAN ports: 2 (1 × 10G SFP+ and 1 × 2.5 GbE RJ45)
- Maximum WAN port count: 4
- Physical port layout:
  - 4 × 2.5 GbE RJ45 (1 PoE)
  - 1 × 10G SFP+
- IDS/IPS throughput: 2.3 Gbps
- Maximum power consumption: 34.5 W (excluding PoE output)
- PoE budget: 15.4 W
- Form factor: Desktop
- Integrated Wi-Fi: Wi-Fi 7
- Cellular connectivity: 5G NR and 4G LTE
- VPN: Supported; protocol-specific throughput must be recorded separately if used.

### Dream Router 7 — UDR7

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/udr7

- Default WAN ports: 2 (1 × 10G SFP+ and 1 × 2.5 GbE RJ45)
- Maximum WAN port count: 4
- Physical port layout:
  - 4 × 2.5 GbE RJ45 (1 PoE)
  - 1 × 10G SFP+
- IDS/IPS throughput: 2.3 Gbps
- Maximum power consumption: 26 W (excluding PoE output)
- Form factor: Compact desktop
- Integrated Wi-Fi: Wi-Fi 7
- VPN: Supported.

### UniFi Express — UX

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/ux

- Default WAN ports: 1 × GbE RJ45
- Maximum WAN port count: 1
- Physical port layout: 2 × 1 GbE RJ45
- IDS/IPS throughput: Not specified on the current page.
- Maximum power consumption: 10 W
- Form factor: Compact desktop
- Integrated Wi-Fi: Wi-Fi 6
- VPN: Supported (IPsec, OpenVPN, Teleport, WireGuard and L2TP).

### Dream Wall — UDW

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/udw

- Default WAN ports: 2 (1 × 2.5 GbE RJ45 and 1 × 10G SFP+)
- Maximum WAN port count: 8
- Physical port layout:
  - 17 × 1 GbE RJ45 (official page lists PoE classifications for 4 PoE++, 4 PoE+ and 4 PoE ports)
  - 1 × 2.5 GbE RJ45
  - 2 × 10G SFP+
- IDS/IPS throughput: 3.5 Gbps
- Maximum power consumption: 112 W (excluding PoE output)
- PoE budget: 420 W
- Form factor: Wall-mounted
- Redundancy: 2 hot-swappable power supplies
- Integrated Wi-Fi: Wi-Fi 6.

**Schema review:** Confirm the complete RJ45 port breakdown and PoE classification against the official port diagram before entering switch-related specifications. Do not infer the remaining port types.

### Dream Router — UDR

**Official source:** https://techspecs.ui.com/unifi/cloud-gateways/udr

- Default WAN ports: 1 × GbE RJ45
- Maximum WAN port count: 1
- Physical port layout: 5 × 1 GbE RJ45 (2 PoE)
- IDS/IPS throughput: 1 Gbps
- Maximum power consumption: 19.37 W (excluding PoE output)
- PoE budget: 40 W
- Form factor: Compact desktop
- Integrated Wi-Fi: Wi-Fi 5
- VPN: Supported.

## Enterprise Firewalls / Gateways

### Enterprise Firewall Core — EF-Core

**Official source:** UniFi Enterprise Firewall Core Tech Specs
**Official detail URL:** To be verified and recorded.

**Core hardware**
- SKU: `EF-Core`
- Dimensions: 442.4 × 43.7 × 400 mm
- Form factor: Rack mount, 1U
- Maximum power consumption: 171 W
- Power method: Universal AC input, 100–240V AC
- Redundancy: Two hot-swappable 550 W AC/DC power supplies
- High availability: Shadow Mode (VRRP) Gateway Failover

**Physical port layout**
- 1 GbE RJ45: 2
- 10 GbE RJ45: 8
- 25G SFP28: 4
- 100G QSFP28: 4
- Management: 1
- Console: 1

**WAN**
- Default WAN ports: 1 × 100G QSFP28, 1 × 25G SFP28, and 1 × 10 GbE RJ45
- Maximum WAN port count: 8

**Firewall and performance**
- IDS/IPS throughput: 79 Gbps
- Concurrent sessions: 10 million
- New sessions per second: 120,000
- SSL/TLS inspection concurrent sessions: 10,000
- General firewall throughput: Not specified
- VPN throughput: Not specified

**VPN**
- Site-to-site: Site Magic, IPsec, OpenVPN
- VPN server: WireGuard, OpenVPN, L2TP
- VPN client: OpenVPN, WireGuard

**Additional specifications**
- Managed UniFi devices: 2,250+
- Simultaneous connected users: 22,500+

**Schema review**
- The schema requires `firewall_throughputs_mbps`.
- The documented 79 Gbps figure is IDS/IPS throughput, not general firewall throughput. Do not use it for `firewall_throughputs_mbps`.
- If supported by the schema, map IDS/IPS throughput to `idps_throughput_mbps: 79000`.
- `vpn_throughput_mbps` remains unknown.
- Do not invent a LAN port assignment.
- Keep the record pending until the required firewall-throughput field has an approved mapping or the schema is revised.
- Preserve the mixed SFP28 and QSFP28 layout in the research notes.

### Enterprise Firewall — EFG

**Official catalog:** https://techspecs.ui.com/unifi/cloud-gateways

- Exact model: `EFG`
- Product detail specifications and source URL: To be recorded from the official product page before JSON entry.
- Confirm firewall throughput, VPN throughput, concurrent sessions, port layout, power consumption and rack height.
- Include `firewall_specs` only when the official specifications support the corresponding schema fields.

---

# Switches

**Official source:** https://techspecs.ui.com/unifi/switching

The following are candidate indoor UniFi switching models from the official catalog. Confirm the individual model's current listing and detail-page specifications before adding it to the final JSON catalog.

## Enterprise

- Enterprise Campus Switch Core — `ECS-Core`
- Enterprise Campus Aggregation — `ECS-Aggregation`
- Enterprise Campus 48S PoE — `ECS-48S-PoE`
- Enterprise Campus 24S PoE — `ECS-24S-PoE`
- Enterprise Campus 48S — `ECS-48S`
- Enterprise Campus 24S — `ECS-24S`
- Enterprise Campus 48 PoE — `ECS-48-PoE`
- Enterprise Campus 24 PoE — `ECS-24-PoE`

## Professional

- Pro XG 48 PoE — `USW-Pro-XG-48-PoE`
- Pro XG 24 PoE — `USW-Pro-XG-24-PoE`
- Pro XG 10 PoE — `USW-Pro-XG-10-PoE`
- Pro XG 48 — `USW-Pro-XG-48`
- Pro XG 24 — `USW-Pro-XG-24`
- Pro HD 24 PoE — `USW-Pro-HD-24-PoE`
- Pro HD 24 — `USW-Pro-HD-24`
- Pro 48 PoE — `USW-Pro-48-POE`
- Pro 24 PoE — `USW-Pro-24-POE`
- Pro 48 — `USW-Pro-48`
- Pro 24 — `USW-Pro-24`

## Standard

- Standard 48 PoE — `USW-48-POE`
- Standard 24 PoE — `USW-24-POE`
- Standard 16 PoE — `USW-16-POE`
- Standard 48 — `USW-48`
- Standard 24 — `USW-24`

## Aggregation

- Aggregation — `USW-Aggregation`
- Pro XG Aggregation — `USW-Pro-XG-Aggregation`
- Hi-Capacity Aggregation — `USW-Pro-Aggregation`

## Other Managed Switches

- Pro Max 48 PoE — `USW-Pro-Max-48-PoE`
- Pro Max 24 PoE — `USW-Pro-Max-24-PoE`
- Pro Max 16 PoE — `USW-Pro-Max-16-PoE`
- Pro Max 48 — `USW-Pro-Max-48`
- Pro Max 24 — `USW-Pro-Max-24`
- Pro Max 16 — `USW-Pro-Max-16`
- Pro 8 PoE — `USW-Pro-8-PoE`
- Pro XG 8 PoE — `USW-Pro-XG-8-PoE`
- Lite 16 PoE — `USW-Lite-16-PoE`
- Lite 8 PoE — `USW-Lite-8-PoE`
- Ultra — `USW-Ultra`
- Ultra 60W — `USW-Ultra-60W`
- Ultra 210W — `USW-Ultra-210W`
- Flex 2.5G 8 PoE — `USW-Flex-2.5G-8-PoE`
- Flex 2.5G 8 — `USW-Flex-2.5G-8`
- Flex Mini 2.5G 5 — `USW-Flex-2.5G-5`
- Flex 10 GbE — `USW-Flex-XG`
- Flex — `USW-Flex`
- Flex Mini — `USW-Flex-Mini`

## Additional Models Listed in the Official Switching Catalog

Review these separately before inclusion because they may be utility, WAN, legacy, or specialized products rather than ordinary access/distribution switches:

- Enterprise 48 PoE (Vintage) — `USW-Enterprise-48-PoE`
- Enterprise 24 PoE (Vintage) — `USW-Enterprise-24-PoE`
- Enterprise Audio/Video XG 24 PoE — `EAV-XG-24-PoE`
- Enterprise Audio/Video Fiber — `EAV-Fiber`
- WAN Switch — `USW-WAN`
- WAN Switch RJ45 — `USW-WAN-RJ45`
- Flex Utility — `USW-Flex-Utility`
- Industrial — `USW-Industrial`
- UPS PoE Switch — `USW-Mission-Critical`

The official catalog also lists older-generation models. Do not automatically include them as current devices. Confirm lifecycle and project scope first.

## Switch Specifications — Preliminary Research Batch 1

**Important:** The following values are preliminary research notes from the first specification-gathering batch. Confirm each value against the current official individual product page and port diagram before using it in the final JSON. Where a value is missing or ambiguous, leave it unresolved rather than assuming.

### Enterprise

#### Enterprise Campus Switch Core — `ECS-Core`

- Physical port layout: 1 × 1 GbE RJ45 and 32 × 100G QSFP28
- Switching capacity: 6.4 Tbps
- Layer: Layer 3
- Rack mount: 1U
- Additional features: MC-LAG, dual hot-swappable power supplies and fans.
- PoE ports: Not documented in the preliminary notes.
- Maximum power consumption: Verify.
- Uplink form factor: QSFP28.

**Schema review:** QSFP28 is supported as an individual enum value. However, confirm whether the schema's single `sfp_form_factor` field can accurately represent the complete uplink configuration.

#### Enterprise Campus 48 PoE — `ECS-48-PoE`

- Physical port layout:
  - 16 × 2.5 GbE PoE+++
  - 32 × 10 GbE PoE+++
  - 4 × 25G SFP28
- Total ports: 52
- PoE ports: 48
- PoE budget: Varies by AC input and power-supply configuration; verify exact supported figures.
- Switching capacity: 920 Gbps
- Layer: Layer 3
- Rack mount: 1U
- Maximum power consumption: Verify.

#### Enterprise Campus 24 PoE — `ECS-24-PoE`

- Physical port layout:
  - 8 × 2.5 GbE PoE+++
  - 16 × 10 GbE PoE+++
  - 2 × 25G SFP28
- Total ports: 26
- PoE ports: 24
- Switching capacity: 460 Gbps
- Layer: Layer 3
- Rack mount: 1U
- PoE budget: Verify.
- Maximum power consumption: Verify.

### Professional — Pro XG

#### Pro XG 48 PoE — `USW-Pro-XG-48-PoE`

- Physical port layout:
  - 16 × 2.5 GbE PoE+++
  - 32 × 10 GbE PoE+++
  - 4 × 25G SFP28
- Total ports: 52
- PoE ports: 48
- PoE budget: 1,080 W (200–240 VAC) / 972 W (100–120 VAC)
- Switching capacity: 920 Gbps
- Layer: Layer 3
- Maximum power consumption: 200 W (excluding PoE output)
- Rack mount: 1U

#### Pro XG 24 PoE — `USW-Pro-XG-24-PoE`

- Physical port layout:
  - 8 × 2.5 GbE PoE+++
  - 16 × 10 GbE PoE+++
  - 2 × 25G SFP28
- Total ports: 26
- PoE ports: 24
- PoE budget: 720 W
- Switching capacity: 460 Gbps
- Layer: Layer 3
- Rack mount: 1U
- Maximum power consumption: Verify.

#### Pro XG 10 PoE — `USW-Pro-XG-10-PoE`

- Physical port layout:
  - 10 × 10 GbE RJ45 PoE+++
  - 2 × 10G SFP+
- Total ports: 12
- PoE ports: 10
- PoE budget: 400 W
- Switching capacity: 240 Gbps
- Layer: Layer 3
- Rack mount: 1U
- Maximum power consumption: Verify.

#### Pro XG 24 — `USW-Pro-XG-24`

- Physical port layout:
  - 8 × 2.5 GbE RJ45
  - 16 × 10 GbE RJ45
  - 2 × 25G SFP28
- Total ports: 26
- Switching capacity: 460 Gbps
- Layer: Layer 3
- Rack mount: 1U
- PoE ports: None documented.
- Maximum power consumption: Verify.

### Professional — Pro Max

#### Pro Max 48 PoE — `USW-Pro-Max-48-PoE`

- Physical port layout:
  - 32 × 1 GbE RJ45 (24 PoE+ and 8 PoE++)
  - 16 × 2.5 GbE RJ45 (8 PoE+ and 8 PoE++)
  - 4 × 10G SFP+
- Total ports: 52
- PoE ports: 48
- PoE budget: 720 W
- Switching capacity: 224 Gbps
- Layer: Layer 3
- Rack mount: 1U
- Maximum power consumption: Verify.

#### Pro Max 24 PoE — `USW-Pro-Max-24-PoE`

- Physical port layout:
  - 16 × 1 GbE RJ45 (8 PoE+ and 8 PoE++)
  - 8 × 2.5 GbE RJ45 (PoE++)
  - 2 × 10G SFP+
- Total ports: 26
- PoE ports: 24
- PoE budget: 400 W
- Switching capacity: 112 Gbps
- Layer: Layer 3
- Maximum power consumption: 50 W (excluding PoE output)
- Rack mount: 1U

#### Pro Max 16 PoE — `USW-Pro-Max-16-PoE`

- Physical port layout:
  - 12 × 1 GbE RJ45 PoE+
  - 4 × 2.5 GbE RJ45 PoE++
  - 2 × 10G SFP+
- Total ports: 18
- PoE ports: 16
- PoE budget: 180 W
- Switching capacity: 84 Gbps
- Layer: Layer 3
- Maximum power consumption: 25 W (excluding PoE output)
- Form factor: Rack, desktop or wall mounting; verify included mounting hardware.

#### Pro Max 48 — `USW-Pro-Max-48`

- Physical port layout:
  - 32 × 1 GbE RJ45
  - 16 × 2.5 GbE RJ45
  - 4 × 10G SFP+
- Total ports: 52
- Switching capacity: 224 Gbps
- Layer: Layer 3
- Rack mount: 1U
- PoE ports: None documented.
- Maximum power consumption: Verify.

### Professional — Pro

#### Pro 48 PoE — `USW-Pro-48-POE`

- Physical port layout:
  - 48 × 1 GbE RJ45 (40 PoE+ and 8 PoE++)
  - 4 × 10G SFP+
- Total ports: 52
- PoE ports: 48
- PoE budget: 600 W
- Switching capacity: 176 Gbps
- Layer: Layer 3
- Rack mount: 1U
- Maximum power consumption: Verify.

#### Pro 24 PoE — `USW-Pro-24-POE`

- Physical port layout:
  - 24 × 1 GbE RJ45 (16 PoE+ and 8 PoE++)
  - 2 × 10G SFP+
- Total ports: 26
- PoE ports: 24
- PoE budget: 400 W
- Switching capacity: 88 Gbps
- Layer: Layer 3
- Rack mount: 1U
- Maximum power consumption: Verify.

### Standard

#### Standard 48 PoE — `USW-48-POE`

- Physical port layout:
  - 48 × 1 GbE RJ45 (32 PoE+)
  - 4 × 1G SFP
- Total ports: 52
- PoE ports: 32
- PoE budget: 195 W
- Switching capacity: 104 Gbps
- Rack mount: 1U
- Maximum power consumption: Verify.

#### Standard 48 — `USW-48`

- Physical port layout:
  - 48 × 1 GbE RJ45
  - 4 × 1G SFP
- Total ports: 52
- Switching capacity: 104 Gbps
- Maximum power consumption: 40 W
- Rack mount: 1U
- PoE ports: None documented.

#### Standard 16 PoE — `USW-16-POE`

- Physical port layout:
  - 16 × 1 GbE RJ45 (8 PoE+)
  - 2 × 1G SFP
- Total ports: 18
- PoE ports: 8
- PoE budget: 42 W
- Switching capacity: 36 Gbps
- Rack mount: 1U
- Maximum power consumption: Verify.

### Aggregation

#### Aggregation — `USW-Aggregation`

- Physical port layout: 8 × 10G SFP+
- Switching capacity: 160 Gbps
- Maximum power consumption: 36 W (including SFP modules)
- Rack mount: 1U
- Layer: Verify against the official product page.

#### Pro XG Aggregation — `USW-Pro-XG-Aggregation`

- Physical port layout: 32 × 25G SFP28
- Switching capacity: 1.6 Tbps
- Layer: Layer 3
- Rack mount: 1U
- Maximum power consumption: Verify.

#### Pro Aggregation — `USW-Pro-Aggregation`

- Physical port layout:
  - 28 × 10G SFP+
  - 4 × 25G SFP28
- Switching capacity: 760 Gbps
- Layer: Layer 3
- Rack mount: 1U
- Maximum power consumption: Verify.

**Schema review:** Mixed SFP+ and SFP28 port types cannot be represented accurately using one `sfp_form_factor` value.

### Other Managed Switches

#### Lite 16 PoE — `USW-Lite-16-PoE`

- Physical port layout: 16 × 1 GbE RJ45
- PoE ports: 8 × PoE+
- PoE budget: 45 W
- Switching capacity: 32 Gbps
- Maximum power consumption: 15 W excluding PoE; 60 W including PoE
- Form factor: Desktop or wall-mounted
- Rack mount: No.

#### Lite 8 PoE — `USW-Lite-8-PoE`

- Physical port layout: 8 × 1 GbE RJ45
- PoE ports: 4 × PoE+
- PoE budget: 52 W
- Switching capacity: 16 Gbps
- Maximum power consumption: 8 W excluding PoE; 60 W including PoE
- Form factor: Desktop or wall-mounted
- Rack mount: No.

#### Ultra 60W — `USW-Ultra-60W`

- Physical port layout:
  - 8 × 1 GbE RJ45
  - 7 PoE+ output ports
  - 1 PoE++ input port
- Switching capacity: 16 Gbps
- PoE budget: Depends on the power input; verify the supported input-specific values.
- Form factor: Compact desktop, wall-mounted or magnetic mounting.
- Maximum power consumption: Verify.
- Rack mount: No.

#### Flex 2.5G 8 PoE — `USW-Flex-2.5G-8-PoE`

- Physical port layout:
  - 8 × 2.5 GbE RJ45 PoE++
  - 1 × 10 GbE RJ45 PoE+++
  - 1 × 10G SFP+
- Total ports: 10
- PoE ports: 9
- PoE budget: Varies by power input; preliminary values are 76 W, 46 W, 16 W or 196 W depending on input configuration. Verify against the official power-input table.
- Switching capacity: 60 Gbps
- Maximum power consumption: 14 W with PoE input / 17 W with AC input, excluding PoE output.
- Form factor: Desktop, wall, DIN rail or magnetic mounting.
- Rack mount: No.

#### Flex 2.5G 8 — `USW-Flex-2.5G-8`

- Physical port layout:
  - 8 × 2.5 GbE RJ45
  - 1 × 10 GbE RJ45
  - 1 × 10G SFP+
- Total ports: 10
- Switching capacity: 60 Gbps
- Maximum power consumption: 14 W
- Form factor: Desktop, wall, DIN rail or magnetic mounting.
- PoE ports: None documented.
- Rack mount: No.

## Switch Batch 1 — Schema and Verification Notes

1. **Port count:** Record the complete physical port layout, including RJ45, SFP and QSFP uplinks. Keep RJ45 and optical uplink counts separately documented until the schema mapping is confirmed.
2. **PoE ports:** Count only ports that supply PoE output. Do not count a PoE input port as an output port.
3. **PoE budget:** Keep PoE output budget separate from the switch's own maximum power consumption.
4. **Switching layer:** The schema requires `layer`. Confirm whether each device is Layer 2 or Layer 3 from the official product specifications. Do not infer this from its product family.
5. **SFP form factor:** The schema supports one form factor per device. Mixed SFP+ and SFP28 configurations need review.
6. **QSFP28:** QSFP28 is supported by the schema enum. Preserve its correct form-factor value.
7. **Maximum power:** A missing value is not zero. Use `null` where permitted and continue verification.
8. **Rack mount:** Do not assign `u_height: 1` to desktop, wall-mounted or DIN-rail products unless the device is officially rack-mountable and the project's convention supports that value.
9. **Product detail URLs:** Use the individual official product page for each device in the final catalog. The switching category page alone is not sufficient evidence for all individual specifications.
10. **Batch status:** This batch is preliminary research, not final JSON-ready data. Confirm all figures against current official product pages before catalog entry.

---

## Switch Batch 2 — Remaining Models for Specification Research

**Source:** [Official Ubiquiti UniFi Switching Tech Specs](https://techspecs.ui.com/unifi/switching?subcategory=switching-standard&view=list)

### 1. Enterprise Campus Switches

- ECS-Aggregation
- ECS-48S-PoE
- ECS-24S-PoE
- ECS-48S
- ECS-24S

### 2. Professional and Professional Max Switches

- USW-Pro-XG-48
- USW-Pro-HD-24-PoE
- USW-Pro-HD-24
- USW-Pro-48
- USW-Pro-24
- USW-Pro-Max-24
- USW-Pro-Max-16
- USW-Pro-8-PoE
- USW-Pro-XG-8-PoE

### 3. Standard Switches

- USW-24-POE
- USW-24

### 4. Utility Switches

- USW-Ultra
- USW-Ultra-210W
- USW-Flex-2.5G-5
- USW-Flex-XG
- USW-Flex
- USW-Flex-Mini

### 5. Required Specifications to Collect

For each model, research and record the following when officially documented:

- Exact model name and SKU
- Product line
- Number of physical Ethernet ports
- Port speeds and uplink types
- Layer (Layer 2 or Layer 3)
- Number of PoE output ports
- PoE standard per port
- Total PoE budget (W)
- Switching capacity (Gbps)
- Maximum power consumption (W)
- SFP port count and form factor
- Rack-mountable status
- Rack height (U)
- Lifecycle status
- Official product specification URL

### Research Rules

1. Use official Ubiquiti documentation as the primary source.
2. Do not assume a specification based on another model in the same product family.
3. Use `null` for undocumented optional numeric values in the eventual JSON.
4. Do not confuse PoE budget with the switch's own power consumption.
5. Record the number of RJ45 Ethernet ports and optical uplink ports separately in the research notes.
6. Record conflicting or unclear specifications in the research notes for review.
7. Do not create the final JSON entries until the specifications have been checked against the device schema.

## Switch Batch 2 — Verified Specification Notes

**Primary source:** Official Ubiquiti UniFi Tech Specs
https://techspecs.ui.com/unifi/switching

The following values were checked against official product specification pages.

### 1. Enterprise Campus

#### ECS-24S-PoE

- SKU: `ECS-24S-PoE`
- Port layout:
  - 1 × 1 GbE RJ45
  - 8 × 2.5 GbE RJ45 (PoE+++)
  - 16 × 10 GbE RJ45 (PoE+++)
  - 4 × 25G SFP28
  - 2 × 100G QSFP28
- Layer: 3
- Switching capacity: 460 Gbps
- PoE output: Up to PoE+++
- PoE availability: Varies by power supply and operating mode
- Max power consumption: 150 W excluding PoE output
- Rack mount: Yes, 1U, full-depth
- Source: https://techspecs.ui.com/unifi/switching/ecs-24s-poe

#### ECS-48S-PoE

- SKU: `ECS-48S-PoE`
- Port layout:
  - 1 × 1 GbE RJ45
  - 32 × 2.5 GbE RJ45 (PoE+++)
  - 16 × 10 GbE RJ45 (PoE+++)
  - 4 × 25G SFP28
  - 2 × 100G QSFP28
- Layer: 3
- Switching capacity: 680 Gbps
- PoE output: Up to PoE+++
- PoE availability: Varies by power supply and operating mode
- Rack mount: Yes, 1U, full-depth
- Source: https://techspecs.ui.com/unifi/switching/ecs-48s-poe

#### ECS-24S

- SKU: `ECS-24S`
- Port layout:
  - 1 × 1 GbE RJ45
  - 8 × 2.5 GbE RJ45
  - 16 × 10 GbE RJ45
  - 4 × 25G SFP28
  - 2 × 100G QSFP28
- Layer: 3
- Switching capacity: 460 Gbps
- Max power consumption: 150 W
- Rack mount: Yes, 1U, full-depth
- Source: https://techspecs.ui.com/unifi/switching/ecs-24s

#### ECS-48-PoE

- SKU: `ECS-48-PoE`
- Port layout:
  - 16 × 2.5 GbE RJ45 (PoE+++)
  - 32 × 10 GbE RJ45 (PoE+++)
  - 4 × 25G SFP28
- Layer: 3
- Switching capacity: 920 Gbps
- PoE output: Up to PoE+++
- PoE availability: Varies by power supply and operating mode
- Rack mount: Yes, 1U, full-depth
- Source: https://techspecs.ui.com/unifi/switching/ecs-48-poe

#### ECS-24-PoE

- SKU: `ECS-24-PoE`
- Port layout:
  - 8 × 2.5 GbE RJ45 (PoE+++)
  - 16 × 10 GbE RJ45 (PoE+++)
  - 2 × 25G SFP28
- Layer: 3
- Switching capacity: 460 Gbps
- PoE output: Up to PoE+++
- PoE availability: Varies by power supply and operating mode
- Rack mount: Yes, 1U, full-depth
- Source: https://techspecs.ui.com/unifi/switching/ecs-24-poe

### 2. Professional and Professional HD

#### USW-Pro-XG-48

- SKU: `USW-Pro-XG-48`
- Port layout:
  - 16 × 2.5 GbE RJ45
  - 32 × 10 GbE RJ45
  - 4 × 25G SFP28
- Layer: 3
- Switching capacity: 920 Gbps
- Rack mount: Yes, 1U
- Source: https://techspecs.ui.com/unifi/switching/usw-pro-xg-48

#### USW-Pro-XG-24

- SKU: `USW-Pro-XG-24`
- Port layout:
  - 8 × 2.5 GbE RJ45
  - 16 × 10 GbE RJ45
  - 2 × 25G SFP28
- Layer: 3
- Switching capacity: 460 Gbps
- Rack mount: Yes, 1U
- Source: https://techspecs.ui.com/unifi/switching/usw-pro-xg-24

#### USW-Pro-HD-24-PoE

- SKU: `USW-Pro-HD-24-PoE`
- Port layout:
  - 22 × 2.5 GbE RJ45 (PoE++)
  - 2 × 10 GbE RJ45 (PoE++)
  - 4 × 10G SFP+
- Layer: 3
- Switching capacity: 230 Gbps
- PoE output: Up to PoE++
- PoE ports: 24
- PoE availability: 600 W
- Max power consumption: 60 W excluding PoE output
- Rack mount: Yes, 1U
- Source: https://techspecs.ui.com/unifi/switching/usw-pro-hd-24-poe

#### USW-Pro-HD-24

- SKU: `USW-Pro-HD-24`
- Port layout:
  - 22 × 2.5 GbE RJ45
  - 2 × 10 GbE RJ45
  - 4 × 10G SFP+
- Layer: 3
- Switching capacity: 230 Gbps
- Rack mount: Yes, 1U
- Source: https://techspecs.ui.com/unifi/switching/usw-pro-hd-24

#### USW-Pro-24-POE

- SKU: `USW-Pro-24-POE`
- Port layout:
  - 24 × 1 GbE RJ45 (16 PoE+, 8 PoE++)
  - 2 × 10G SFP+
- Layer: 3
- Switching capacity: 88 Gbps
- PoE availability: 400 W
- Max power consumption: 50 W excluding PoE output
- Rack mount: Yes, 1U
- Source: https://techspecs.ui.com/unifi/switching/usw-pro-24-poe

#### USW-Pro-24

- SKU: `USW-Pro-24`
- Port layout:
  - 24 × 1 GbE RJ45
  - 2 × 10G SFP+
- Layer: 3
- Switching capacity: 88 Gbps
- Rack mount: Yes, 1U
- Source: https://techspecs.ui.com/unifi/switching/usw-pro-24

#### USW-Pro-48

- SKU: `USW-Pro-48`
- Port layout:
  - 48 × 1 GbE RJ45
  - 4 × 10G SFP+
- Layer: 3
- Switching capacity: 176 Gbps
- Rack mount: Yes, 1U
- Source: https://techspecs.ui.com/unifi/switching/usw-pro-48

### 3. Professional Max

#### USW-Pro-Max-24-PoE

- SKU: `USW-Pro-Max-24-PoE`
- Port layout:
  - 16 × 1 GbE RJ45 (8 PoE+, 8 PoE++)
  - 8 × 2.5 GbE RJ45 (PoE++)
  - 2 × 10G SFP+
- Layer: 3
- Switching capacity: 112 Gbps
- PoE availability: 400 W
- Rack mount: Yes, 1U
- Source: https://techspecs.ui.com/unifi/switching/usw-pro-max-24-poe

### 4. Standard

#### USW-24-POE

- SKU: `USW-24-POE`
- Port layout:
  - 24 × 1 GbE RJ45 (16 PoE+)
  - 2 × 1G SFP
- PoE availability: 95 W
- Switching capacity: 52 Gbps
- Rack mount: Yes, 1U
- Source: https://techspecs.ui.com/unifi/switching/usw-24-poe

#### USW-24

- SKU: `USW-24`
- Port layout:
  - 24 × 1 GbE RJ45
  - 2 × 1G SFP
- Switching capacity: 52 Gbps
- Max power consumption: 25 W
- Rack mount: Yes, 1U
- Source: https://techspecs.ui.com/unifi/switching/usw-24

### 5. Utility

#### USW-Ultra

- SKU: `USW-Ultra`
- Port layout: 8 × 1 GbE RJ45 (7 PoE+ output ports, 1 PoE++ input port)
- Switching capacity: 16 Gbps
- PoE availability: Depends on the power input or adapter used
- Max power consumption: 9 W excluding PoE output
- Form factor: Compact desktop, wall, magnetic
- Source: https://techspecs.ui.com/unifi/switching/usw-ultra

### 6. Outstanding Specifications

The following models still need their individual official specifications checked:

- ECS-Aggregation
- ECS-48S
- USW-Pro-Max-24
- USW-Pro-Max-16
- USW-Pro-48-POE
- USW-Pro-8-PoE
- USW-Pro-XG-8-PoE
- USW-Ultra-210W
- USW-Flex-2.5G-5
- USW-Flex-XG
- USW-Flex
- USW-Flex-Mini

### 7. Schema Mapping Reminders

- `port_count`: Record physical Ethernet and optical uplink counts separately in research notes. Confirm the intended schema convention before mapping the value.
- `layer`: Use the officially documented layer.
- `poe_ports`: Count PoE output ports only.
- `poe_budget_w`: Use total PoE availability, not the switch's own power consumption.
- `switching_capacity_gbps`: Use the official switching capacity.
- `max_power_draw_w`: Use the device's maximum power consumption, excluding PoE output when that is how Ubiquiti reports it.
- `sfp_ports`: Record the number of optical uplink ports.
- `sfp_form_factor`: The schema supports `SFP`, `SFP+`, `SFP28`, `QSFP+` and `QSFP28`. Mixed form factors still need review before JSON mapping.
- Unknown optional numeric fields should be `null`, not `0`.
- Do not infer lifecycle status or product line from the model name alone.

---

# Access Points

**Official source:** https://techspecs.ui.com/unifi/wifi

The following are candidate indoor AP models from the official UniFi WiFi catalog. Outdoor models and dedicated bridging devices are excluded from the initial project scope.

## Wi-Fi 7

- U7 Pro XGS — `U7-Pro-XGS`
- U7 Pro XG — `U7-Pro-XG`
- U7 Pro Max — `U7-Pro-Max`
- U7 Pro — `U7-Pro`
- U7 Long-Range — `U7-LR`
- U7 Lite — `U7-Lite`
- U7 Pro XG Wall — `U7-Pro-XG-Wall`
- U7 Pro Wall — `U7-Pro-Wall`
- U7 In-Wall — `U7-IW`
- E7 Campus — `E7-Campus`
- E7 Campus Indoor — `E7-Campus-Indoor`
- E7 — `E7`
- E7 Audience Indoor — `E7-Audience-Indoor`

## Wi-Fi 6 / Wi-Fi 6E

- U6 Enterprise — `U6-Enterprise`
- U6 Pro — `U6-Pro`
- U6 Long-Range — `U6-LR`
- U6+ — `U6+`
- U6 Enterprise In-Wall — `U6-Enterprise-IW`
- U6 In-Wall — `U6-IW`

## Older Wi-Fi Generations

- AC Pro — `UAP-AC-PRO`
- AC Long-Range — `UAP-AC-LR`
- AC Lite — `UAP-AC-LITE`
- In-Wall HD — `UAP-IW-HD`
- AC In-Wall — `UAP-AC-IW`

## AP Specifications to Collect

For each approved AP, record the fields supported by `device-schemas.json`:

- Exact model name and SKU
- Official product detail URL
- Product line
- Price and date checked, if available from an approved source
- Rack mountability and rack height
- Lifecycle status and official EOS/EOL dates, if documented
- Wi-Fi standard
- Supported 2.4 GHz band
- Supported 5 GHz band
- Supported 6 GHz band
- Maximum concurrent clients
- Maximum data rate
- Maximum power consumption
- Power method
- Capabilities
- Any additional documented specifications useful for verification

## AP Exclusions for Initial Scope

Exclude the following outdoor or specialized bridging products unless the project scope is expanded and approved:

- U7 Pro Outdoor — `U7-Pro-Outdoor`
- U7 Outdoor — `U7-Outdoor`
- U7 Mesh — `U7-Mesh`
- U6 Mesh Pro — `U6-Mesh-Pro`
- U6 Mesh — `U6-Mesh`
- AC Mesh Pro — `UAP-AC-M-PRO`
- AC Mesh — `UAP-AC-M`
- Swiss Army Knife — `UK-Ultra`
- WiFi BaseStation XG — `UWB-XG`
- Building Bridge XG — `UBB-XG`
- Building Bridge — `UBB`
- AirWire — `U-AirWire`
- Device Bridge — `UDB`
- Device Bridge IoT — `UDB-IoT`
- Device Bridge Switch — `UDB-Switch`
- Device Bridge Pro — `UDB-Pro`
- Device Bridge Pro Sector — `UDB-Pro-Sector`

Confirm the exact use case and indoor/outdoor classification from the official product page before adding any excluded or specialized product.

## Access Point Batch 1 — Official Specification Research

**Primary source:** Ubiquiti UniFi Wi-Fi Tech Specs
https://techspecs.ui.com/unifi/wifi

### 1. Wi-Fi 7 Access Points

#### U7 Pro XGS

- SKU: `U7-Pro-XGS`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz, 6 GHz
- Maximum client count: 500+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 8.6 Gbps
  - 6 GHz: 5.8 Gbps
- Power method: PoE++
- Uplink: 10 GbE
- Source: https://techspecs.ui.com/unifi/wifi/u7-pro-xgs

#### U7 Pro XG

- SKU: `U7-Pro-XG`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz, 6 GHz
- Maximum client count: 300+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 4.3 Gbps
  - 6 GHz: 5.8 Gbps
- Power method: PoE+
- Uplink: 10 GbE
- Source: https://techspecs.ui.com/unifi/wifi/u7-pro-xg

#### U7 Pro

- SKU: `U7-Pro`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz, 6 GHz
- Maximum client count: 300+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 4.3 Gbps
  - 6 GHz: 5.8 Gbps
- Power method: PoE+
- Uplink: 2.5 GbE
- Maximum power consumption: 21 W
- Source: https://techspecs.ui.com/unifi/wifi/u7-pro

#### U7 Long-Range

- SKU: `U7-LR`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz
- 6 GHz: Not supported
- Maximum client count: 300+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 4.3 Gbps
- Power method: PoE
- Uplink: 2.5 GbE
- Source: https://techspecs.ui.com/unifi/wifi/u7-lr

#### U7 Lite

- SKU: `U7-Lite`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz
- 6 GHz: Not supported
- Maximum client count: 200+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 4.3 Gbps
- Power method: PoE
- Uplink: 2.5 GbE
- Source: https://techspecs.ui.com/unifi/wifi/u7-lite

#### U7 Pro XG Wall

- SKU: `U7-Pro-XG-Wall`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz, 6 GHz
- Maximum client count: 300+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 4.3 Gbps
  - 6 GHz: 5.8 Gbps
- Power method: PoE+
- Uplink: 10 GbE
- Source: https://techspecs.ui.com/unifi/wifi/u7-pro-xg-wall

#### U7 Pro Wall

- SKU: `U7-Pro-Wall`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz, 6 GHz
- Maximum client count: 300+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 4.3 Gbps
  - 6 GHz: 5.8 Gbps
- Power method: PoE+
- Uplink: 2.5 GbE
- Source: https://techspecs.ui.com/unifi/wifi/u7-pro-wall

#### U7 In-Wall

- SKU: `U7-IW`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz
- 6 GHz: Not supported
- Maximum client count: 200+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 4.3 Gbps
- Power method: PoE; PoE+ required for PoE output
- Uplink: 2.5 GbE
- Maximum power consumption: 13 W, excluding PoE output
- Source: https://techspecs.ui.com/unifi/wifi/u7-iw

### 2. Enterprise Wi-Fi 7 Access Points

#### E7 Campus Indoor

- SKU: `E7-Campus-Indoor`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz, 6 GHz
- Maximum client count: 1000+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 8.6 Gbps
  - 6 GHz: 11.5 Gbps
- Power method: PoE++
- Uplink: 10 GbE and 1 GbE
- Maximum power consumption: 44 W
- Source: https://techspecs.ui.com/unifi/wifi/e7-campus-indoor

#### E7 Campus

- SKU: `E7-Campus-US` (North America listing; confirm regional SKU before catalog entry)
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz, 6 GHz
- Maximum client count: 1000+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 8.6 Gbps
  - 6 GHz: 11.5 Gbps
- Power method: PoE++
- Uplink: 10 GbE and 1 GbE
- Source: https://techspecs.ui.com/unifi/wifi/e7-campus-us

#### E7

- SKU: `E7`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz, 6 GHz
- Maximum client count: 1000+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 8.6 Gbps
  - 6 GHz: 11.5 Gbps
- Power method: PoE++
- Uplink: 10 GbE and 1 GbE
- Maximum power consumption: 43 W
- Source: https://techspecs.ui.com/unifi/wifi/e7

#### E7 Audience Indoor

- SKU: `E7-Audience-Indoor`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 5 GHz and 6 GHz
- 2.4 GHz: Not listed as a supported radio
- Maximum client count: 1500+
- Maximum data rates:
  - 5 GHz: 8.6 Gbps
  - 6 GHz: 11.5 Gbps per listed radio
- Power method: PoE++
- Uplink: 10 GbE and 1 GbE
- Maximum power consumption: 51 W
- Source: https://techspecs.ui.com/unifi/wifi/e7-audience-indoor

### 3. Wi-Fi 6 and Wi-Fi 6E Access Points

#### U6 Enterprise

- SKU: `U6-Enterprise`
- Wi-Fi standard: Wi-Fi 6E
- Supported bands: 2.4 GHz, 5 GHz, 6 GHz
- Maximum client count: 600+
- Maximum data rates:
  - 2.4 GHz: 573.5 Mbps
  - 5 GHz: 4.8 Gbps
  - 6 GHz: 4.8 Gbps
- Power method: PoE+
- Uplink: 2.5 GbE
- Source: https://techspecs.ui.com/unifi/wifi/u6-enterprise

#### U6 Enterprise In-Wall

- SKU: `U6-Enterprise-IW`
- Wi-Fi standard: Wi-Fi 6E
- Supported bands: 2.4 GHz, 5 GHz, 6 GHz
- Maximum client count: 600+
- Maximum data rates:
  - 2.4 GHz: 573.5 Mbps
  - 5 GHz: 4.8 Gbps
  - 6 GHz: 4.8 Gbps
- Power method: PoE+; PoE++ required for PoE output
- Uplink: 2.5 GbE
- Source: https://techspecs.ui.com/unifi/wifi/u6-enterprise-iw

#### U6 Pro

- SKU: `U6-Pro`
- Wi-Fi standard: Wi-Fi 6
- Supported bands: 2.4 GHz, 5 GHz
- 6 GHz: Not supported
- Maximum client count: 250+
- Maximum data rates:
  - 2.4 GHz: 573.5 Mbps
  - 5 GHz: 4.8 Gbps
- Power method: PoE
- Uplink: GbE
- Source: https://techspecs.ui.com/unifi/wifi/u6-pro

#### U6 Long-Range

- SKU: `U6-LR`
- Wi-Fi standard: Wi-Fi 6
- Supported bands: 2.4 GHz, 5 GHz
- 6 GHz: Not supported
- Maximum client count: 350+
- Maximum data rates:
  - 2.4 GHz: 600 Mbps
  - 5 GHz: 2.4 Gbps
- Power method: PoE+
- Uplink: GbE
- Source: https://techspecs.ui.com/unifi/wifi/u6-lr

#### U6+

- SKU: `U6+`
- Wi-Fi standard: Wi-Fi 6
- Supported bands: 2.4 GHz, 5 GHz
- 6 GHz: Not supported
- Maximum client count: 300+
- Maximum data rates:
  - 2.4 GHz: 573.5 Mbps
  - 5 GHz: 2.4 Gbps
- Power method: PoE
- Uplink: GbE
- Source: https://techspecs.ui.com/unifi/wifi/u6-plus

#### U6 In-Wall

- SKU: `U6-IW`
- Wi-Fi standard: Wi-Fi 6
- Supported bands: 2.4 GHz, 5 GHz
- 6 GHz: Not supported
- Maximum client count: 250+
- Maximum data rates:
  - 2.4 GHz: 573.5 Mbps
  - 5 GHz: 4.8 Gbps
- Power method: PoE; PoE+ required for PoE output
- Uplink: GbE
- Maximum power consumption: 13 W, excluding PoE output
- Source: https://techspecs.ui.com/unifi/wifi/u6-iw

### 4. Older Wi-Fi 5 Access Points

#### AC Pro

- SKU: `UAP-AC-PRO`
- Wi-Fi standard: Wi-Fi 5
- Supported bands: 2.4 GHz, 5 GHz
- Maximum client count: 250+
- Maximum data rates:
  - 2.4 GHz: 450 Mbps
  - 5 GHz: 1.3 Gbps
- Power method: PoE
- Uplink: GbE
- Source: https://techspecs.ui.com/unifi/wifi/uap-ac-pro

#### AC Long-Range

- SKU: `UAP-AC-LR`
- Wi-Fi standard: Wi-Fi 5
- Supported bands: 2.4 GHz, 5 GHz
- Maximum client count: 250+
- Maximum data rates:
  - 2.4 GHz: 450 Mbps
  - 5 GHz: 867 Mbps
- Power method: PoE
- Uplink: GbE
- Source: https://techspecs.ui.com/unifi/wifi/unifi-ac-lr

#### AC Lite

- SKU: `UAP-AC-LITE`
- Wi-Fi standard: Wi-Fi 5
- Supported bands: 2.4 GHz, 5 GHz
- Maximum client count: 250+
- Maximum data rates:
  - 2.4 GHz: 450 Mbps
  - 5 GHz: 867 Mbps
- Power method: PoE
- Uplink: GbE
- Source: https://techspecs.ui.com/unifi/wifi/uap-ac-lite

#### In-Wall HD

- SKU: `UAP-IW-HD`
- Wi-Fi standard: Wi-Fi 5
- Supported bands: 2.4 GHz, 5 GHz
- Maximum client count: 200+
- Maximum data rates:
  - 2.4 GHz: 300 Mbps
  - 5 GHz: 1.7 Gbps
- Power method: PoE; PoE+ required for PoE passthrough
- Uplink: GbE
- Source: https://techspecs.ui.com/unifi/wifi/uap-iw-hd

#### AC In-Wall

- SKU: `UAP-AC-IW`
- Wi-Fi standard: Wi-Fi 5
- Supported bands: 2.4 GHz, 5 GHz
- Maximum client count: 250+
- Maximum data rates:
  - 2.4 GHz: 300 Mbps
  - 5 GHz: 867 Mbps
- Power method: PoE; PoE+ required for PoE passthrough
- Uplink: GbE
- Source: https://techspecs.ui.com/unifi/wifi/uap-ac-iw

### 5. Additional Wi-Fi 7 Access Point — U7 Pro Max

- Product name: U7 Pro Max
- SKU: `U7-Pro-Max`
- Wi-Fi standard: Wi-Fi 7
- Supported bands: 2.4 GHz, 5 GHz, 6 GHz
- Maximum client count: 500+
- Maximum data rates:
  - 2.4 GHz: 688 Mbps
  - 5 GHz: 8.6 Gbps
  - 6 GHz: 5.8 Gbps
- Power method: PoE+
- Uplink: 2.5 GbE
- Maximum power consumption: 25 W
- Coverage area: 160 m²
- Official source: https://techspecs.ui.com/unifi/wifi/u7-pro-max

## Access Point Batch — Aggregate Data-Rate Calculations

**Calculation convention:** Aggregate data rate = sum of the manufacturer's advertised maximum data rates for each supported band. Values are rounded to the nearest whole Mbps for the catalog's integer field. These are team-calculated values, not manufacturer-published aggregate totals.

### Wi-Fi 7

| Model | SKU | Supported bands | Advertised rates | Aggregate Mbps | Max clients |
|---|---|---|---|---:|---|
| U7 Pro XGS | U7-Pro-XGS | 2.4 / 5 / 6 GHz | 688 + 8,600 + 5,800 Mbps | 15,088 | 500+ |
| U7 Pro XG | U7-Pro-XG | 2.4 / 5 / 6 GHz | 688 + 4,300 + 5,800 Mbps | 10,788 | 300+ |
| U7 Pro Max | U7-Pro-Max | 2.4 / 5 / 6 GHz | 688 + 8,600 + 5,800 Mbps | 15,088 | 500+ |
| U7 Pro | U7-Pro | 2.4 / 5 / 6 GHz | 688 + 4,300 + 5,800 Mbps | 10,788 | 300+ |
| U7 Long-Range | U7-LR | 2.4 / 5 GHz | 688 + 4,300 Mbps | 4,988 | 300+ |
| U7 Lite | U7-Lite | 2.4 / 5 GHz | 688 + 4,300 Mbps | 4,988 | 200+ |
| U7 Pro XG Wall | U7-Pro-XG-Wall | 2.4 / 5 / 6 GHz | 688 + 4,300 + 5,800 Mbps | 10,788 | 300+ |
| U7 Pro Wall | U7-Pro-Wall | 2.4 / 5 / 6 GHz | 688 + 4,300 + 5,800 Mbps | 10,788 | 300+ |
| U7 In-Wall | U7-IW | 2.4 / 5 GHz | 688 + 4,300 Mbps | 4,988 | 200+ |
| E7 Campus Indoor | E7-Campus-Indoor | 2.4 / 5 / 6 GHz | 688 + 8,600 + 11,500 Mbps | 20,788 | 1,000+ |
| E7 Campus | E7-Campus-US | 2.4 / 5 / 6 GHz | 688 + 8,600 + 11,500 Mbps | 20,788 | 1,000+ |
| E7 | E7 | 2.4 / 5 / 6 GHz | 688 + 8,600 + 11,500 Mbps | 20,788 | 1,000+ |
| E7 Audience Indoor | E7-Audience-Indoor | 5 / 6 GHz | 8,600 + 11,500 Mbps | 20,100 | 1,500+ |

### Wi-Fi 6 / Wi-Fi 6E

| Model | SKU | Wi-Fi | Supported bands | Advertised rates | Aggregate Mbps | Max clients | Power method |
|---|---|---|---|---|---:|---:|---|
| U6 Enterprise | U6-Enterprise | 6E | 2.4 / 5 / 6 GHz | 573.5 + 4,800 + 4,800 Mbps | 10,174 | 600+ | PoE+ |
| U6 Enterprise In-Wall | U6-Enterprise-IW | 6E | 2.4 / 5 / 6 GHz | 573.5 + 4,800 + 4,800 Mbps | 10,174 | 600+ | PoE+ / PoE++ for PoE output |
| U6 Pro | U6-Pro | 6 | 2.4 / 5 GHz | 573.5 + 4,800 Mbps | 5,374 | 250+ | PoE |
| U6 Long-Range | U6-LR | 6 | 2.4 / 5 GHz | 600 + 2,400 Mbps | 3,000 | 350+ | PoE+ |
| U6+ | U6+ | 6 | 2.4 / 5 GHz | 573.5 + 2,400 Mbps | 2,974 | 300+ | PoE |
| U6 In-Wall | U6-IW | 6 | 2.4 / 5 GHz | 573.5 + 4,800 Mbps | 5,374 | 250+ | PoE / PoE+ for PoE output |

### Wi-Fi 5

| Model | SKU | Wi-Fi | Supported bands | Advertised rates | Aggregate Mbps | Max clients | Power method |
|---|---|---|---|---|---:|---:|---|
| AC Pro | UAP-AC-PRO | 5 | 2.4 / 5 GHz | 450 + 1,300 Mbps | 1,750 | 250+ | PoE |
| AC Long-Range | UAP-AC-LR | 5 | 2.4 / 5 GHz | 450 + 867 Mbps | 1,317 | 250+ | PoE |
| AC Lite | UAP-AC-LITE | 5 | 2.4 / 5 GHz | 450 + 867 Mbps | 1,317 | 250+ | PoE |
| In-Wall HD | UAP-IW-HD | 5 | 2.4 / 5 GHz | 300 + 1,700 Mbps | 2,000 | 200+ | PoE / PoE+ for PoE passthrough |
| AC In-Wall | UAP-AC-IW | 5 | 2.4 / 5 GHz | 300 + 867 Mbps | 1,167 | 250+ | PoE / PoE+ for PoE passthrough |

**Data handling notes:**
- `wifi_standard` is `6` for both Wi-Fi 6 and Wi-Fi 6E devices. The 6E distinction is retained in the research notes and product-line naming.
- The `+` in manufacturer client-count claims indicates a lower-bound claim. For the integer catalog field, use the stated number (e.g. 250), not an invented exact maximum.
- Do not use `0` for undocumented power draw. Leave optional power values null or omit them according to the catalog convention.
- Keep the individual band rates in this research file for traceability.
- These values are based on the official Ubiquiti Tech Specs pages, as recorded in the research notes.

## AP Schema Mapping and Research Cautions

1. `wifi_standard`: Use integer values supported by the schema: `5` for Wi-Fi 5, `6` for Wi-Fi 6 and Wi-Fi 6E, and `7` for Wi-Fi 7.
2. Wi-Fi 6E remains distinguishable in the research notes and product-line naming, even though its schema value is `6`.
3. `supported_24ghz`, `supported_5ghz`, and `supported_6ghz`: Set these according to the radios actually listed on the official product page.
4. `max_concurrent_clients`: Preserve the manufacturer's original claim (such as `300+`) in the research notes. For the integer catalog field, use the stated numeric portion as a lower-bound representation, not as an exact maximum.
5. `max_data_rate_mbps`: Calculate the aggregate by summing the manufacturer's advertised maximum data rates for all supported bands. Convert Gbps to Mbps and round to the nearest whole Mbps.
6. The aggregate data rate is team-calculated, not a manufacturer-published aggregate throughput figure. Retain individual band rates for traceability.
7. `max_power_draw_w`: Use the official maximum power consumption value. If it is not documented, leave the optional field null or omit it according to the catalog convention.
8. `power_method`: Preserve the official PoE requirement. Note when a higher PoE standard is required for passthrough or PoE output.
9. Do not infer lifecycle status from product availability.
10. Confirm regional SKU variants before creating final catalog records.
11. Do not assume all Wi-Fi 7 devices support 6 GHz. Some models only publish 2.4 GHz and 5 GHz radios.
12. Keep official source URLs with each device entry for traceability.

---

# Product Line Classification

The schema requires `product_line` for gateway routers, switches and APs. Prepare a separate `unifi-productlines.json` file using the product-line schema.

- Use separate rankings for gateway routers, switches and APs.
- Rank products from lower to higher capability within each category.
- Use official Ubiquiti product families or documented product tiers where possible.
- If a ranking is derived by the team from technical specifications rather than published by Ubiquiti, explicitly identify it as team-derived in `source_note`.
- Do not assume Ubiquiti's marketing categories are performance rankings.
- Do not reuse Omada product-line names or rankings for Ubiquiti.

## Proposed AP Product Line Classification

**Vendor ID:** `3`
**Category:** `ap`

**Classification basis:** Team-derived from documented UniFi AP specifications. The ranking considers Wi-Fi standard first, followed by aggregate advertised maximum data rate. For Wi-Fi 7 models, supported frequency bands, advertised client capacity, and documented deployment characteristics are also considered when distinguishing product lines. These rankings are intended for the system's CE-to-HP selection logic and are not an official Ubiquiti product-line hierarchy.

| Category | Product line | Proposed rank |
|---|---|---:|
| ap | Wi-Fi 5 AC | 1 |
| ap | Wi-Fi 6 AX Entry | 2 |
| ap | Wi-Fi 6 AX Performance | 3 |
| ap | Wi-Fi 6E AXE | 4 |
| ap | Wi-Fi 7 BE Dual-Band | 5 |
| ap | Wi-Fi 7 BE Tri-Band | 6 |
| ap | Wi-Fi 7 BE High-Performance | 7 |
| ap | Wi-Fi 7 BE Enterprise | 8 |
| ap | Wi-Fi 7 BE Ultra-High-Density | 9 |

**Source note for all AP product lines:** Team-derived classification based on official Ubiquiti UniFi AP specifications. Rankings consider Wi-Fi standard, aggregate advertised maximum data rate, supported frequency bands, and relevant documented deployment characteristics. Enterprise and high-density classifications reflect different deployment capabilities and should not be interpreted as a strict ranking across every individual performance metric. Not a Ubiquiti-published product-line hierarchy.

**Review requirement:**
- Verify each model's aggregate data rate before assigning its product line.
- Do not assign a product line solely from the model name.
- Use documented characteristics to distinguish Enterprise and Ultra-High-Density products.
- Confirm the final product-line assignments before creating `unifi-productlines.json` and `unifi-aps.json`.

## Proposed Gateway Router Product Line Classification

**Vendor ID:** `3`
**Category:** `gateway_router`

**Classification basis:** Team-derived classification based on documented official Ubiquiti UniFi gateway specifications. Rankings consider documented IDS/IPS throughput, physical port capacity, supported connectivity, and overall gateway capabilities. These product lines are intended for the system's Cost-Efficient-to-High-Performance selection logic and are not an official Ubiquiti-published product-line hierarchy.

| Category | Product line | Proposed rank | Models |
|---|---|---:|---|
| gateway_router | Compact Gateway | 1 | UCG-Ultra, UX, UDR |
| gateway_router | Multi-Gigabit Gateway | 2 | UXG-Max, UCG-Max, UX7, UDR7, UDR-5G-Max |
| gateway_router | Advanced Gateway | 3 | UXG-Pro, UDM-Pro, UDM-SE, UCG-Fiber, UCG-Industrial, UDW |
| gateway_router | Enterprise Gateway | 4 | UXG-Enterprise, UDM-Pro-Max, UDM-Beast |

**Source note for all gateway router product lines:** Team-derived classification based on official Ubiquiti UniFi gateway specifications. Rankings consider documented IDS/IPS throughput, physical port capacity, connectivity, and overall gateway capabilities. Models within a product line may differ in integrated features, form factor, and supported connectivity. Not a Ubiquiti-published product-line hierarchy.

**Pending models:**
- EF-Core: Do not finalize until the required firewall throughput mapping is resolved.
- EFG: Do not finalize until its individual official product specifications are documented.

---

# Schema Limitations / Items for Review

1. **Mixed SFP port types:** The current schema supports only one `sfp_form_factor` per device. Some Ubiquiti gateways and switches have both SFP+ and SFP28 ports. Preserve their exact port layout in the source notes and flag mixed configurations for review.
2. **QSFP28 support:** The current schema's `sfp_form_factor` enum supports `SFP`, `SFP+`, `SFP28`, `QSFP+`, and `QSFP28`. QSFP28 is supported as an individual value, but devices with multiple uplink types may still require schema review.
3. **VPN throughput:** Some products publish multiple throughput values by protocol and use case. Do not select one as a generic VPN throughput without an agreed mapping.
4. **Firewall throughput:** Keep general throughput, firewall routing throughput and IDS/IPS throughput distinct. Confirm which official metric maps to `firewall_throughputs_mbps`.
5. **WAN/LAN assignment:** A physical Ethernet port may be configurable as WAN or LAN. Record default WAN assignments separately from the physical port layout.
6. **Integrated gateway functions:** Some Cloud Gateways include integrated Wi-Fi or switching. Confirm the intended catalog representation before creating separate AP or switch entries.
7. **Rack height:** Confirm the project's convention for non-rack devices before assigning `u_height`. Do not assume an undocumented value.
8. **Power and PoE:** Distinguish device maximum power consumption from PoE output budget. Record whether the published device power excludes PoE output.
9. **Lifecycle:** Do not infer `sunsetting` or `discontinued` from a product being absent from a store listing. Require official lifecycle evidence.
10. **Unverified products:** A model appearing in the category catalog is not sufficient evidence for every field required by the JSON schema. Verify the individual product detail page before creating its record.
11. **Product line:** Every gateway router, switch and AP needs a valid product line matching the vendor and category.

---

# Planned JSON Files

Create separate catalog files after the source specifications and schema mapping have been reviewed:

- `unifi-productlines.json`
- `unifi-routers.json`
- `unifi-switches.json`
- `unifi-aps.json`

Keep raw research and verification notes in this Markdown file. Do not add unsupported values to the JSON files. Any unresolved schema or specification issue should be raised for review before finalizing the affected device record.

## Final Catalog Readiness Checklist

Before adding any device to the final JSON:

- [ ] Exact model name and SKU confirmed.
- [ ] Individual official product specification URL recorded.
- [ ] Vendor ID set to `3`.
- [ ] Required core fields checked against `device-schemas.json`.
- [ ] Correct device category and capabilities identified.
- [ ] Required product line exists for the correct category.
- [ ] Physical port layout recorded accurately.
- [ ] WAN/LAN assignments kept separate from physical port counts.
- [ ] PoE output ports and PoE budget checked separately.
- [ ] Switching layer and switching capacity supported by official specifications.
- [ ] SFP/QSFP counts and form factors mapped without misrepresentation.
- [ ] Maximum power consumption recorded with its PoE-output qualification.
- [ ] Wi-Fi bands, standard, client count and aggregate data rate checked for APs.
- [ ] Unknown optional values represented as `null` or omitted where permitted.
- [ ] Required values that cannot be supported are flagged for review.
- [ ] Lifecycle status and EOS/EOL dates supported by official sources.
- [ ] Final JSON validated against the project schema.

**Research status:** This document is a working specification and verification list. Preliminary and verified research notes are retained separately as identified above. A specification appearing in this document does not automatically mean the corresponding device is approved or ready for final JSON entry.