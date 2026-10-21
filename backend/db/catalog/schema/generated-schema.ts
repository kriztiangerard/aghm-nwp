import { z } from "zod"

/**Per-category device schemas matching the ERD's class-table-inheritance structure: a shared Device core plus one subtype block per hardware category. Composed via allOf so each category schema is core Device fields + its own specs.*/
export const generatedDeviceSchemas = z.union([z.intersection(z.object({ "device_id": z.number().int().optional(), "vendor_id": z.number().int(), "sku": z.string(), 
/**Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.*/
"price": z.union([z.number().gte(0).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), z.null().describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.")]).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), "price_updated_at": z.string().datetime({ offset: true }).optional(), "name": z.string(), "description": z.string().optional(), "is_rack_mountable": z.boolean(), "u_height": z.number().int().gte(0), "lifecycle_status": z.enum(["active","sunsetting","discontinued"]), "eos_date": z.union([z.string().date(), z.null()]).optional(), "eol_date": z.union([z.string().date(), z.null()]).optional(), 
/**Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.*/
"capabilities": z.array(z.enum(["router","switch","controller","firewall","ap"])).refine((arr) => arr.every((item, i) => arr.indexOf(item) == i), "All items must be unique!").describe("Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.").optional() }).describe("Fields common to every device row, regardless of category — matches the Device table."), z.object({ "category": z.literal("gateway_router"), 
/**Gateway/router specifications table.*/
"gateway_router_specs": z.object({ "wan_ports": z.number().int().gte(0), "lan_ports": z.number().int().gte(0), "max_throughput_mbps": z.number().int().gte(0).optional(), "max_power_draw_w": z.number().gte(0).optional(), "vpn_supported": z.boolean(), 
/**Number of SFP-family ports. A subset of wan_ports + lan_ports, not additional to it.*/
"sfp_ports": z.number().int().gte(0).describe("Number of SFP-family ports. A subset of wan_ports + lan_ports, not additional to it.").optional(), 
/**Form factor of the SFP ports. Required when sfp_ports > 0.*/
"sfp_form_factor": z.enum(["SFP","SFP+","SFP28","QSFP+","QSFP28"]).describe("Form factor of the SFP ports. Required when sfp_ports > 0.").optional() }).describe("Gateway/router specifications table."), 
/**Present only when this gateway/router is ALSO capability-tagged as a firewall (dual-role device, e.g. UniFi UDM-Pro). Omit entirely for a plain gateway with no firewall role — don't send null, just leave the key out.*/
"firewall_specs": z.object({ "firewall_throughputs_mbps": z.number().int().gte(0), "vpn_throughput_mbps": z.number().int().gte(0).optional(), "max_concurrent_sessions": z.number().int().gte(0).optional(), "wan_ports": z.number().int().gte(0).optional(), "lan_ports": z.number().int().gte(0).optional(), "max_power_draw_w": z.number().gte(0).optional() }).describe("Present only when this gateway/router is ALSO capability-tagged as a firewall (dual-role device, e.g. UniFi UDM-Pro). Omit entirely for a plain gateway with no firewall role — don't send null, just leave the key out.").optional(), 
/**Present only when this gateway/router has an integrated switch (e.g. Omada ER7212PC with built-in PoE ports). Omit entirely for a plain gateway. The engine counts ports from this block, so gateway_router_specs.lan_ports must be 0 whenever switch_specs is present (enforced below).*/
"switch_specs": z.object({ "port_count": z.number().int().gte(0), "poe_ports": z.number().int().gte(0).optional(), "poe_budget_w": z.number().int().gte(0).optional(), "switching_capacity_gbps": z.number().gte(0).optional(), "layer": z.union([z.literal(2), z.literal(3)]), "max_power_draw_w": z.number().gte(0).optional(), 
/**Number of SFP-family ports. A subset of the total port count, not additional to it.*/
"sfp_ports": z.number().int().gte(0).describe("Number of SFP-family ports. A subset of the total port count, not additional to it.").optional(), 
/**Form factor of the SFP ports. Required when sfp_ports > 0.*/
"sfp_form_factor": z.enum(["SFP","SFP+","SFP28","QSFP+","QSFP28"]).describe("Form factor of the SFP ports. Required when sfp_ports > 0.").optional() }).describe("Present only when this gateway/router has an integrated switch (e.g. Omada ER7212PC with built-in PoE ports). Omit entirely for a plain gateway. The engine counts ports from this block, so gateway_router_specs.lan_ports must be 0 whenever switch_specs is present (enforced below).").optional(), 
/**Present only when this gateway/router has an integrated controller (e.g. Omada ER7212PC). Omit entirely for a plain gateway.*/
"controller_specs": z.object({ 
/**hardware = standalone physical appliance; software = self-hosted install; cloud = vendor-hosted (typically licensed); integrated = built into another device (e.g. a router such as the Omada ER7212PC) and not separately purchasable.*/
"controller_type": z.enum(["hardware","software","cloud","integrated"]).describe("hardware = standalone physical appliance; software = self-hosted install; cloud = vendor-hosted (typically licensed); integrated = built into another device (e.g. a router such as the Omada ER7212PC) and not separately purchasable."), 
/**Max access points this controller can manage.*/
"max_managed_aps": z.number().int().gte(0).describe("Max access points this controller can manage."), 
/**Max switches this controller can manage.*/
"max_managed_switches": z.number().int().gte(0).describe("Max switches this controller can manage."), 
/**Max gateways/routers this controller can manage.*/
"max_managed_gateways": z.number().int().gte(0).describe("Max gateways/routers this controller can manage."), 
/**Optional combined cap shared by access points and switches, for controllers whose vendor states one (e.g. 22 for the Omada ER7212PC's integrated controller). The engine checks aps + switches against this in addition to the per-type limits.*/
"max_managed_aps_and_switches": z.number().int().gte(0).describe("Optional combined cap shared by access points and switches, for controllers whose vendor states one (e.g. 22 for the Omada ER7212PC's integrated controller). The engine checks aps + switches against this in addition to the per-type limits.").optional(), "max_managed_clients": z.number().int().gte(0).optional(), 
/**Ethernet ports on the appliance. Use 0 or omit for software/cloud controllers.*/
"lan_ports": z.number().int().gte(0).describe("Ethernet ports on the appliance. Use 0 or omit for software/cloud controllers.").optional(), 
/**e.g. PoE 802.3af, DC adapter*/
"power_method": z.string().describe("e.g. PoE 802.3af, DC adapter").optional(), "max_power_draw_w": z.number().gte(0).optional() }).describe("Present only when this gateway/router has an integrated controller (e.g. Omada ER7212PC). Omit entirely for a plain gateway.").optional() })), z.intersection(z.object({ "device_id": z.number().int().optional(), "vendor_id": z.number().int(), "sku": z.string(), 
/**Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.*/
"price": z.union([z.number().gte(0).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), z.null().describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.")]).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), "price_updated_at": z.string().datetime({ offset: true }).optional(), "name": z.string(), "description": z.string().optional(), "is_rack_mountable": z.boolean(), "u_height": z.number().int().gte(0), "lifecycle_status": z.enum(["active","sunsetting","discontinued"]), "eos_date": z.union([z.string().date(), z.null()]).optional(), "eol_date": z.union([z.string().date(), z.null()]).optional(), 
/**Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.*/
"capabilities": z.array(z.enum(["router","switch","controller","firewall","ap"])).refine((arr) => arr.every((item, i) => arr.indexOf(item) == i), "All items must be unique!").describe("Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.").optional() }).describe("Fields common to every device row, regardless of category — matches the Device table."), z.object({ "category": z.literal("switch"), 
/**Switch specifications table.*/
"switch_specs": z.object({ "port_count": z.number().int().gte(0), "poe_ports": z.number().int().gte(0).optional(), "poe_budget_w": z.number().int().gte(0).optional(), "switching_capacity_gbps": z.number().gte(0).optional(), "layer": z.union([z.literal(2), z.literal(3)]), "max_power_draw_w": z.number().gte(0).optional(), 
/**Number of SFP-family ports. A subset of the total port count, not additional to it.*/
"sfp_ports": z.number().int().gte(0).describe("Number of SFP-family ports. A subset of the total port count, not additional to it.").optional(), 
/**Form factor of the SFP ports. Required when sfp_ports > 0.*/
"sfp_form_factor": z.enum(["SFP","SFP+","SFP28","QSFP+","QSFP28"]).describe("Form factor of the SFP ports. Required when sfp_ports > 0.").optional() }).describe("Switch specifications table.") })), z.intersection(z.object({ "device_id": z.number().int().optional(), "vendor_id": z.number().int(), "sku": z.string(), 
/**Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.*/
"price": z.union([z.number().gte(0).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), z.null().describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.")]).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), "price_updated_at": z.string().datetime({ offset: true }).optional(), "name": z.string(), "description": z.string().optional(), "is_rack_mountable": z.boolean(), "u_height": z.number().int().gte(0), "lifecycle_status": z.enum(["active","sunsetting","discontinued"]), "eos_date": z.union([z.string().date(), z.null()]).optional(), "eol_date": z.union([z.string().date(), z.null()]).optional(), 
/**Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.*/
"capabilities": z.array(z.enum(["router","switch","controller","firewall","ap"])).refine((arr) => arr.every((item, i) => arr.indexOf(item) == i), "All items must be unique!").describe("Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.").optional() }).describe("Fields common to every device row, regardless of category — matches the Device table."), z.object({ "category": z.literal("ap"), 
/**AP specifications table.*/
"ap_specs": z.object({ 
/**e.g. 6 for Wi-Fi 6, 7 for Wi-Fi 7*/
"wifi_standard": z.number().int().describe("e.g. 6 for Wi-Fi 6, 7 for Wi-Fi 7"), "max_concurrent_clients": z.number().int().gte(0).optional(), "max_data_rate_mbps": z.number().int().gte(0).optional(), "supported_24ghz": z.boolean(), "supported_5ghz": z.boolean(), "supported_6ghz": z.boolean(), "max_power_draw_w": z.number().gte(0).optional(), 
/**e.g. PoE+, PoE++, DC adapter*/
"power_method": z.string().describe("e.g. PoE+, PoE++, DC adapter").optional() }).describe("AP specifications table.") })), z.intersection(z.object({ "device_id": z.number().int().optional(), "vendor_id": z.number().int(), "sku": z.string(), 
/**Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.*/
"price": z.union([z.number().gte(0).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), z.null().describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.")]).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), "price_updated_at": z.string().datetime({ offset: true }).optional(), "name": z.string(), "description": z.string().optional(), "is_rack_mountable": z.boolean(), "u_height": z.number().int().gte(0), "lifecycle_status": z.enum(["active","sunsetting","discontinued"]), "eos_date": z.union([z.string().date(), z.null()]).optional(), "eol_date": z.union([z.string().date(), z.null()]).optional(), 
/**Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.*/
"capabilities": z.array(z.enum(["router","switch","controller","firewall","ap"])).refine((arr) => arr.every((item, i) => arr.indexOf(item) == i), "All items must be unique!").describe("Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.").optional() }).describe("Fields common to every device row, regardless of category — matches the Device table."), z.object({ "category": z.literal("firewall"), 
/**Firewall specifications table. Used standalone for dedicated firewall devices, and optionally nested under a gateway/router entry when that device is also capability-tagged as a firewall (see DeviceCapability junction, e.g. UDM-Pro).*/
"firewall_specs": z.object({ "firewall_throughputs_mbps": z.number().int().gte(0), "vpn_throughput_mbps": z.number().int().gte(0).optional(), "max_concurrent_sessions": z.number().int().gte(0).optional(), "wan_ports": z.number().int().gte(0).optional(), "lan_ports": z.number().int().gte(0).optional(), "max_power_draw_w": z.number().gte(0).optional() }).describe("Firewall specifications table. Used standalone for dedicated firewall devices, and optionally nested under a gateway/router entry when that device is also capability-tagged as a firewall (see DeviceCapability junction, e.g. UDM-Pro).") })).describe("A dedicated, standalone firewall device (e.g. a Reyee RG-WALL 1600-equivalent) — not a gateway with firewall capability layered on. Multi-role devices belong under gatewayRouterDevice instead, with firewall_specs nested there."), z.intersection(z.object({ "device_id": z.number().int().optional(), "vendor_id": z.number().int(), "sku": z.string(), 
/**Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.*/
"price": z.union([z.number().gte(0).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), z.null().describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.")]).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), "price_updated_at": z.string().datetime({ offset: true }).optional(), "name": z.string(), "description": z.string().optional(), "is_rack_mountable": z.boolean(), "u_height": z.number().int().gte(0), "lifecycle_status": z.enum(["active","sunsetting","discontinued"]), "eos_date": z.union([z.string().date(), z.null()]).optional(), "eol_date": z.union([z.string().date(), z.null()]).optional(), 
/**Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.*/
"capabilities": z.array(z.enum(["router","switch","controller","firewall","ap"])).refine((arr) => arr.every((item, i) => arr.indexOf(item) == i), "All items must be unique!").describe("Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.").optional() }).describe("Fields common to every device row, regardless of category — matches the Device table."), z.object({ "category": z.literal("rack"), 
/**Rack specifications table.*/
"rack_specs": z.object({ "form_factor": z.string(), "u_capacity": z.number().int().gte(0), "load_capacity_kg": z.number().int().gte(0).optional(), "mount_type": z.string().optional(), "has_ventilation": z.boolean().optional() }).describe("Rack specifications table.") })), z.intersection(z.object({ "device_id": z.number().int().optional(), "vendor_id": z.number().int(), "sku": z.string(), 
/**Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.*/
"price": z.union([z.number().gte(0).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), z.null().describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free.")]).describe("Unit price. null = unknown/price on request (excluded from Cost-Efficient ranking); 0 = genuinely free."), "price_updated_at": z.string().datetime({ offset: true }).optional(), "name": z.string(), "description": z.string().optional(), "is_rack_mountable": z.boolean(), "u_height": z.number().int().gte(0), "lifecycle_status": z.enum(["active","sunsetting","discontinued"]), "eos_date": z.union([z.string().date(), z.null()]).optional(), "eol_date": z.union([z.string().date(), z.null()]).optional(), 
/**Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.*/
"capabilities": z.array(z.enum(["router","switch","controller","firewall","ap"])).refine((arr) => arr.every((item, i) => arr.indexOf(item) == i), "All items must be unique!").describe("Role tags written to the DeviceCapability junction at seed time (capability_desc values; the seed script resolves each to a capability_id). Fixed vocabulary so a typo can't create a new capability. Tag every role a multi-role device performs so the engine knows it replaces separate devices. Optional for single-role devices.").optional() }).describe("Fields common to every device row, regardless of category — matches the Device table."), z.object({ "category": z.literal("controller"), 
/**Controller specifications table. A purchasable hardware controller appliance (e.g. Omada OC200/OC300-style) or a licensed cloud/software controller line item. Selected by the engine when the chosen vendor has need_controller = true; sizing is checked per device type: planned AP, switch and gateway counts must each fit within max_managed_aps / max_managed_switches / max_managed_gateways.*/
"controller_specs": z.object({ 
/**hardware = standalone physical appliance; software = self-hosted install; cloud = vendor-hosted (typically licensed); integrated = built into another device (e.g. a router such as the Omada ER7212PC) and not separately purchasable.*/
"controller_type": z.enum(["hardware","software","cloud","integrated"]).describe("hardware = standalone physical appliance; software = self-hosted install; cloud = vendor-hosted (typically licensed); integrated = built into another device (e.g. a router such as the Omada ER7212PC) and not separately purchasable."), 
/**Max access points this controller can manage.*/
"max_managed_aps": z.number().int().gte(0).describe("Max access points this controller can manage."), 
/**Max switches this controller can manage.*/
"max_managed_switches": z.number().int().gte(0).describe("Max switches this controller can manage."), 
/**Max gateways/routers this controller can manage.*/
"max_managed_gateways": z.number().int().gte(0).describe("Max gateways/routers this controller can manage."), 
/**Optional combined cap shared by access points and switches, for controllers whose vendor states one (e.g. 22 for the Omada ER7212PC's integrated controller). The engine checks aps + switches against this in addition to the per-type limits.*/
"max_managed_aps_and_switches": z.number().int().gte(0).describe("Optional combined cap shared by access points and switches, for controllers whose vendor states one (e.g. 22 for the Omada ER7212PC's integrated controller). The engine checks aps + switches against this in addition to the per-type limits.").optional(), "max_managed_clients": z.number().int().gte(0).optional(), 
/**Ethernet ports on the appliance. Use 0 or omit for software/cloud controllers.*/
"lan_ports": z.number().int().gte(0).describe("Ethernet ports on the appliance. Use 0 or omit for software/cloud controllers.").optional(), 
/**e.g. PoE 802.3af, DC adapter*/
"power_method": z.string().describe("e.g. PoE 802.3af, DC adapter").optional(), "max_power_draw_w": z.number().gte(0).optional() }).describe("Controller specifications table. A purchasable hardware controller appliance (e.g. Omada OC200/OC300-style) or a licensed cloud/software controller line item. Selected by the engine when the chosen vendor has need_controller = true; sizing is checked per device type: planned AP, switch and gateway counts must each fit within max_managed_aps / max_managed_switches / max_managed_gateways.") })).describe("A network controller (hardware appliance, self-hosted software, or cloud license). Only relevant for vendors with need_controller = true.")]).describe("Per-category device schemas matching the ERD's class-table-inheritance structure: a shared Device core plus one subtype block per hardware category. Composed via allOf so each category schema is core Device fields + its own specs.")

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const deviceSchemas = generatedDeviceSchemas.superRefine((device, ctx) => {
  const requireSfpFormFactor = (specs: unknown, path: string[]) => {
    if (
      isRecord(specs) &&
      typeof specs.sfp_ports === 'number' &&
      specs.sfp_ports >= 1 &&
      specs.sfp_form_factor === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'sfp_form_factor'],
        message: 'Required when sfp_ports is greater than 0.',
      })
    }
  }

  if (device.category === 'gateway_router') {
    requireSfpFormFactor(device.gateway_router_specs, ['gateway_router_specs'])

    if (device.switch_specs !== undefined) {
      requireSfpFormFactor(device.switch_specs, ['switch_specs'])

      if (device.gateway_router_specs.lan_ports !== 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['gateway_router_specs', 'lan_ports'],
          message: 'Must be 0 when switch_specs is present.',
        })
      }
    }
  } else if (device.category === 'switch') {
    requireSfpFormFactor(device.switch_specs, ['switch_specs'])
  }
})

export type DeviceSchemas = z.infer<typeof deviceSchemas>
