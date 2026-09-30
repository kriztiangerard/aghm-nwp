export type SummaryItem = {
  label: string
  value: string
}

export type SummarySection = {
  title: string
  items: SummaryItem[]
}

const LABEL_OVERRIDES: Record<string, string> = {
  name: 'Project or company name',
  numberOfSites: 'Number of business locations',
  siteRelationship: 'Business location relationship',
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
  phoneCount: 'VOIP phone count',
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
  otherEnabled: 'Other network usage enabled',
  other: 'Other network usage',
  enabled: 'Enabled',
}

const VALUE_OVERRIDES: Record<string, string> = {
  same_city: 'Same city',
  different_city: 'Different city',
  same_country: 'Same country',
  national: 'National',
  multi_site: 'Multi-site',
  fiber: 'Fiber',
  cable: 'Cable',
  dsl: 'DSL',
  fixed_wireless: 'Fixed wireless',
  same_day_matters: 'Same day matters',
  same_week_matters: 'Same week matters',
  can_wait: 'Can wait',
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
  one: '1',
  two_or_more: '2+',
  wall_cabinet: 'Wall cabinet',
  dedicated_room: 'Dedicated room',
  rack_room: 'Rack room',
}

const SECTION_TITLES: Record<string, string> = {
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

const formatValue = (key: string, value: unknown): string => {
  if (value === undefined || value === null || value === '') return ''

  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map((item) => formatValue(key, item)).filter(Boolean).join(', ')
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized) return ''
    return VALUE_OVERRIDES[normalized] ?? normalized
  }

  return String(value)
}

const flattenSummaryItems = (obj: Record<string, unknown>, parentKey = ''): SummaryItem[] => {
  const items: SummaryItem[] = []

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return

    if (typeof value === 'object' && !Array.isArray(value)) {
      items.push(...flattenSummaryItems(value as Record<string, unknown>, key))
      return
    }

    const labelKey = parentKey ? `${parentKey}.${key}` : key
    const label = prettifyKey(labelKey.includes('.') ? labelKey.split('.').at(-1) ?? key : key)
    const text = formatValue(key, value)

    if (!text) return

    items.push({ label, value: text })
  })

  return items
}

export const getSummarySections = (values: Record<string, any> | undefined): SummarySection[] => {
  if (!values || typeof values !== 'object') return []

  return Object.entries(SECTION_TITLES)
    .map(([key, title]) => {
      const sectionValue = values[key]
      if (!sectionValue || typeof sectionValue !== 'object') return null

      const items = flattenSummaryItems(sectionValue as Record<string, unknown>)
      if (!items.length) return null

      return { title, items }
    })
    .filter((section): section is SummarySection => Boolean(section))
}
