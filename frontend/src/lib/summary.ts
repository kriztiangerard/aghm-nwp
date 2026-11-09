import { formatSelectLabel } from '../schemas/formatters'

export type SummaryItem = {
  id?: string
  label: string
  value: string | string[]
}

export type SummarySection = {
  title: string
  items: SummaryItem[]
}

const LABEL_OVERRIDES: Record<string, string> = {
  name: 'Project or company name',
  numberOfSites: 'Number of business locations',
  totalUsers: 'Total number of users',
  numberOfFloors: 'Number of floors',
  floorAreaPerFloor: 'Approximate floor area per floor',
  roomsPerFloor: 'Number of rooms/work areas per floor',
  hasLargeGroupRooms: 'Has large group rooms',
  rooms: 'Large group room count',
  equipmentStatus: 'Existing network equipment status',
  existingCabling: 'Existing cabling',
  routerModem: 'Router/modem',
  switches: 'Switches',
  wifiAccessPoints: 'Wi-Fi access points',
  cablingAlreadyRun: 'Cabling already run',
  currentSpeedMbps: 'Current internet speed',
  connectionType: 'Internet connection type',
  downtimeImpact: 'Internet downtime impact',
  wiredComputers: 'Wired computer count',
  wifiDevices: 'Wireless device count',
  phoneCount: 'VoIP phone count',
  cameraCount: 'IP camera count',
  description: 'Device description',
  guestWifi: 'Guest Wi‑Fi preference',
  sensitiveData: 'Sensitive data handling preference',
  equipmentLocation: 'Equipment location',
  managementPreference: 'Management preference',
  monthlyITBudget: 'Monthly IT budget',
  ITSupport: 'IT support',
  electricityReliability: 'Electricity reliability',
  expectedGrowth: 'Expected business growth',
  headcountGrowth: 'Expected headcount growth',
  newSites: 'Expected additional sites',
  videoConferencing: 'Video conferencing',
  voipCalls: 'VoIP calls',
  posPayment: 'POS/payment',
  cloudStorage: 'Cloud storage',
  businessSoftware: 'Business software',
  videoStreaming: 'Video streaming',
  securityCameraViewing: 'Security camera viewing',
  basicBrowsingEmail: 'Basic browsing / email',
  otherEnabled: 'Other network usage enabled',
  other: 'Other network usage',
  enabled: 'Enabled',
}

const VALUE_OVERRIDES: Record<string, string> = {
  one: 'One site',
  two_or_more: 'Two or more sites',
  national: 'National',
  multi_site: 'Multi-site',
  fiber: 'Fiber',
  cable: 'Cable',
  dsl: 'DSL',
  fixed_wireless: 'Fixed wireless',
  same_day_matters: 'Same day matters',
  same_week_matters: 'Same week matters',
  can_wait: 'Can wait',
  every_minute_matters: 'Every minute matters',
  yes: 'Yes',
  no: 'No',
  stable: 'Stable',
  frequent_outages: 'Frequent brownouts/outages',
  under_15000: 'Under ₱15,000',
  '15000_40000': '₱15,000–₱40,000',
  over_40000: 'Over ₱40,000',
  none: 'No dedicated IT support',
  external: 'Outside person/company',
  in_house: 'In-house IT',
  '0_10': '0–10%',
  '11_30': '11–30%',
  '31_plus': '31%+',
  wall_cabinet: 'Wall cabinet',
  dedicated_room: 'Dedicated room',
  rack_room: 'Rack room',
}

export const SECTION_TITLES: Record<string, string> = {
  project: 'Project basics',
  physicalSpace: 'Physical space',
  existingNetwork: 'Existing environment',
  internet: 'Internet connection',
  devices: 'Devices',
  preferences: 'Network setup preferences',
  businessContext: 'Budget & business context',
}

const prettifyKey = (key: string) => {
  const override = LABEL_OVERRIDES[key]
  if (override) return override

  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const UNIT_SUFFIXES: Record<string, string> = {
  totalUsers: ' people',
  numberOfFloors: ' floors',
  floorAreaPerFloor: ' m²',
  roomsPerFloor: ' rooms',
  currentSpeedMbps: ' Mbps',
  wiredComputers: ' computers',
  wifiDevices: ' devices',
  phoneCount: ' phones',
  cameraCount: ' cameras',
}

const formatObjectArrayValue = (value: Record<string, unknown>[]) =>
  value
    .map((item) => {
      const hasMeaningfulData = Object.values(item).some(
        (entry) => entry !== undefined && entry !== null && entry !== '' && !(typeof entry === 'string' && entry.trim() === ''),
      )

      if (!hasMeaningfulData) {
        return undefined
      }

      const floor = typeof item.floor === 'number' ? `Floor ${item.floor}` : undefined
      const capacity = typeof item.capacity === 'number' ? `${item.capacity} people` : undefined
      const parts = [floor, capacity].filter(Boolean)
      return parts.length > 0 ? parts.join(' · ') : JSON.stringify(item)
    })
    .filter((item): item is string => Boolean(item))

const formatValue = (key: string, value: unknown): string | string[] => {
  if (value === undefined || value === null || value === '') return ''

  if (key === 'totalUsers') {
    const numericValue = typeof value === 'string' ? Number(value) : value

    if (typeof numericValue !== 'number' || !Number.isInteger(numericValue) || numericValue < 1 || numericValue > 200) {
      return ''
    }
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    const unit = UNIT_SUFFIXES[key] ?? ''
    return `${String(value)}${unit}`
  }
  if (Array.isArray(value)) {
    if (value.every((item) => item !== null && typeof item === 'object')) {
      const formatted = formatObjectArrayValue(value as Record<string, unknown>[])
      return formatted.length > 0 ? formatted : ['']
    }

    const formatted = value
      .map((item) => formatValue(key, item))
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .filter((item) => typeof item === 'string' && item.length > 0)

    return formatted.length === 0 ? '' : formatted
  }
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized) return ''

    if (key === 'newSites') {
      const siteCountLabels: Record<string, string> = {
        none: 'None',
        one: '1',
        two_or_more: '2+',
      }

      return siteCountLabels[normalized] ?? normalized
    }

    if (VALUE_OVERRIDES[normalized]) {
      return VALUE_OVERRIDES[normalized]
    }

    if (normalized.includes('_') || normalized.includes('-')) {
      return formatSelectLabel(normalized)
    }

    return normalized
  }

  return String(value)
}

const flattenSummaryItems = (obj: Record<string, unknown>, parentKey = ''): SummaryItem[] => {
  const items: SummaryItem[] = []

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return

    if (key === 'equipment' && typeof value === 'object' && !Array.isArray(value)) {
      const equipment = value as Record<string, unknown>
      const availableEquipment = [
        ['routerModem', 'Router / Modem'],
        ['switches', 'Switch'],
        ['wifiAccessPoints', 'Wi-Fi Access Point'],
        ['cablingAlreadyRun', 'Cabling already run'],
        ['otherOrUnknown', 'Other / not sure'],
      ].flatMap(([equipmentKey, label]) => {
        const selectedEquipment = equipment[equipmentKey]
        if (!selectedEquipment) return []

        const quantity =
          typeof selectedEquipment === 'object'
            ? (selectedEquipment as Record<string, unknown>).quantity
            : undefined
        const quantityLabel =
          typeof quantity === 'string' ? formatValue('quantity', quantity) : ''

        return [
          `${label}${quantityLabel ? ` (${quantityLabel})` : ''}`,
        ]
      })

      if (availableEquipment.length > 0) {
        items.push({
          id: 'equipment.available',
          label: 'Available equipment',
          value: availableEquipment,
        })
      }

      return
    }

    if (key === 'applications' && typeof value === 'object' && !Array.isArray(value)) {
      const applicationValues = Object.entries(value as Record<string, unknown>)
        .filter(([appKey, appValue]) => appKey !== 'other' && appKey !== 'otherEnabled' && appValue === true)
        .map(([appKey]) => prettifyKey(appKey))

      if (applicationValues.length > 0) {
        items.push({ id: 'applications.mainNetworkUsage', label: 'Main network usage', value: applicationValues })
      }

      const otherUsage = (value as Record<string, unknown>).other
      if ((value as Record<string, unknown>).otherEnabled === true && typeof otherUsage === 'string' && otherUsage.trim()) {
        items.push({ id: 'applications.other', label: 'Other network usage', value: otherUsage.trim() })
      }

      return
    }

    if (key === 'largeGroupRooms' && typeof value === 'object' && !Array.isArray(value)) {
      const largeGroupRooms = value as Record<string, unknown>

      if ('hasLargeGroupRooms' in largeGroupRooms) {
        if (largeGroupRooms.hasLargeGroupRooms === false) {
          items.push({ id: 'largeGroupRooms.hasLargeGroupRooms', label: prettifyKey('hasLargeGroupRooms'), value: 'No' })
          return
        }

        if (largeGroupRooms.hasLargeGroupRooms !== true) {
          return
        }
      }
    }

    if ((key === 'voip' || key === 'ipCameras' || key === 'otherNetworkDevices') && typeof value === 'object' && !Array.isArray(value)) {
      const nestedData = value as Record<string, unknown>

      if ('enabled' in nestedData) {
        if (nestedData.enabled === false) {
          items.push({ id: `${key}.enabled`, label: prettifyKey('enabled'), value: 'No' })
          return
        }

        if (nestedData.enabled !== true) {
          return
        }
      }
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      items.push(...flattenSummaryItems(value as Record<string, unknown>, key))
      return
    }

    const labelKey = parentKey ? `${parentKey}.${key}` : key
    const label = prettifyKey(labelKey.includes('.') ? labelKey.split('.').at(-1) ?? key : key)
    const text = formatValue(key, value)

    if (!text) return

    items.push({ id: labelKey, label, value: text })
  })

  return items
}

export const getSummarySections = (
  values: Record<string, unknown> | undefined,
  sectionKey?: keyof typeof SECTION_TITLES,
): SummarySection[] => {
  if (!values || typeof values !== 'object') return []

  const targetKeys = sectionKey ? [sectionKey] : Object.keys(SECTION_TITLES)

  return targetKeys
    .map((key) => {
      const sectionValue = values[key]
      if (!sectionValue || typeof sectionValue !== 'object') return null

      const items = flattenSummaryItems(sectionValue as Record<string, unknown>)
      if (!items.length) return null

      return { title: SECTION_TITLES[key], items }
    })
    .filter((section): section is SummarySection => Boolean(section))
}
