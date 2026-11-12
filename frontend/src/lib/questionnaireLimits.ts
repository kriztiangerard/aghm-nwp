export const QUESTIONNAIRE_LIMITS = {
  project: {
    name: { max: 100 },
    totalUsers: { min: 1, max: 200 },
  },
  physicalSpace: {
    numberOfFloors: { min: 1, max: 20 },
    floorAreaPerFloor: { min: 1, max: 5000 },
    roomsPerFloor: { min: 1, max: 100 },
    largeGroupRooms: {
      floor: { min: 1 },
      capacity: { min: 1, max: 2000 },
    },
  },
  internet: {
    currentSpeedMbps: { min: 1, max: 10000 },
  },
  devices: {
    wiredComputers: { min: 0, max: 1500 },
    wifiDevices: { min: 0, max: 2500 },
    voipPhoneCount: { min: 0, max: 500 },
    ipCameraCount: { min: 0, max: 500 },
  },
  text: {
    projectName: { max: 100 },
    otherDescription: { max: 200 },
  },
} as const
