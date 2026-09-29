/**
 * Formats raw schema values (snake_case, booleans, key names)
 * into human-readable, sentence-case display labels for forms & summaries.
 */
export function formatSelectLabel(value?: string | boolean | null): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'

  // Explicit mappings for options where simple capitalization isn't enough
  const customLabels: Record<string, string> = {
    same_city: 'Same city',
    same_country: 'Same country',
    different_countries: 'Different countries',
    in_house: 'In-house IT',
    outside: 'Outside person/company',
    none: 'No',
    stable: 'Stable',
    frequent_outages: 'Frequent brownouts/outages',
    full_size_rack: 'Full-size rack in a dedicated closet/room',
    wall_cabinet: 'Wall cabinet',
    not_sure: 'Not sure',
    command_line: 'Traditional command-line/technical management',
    dashboard: 'A simple app or web dashboard',
    can_wait: 'We can wait for it to be fixed',
    same_day_matters: 'It should be fixed within the same day',
    every_minute_matters: 'We need the internet available with very little downtime',
    not_checked: 'Not checked / Not sure',
    dsl_or_cellular: 'DSL / Cellular',
    fiber: 'Fiber',
    none_or_not_sure: 'None / Not sure',
    cat5e_or_cat6: 'Cat5e / Cat6',
    '0_10': '0–10%',
    '11_30': '11–30%',
    '31_plus': '31%+',
    one: '1',
    two_plus: '2+',
  }

  if (customLabels[value]) {
    return customLabels[value]
  }

  // Fallback: convert snake_case to sentence case
  const formatted = value.replace(/_/g, ' ')
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}