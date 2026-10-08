import type { NetworkConfiguration } from '../../../backend/src/types/network-config'
import type { QuestionnaireData } from '../schemas/questionnaireSchema'

export function mapFormToNetworkConfiguration(
  data: QuestionnaireData,
): NetworkConfiguration {
  const numberOfSites =
    data.project.numberOfSites === 'two_or_more' ? 2 : 1

  return {
    project: {
      name: data.project.name,
      numberOfSites,
      totalUsers: data.project.totalUsers,
    },

    physicalSpace: {
      numberOfFloors: data.physicalSpace.numberOfFloors,
      floorAreaPerFloor: data.physicalSpace.floorAreaPerFloor,
      roomsPerFloor: data.physicalSpace.roomsPerFloor,
      largeGroupRooms: data.physicalSpace.largeGroupRooms,
    },

    existingNetwork: {
      equipmentStatus: data.existingNetwork.equipmentStatus as
        | 'none'
        | 'yes'
        | 'not_sure',

      equipment: data.existingNetwork.equipment
        ? {
            routerModem: data.existingNetwork.equipment.routerModem,

            switches: data.existingNetwork.equipment.switches
              ?.quantity
              ? {
                  quantity:
                    data.existingNetwork.equipment.switches.quantity as
                      | '1'
                      | '2-3'
                      | 'more_than_3'
                      | 'not_sure',
                }
              : undefined,

            wifiAccessPoints:
              data.existingNetwork.equipment.wifiAccessPoints?.quantity
                ? {
                    quantity:
                      data.existingNetwork.equipment.wifiAccessPoints
                        .quantity as
                        | '1'
                        | '2-3'
                        | 'more_than_3'
                        | 'not_sure',
                  }
                : undefined,

            cablingAlreadyRun:
              data.existingNetwork.equipment.cablingAlreadyRun ?? false,

            otherOrUnknown:
              data.existingNetwork.equipment.otherOrUnknown ?? false,
          }
        : undefined,

      existingCabling: data.existingNetwork.existingCabling as
        | 'none_or_not_sure'
        | 'cat5e_or_cat6'
        | 'fiber',
    },

    internet: {
      currentSpeedMbps: data.internet.currentSpeedMbps,

      connectionType: data.internet.connectionType as
        | 'fiber'
        | 'dsl_or_cellular'
        | 'not_checked',

      downtimeImpact: data.internet.downtimeImpact as
        | 'can_wait'
        | 'same_day_matters'
        | 'every_minute_matters',
    },

    devices: {
      wiredComputers: data.devices.wiredComputers,
      wifiDevices: data.devices.wifiDevices,
      voip: data.devices.voip,
      ipCameras: data.devices.ipCameras,
      otherNetworkDevices: data.devices.otherNetworkDevices,
    },

    preferences: {
      guestWifi: data.preferences.guestWifi,

      sensitiveData: data.preferences.sensitiveData as
        | 'no'
        | 'yes'
        | 'not_sure',

      applications: {
        videoConferencing: data.preferences.applications.videoConferencing,
        voipCalls: data.preferences.applications.voipCalls,
        posPayment: data.preferences.applications.posPayment,
        cloudStorage: data.preferences.applications.cloudStorage,
        businessSoftware: data.preferences.applications.businessSoftware,
        videoStreaming: data.preferences.applications.videoStreaming,
        securityCameraViewing:
          data.preferences.applications.securityCameraViewing,
        basicBrowsingEmail:
          data.preferences.applications.basicBrowsingEmail,
        other: data.preferences.applications.other,
      },

      equipmentLocation: data.preferences.equipmentLocation as
        | 'full_size_rack'
        | 'wall_cabinet'
        | 'not_sure',

      managementPreference: data.preferences.managementPreference as
        | 'dashboard'
        | 'command_line'
        | 'not_sure',
    },

    businessContext: {
      monthlyITBudget: data.businessContext.monthlyITBudget as
        | 'under_15000'
        | '15000_40000'
        | 'over_40000',

      ITSupport: data.businessContext.ITSupport as
        | 'none'
        | 'external'
        | 'in_house',

      electricityReliability:
        data.businessContext.electricityReliability as
          | 'stable'
          | 'frequent_outages',

      expectedGrowth: data.businessContext.expectedGrowth,

      growth: data.businessContext.growth
        ? {
            headcountGrowth:
              data.businessContext.growth.headcountGrowth as
                | '0_10'
                | '11_30'
                | '31_plus',

            newSites:
              data.businessContext.growth.newSites as
                | 'none'
                | 'one'
                | 'two_or_more',
          }
        : undefined,
    },
  }
}