import { closeOpenSelectPortals } from '../frontend/src/lib/closeOpenSelectPortals'
import { getSummarySections } from '../frontend/src/lib/summary'
import {
  clampWholeNumberInput,
  handleWholeNumberChange,
  sanitizeNumberInput,
} from '../frontend/src/lib/numberInput'
import { formatSelectLabel } from '../frontend/src/schemas/formatters'
import { questionnaireSchema } from '../frontend/src/schemas/questionnaireSchema'

describe('questionnaire validation messages', () => {
  it('closes open selects without leaving their portals unclickable', () => {
    const trigger = { click: jest.fn() }
    const listbox = {
      removeAttribute: jest.fn(),
      style: { removeProperty: jest.fn() },
    }
    const portal = {
      removeAttribute: jest.fn(),
      style: { removeProperty: jest.fn() },
      querySelectorAll: jest.fn(() => [listbox]),
    }
    const root = {
      querySelectorAll: jest.fn((selector: string) =>
        selector.includes('select-trigger') ? [trigger] : [portal],
      ),
    }

    closeOpenSelectPortals(root as unknown as ParentNode)

    expect(trigger.click).toHaveBeenCalledTimes(1)
    expect(portal.removeAttribute).toHaveBeenCalledWith(
      'data-base-ui-portal-closed',
    )
    expect(portal.style.removeProperty).toHaveBeenCalledWith('pointer-events')
    expect(portal.style.removeProperty).toHaveBeenCalledWith('display')
    expect(listbox.removeAttribute).toHaveBeenCalledWith('aria-hidden')
    expect(listbox.style.removeProperty).toHaveBeenCalledWith('pointer-events')
    expect(listbox.style.removeProperty).toHaveBeenCalledWith('display')
  })

  it('clears numeric inputs without leaving NaN stuck in the field', () => {
    expect(sanitizeNumberInput('')).toBeUndefined()
    expect(sanitizeNumberInput('250')).toBe(250)
    expect(sanitizeNumberInput('0')).toBe(0)
    expect(sanitizeNumberInput('abc')).toBeUndefined()
  })

  it('does not apply a global 200 cap to generic whole-number inputs', () => {
    expect(clampWholeNumberInput('250', 1)).toBe(250)

    let changedValue: string | number | undefined
    handleWholeNumberChange('250', (value) => {
      changedValue = value
    })

    expect(changedValue).toBe(250)
  })

  it('rejects values above a field-specific maximum while typing', () => {
    expect(clampWholeNumberInput('201', 1, 200)).toBeUndefined()

    let changedValue: string | number | undefined
    handleWholeNumberChange('201', (value) => {
      changedValue = value
    }, 1, 200)

    expect(changedValue).toBeUndefined()
  })

  it('uses user-facing labels rather than raw enum values in summary output', () => {
    const sections = getSummarySections({
      project: {
        name: 'Acme Logistics',
        numberOfSites: 'two_or_more',
        siteRelationship: 'same_city',
        totalUsers: 80,
      },
      existingNetwork: {
        equipmentStatus: 'not_sure',
        existingCabling: 'cat5e_or_cat6',
      },
      businessContext: {
        monthlyITBudget: '15000_40000',
        ITSupport: 'in_house',
        electricityReliability: 'frequent_outages',
        expectedGrowth: true,
        growth: {
          headcountGrowth: '11_30',
          newSites: 'one',
        },
      },
    })

    const summaryText = sections
      .flatMap((section) => section.items.map((item) => item.value))
      .join(' ')

    expect(formatSelectLabel('not_sure')).toBe('Not sure')
    expect(formatSelectLabel('cat5e_or_cat6')).toBe('Cat5e / Cat6')
    expect(summaryText).toContain('Same city')
    expect(summaryText).toContain('Yes')
    expect(summaryText).toContain('In-house IT')
    expect(summaryText).toContain('Not sure')
    expect(summaryText).toContain('Cat5e / Cat6')
    expect(summaryText).not.toContain('not_sure')
    expect(summaryText).not.toContain('cat5e_or_cat6')
  })

  it('blocks empty device counts and descriptions with clear required messages', () => {
    const result = questionnaireSchema.safeParse({
      project: {
        name: 'Example Business',
        numberOfSites: 1,
        siteRelationship: 'same_city',
        totalUsers: 15,
      },
      physicalSpace: {
        numberOfFloors: 2,
        floorAreaPerFloor: 1500,
        roomsPerFloor: 5,
        largeGroupRooms: {
          hasLargeGroupRooms: false,
          rooms: undefined,
        },
      },
      existingNetwork: {
        equipmentStatus: 'yes',
        equipment: {
          routerModem: true,
          switches: { quantity: '1' },
          wifiAccessPoints: { quantity: '1' },
          cablingAlreadyRun: true,
        },
      },
      internet: {
        currentSpeedMbps: 250,
        connectionType: 'fiber',
        downtimeImpact: 'same_day_matters',
      },
      devices: {
        wiredComputers: '',
        wifiDevices: '',
        voip: {
          enabled: true,
          phoneCount: '',
        },
        ipCameras: {
          enabled: true,
          cameraCount: '',
        },
        otherNetworkDevices: {
          enabled: true,
          description: '',
        },
      },
      preferences: {
        guestWifi: true,
        sensitiveData: 'yes',
        applications: {
          videoConferencing: true,
          voipCalls: false,
          posPayment: false,
          cloudStorage: false,
          businessSoftware: false,
          videoStreaming: false,
          securityCameraViewing: false,
          basicBrowsingEmail: false,
          other: '',
        },
        equipmentLocation: 'wall_cabinet',
        managementPreference: 'dashboard',
      },
      businessContext: {
        monthlyITBudget: '15000_40000',
        ITSupport: 'in_house',
        electricityReliability: 'stable',
        expectedGrowth: false,
      },
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Wired computer count is required.',
        'Wireless device count is required.',
        'Voice over internet protocol phone count is required.',
        'Internet protocol camera count is required.',
        'Other network-connected device description is required.',
      ])
    )
  })

  it('requires an entry when other network usage is checked', () => {
    const result = questionnaireSchema.safeParse({
      project: {
        name: 'Example Business',
        numberOfSites: 1,
        siteRelationship: 'same_city',
        totalUsers: 15,
      },
      physicalSpace: {
        numberOfFloors: 2,
        floorAreaPerFloor: 1500,
        roomsPerFloor: 5,
        largeGroupRooms: { hasLargeGroupRooms: false, rooms: undefined },
      },
      existingNetwork: {
        equipmentStatus: 'yes',
        equipment: {
          routerModem: true,
          switches: { quantity: '1' },
          wifiAccessPoints: { quantity: '1' },
          cablingAlreadyRun: true,
        },
      },
      internet: {
        currentSpeedMbps: 250,
        connectionType: 'fiber',
        downtimeImpact: 'same_day_matters',
      },
      devices: {
        wiredComputers: 5,
        wifiDevices: 10,
        voip: { enabled: false, phoneCount: undefined },
        ipCameras: { enabled: false, cameraCount: undefined },
        otherNetworkDevices: { enabled: false, description: undefined },
      },
      preferences: {
        guestWifi: true,
        sensitiveData: 'yes',
        applications: {
          videoConferencing: true,
          voipCalls: false,
          posPayment: false,
          cloudStorage: false,
          businessSoftware: false,
          videoStreaming: false,
          securityCameraViewing: false,
          basicBrowsingEmail: false,
          otherEnabled: true,
          other: '',
        },
        equipmentLocation: 'wall_cabinet',
        managementPreference: 'dashboard',
      },
      businessContext: {
        monthlyITBudget: '15000_40000',
        ITSupport: 'in_house',
        electricityReliability: 'stable',
        expectedGrowth: false,
      },
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining(['Other network usage is required.'])
    )
  })

  it('builds a readable summary of answered questionnaire fields', () => {
    const sections = getSummarySections({
      project: {
        name: 'Acme Logistics',
        numberOfSites: 2,
        siteRelationship: 'same_city',
        totalUsers: 80,
      },
      businessContext: {
        monthlyITBudget: '15000_40000',
        ITSupport: 'in_house',
        electricityReliability: 'stable',
        expectedGrowth: true,
        growth: {
          headcountGrowth: '11_30',
          newSites: 'one',
        },
      },
    })

    expect(sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Project basics',
          items: expect.arrayContaining([
            expect.objectContaining({ label: 'Project or company name', value: 'Acme Logistics' }),
            expect.objectContaining({ label: 'Number of business locations', value: '2' }),
          ]),
        }),
        expect.objectContaining({
          title: 'Budget & business context',
          items: expect.arrayContaining([
            expect.objectContaining({ label: 'Monthly IT budget', value: '₱15,000–₱40,000' }),
            expect.objectContaining({ label: 'IT support', value: 'In-house IT' }),
            expect.objectContaining({ label: 'Expected business growth', value: 'Yes' }),
          ]),
        }),
      ])
    )
  })

  it('skips hidden or incomplete large-group room entries from the summary', () => {
    const sections = getSummarySections({
      physicalSpace: {
        largeGroupRooms: {
          hasLargeGroupRooms: false,
          rooms: [{ floor: undefined, capacity: undefined }],
        },
      },
    }, 'physicalSpace')

    expect(sections).toHaveLength(1)
    expect(sections[0].items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Large group room count' }),
      ])
    )
  })

  it('omits hidden device counts and descriptions from the summary when their parent settings are off', () => {
    const sections = getSummarySections({
      devices: {
        voip: { enabled: false, phoneCount: 12 },
        ipCameras: { enabled: false, cameraCount: 5 },
        otherNetworkDevices: { enabled: false, description: 'Unused device' },
      },
    }, 'devices')

    expect(sections).toHaveLength(1)
    expect(sections[0].items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Enabled', value: 'No' }),
      ])
    )
    expect(sections[0].items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'VoIP phone count' }),
        expect.objectContaining({ label: 'IP camera count' }),
        expect.objectContaining({ label: 'Other network usage' }),
      ])
    )
  })

  it('groups multi-select application choices into a badge list', () => {
    const sections = getSummarySections({
      preferences: {
        applications: {
          videoConferencing: true,
          voipCalls: true,
          posPayment: false,
          otherEnabled: true,
          other: 'Inventory system',
        },
      },
    })

    expect(sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Network setup preferences',
          items: expect.arrayContaining([
            expect.objectContaining({
              label: 'Main network usage',
              value: ['Video conferencing', 'VoIP calls'],
            }),
            expect.objectContaining({
              label: 'Other network usage',
              value: 'Inventory system',
            }),
          ]),
        }),
      ])
    )
  })

  it('adds units to summary values where the questionnaire calls for them', () => {
    const sections = getSummarySections({
      project: {
        totalUsers: 42,
      },
      internet: {
        currentSpeedMbps: 250,
      },
      devices: {
        voip: {
          phoneCount: 12,
        },
        ipCameras: {
          cameraCount: 5,
        },
      },
    })

    expect(sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Project basics',
          items: expect.arrayContaining([
            expect.objectContaining({ label: 'Total number of users', value: '42 people' }),
          ]),
        }),
        expect.objectContaining({
          title: 'Internet connection',
          items: expect.arrayContaining([
            expect.objectContaining({ label: 'Current internet speed', value: '250 Mbps' }),
          ]),
        }),
        expect.objectContaining({
          title: 'Devices',
          items: expect.arrayContaining([
            expect.objectContaining({ label: 'VoIP phone count', value: '12 phones' }),
            expect.objectContaining({ label: 'IP camera count', value: '5 cameras' }),
          ]),
        }),
      ])
    )
  })

  it('shows only the current section in the side summary and keeps the full history for the overall summary', () => {
    const values = {
      project: {
        name: 'Acme Logistics',
        numberOfSites: 'two_or_more',
        totalUsers: 50,
      },
      physicalSpace: {
        numberOfFloors: 2,
        floorAreaPerFloor: 150,
        roomsPerFloor: 8,
        largeGroupRooms: { hasLargeGroupRooms: true, rooms: [{ floor: 1, capacity: 25 }] },
      },
      internet: {
        currentSpeedMbps: 300,
        connectionType: 'fiber',
        downtimeImpact: 'every_minute_matters',
      },
      preferences: {
        applications: {
          videoConferencing: true,
          cloudStorage: true,
          basicBrowsingEmail: false,
          otherEnabled: false,
          other: '',
        },
      },
    }

    const sectionSummary = getSummarySections(values, 'project')
    expect(sectionSummary).toEqual([
      expect.objectContaining({
        title: 'Project basics',
        items: expect.arrayContaining([
          expect.objectContaining({ label: 'Project or company name', value: 'Acme Logistics' }),
          expect.objectContaining({ label: 'Number of business locations', value: 'Two or more sites' }),
          expect.objectContaining({ label: 'Total number of users', value: '50 people' }),
        ]),
      }),
    ])
    expect(sectionSummary).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Physical space' }),
      ])
    )

    const overallSummary = getSummarySections(values)
    expect(overallSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Project basics' }),
        expect.objectContaining({ title: 'Physical space' }),
        expect.objectContaining({ title: 'Internet connection' }),
        expect.objectContaining({ title: 'Network setup preferences' }),
      ])
    )
  })

  it('hides dependent existing-network details and skips validation when the answer is no or not sure', () => {
    const noResult = questionnaireSchema.safeParse({
      project: {
        name: 'Example Business',
        numberOfSites: 1,
        siteRelationship: 'same_city',
        totalUsers: 15,
      },
      physicalSpace: {
        numberOfFloors: 2,
        floorAreaPerFloor: 1500,
        roomsPerFloor: 5,
        largeGroupRooms: {
          hasLargeGroupRooms: false,
          rooms: undefined,
        },
      },
      existingNetwork: {
        equipmentStatus: 'none',
        equipment: undefined,
        existingCabling: undefined,
      },
      internet: {
        currentSpeedMbps: 250,
        connectionType: 'fiber',
        downtimeImpact: 'same_day_matters',
      },
      devices: {
        wiredComputers: 5,
        wifiDevices: 10,
        voip: { enabled: false, phoneCount: undefined },
        ipCameras: { enabled: false, cameraCount: undefined },
        otherNetworkDevices: { enabled: false, description: undefined },
      },
      preferences: {
        guestWifi: true,
        sensitiveData: 'yes',
        applications: {
          videoConferencing: true,
          voipCalls: false,
          posPayment: false,
          cloudStorage: false,
          businessSoftware: false,
          videoStreaming: false,
          securityCameraViewing: false,
          basicBrowsingEmail: false,
          otherEnabled: false,
          other: '',
        },
        equipmentLocation: 'wall_cabinet',
        managementPreference: 'dashboard',
      },
      businessContext: {
        monthlyITBudget: '15000_40000',
        ITSupport: 'in_house',
        electricityReliability: 'stable',
        expectedGrowth: false,
      },
    })

    expect(noResult.success).toBe(true)

    const unsureResult = questionnaireSchema.safeParse({
      project: {
        name: 'Example Business',
        numberOfSites: 1,
        siteRelationship: 'same_city',
        totalUsers: 15,
      },
      physicalSpace: {
        numberOfFloors: 2,
        floorAreaPerFloor: 1500,
        roomsPerFloor: 5,
        largeGroupRooms: {
          hasLargeGroupRooms: false,
          rooms: undefined,
        },
      },
      existingNetwork: {
        equipmentStatus: 'not_sure',
        equipment: undefined,
        existingCabling: undefined,
      },
      internet: {
        currentSpeedMbps: 250,
        connectionType: 'fiber',
        downtimeImpact: 'same_day_matters',
      },
      devices: {
        wiredComputers: 5,
        wifiDevices: 10,
        voip: { enabled: false, phoneCount: undefined },
        ipCameras: { enabled: false, cameraCount: undefined },
        otherNetworkDevices: { enabled: false, description: undefined },
      },
      preferences: {
        guestWifi: true,
        sensitiveData: 'yes',
        applications: {
          videoConferencing: true,
          voipCalls: false,
          posPayment: false,
          cloudStorage: false,
          businessSoftware: false,
          videoStreaming: false,
          securityCameraViewing: false,
          basicBrowsingEmail: false,
          otherEnabled: false,
          other: '',
        },
        equipmentLocation: 'wall_cabinet',
        managementPreference: 'dashboard',
      },
      businessContext: {
        monthlyITBudget: '15000_40000',
        ITSupport: 'in_house',
        electricityReliability: 'stable',
        expectedGrowth: false,
      },
    })

    expect(unsureResult.success).toBe(true)
  })

  it('allows multiple locations and rough estimates when the user is unsure', () => {
    const result = questionnaireSchema.safeParse({
      project: {
        name: 'Example Business',
        numberOfSites: 1,
        siteRelationship: undefined,
        totalUsers: 15,
      },
      physicalSpace: {
        numberOfFloors: 2,
        floorAreaPerFloor: undefined,
        roomsPerFloor: 5,
        largeGroupRooms: {
          hasLargeGroupRooms: false,
          rooms: undefined,
        },
      },
      existingNetwork: {
        equipmentStatus: 'yes',
        equipment: {
          routerModem: true,
          switches: { quantity: '1' },
          wifiAccessPoints: { quantity: '1' },
          cablingAlreadyRun: true,
          otherOrUnknown: false,
        },
        existingCabling: 'cat5e_or_cat6',
      },
      internet: {
        currentSpeedMbps: undefined,
        connectionType: 'fiber',
        downtimeImpact: 'same_day_matters',
      },
      devices: {
        wiredComputers: 5,
        wifiDevices: 10,
        voip: { enabled: false, phoneCount: undefined },
        ipCameras: { enabled: false, cameraCount: undefined },
        otherNetworkDevices: { enabled: false, description: undefined },
      },
      preferences: {
        guestWifi: true,
        sensitiveData: 'yes',
        applications: {
          videoConferencing: true,
          voipCalls: false,
          posPayment: false,
          cloudStorage: false,
          businessSoftware: false,
          videoStreaming: false,
          securityCameraViewing: false,
          basicBrowsingEmail: false,
          otherEnabled: false,
          other: '',
        },
        equipmentLocation: 'wall_cabinet',
        managementPreference: 'dashboard',
      },
      businessContext: {
        monthlyITBudget: '15000_40000',
        ITSupport: 'in_house',
        electricityReliability: 'stable',
        expectedGrowth: false,
      },
    })

    expect(result.success).toBe(true)
  })

  it('caps the total user count at 200 as required by the draft', () => {
    const validCases = [1, 50, 200]
    const invalidCases = [0, -1, 201, 20000000, 50.5]

    validCases.forEach((value) => {
      const result = questionnaireSchema.safeParse({
        project: {
          name: 'Example Business',
          numberOfSites: 1,
          siteRelationship: 'same_city',
          totalUsers: value,
        },
        physicalSpace: {
          numberOfFloors: 2,
          floorAreaPerFloor: 1500,
          roomsPerFloor: 5,
          largeGroupRooms: { hasLargeGroupRooms: false, rooms: undefined },
        },
        existingNetwork: {
          equipmentStatus: 'yes',
          equipment: {
            routerModem: true,
            switches: { quantity: '1' },
            wifiAccessPoints: { quantity: '1' },
            cablingAlreadyRun: true,
            otherOrUnknown: false,
          },
          existingCabling: 'cat5e_or_cat6',
        },
        internet: {
          currentSpeedMbps: 250,
          connectionType: 'fiber',
          downtimeImpact: 'same_day_matters',
        },
        devices: {
          wiredComputers: 5,
          wifiDevices: 10,
          voip: { enabled: false, phoneCount: undefined },
          ipCameras: { enabled: false, cameraCount: undefined },
          otherNetworkDevices: { enabled: false, description: undefined },
        },
        preferences: {
          guestWifi: true,
          sensitiveData: 'yes',
          applications: {
            videoConferencing: true,
            voipCalls: false,
            posPayment: false,
            cloudStorage: false,
            businessSoftware: false,
            videoStreaming: false,
            securityCameraViewing: false,
            basicBrowsingEmail: false,
            otherEnabled: false,
            other: '',
          },
          equipmentLocation: 'wall_cabinet',
          managementPreference: 'dashboard',
        },
        businessContext: {
          monthlyITBudget: '15000_40000',
          ITSupport: 'in_house',
          electricityReliability: 'stable',
          expectedGrowth: false,
        },
      })

      expect(result.success).toBe(true)
    })

    invalidCases.forEach((value) => {
      const result = questionnaireSchema.safeParse({
        project: {
          name: 'Example Business',
          numberOfSites: 1,
          siteRelationship: 'same_city',
          totalUsers: value,
        },
        physicalSpace: {
          numberOfFloors: 2,
          floorAreaPerFloor: 1500,
          roomsPerFloor: 5,
          largeGroupRooms: { hasLargeGroupRooms: false, rooms: undefined },
        },
        existingNetwork: {
          equipmentStatus: 'yes',
          equipment: {
            routerModem: true,
            switches: { quantity: '1' },
            wifiAccessPoints: { quantity: '1' },
            cablingAlreadyRun: true,
            otherOrUnknown: false,
          },
          existingCabling: 'cat5e_or_cat6',
        },
        internet: {
          currentSpeedMbps: 250,
          connectionType: 'fiber',
          downtimeImpact: 'same_day_matters',
        },
        devices: {
          wiredComputers: 5,
          wifiDevices: 10,
          voip: { enabled: false, phoneCount: undefined },
          ipCameras: { enabled: false, cameraCount: undefined },
          otherNetworkDevices: { enabled: false, description: undefined },
        },
        preferences: {
          guestWifi: true,
          sensitiveData: 'yes',
          applications: {
            videoConferencing: true,
            voipCalls: false,
            posPayment: false,
            cloudStorage: false,
            businessSoftware: false,
            videoStreaming: false,
            securityCameraViewing: false,
            basicBrowsingEmail: false,
            otherEnabled: false,
            other: '',
          },
          equipmentLocation: 'wall_cabinet',
          managementPreference: 'dashboard',
        },
        businessContext: {
          monthlyITBudget: '15000_40000',
          ITSupport: 'in_house',
          electricityReliability: 'stable',
          expectedGrowth: false,
        },
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues.some((issue) => issue.path.join('.') === 'project.totalUsers')).toBe(true)
    })

    const summary = getSummarySections({
      project: {
        totalUsers: 201,
      },
    })

    expect(summary).toEqual([])
  })

  it('caps rough device and speed estimates to realistic SME ranges', () => {
    const result = questionnaireSchema.safeParse({
      project: {
        name: 'Example Business',
        numberOfSites: 1,
        siteRelationship: 'same_city',
        totalUsers: 50,
      },
      physicalSpace: {
        numberOfFloors: 3,
        floorAreaPerFloor: 3500,
        roomsPerFloor: 18,
        largeGroupRooms: { hasLargeGroupRooms: false, rooms: undefined },
      },
      existingNetwork: {
        equipmentStatus: 'yes',
        equipment: {
          routerModem: true,
          switches: { quantity: '1' },
          wifiAccessPoints: { quantity: '1' },
          cablingAlreadyRun: true,
          otherOrUnknown: false,
        },
        existingCabling: 'cat5e_or_cat6',
      },
      internet: {
        currentSpeedMbps: 25000,
        connectionType: 'fiber',
        downtimeImpact: 'same_day_matters',
      },
      devices: {
        wiredComputers: 1501,
        wifiDevices: 2501,
        voip: { enabled: true, phoneCount: 501 },
        ipCameras: { enabled: true, cameraCount: 501 },
        otherNetworkDevices: { enabled: false, description: undefined },
      },
      preferences: {
        guestWifi: true,
        sensitiveData: 'yes',
        applications: {
          videoConferencing: true,
          voipCalls: false,
          posPayment: false,
          cloudStorage: false,
          businessSoftware: false,
          videoStreaming: false,
          securityCameraViewing: false,
          basicBrowsingEmail: false,
          otherEnabled: false,
          other: '',
        },
        equipmentLocation: 'wall_cabinet',
        managementPreference: 'dashboard',
      },
      businessContext: {
        monthlyITBudget: '15000_40000',
        ITSupport: 'in_house',
        electricityReliability: 'stable',
        expectedGrowth: false,
      },
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.some((issue) => issue.path.join('.') === 'devices.wiredComputers')).toBe(true)
    expect(result.error?.issues.some((issue) => issue.path.join('.') === 'devices.wifiDevices')).toBe(true)
    expect(result.error?.issues.some((issue) => issue.path.join('.') === 'devices.voip.phoneCount')).toBe(true)
    expect(result.error?.issues.some((issue) => issue.path.join('.') === 'devices.ipCameras.cameraCount')).toBe(true)
    expect(result.error?.issues.some((issue) => issue.path.join('.') === 'internet.currentSpeedMbps')).toBe(true)
  })

  it('shows clear required-field messages for core questionnaire questions', () => {
    const result = questionnaireSchema.safeParse({
      project: {
        name: '',
        numberOfSites: undefined,
        siteRelationship: undefined,
        totalUsers: undefined,
      },
      physicalSpace: {
        numberOfFloors: undefined,
        floorAreaPerFloor: undefined,
        roomsPerFloor: undefined,
        largeGroupRooms: {
          hasLargeGroupRooms: undefined,
          rooms: undefined,
        },
      },
      existingNetwork: {
        equipmentStatus: undefined,
        equipment: undefined,
        existingCabling: undefined,
      },
      internet: {
        currentSpeedMbps: undefined,
        connectionType: undefined,
        downtimeImpact: undefined,
      },
      devices: {
        wiredComputers: undefined,
        wifiDevices: undefined,
        voip: {
          enabled: undefined,
          phoneCount: undefined,
        },
        ipCameras: {
          enabled: undefined,
          cameraCount: undefined,
        },
        otherNetworkDevices: {
          enabled: undefined,
          description: undefined,
        },
      },
      preferences: {
        guestWifi: undefined,
        sensitiveData: undefined,
        applications: {},
        equipmentLocation: undefined,
        managementPreference: undefined,
      },
      businessContext: {
        monthlyITBudget: undefined,
        ITSupport: undefined,
        electricityReliability: undefined,
        expectedGrowth: undefined,
      },
    })

    expect(result.success).toBe(false)

    const messages = result.error?.issues.map((issue) => issue.message) ?? []

    expect(messages).toEqual(
      expect.arrayContaining([
        'Project or company name is required.',
        'Number of business locations is required.',
        'Total number of users is required.',
        'Number of floors is required.',
        'Number of rooms/work areas per floor is required.',
        'Existing network equipment status is required.',
        'Internet connection type is required.',
        'Internet downtime impact is required.',
        'Wired computer count is required.',
        'Wireless device count is required.',
        'Voice over internet protocol phone usage is required.',
        'Internet protocol camera usage is required.',
        'Other network-connected devices usage is required.',
        'Guest Wi-Fi preference is required.',
        'Sensitive data handling preference is required.',
        'Equipment location is required.',
        'Management preference is required.',
        'Monthly IT budget is required.',
        'IT support model is required.',
        'Electricity reliability is required.',
        'Expected business growth is required.',
      ])
    )
  })
})
