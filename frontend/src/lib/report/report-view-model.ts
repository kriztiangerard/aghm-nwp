import type { QuestionnaireData } from '../../schemas/questionnaireSchema'

export type ReportPlanType = 'CE' | 'HP'

export interface ReportSelection {
  vendor: string
  planType: ReportPlanType
}

export interface ReportProjectSummary {
  companyName: string
  locations: string
  floors: number
  roomsPerFloor: number
  floorArea: number | null
}

export interface ReportRequirement {
  label: string
  value: string
  source: 'user' | 'engine'
}

export interface ReportBomLine {
  category: string
  sku: string
  name: string
  vendor: string
  qty: number
  unitPrice: number | null
  lineTotal: number | null
  status: 'ACTIVE' | 'SUNSETTING'
  isGeneric: boolean
  priceSource?: 'synchronized' | 'manual'
  isStale?: boolean
  priceUpdatedAt?: string
}

export interface ReportAssumption {
  field: string
  value: string
  reason: string
}

export interface ReportViewModel {
  project: ReportProjectSummary
  requirements: ReportRequirement[]
  selectedVendor: string
  selectedPlanType: ReportPlanType
  planComplete: boolean
  hardware: ReportBomLine[]
  bom: {
    currency: string
    lines: ReportBomLine[]
    total: number | null
    totalIsPartial: boolean
  }
  installationMaterials: Record<string, unknown> | null
  topology: Record<string, unknown> | null
  assumptions: ReportAssumption[]
  flags: string[]
  limitations: string[]
  generatedAt: string
}

type UnknownRecord = Record<string, unknown>

interface EngineBomLine {
  category: string
  sku: string
  name: string
  vendor: string
  qty: number
  unitPrice: number | null
  lineTotal: number | null
  status: 'ACTIVE' | 'SUNSETTING'
  isGeneric: boolean
  priceSource?: 'synchronized' | 'manual'
  isStale?: boolean
  priceUpdatedAt?: string
}

interface EnginePlan {
  vendor: string
  planType: ReportPlanType
  complete: boolean
  bom: {
    currency: string
    lines: EngineBomLine[]
    total: number | null
    totalIsPartial: boolean
  }
  flags: unknown[]
  ledger: unknown[]
  topology?: UnknownRecord
  installationMaterials?: UnknownRecord
  limitations?: string[]
}

interface EngineRequirements extends UnknownRecord {
  wireless?: {
    standard?: string
    ceiling?: number
    CE?: {
      total?: number
      perFloor?: number[]
    }
    HP?: {
      total?: number
      perFloor?: number[]
    }
  }
  edgePorts?: number
  poeEdgePorts?: number
  requiredMbps?: number
  throughputMetric?: string
  securityTier?: string
  vlans?: string[]
  qos?: boolean
  redundancy?: string
  backupAdvice?: string
  upsRecommendation?: string
  upsRecommendationLevel?: string
  otherPoeLoadW?: number
  backbone?: string
}

interface EngineResult {
  contractVersion: number
  generatedAt: string
  requirements: EngineRequirements
  ledger: unknown[]
  flags: unknown[]
  plans: EnginePlan[]
  defaultVendor: {
    CE: string | null
    HP: string | null
  }
}

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {}
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Not specified'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatValue).join(', ') : 'None'
  }

  if (typeof value === 'object') {
    return Object.entries(value as UnknownRecord)
      .map(([key, item]) => `${key}: ${formatValue(item)}`)
      .join('; ')
  }

  return String(value)
}

function formatChoice(value: unknown, choices: Record<string, string>): string {
  if (typeof value !== 'string') {
    return formatValue(value)
  }

  return choices[value] ?? value
}

function formatYesNo(value: unknown): string {
  return formatChoice(value, {
    yes: 'Yes',
    no: 'No',
    not_sure: 'Not sure',
    'not-sure': 'Not sure',
    notSure: 'Not sure',
  })
}

function formatQuestionnaireRequirements(
  data: QuestionnaireData,
): ReportRequirement[] {
  const requirements: ReportRequirement[] = [
    {
      label: 'Company or project name',
      value: formatValue(data.project.name),
      source: 'user',
    },
    {
      label: 'Number of locations',
      value: formatChoice(data.project.numberOfSites, {
        one: 'One location',
        two_or_more: 'Two or more locations',
      }),
      source: 'user',
    },
    {
      label: 'Total users',
      value: formatValue(data.project.totalUsers),
      source: 'user',
    },
    {
      label: 'Number of floors',
      value: formatValue(data.physicalSpace.numberOfFloors),
      source: 'user',
    },
    {
      label: 'Rooms per floor',
      value: formatValue(data.physicalSpace.roomsPerFloor),
      source: 'user',
    },
    {
      label: 'Floor area per floor',
      value:
        data.physicalSpace.floorAreaPerFloor == null
          ? 'Not specified'
          : `${data.physicalSpace.floorAreaPerFloor} m?`,
      source: 'user',
    },
    {
      label: 'Large-group rooms',
      value: formatYesNo(
        data.physicalSpace.largeGroupRooms.hasLargeGroupRooms,
      ),
      source: 'user',
    },
    {
      label: 'Existing network equipment',
      value: formatChoice(data.existingNetwork.equipmentStatus, {
        none: 'No existing equipment',
        yes: 'Yes',
        not_sure: 'Not sure',
      }),
      source: 'user',
    },
    {
      label: 'Existing cabling',
      value: formatChoice(data.existingNetwork.existingCabling, {
        none_or_not_sure: 'None or not sure',
        cat5e_or_cat6: 'Cat5e or Cat6',
        fiber: 'Fiber',
      }),
      source: 'user',
    },
    {
      label: 'Current internet speed',
      value:
        data.internet.currentSpeedMbps == null
          ? 'Not specified'
          : `${data.internet.currentSpeedMbps} Mbps`,
      source: 'user',
    },
    {
      label: 'Internet connection type',
      value: formatChoice(data.internet.connectionType, {
        fiber: 'Fiber',
        dsl_or_cellular: 'DSL or cellular',
        not_checked: 'Not checked',
      }),
      source: 'user',
    },
    {
      label: 'Internet downtime impact',
      value: formatChoice(data.internet.downtimeImpact, {
        can_wait: 'Can wait',
        same_day_matters: 'Same-day restoration matters',
        every_minute_matters: 'Every minute matters',
      }),
      source: 'user',
    },
    {
      label: 'Wired computers',
      value: formatValue(data.devices.wiredComputers),
      source: 'user',
    },
    {
      label: 'Wireless devices',
      value: formatValue(data.devices.wifiDevices),
      source: 'user',
    },
    {
      label: 'VoIP phones',
      value: data.devices.voip.enabled
        ? `${formatYesNo(data.devices.voip.enabled)} (${formatValue(data.devices.voip.phoneCount)} phones)`
        : 'No',
      source: 'user',
    },
    {
      label: 'IP cameras',
      value: data.devices.ipCameras.enabled
        ? `${formatYesNo(data.devices.ipCameras.enabled)} (${formatValue(data.devices.ipCameras.cameraCount)} cameras)`
        : 'No',
      source: 'user',
    },
    {
      label: 'Other network devices',
      value: data.devices.otherNetworkDevices.enabled
        ? `Yes ? ${formatValue(data.devices.otherNetworkDevices.description)}`
        : 'No',
      source: 'user',
    },
    {
      label: 'Guest Wi-Fi',
      value: formatYesNo(data.preferences.guestWifi),
      source: 'user',
    },
    {
      label: 'Sensitive data',
      value: formatChoice(data.preferences.sensitiveData, {
        no: 'No',
        yes: 'Yes',
        not_sure: 'Not sure',
      }),
      source: 'user',
    },
    {
      label: 'Equipment location',
      value: formatChoice(data.preferences.equipmentLocation, {
        full_size_rack: 'Full-size rack',
        wall_cabinet: 'Wall cabinet',
        not_sure: 'Not sure',
      }),
      source: 'user',
    },
    {
      label: 'Network management preference',
      value: formatChoice(data.preferences.managementPreference, {
        dashboard: 'Dashboard',
        command_line: 'Command line',
        not_sure: 'Not sure',
      }),
      source: 'user',
    },
    {
      label: 'Monthly IT budget',
      value: formatChoice(data.businessContext.monthlyITBudget, {
        under_15000: 'Under ?15,000',
        '15000_40000': '?15,000??40,000',
        over_40000: 'Over ?40,000',
      }),
      source: 'user',
    },
    {
      label: 'IT support model',
      value: formatChoice(data.businessContext.ITSupport, {
        none: 'No dedicated IT support',
        external: 'External IT support',
        in_house: 'In-house IT support',
      }),
      source: 'user',
    },
    {
      label: 'Electricity reliability',
      value: formatChoice(data.businessContext.electricityReliability, {
        stable: 'Stable',
        frequent_outages: 'Frequent outages',
      }),
      source: 'user',
    },
  ]

  // Additional physical-space details
  const largeGroupRooms = data.physicalSpace.largeGroupRooms

  if (largeGroupRooms.rooms?.length) {
    requirements.push({
      label: 'Large-group room details',
      value: largeGroupRooms.rooms
        .map(
          (room) =>
            `Floor ${room.floor}: ${room.capacity} people`,
        )
        .join('; '),
      source: 'user',
    })
  }

  // Existing equipment inventory
  const equipment = data.existingNetwork.equipment

  if (equipment) {
    requirements.push(
      {
        label: 'Existing router or modem',
        value: formatYesNo(equipment.routerModem),
        source: 'user',
      },
      {
        label: 'Existing switches',
        value: formatValue(equipment.switches?.quantity),
        source: 'user',
      },
      {
        label: 'Existing Wi-Fi access points',
        value: formatValue(equipment.wifiAccessPoints?.quantity),
        source: 'user',
      },
      {
        label: 'Cabling already run',
        value: formatYesNo(equipment.cablingAlreadyRun),
        source: 'user',
      },
      {
        label: 'Other or unknown equipment',
        value: formatYesNo(equipment.otherOrUnknown),
        source: 'user',
      },
    )
  }

  // Application and network usage preferences
  const applications = data.preferences.applications

  const applicationLabels: Array<[string, boolean]> = [
    ['Video conferencing', applications.videoConferencing],
    ['VoIP calls', applications.voipCalls],
    ['POS and payment systems', applications.posPayment],
    ['Cloud storage', applications.cloudStorage],
    ['Business software', applications.businessSoftware],
    ['Video streaming', applications.videoStreaming],
    ['Security camera viewing', applications.securityCameraViewing],
    ['Basic browsing and email', applications.basicBrowsingEmail],
    ['Other application usage', applications.otherEnabled],
  ]

  requirements.push(
    ...applicationLabels.map(([label, enabled]) => ({
      label,
      value: formatYesNo(enabled),
      source: 'user' as const,
    })),
  )

  if (applications.otherEnabled && applications.other) {
    requirements.push({
      label: 'Other application details',
      value: applications.other,
      source: 'user',
    })
  }

  // Business growth expectations
  requirements.push({
    label: 'Expected business growth',
    value: formatYesNo(data.businessContext.expectedGrowth),
    source: 'user',
  })

  if (data.businessContext.expectedGrowth && data.businessContext.growth) {
    requirements.push(
      {
        label: 'Expected headcount growth',
        value: formatChoice(
          data.businessContext.growth.headcountGrowth,
          {
            '0_10': '0–10%',
            '11_30': '11–30%',
            '31_plus': '31% or more',
          },
        ),
        source: 'user',
      },
      {
        label: 'Expected new sites',
        value: formatChoice(
          data.businessContext.growth.newSites,
          {
            none: 'None',
            one: 'One',
            two_or_more: 'Two or more',
          },
        ),
        source: 'user',
      },
    )
  }

  return requirements
}




function formatEngineeringRequirements(
  requirements: EngineRequirements,
  planType: ReportPlanType,
): ReportRequirement[] {
  const wireless = requirements.wireless
  const selectedWireless = wireless?.[planType]

  const vlanNames: Record<string, string> = {
    Corporate: 'Corporate network',
    Guest: 'Guest network',
    Restricted: 'Restricted network',
    Voice: 'Voice network',
    Cameras_IoT: 'Cameras and IoT network',
  }

  const choices: Record<string, Record<string, string>> = {
    'Throughput metric': {
      routing_throughput: 'Routing throughput',
      idps_throughput: 'Intrusion prevention and detection throughput',
    },
    'Security tier': {
      standard: 'Standard security',
      advanced: 'Advanced security',
    },
    'Redundancy requirement': {
      none: 'No redundancy required',
      required: 'Redundancy required',
      backupWan: 'Backup WAN connection',
    },
    'Backbone recommendation': {
      fiber: 'Fiber backbone',
      copper: 'Copper backbone',
    },
    'UPS recommendation level': {
      prominent: 'Prominent recommendation',
      advisory: 'Advisory recommendation',
    },
  }

  const derived: Array<[string, unknown]> = [
    ['Recommended access points', selectedWireless?.total],
    ['Access points per floor', selectedWireless?.perFloor],
    ['Required switch ports', requirements.edgePorts],
    ['PoE switch ports', requirements.poeEdgePorts],
    [
      'Required gateway throughput',
      requirements.requiredMbps == null
        ? null
        : `${requirements.requiredMbps} Mbps`,
    ],
    ['Throughput metric', requirements.throughputMetric],
    ['Security tier', requirements.securityTier],
    ['Recommended VLANs', requirements.vlans],
    ['Quality of Service (QoS)', requirements.qos],
    ['Redundancy requirement', requirements.redundancy],
    ['Backup connection advice', requirements.backupAdvice],
    ['Backbone recommendation', requirements.backbone],
    ['UPS recommendation', requirements.upsRecommendation],
    ['UPS recommendation level', requirements.upsRecommendationLevel],
    [
      'Additional PoE load',
      requirements.otherPoeLoadW == null
        ? null
        : `${requirements.otherPoeLoadW} W`,
    ],
  ]

  return derived
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([label, value]) => {
      let formattedValue: string

      if (label === 'Recommended VLANs' && Array.isArray(value)) {
        formattedValue = formatValue(
          value.map((vlan) => vlanNames[vlan] ?? vlan),
        )
      } else if (choices[label]) {
        formattedValue = formatChoice(value, choices[label])
      } else {
        formattedValue = formatValue(value)
      }

      return {
        label,
        value: formattedValue,
        source: 'engine' as const,
      }
    })
}




function formatLedger(entries: unknown[]): ReportAssumption[] {
  return entries.map((entry) => {
    const item = asRecord(entry)

    return {
      field: formatValue(item.field),
      value: formatValue(item.valueUsed),
      reason: formatValue(item.reason),
    }
  })
}

function ledgerKey(entry: unknown): string {
  const item = asRecord(entry)

  return JSON.stringify([
    item.field,
    item.valueUsed,
    item.reason,
  ])
}

function selectLedger(
  result: EngineResult,
  plan: EngineResult['plans'][number],
): unknown[] {
  const planKeys = new Set(
    result.plans.flatMap((item) =>
      item.ledger.map(ledgerKey),
    ),
  )

  const shared = result.ledger.filter(
    (entry) => !planKeys.has(ledgerKey(entry)),
  )

  const seen = new Set<string>()

  return [...shared, ...plan.ledger].filter((entry) => {
    const key = ledgerKey(entry)

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function formatFlag(flag: unknown): string {
  if (typeof flag === 'string') {
    return flag
  }

  const item = asRecord(flag)

  return formatValue(
    item.message ?? item.description ?? item.reason ?? item.code ?? flag,
  )
}

function formatSelectedPlanFlags(flags: unknown[]): string[] {
  return flags.map(formatFlag)
}

export function formatReportDateTime(generatedAt: string): string {
  const date = new Date(generatedAt)

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid generatedAt date: ${generatedAt}`)
  }

  const formatted = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)

  return `${formatted} (Asia/Manila)`
}

export function buildReport(
  result: EngineResult,
  selection: ReportSelection,
  questionnaireData: QuestionnaireData,
): ReportViewModel {
  const selectedPlan = result.plans.find(
    (plan) =>
      plan.vendor === selection.vendor &&
      plan.planType === selection.planType,
  )

  if (!selectedPlan) {
    throw new Error(
      `No plan found for vendor "${selection.vendor}" and plan type "${selection.planType}".`,
    )
  }

  const bomLines = selectedPlan.bom.lines.map((line) => ({ ...line }))

  const project: ReportProjectSummary = {
    companyName: questionnaireData.project.name,
    locations: formatChoice(questionnaireData.project.numberOfSites, {
      one: 'One location',
      two_or_more: 'Two or more locations',
    }),
    floors: questionnaireData.physicalSpace.numberOfFloors,
    roomsPerFloor: questionnaireData.physicalSpace.roomsPerFloor,
    floorArea: questionnaireData.physicalSpace.floorAreaPerFloor ?? null,
  }

  const requirements = [
    ...formatQuestionnaireRequirements(questionnaireData),
    ...formatEngineeringRequirements(result.requirements, selection.planType),
  ]


  const existingEquipmentNotice =
    questionnaireData.existingNetwork.equipmentStatus === 'yes'
      ? [
          'This is a full greenfield replacement estimate. Existing functional cabling may reduce the final deployment cost.',
        ]
      : []

  return {
    project,
    requirements,
    selectedVendor: selectedPlan.vendor,
    selectedPlanType: selectedPlan.planType,
    planComplete: selectedPlan.complete,
    hardware: bomLines,
    bom: {
      currency: selectedPlan.bom.currency,
      lines: bomLines,
      total: selectedPlan.bom.total,
      totalIsPartial: selectedPlan.bom.totalIsPartial,
    },
    installationMaterials: selectedPlan.installationMaterials ?? null,
    topology: selectedPlan.topology ?? null,
    assumptions: formatLedger(selectLedger(result, selectedPlan)),
    flags: formatSelectedPlanFlags([
      ...result.flags,
      ...selectedPlan.flags,
    ]),    limitations: [...existingEquipmentNotice, ...(selectedPlan.limitations ?? [])],
    generatedAt: formatReportDateTime(result.generatedAt),
  }
}




