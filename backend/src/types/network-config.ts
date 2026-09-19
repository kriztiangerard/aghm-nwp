export interface NetworkConfiguration {
  // Section A — Project Basics
  project: {
    name: string;
    numberOfSites: number;

    siteRelationship?:
      | "same_city"
      | "same_country"
      | "different_countries";

    totalUsers: number;
  };

  // Section B — Physical Space
  physicalSpace: {
    numberOfFloors: number;
    floorAreaPerFloor?: number;
    roomsPerFloor: number;

    largeGroupRooms: {
      hasLargeGroupRooms: boolean;

      rooms?: {
        floor: number;
        capacity: number;
      }[];
    };
  };

  // Section C — Existing Network
  existingNetwork: {
    equipmentStatus: "none" | "yes" | "not_sure";

    equipment?: {
      routerModem: boolean;

      switches?: {
        quantity: "1" | "2-3" | "more_than_3" | "not_sure";
      };

      wifiAccessPoints?: {
        quantity: "1" | "2-3" | "more_than_3" | "not_sure";
      };

      cablingAlreadyRun: boolean;
      otherOrUnknown: boolean;
    };

    existingCabling:
      | "none_or_not_sure"
      | "cat5e_or_cat6"
      | "fiber";
  };

  // Section D — Internet Connection
  internet: {
    currentSpeedMbps?: number;

    connectionType:
      | "fiber"
      | "dsl_or_cellular"
      | "not_checked";

    downtimeImpact:
      | "can_wait"
      | "same_day_matters"
      | "every_minute_matters";
  };

  // Section E — Devices
  devices: {
    wiredComputers: number;
    wifiDevices: number;

    voip: {
      enabled: boolean;
      phoneCount?: number;
    };

    ipCameras: {
      enabled: boolean;
      cameraCount?: number;
    };

    otherNetworkDevices: {
      enabled: boolean;
      description?: string;
    };
  };

  // Section F — Network Setup Preferences
  preferences: {
    guestWifi: boolean;

    sensitiveData:
      | "no"
      | "yes"
      | "not_sure";

    applications: {
      videoConferencing: boolean;
      voipCalls: boolean;
      posPayment: boolean;
      cloudStorage: boolean;
      businessSoftware: boolean;
      videoStreaming: boolean;
      securityCameraViewing: boolean;
      basicBrowsingEmail: boolean;
      other?: string;
    };

    equipmentLocation:
      | "full_size_rack"
      | "wall_cabinet"
      | "not_sure";

    managementPreference:
      | "dashboard"
      | "command_line"
      | "not_sure";
  };

  // Section G — Budget & Business Context
  businessContext: {
    monthlyITBudget:
      | "under_15000"
      | "15000_40000"
      | "over_40000";

    ITSupport:
      | "none"
      | "external"
      | "in_house";

    electricityReliability:
      | "stable"
      | "frequent_outages";

    expectedGrowth: boolean;

    growth?: {
      headcountGrowth:
        | "0_10"
        | "11_30"
        | "31_plus";

      newSites:
        | "none"
        | "one"
        | "two_or_more";
    };
  };
}


