import { getSummarySections } from '../frontend/src/lib/summary'
import { sanitizeNumberInput } from '../frontend/src/lib/numberInput'
import { questionnaireSchema } from '../frontend/src/schemas/questionnaireSchema'

describe('questionnaire validation messages', () => {
  it('clears numeric inputs without leaving NaN stuck in the field', () => {
    expect(sanitizeNumberInput('')).toBeUndefined()
    expect(sanitizeNumberInput('250')).toBe(250)
    expect(sanitizeNumberInput('0')).toBe(0)
    expect(sanitizeNumberInput('abc')).toBeUndefined()
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
        'Business location relationship is required.',
        'Total number of users is required.',
        'Number of floors is required.',
        'Approximate floor area per floor is required.',
        'Number of rooms/work areas per floor is required.',
        'Existing network equipment status is required.',
        'Current internet speed is required.',
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
