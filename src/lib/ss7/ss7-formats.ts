/**
 * SS7 Data Format Definitions
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * Comprehensive data structures for SS7 protocol handling:
 * - ITU-T Q.700 series message types
 * - Global Title formats (E.164, E.214, E.212)
 * - Point Code formats (ANSI, ITU-T, China Telecom)
 * - Subsystem Number (SSN) mappings
 * - Error codes and cause values
 * 
 * @version 1.0.0
 * @license Proprietary - Djezzy SOC
 */

// ============================================================
// POINT CODE DEFINITIONS
// ============================================================

export enum PointCodeFormat {
  ANSI_24BIT = 'ANSI-24bit',      // 8-8-8 format (North America)
  ITU_14BIT = 'ITU-14bit',        // 3-8-3 format (International/Algeria)
  JAPAN_16BIT = 'Japan-16bit',    // 4-4-8 format
  CHINA_24BIT = 'China-24bit',    // 8-8-8 format (China Telecom)
  NATIONAL = 'National'           // Operator-specific
}

export interface PointCode {
  raw: number;
  format: PointCodeFormat;
  network: number;   // Network identifier
  cluster: number;   // Cluster within network
  member: number;    // Member within cluster
  display: string;   // Human-readable representation
}

// Djezzy Point Code Ranges (ITU-T 14-bit: 0-16383)
export const DJEZZY_POINT_CODES = {
  // STP Primary/Secondary
  STP_PRIMARY: { value: 1, name: 'STP-Algiers-Primary', type: 'stp' },
  STP_SECONDARY: { value: 2, name: 'STP-Oran-Secondary', type: 'stp' },
  
  // HLR Pool (3-100)
  HLR_POOL_START: 3,
  HLR_POOL_END: 100,
  
  // MSC Pool (101-200)
  MSC_POOL_START: 101,
  MSC_POOL_END: 200,
  
  // VLR Pool (201-250)
  VLR_POOL_START: 201,
  VLR_POOL_END: 250,
  
  // SGSN Pool (251-270)
  SGSN_POOL_START: 251,
  SGSN_POOL_END: 270,
  
  // GMSC/Gateway (271-280)
  GMSC_POOL_START: 271,
  GMSC_POOL_END: 280,
  
  // SCP/CAMEL (281-290)
  SCP_POOL_START: 281,
  SCP_POOL_END: 290,
  
  // SMSC (291-300)
  SMSC_POOL_START: 291,
  SMSC_POOL_END: 300,
} as const;

// Algerian Network Operators Point Codes
export const ALGERIAN_OPERATOR_PCS = {
  DJEZZY: [3, 100],
  MOBILIS: [500, 600],
  OOREDOO: [700, 800],
  ALGERIE_TELECOM: [900, 1000],
  ALGOSPACE: [1100, 1200],
} as const;

// ============================================================
// GLOBAL TITLE FORMATS
// ============================================================

export enum GlobalTitleType {
  E164 = 'E.164',       // International phone number (ISDN)
  E212 = 'E.212',       // Mobile subscriber identity (IMSI)
  E214 = 'E.214',       // Mobile station roaming number (MSRN) - E.212 in E.214 format
  DATA = 'Data',        // Data numbering plan
  TELEX = 'Telex',     // Telex number
  MARITIME = 'Maritime', // Maritime identification
  PRIVATE = 'Private',  // Private network
  NATIONAL = 'National' // National standard
}

export interface GlobalTitle {
  type: GlobalTitleType;
  translationType: number;
  numberingPlan: number;
  encodingScheme: number;
  natureOfAddressIndicator: number;
  digits: string;
  masked?: string;      // Masked version for display (GDPR/privacy)
}

// Algeria Country Code and Numbering Plan
export const ALGERIA_NUMBERING = {
  CC: '213',
  COUNTRY_CODE: 213,
  MSISDN_LENGTH: 12,    // +213XXXXXXXXX
  IMSI_LENGTH: 15,      // 60301XXXXXXXXX
  MCC: '603',           // Algeria Mobile Country Code
  MNC_DJEZZY: '01',     // Djezzy Mobile Network Code
  
  // Wilaya (Province) Area Codes
  WILAYA_CODES: {
    21: 'Algiers',
    25: 'Oran',
    27: 'Constantine',
    28: 'Tizi Ouzou',
    29: 'Batna',
    31: 'Bejaia',
    32: 'Biskra',
    33: 'Blida',
    34: 'Bouira',
    35: 'Tamanrasset',
    36: 'Tebessa',
    37: 'Tlemcen',
    38: 'Tiaret',
    39: 'Tizi Ouzou',
    41: 'Alger',
    42: 'Djelfa',
    43: 'Jijel',
    44: 'Setif',
    45: 'Saida',
    46: 'Skikda',
    47: 'Sidi Bel Abbes',
    48: 'Annaba',
    49: 'Guelma',
    51: 'M\'sila',
    52: 'Mascara',
    53: 'Medea',
    54: 'Mostaganem',
    55: 'M\'Ghla',
    56: 'Naama',
    58: 'Ain Temouchent',
    59: 'Ain Defla',
    60: 'Ain Timouchent',
    61: 'Relizane',
    62: 'El Bayadh',
    63: 'El Tarf',
    64: 'Tindouf',
    65: 'Tissemsilt',
    66: 'El Oued',
    67: 'Khenchela',
    68: 'Souk Ahras',
    69: 'Tipaza',
    70: 'Mila',
    71: 'Ain Driss',
    72: 'Naama',
    73: 'Ain Guezzam',
    74: 'Ouargla',
    75: 'Touggourt',
    76: 'Djanet',
    77: 'In Salah',
    78: 'Illizi',
    79: ' Bordj Badji Mokhtar',
    80: 'Tamarasset',
    81: 'Ghardaia',
    82: 'El Meniaa',
    83: 'Timimoun',
    84: 'Bordj Baji Mokhtar',
    85: 'Adrar',
    86: 'Tamanrasset',
  } as Record<number, string>,
};

// ============================================================
// SUBSYSTEM NUMBERS (SSN)
// ============================================================

export enum SubsystemNumber {
  SCCP_MANAGEMENT = 1,
  ITU_TCAP = 6,
  ANSI_TCAP = 7,
  MAP_HLR = 8,          // Home Location Register
  MAP_VLR = 9,          // Visitor Location Register
  MAP_EIR = 10,         // Equipment Identity Register
  MAP_AUC = 11,         // Authentication Center
  MSC = 2,              // Mobile Switching Center
  EIR = 5,              // Equipment Identity Register
  SGSN = 147,           // Serving GPRS Support Node
  GGSN = 148,           // Gateway GPRS Support Node
  GMLC = 149,           // Gateway Mobile Location Center
  CAP = 146,            // CAMEL Application Part
  GSM_SCF = 145,        // GSM Service Control Function
  SMS_SC = 150,         // Short Message Service Center
  BSSAP = 142,          // BSS Application Part
  RANAP = 143,          // Radio Access Network Application Part
  PSP = 135,            // Positioning Service Application
  SSN_BSSMAP = 254,     // BSS Management Application Part
}

export const SSN_NAMES: Record<SubsystemNumber, string> = {
  [SubsystemNumber.SCCP_MANAGEMENT]: 'SCCP Management',
  [SubsystemNumber.ANSI_TCAP]: 'ANSI TCAP',
  [SubsystemNumber.ITU_TCAP]: 'ITU TCAP',
  [SubsystemNumber.MAP_HLR]: 'MAP-HLR',
  [SubsystemNumber.MAP_VLR]: 'MAP-VLR',
  [SubsystemNumber.MAP_EIR]: 'MAP-EIR',
  [SubsystemNumber.MAP_AUC]: 'MAP-AUC',
  [SubsystemNumber.MSC]: 'MSC',
  [SubsystemNumber.EIR]: 'EIR',
  [SubsystemNumber.SGSN]: 'SGSN',
  [SubsystemNumber.GGSN]: 'GGSN',
  [SubsystemNumber.GMLC]: 'GMLC',
  [SubsystemNumber.CAP]: 'CAP',
  [SubsystemNumber.GSM_SCF]: 'GSM SCF',
  [SubsystemNumber.SMS_SC]: 'SMS-SC',
  [SubsystemNumber.BSSAP]: 'BSSAP',
  [SubsystemNumber.RANAP]: 'RANAP',
  [SubsystemNumber.PSP]: 'PSP',
  [SubsystemNumber.SSN_BSSMAP]: 'BSSMAP',
};

// ============================================================
// SCCP MESSAGE TYPES
// ============================================================

export enum SCCPMessageType {
  CR = 0x01,  // Connection Request
  CC = 0x02,  // Connection Confirm
  CREF = 0x03, // Connection Refused
  RLSD = 0x04, // Released
  RLC = 0x05,  // Release Complete
  DT1 = 0x06,  // Data Form 1
  DT2 = 0x07,  // Data Form 2
  AK = 0x08,   // Data Acknowledgement
  UDT = 0x09,  // Unitdata
  UDTS = 0x0a, // Unitdata Service
  ED = 0x0b,   // Expedited Data
  EA = 0x0c,   // Expedited Data Acknowledgement
  RSR = 0x0d,  // Reset Request
  RSC = 0x0e,  // Reset Confirmation
  ERR = 0x0f,  // Protocol Error
  IT = 0x10,   // Inactivity Test
  XUDT = 0x11, // Extended Unitdata
  XUDTS = 0x12,// Extended Unitdata Service
  LUDT = 0x13, // Long Unitdata
  LUDTS = 0x14, // Long Unitdata Service
}

export const SCCP_MESSAGE_NAMES: Record<SCCPMessageType, string> = {
  [SCCPMessageType.CR]: 'Connection Request',
  [SCCPMessageType.CC]: 'Connection Confirm',
  [SCCPMessageType.CREF]: 'Connection Refused',
  [SCCPMessageType.RLSD]: 'Released',
  [SCCPMessageType.RLC]: 'Release Complete',
  [SCCPMessageType.DT1]: 'Data Form 1',
  [SCCPMessageType.DT2]: 'Data Form 2',
  [SCCPMessageType.AK]: 'Data Acknowledgement',
  [SCCPMessageType.UDT]: 'Unitdata',
  [SCCPMessageType.UDTS]: 'Unitdata Service',
  [SCCPMessageType.ED]: 'Expedited Data',
  [SCCPMessageType.EA]: 'Expedited Data Acknowledgement',
  [SCCPMessageType.RSR]: 'Reset Request',
  [SCCPMessageType.RSC]: 'Reset Confirmation',
  [SCCPMessageType.ERR]: 'Protocol Error',
  [SCCPMessageType.IT]: 'Inactivity Test',
  [SCCPMessageType.XUDT]: 'Extended Unitdata',
  [SCCPMessageType.XUDTS]: 'Extended Unitdata Service',
  [SCCPMessageType.LUDT]: 'Long Unitdata',
  [SCCPMessageType.LUDTS]: 'Long Unitdata Service',
};

// ============================================================
// TCAP MESSAGE TYPES
// ============================================================

export enum TCAPMessageType {
  UNIDIRECTIONAL = 0x61,  // Unidirectional
  QUERY_WITH_PERMISSION = 0x62, // Query With Permission
  QUERY_WITHOUT_PERMISSION = 0x63, // Query Without Permission
  RESPONSE_WITH_PERMISSION = 0x64, // Response With Permission
  RESPONSE_WITHOUT_PERMISSION = 0x65, // Response Without Permission
  CONVERSATION_WITH_PERMISSION = 0x66, // Conversation With Permission
  CONVERSATION_WITHOUT_PERMISSION = 0x67, // Conversation Without Permission
  ABORT = 0x68,  // Abort
}

export const TCAP_MESSAGE_NAMES: Record<TCAPMessageType, string> = {
  [TCAPMessageType.UNIDIRECTIONAL]: 'Unidirectional',
  [TCAPMessageType.QUERY_WITH_PERMISSION]: 'Query With Permission',
  [TCAPMessageType.QUERY_WITHOUT_PERMISSION]: 'Query Without Permission',
  [TCAPMessageType.RESPONSE_WITH_PERMISSION]: 'Response With Permission',
  [TCAPMessageType.RESPONSE_WITHOUT_PERMISSION]: 'Response Without Permission',
  [TCAPMessageType.CONVERSATION_WITH_PERMISSION]: 'Conversation With Permission',
  [TCAPMessageType.CONVERSATION_WITHOUT_PERMISSION]: 'Conversation Without Permission',
  [TCAPMessageType.ABORT]: 'Abort',
};

// ============================================================
// MAP (Mobile Application Part) OPERATIONS
// ============================================================

export enum MAPOperationCode {
  // Location Management
  UPDATE_LOCATION = 2,
  CANCEL_LOCATION = 3,
  PROVIDE_ROAMING_NUMBER = 4,
  NOTE_SUBSCRIBER_PRESENT_IN_VLR = 11,
  RESET = 37,
  FORWARD_CHECK_SS_INDICATION = 38,
  
  // Subscriber Management
  INSERT_SUBSCRIBER_DATA = 9,
  DELETE_SUBSCRIBER_DATA = 10,
  
  // Authentication
  SEND_AUTHENTICATION_INFO = 56,
  SEND_IDENTIFICATION = 57,
  SEND_PARAMETERS = 59,
  
  // Call Handling
  PROCESS_ACCESS_REQUEST = 44,
  PREPARE_HANDOVER = 45,
  PREPARE_SUBSEQUENT_HANDOVER = 47,
  PROCESS_ROAMING_NUMBER = 50,
  EXECUTE_HANDOVER = 51,
  SEND_END_SIGNAL = 58,
  
  // SMS Operations
  ROUTING_INFO_FOR_SM = 22,
  MO_FORWARD_SHORT_MESSAGE = 46,
  MT_FORWARD_SHORT_MESSAGE = 44,
  REPORT_SM_DELIVERY_STATUS = 23,
  INFORM_SERVICE_CENTRE = 32,
  ALERT_SERVICE_CENTRE = 33,
  READY_FOR_SM = 24,
  NOTE_MS_PRESENT_FOR_GPRS = 73,
  
  // USSD
  PROCESS_UNSTRUCTURED_SS_REQUEST = 59,
  PROCESS_UNSTRUCTURE_SS_REQUEST = 59,
  UNSTRUCTURE_SS_REQUEST = 60,
  UNSTRUCTURE_SS_NOTIFY = 61,
  
  // Subscriber Information Enquiry
  ANY_TIME_INTERROGATION = 66,
  ANY_TIME_SUBSCRIPTION_INTERROGATION = 69,
  PROVIDE_SUBSCRIBER_INFO = 70,
  PROVIDESubscriberInfo = 71,
  
  // IMEI Management
  CHECK_IMEI = 41,
  
  // LCS (Location Services)
  PROVIDE_SUBSCRIBER_LOCATION = 83,
  SUBSCRIBER_LOCATION_REPORT = 74,
  
  // MGRL (Multimedia)
  PREPARE_GRPS_HANDOVER = 75,
  SEND_ROUTING_INFO_FOR_GPRS = 12,
  FAILURE_REPORT = 25,
  NOTE_MSUBSCRIBER_PRESENT_IN_GPRS = 26,
}

export const MAP_OPERATION_NAMES: Record<MAPOperationCode, string> = {
  [MAPOperationCode.UPDATE_LOCATION]: 'updateLocation',
  [MAPOperationCode.CANCEL_LOCATION]: 'cancelLocation',
  [MAPOperationCode.PROVIDE_ROAMING_NUMBER]: 'provideRoamingNumber',
  [MAPOperationCode.NOTE_SUBSCRIBER_PRESENT_IN_VLR]: 'noteSubscriberPresentInVLR',
  [MAPOperationCode.RESET]: 'reset',
  [MAPOperationCode.FORWARD_CHECK_SS_INDICATION]: 'forwardCheckSSIndication',
  [MAPOperationCode.INSERT_SUBSCRIBER_DATA]: 'insertSubscriberData',
  [MAPOperationCode.DELETE_SUBSCRIBER_DATA]: 'deleteSubscriberData',
  [MAPOperationCode.SEND_AUTHENTICATION_INFO]: 'sendAuthenticationInfo',
  [MAPOperationCode.SEND_IDENTIFICATION]: 'sendIdentification',
  [MAPOperationCode.SEND_PARAMETERS]: 'sendParameters',
  [MAPOperationCode.PROCESS_ACCESS_REQUEST]: 'processAccessRequest',
  [MAPOperationCode.PREPARE_HANDOVER]: 'prepareHandover',
  [MAPOperationCode.PREPARE_SUBSEQUENT_HANDOVER]: 'prepareSubsequentHandover',
  [MAPOperationCode.PROCESS_ROAMING_NUMBER]: 'processRoamingNumber',
  [MAPOperationCode.EXECUTE_HANDOVER]: 'executeHandover',
  [MAPOperationCode.SEND_END_SIGNAL]: 'sendEndSignal',
  [MAPOperationCode.ROUTING_INFO_FOR_SM]: 'routingInfoForSM',
  [MAPOperationCode.MO_FORWARD_SHORT_MESSAGE]: 'moForwardSM',
  [MAPOperationCode.MT_FORWARD_SHORT_MESSAGE]: 'mtForwardSM',
  [MAPOperationCode.REPORT_SM_DELIVERY_STATUS]: 'reportSMDeliveryStatus',
  [MAPOperationCode.INFORM_SERVICE_CENTRE]: 'informServiceCentre',
  [MAPOperationCode.ALERT_SERVICE_CENTRE]: 'alertServiceCentre',
  [MAPOperationCode.READY_FOR_SM]: 'readyForSM',
  [MAPOperationCode.NOTE_MS_PRESENT_FOR_GPRS]: 'noteMSPresentForGPRS',
  [MAPOperationCode.PROCESS_UNSTRUCTURED_SS_REQUEST]: 'processUSSD',
  [MAPOperationCode.UNSTRUCTURE_SS_REQUEST]: 'unstructuredSSRequest',
  [MAPOperationCode.UNSTRUCTURE_SS_NOTIFY]: 'unstructuredSSNotify',
  [MAPOperationCode.ANY_TIME_INTERROGATION]: 'anyTimeInterrogation',
  [MAPOperationCode.ANY_TIME_SUBSCRIPTION_INTERROGATION]: 'anyTimeSubscriptionInterrogation',
  [MAPOperationCode.PROVIDE_SUBSCRIBER_INFO]: 'provideSubscriberInfo',
  [MAPOperationCode.ProvideSubscriberInfo]: 'provideSubscriberInfoV3',
  [MAPOperationCode.CHECK_IMEI]: 'checkIMEI',
  [MAPOperationCode.PROVIDE_SUBSCRIBER_LOCATION]: 'provideSubscriberLocation',
  [MAPOperationCode.SUBSCRIBER_LOCATION_REPORT]: 'subscriberLocationReport',
  [MAPOperationCode.PREPARE_GRPS_HANDOVER]: 'prepareGRPSHandover',
  [MAPOperationCode.SEND_ROUTING_INFO_FOR_GPRS]: 'sendRoutingInfoForGPRS',
  [MAPOperationCode.FAILURE_REPORT]: 'failureReport',
  [MAPOperationCode.NOTE_MSUBSCRIBER_PRESENT_IN_GPRS]: 'noteMSubscriberPresentForGPRS',
};

// ============================================================
// CAP (CAMEL Application Part) OPERATIONS
// ============================================================

export enum CAPOperationCode {
  // Initial DP
  INITIAL_DP = 0,
  
  // Call Information
  REQUEST_REPORT_BCSM_EVENT = 1,
  EVENT_REPORT_BCSM = 2,
  
  // Call Processing
  CALL_INFORMATION_REPORT = 3,
  CONNECT = 4,
  CONTINUE = 5,
  RELEASE_CALL = 6,
  REQUEST_CURRENT_BCSM_REPORT = 7,
  
  // Activity Test
  ACTIVITY_TEST = 17,
  
  // Applied Charges
  APPLIED_CHARGES_REPORT = 18,
  
  // Specialized Resources
  ASSISTANCE_REQUEST = 19,
  PLAY_ANNOUNCEMENT = 20,
  PROMPT_AND_COLLECT_USER_INFORMATION = 21,
  SPECIALIZED_RESOURCE_REPORT = 22,
  
  // Call Gap
  CALL_GAP = 23,
  CONNECT_REPORT = 24,
  
  // Timer Management & Reset
  FURNISH_CHARGING_INFORMATION = 26,
  RESET_TIMER = 27,
  
  // Mobility
  INITIAL_DP_EVENT = 40,
  
  // SMS
  CONNECT_TO_RESOURCE = 50,
  ESTABLISH_TEMPORARY_CONNECTION = 51,
  EVENT_NOTIFICATION = 52,
  CALL_RESULT = 53,
  
  // GPRS
  APPLY_CHARGING_GPRS = 55,
  FURNISH_CHARGING_INFORMATION_GPRS = 56,
  INITIAL_DP_GPRS = 70,
}

export const CAP_OPERATION_NAMES: Record<CAPOperationCode, string> = {
  [CAPOperationCode.INITIAL_DP]: 'initialDP',
  [CAPOperationCode.REQUEST_REPORT_BCSM_EVENT]: 'requestReportBCSMEvent',
  [CAPOperationCode.EVENT_REPORT_BCSM]: 'eventReportBCSM',
  [CAPOperationCode.CALL_INFORMATION_REPORT]: 'callInformationReport',
  [CAPOperationCode.CONNECT]: 'connect',
  [CAPOperationCode.CONTINUE]: 'continue',
  [CAPOperationCode.RELEASE_CALL]: 'releaseCall',
  [CAPOperationCode.REQUEST_CURRENT_BCSM_REPORT]: 'requestCurrentBCSMReport',
  [CAPOperationCode.ACTIVITY_TEST]: 'activityTest',
  [CAPOperationCode.APPLIED_CHARGES_REPORT]: 'appliedChargesReport',
  [CAPOperationCode.ASSISTANCE_REQUEST]: 'assistanceRequest',
  [CAPOperationCode.PLAY_ANNOUNCEMENT]: 'playAnnouncement',
  [CAPOperationCode.PROMPT_AND_COLLECT_USER_INFORMATION]: 'promptAndCollectUserInformation',
  [CAPOperationCode.SPECIALIZED_RESOURCE_REPORT]: 'specializedResourceReport',
  [CAPOperationCode.CALL_GAP]: 'callGap',
  [CAPOperationCode.CONNECT_REPORT]: 'connectReport',
  [CAPOperationCode.FURNISH_CHARGING_INFORMATION]: 'furnishChargingInformation',
  [CAPOperationCode.RESET_TIMER]: 'resetTimer',
  [CAPOperationCode.INITIAL_DP_EVENT]: 'initialDPEvent',
  [CAPOperationCode.CONNECT_TO_RESOURCE]: 'connectToResource',
  [CAPOperationCode.ESTABLISH_TEMPORARY_CONNECTION]: 'establishTemporaryConnection',
  [CAPOperationCode.EVENT_NOTIFICATION]: 'eventNotification',
  [CAPOperationCode.CALL_RESULT]: 'callResult',
  [CAPOperationCode.APPLY_CHARGING_GPRS]: 'applyChargingGPRS',
  [CAPOperationCode.FURNISH_CHARGING_INFORMATION_GPRS]: 'furnishChargingInformationGPRS',
  [CAPOperationCode.INITIAL_DP_GPRS]: 'initialDPGPRS',
};

// ============================================================
// ISUP (ISDN User Part) MESSAGE TYPES
// ============================================================

export enum ISUPMessageType {
  IAM = 0x01,   // Initial Address Message
  ACM = 0x02,   // Address Complete Message
  ANM = 0x06,   // Answer Message
  REL = 0x0c,   // Release
  RLC = 0x10,   // Release Complete
  SUS = 0x02,   // Suspend
  RES = 0x04,   // Resume
  
  // Call management
  INF = 0x03,   // Information
  INR = 0x04,   // Information Request
  APR = 0x06,   // Address Progress
  CPG = 0x2c,   // Call Progress
  COT = 0x05,   // Continuity
  CCR = 0x11,   // Continuity Check Request
  RAA = 0x12,   // Continuity Check Response
  FOT = 0x07,   // Forward Transfer
  PAS = 0x07,   // Pause
  RESUME = 0x08, // Resume
  SUSPEND = 0x09, // Suspend
  
  // Circuit supervision
  GRG = 0x08,   // Circuit Group Reset
  GRA = 0x10,   // Circuit Group Acknowledge
  GRS = 0x04,   // Circuit Group Reset
  CGB = 0x13,   // Circuit Group Blocking
  GBA = 0x14,   // Circuit Group Blocking Ack
  CGU = 0x17,   // Circuit Group Unblock
  GUA = 0x18,   // Circuit Group Unblock Ack
  CQM = 0x1b,   // Circuit Group Query
  CGR = 0x1c,   // Circuit Group Response
  
  // Maintenance
  CPM = 0x2d,   // Call Progress
  CIF = 0x2e,   // User Part Available
  CONF = 0x03,  // Confusion
  DRS = 0x0f,   // Delayed Release
  FAR = 0x02,   // Facility Accepted
  FAC = 0x03,   // Facility Requested
  FAA = 0x06,   // Facility not Applied
  LPA = 0x04,   // Loop Back Ack
  OLM = 0x21,   // Overload Message
  PAM = 0x1a,   // Pass Along
  PRI = 0x01,   // Pre-release Information
  RSC = 0x12,   // Reset Circuit
  SSR = 0x17,   // Suspension
  UBA = 0x19,   // User Part Available
  UBL = 0x1a,   // User Part Available
  UCIC = 0x1e,  // Unequipped CIC
  
  // MTP management
  TCR = 0x01,   // Traffic Received
  TFA = 0x03,   // Transfer Allowed
  TFP = 0x04,   // Transfer Prohibited
  TRW = 0x05,   // Transfer Restricted
  RST = 0x09,   // Restart
  UPUP = 0x0b,  // User Part Up
  UPUG = 0x0c,  // User Part Down
}

export const ISUP_MESSAGE_NAMES: Record<ISUPMessageType, string> = {
  [ISUPMessageType.IAM]: 'Initial Address Message (IAM)',
  [ISUPMessageType.ACM]: 'Address Complete Message (ACM)',
  [ISUPMessageType.ANM]: 'Answer Message (ANM)',
  [ISUPMessageType.REL]: 'Release (REL)',
  [ISUPMessageType.RLC]: 'Release Complete (RLC)',
  [ISUPMessageType.INF]: 'Information (INF)',
  [ISUPMessageType.INR]: 'Information Request (INR)',
  [ISUPMessageType.CPG]: 'Call Progress (CPG)',
  [ISUPMessageType.COT]: 'Continuity (COT)',
  [ISUPMessageType.CCR]: 'Continuity Check Request (CCR)',
  [ISUPMessageType.RAA]: 'Continuity Check Response (RAA)',
  [ISUPMessageType.FOT]: 'Forward Transfer (FOT)',
  [ISUPMessageType.GRG]: 'Circuit Group Reset (GRG)',
  [ISUPMessageType.GRA]: 'Circuit Group Acknowledge (GRA)',
  [ISUPMessageType.GRS]: 'Circuit Group Reset (GRS)',
  [ISUPMessageType.CGB]: 'Circuit Group Blocking (CGB)',
  [ISUPMessageType.GBA]: 'Circuit Group Blocking Ack (GBA)',
  [ISUPMessageType.CGU]: 'Circuit Group Unblock (CGU)',
  [ISUPMessageType.GUA]: 'Circuit Group Unblock Ack (GUA)',
  [ISUPMessageType.CQM]: 'Circuit Group Query (CQM)',
  [ISUPMessageType.CGR]: 'Circuit Group Response (CGR)',
  [ISUPMessageType.CONF]: 'Confusion (CONF)',
  [ISUPMessageType.DRS]: 'Delayed Release (DRS)',
  [ISUPMessageType.RSC]: 'Reset Circuit (RSC)',
  [ISUPMessageType.UCIC]: 'Unequipped CIC (UCIC)',
  [ISUPMessageType.TCR]: 'Traffic Received (TCR)',
  [ISUPMessageType.TFA]: 'Transfer Allowed (TFA)',
  [ISUPMessageType.TFP]: 'Transfer Prohibited (TFP)',
  [ISUPMessageType.TRW]: 'Transfer Restricted (TRW)',
  [ISUPMessageType.RST]: 'Restart (RST)',
  [ISUPMessageType.UPUP]: 'User Part Up (UPUP)',
  [ISUPMessageType.UPUG]: 'User Part Down (UPUG)',
};

// ============================================================
// CAUSE VALUES (Q.850 / ISUP)
// ============================================================

export enum CauseValue {
  // Normal causes
  NORMAL_UNSPECIFIED = 1,
  USER_BUSY = 17,
  NO_USER_RESPONDING = 18,
  NO_ANSWER_FROM_USER = 19,
  SUBSCRIBER_ABSENT = 20,
  CALL_REJECTED = 21,
  NUMBER_CHANGED = 22,
  NON_EXISTING_USER = 27,
  DESTINATION_OUT_OF_ORDER = 28,
  INVALID_NUMBER_FORMAT = 28,
  FACILITY_REJECTED = 29,
  RESP_STATUS_ENQUIRY = 30,
  NORMAL_CALL_CLEARING = 16,
  USER_NOT_MEMBER_OF_CUG = 87,
  INCOMPATIBLE_DESTINATION = 88,
  INVALID_TRANSIT_NETWORK_SELECTION = 91,
  USER_NOT_CUG_MEMBER = 102,
  PAYLOAD_TYPE_NOT_IMPLEMENTED = 112,
  OUTAGE_DISCONNECTION = 127,
  
  // Resource unavailable
  NO_CIRCUIT_AVAILABLE = 34,
  NETWORK_OUT_OF_ORDER = 38,
  TEMPORARY_FAILURE = 41,
  SWITCHING_EQUIPMENT_CONGESTION = 42,
  ACCESS_INFO_DISCARDED = 43,
  REQUESTED_CHANNEL_NOT_AVAILABLE = 44,
  RESOURCE_UNAVAILABLE = 47,
  QOS_UNAVAILABLE = 49,
  FACILITY_NOT_SUBSCRIBED = 50,
  INCOMING_CALL_BARRED_WITHIN_CUG = 52,
  BEARER_CAPABILITY_NOT_AUTHORIZED = 57,
  BEARER_CAPABILITY_NOT_AVAILABLE = 58,
  CAPABILITY_ALREADY_IN_USE = 63,
  INCOMPATIBLE_PAYLOAD_TYPE = 114,
  NON_EXISTENT_CUG = 126,
  
  // Invalid message
  MANDATORY_IE_MISSING = 96,
  MESSAGE_TYPE_NONEXISTENT = 97,
  MESSAGE_NOT_COMPATIBLE = 99,
  IE_NOT_IMPLEMENTED = 103,
  CONDITIONAL_IE_MISSING = 104,
  MESSAGE_INCOMPATIBLE_STATE = 101,
  RECOVERY_ON_TIMER_EXPIRY = 102,
  PROTOCOL_ERROR = 111,
  INTERWORKING_UNSPECIFIED = 127,
  
  // Security
  ACCESS_CLASS_DENIED = 113,
  CONGESTION = 42,
  SERVICE_OPTION_NOT_SUPPORTED = 117,
  REQUESTED_SERVICE_NOT_IMPLEMENTED = 118,
  USER_NOT_MEMBER_OF_QSG = 119,
  ERROR_IN_QSG = 120,
  ACL_FAILURE = 122,
  REQUESTED_FACILITY_NOT_IMPLEMENTED = 63,
  INVALID_IE_CONTENTS = 100,
  WRONG_MESSAGE = 98,
  NOT_CUG_MEMBER = 111,
  EXISTING_CUG_MEMBERSHIP = 123,
  NON_SELECTED_USER_CLEARING = 124,
  DESTINATION_OUT_OF_ORDER_ALT = 125,
  NUMBER_PORTABILITY_NOT_ALLOWED = 127,
}

export const CAUSE_VALUE_NAMES: Record<CauseValue, string> = {
  [CauseValue.NORMAL_UNSPECIFIED]: 'Normal, unspecified',
  [CauseValue.USER_BUSY]: 'User busy',
  [CauseValue.NO_USER_RESPONDING]: 'No user responding',
  [CauseValue.NO_ANSWER_FROM_USER]: 'No answer from user',
  [CauseValue.SUBSCRIBER_ABSENT]: 'Subscriber absent',
  [CauseValue.CALL_REJECTED]: 'Call rejected',
  [CauseValue.NUMBER_CHANGED]: 'Number changed',
  [CauseValue.NON_EXISTING_USER]: 'Non-existing user',
  [CauseValue.DESTINATION_OUT_OF_ORDER]: 'Destination out of order',
  [CauseValue.INVALID_NUMBER_FORMAT]: 'Invalid number format',
  [CauseValue.FACILITY_REJECTED]: 'Facility rejected',
  [CauseValue.RESP_STATUS_ENQUIRY]: 'Response status enquiry',
  [CauseValue.NORMAL_CALL_CLEARING]: 'Normal call clearing',
  [CauseValue.USER_NOT_MEMBER_OF_CUG]: 'User not member of CUG',
  [CauseValue.INCOMPATIBLE_DESTINATION]: 'Incompatible destination',
  [CauseValue.INVALID_TRANSIT_NETWORK_SELECTION]: 'Invalid transit network selection',
  [CauseValue.USER_NOT_CUG_MEMBER]: 'User not CUG member',
  [CauseValue.PAYLOAD_TYPE_NOT_IMPLEMENTED]: 'Payload type not implemented',
  [CauseValue.OUTAGE_DISCONNECTION]: 'Outage disconnection',
  [CauseValue.NO_CIRCUIT_AVAILABLE]: 'No circuit available',
  [CauseValue.NETWORK_OUT_OF_ORDER]: 'Network out of order',
  [CauseValue.TEMPORARY_FAILURE]: 'Temporary failure',
  [CauseValue.SWITCHING_EQUIPMENT_CONGESTION]: 'Switching equipment congestion',
  [CauseValue.ACCESS_INFO_DISCARDED]: 'Access info discarded',
  [CauseValue.REQUESTED_CHANNEL_NOT_AVAILABLE]: 'Requested channel not available',
  [CauseValue.RESOURCE_UNAVAILABLE]: 'Resource unavailable',
  [CauseValue.QOS_UNAVAILABLE]: 'QoS unavailable',
  [CauseValue.FACILITY_NOT_SUBSCRIBED]: 'Facility not subscribed',
  [CauseValue.INCOMING_CALL_BARRED_WITHIN_CUG]: 'Incoming call barred within CUG',
  [CauseValue.BEARER_CAPABILITY_NOT_AUTHORIZED]: 'Bearer capability not authorized',
  [CauseValue.BEARER_CAPABILITY_NOT_AVAILABLE]: 'Bearer capability not available',
  [CauseValue.CAPABILITY_ALREADY_IN_USE]: 'Capability already in use',
  [CauseValue.INCOMPATIBLE_PAYLOAD_TYPE]: 'Incompatible payload type',
  [CauseValue.NON_EXISTENT_CUG]: 'Non-existent CUG',
  [CauseValue.MANDATORY_IE_MISSING]: 'Mandatory IE missing',
  [CauseValue.MESSAGE_TYPE_NONEXISTENT]: 'Message type nonexistent',
  [CauseValue.MESSAGE_NOT_COMPATIBLE]: 'Message not compatible',
  [CauseValue.IE_NOT_IMPLEMENTED]: 'IE not implemented',
  [CauseValue.CONDITIONAL_IE_MISSING]: 'Conditional IE missing',
  [CauseValue.MESSAGE_INCOMPATIBLE_STATE]: 'Message incompatible state',
  [CauseValue.RECOVERY_ON_TIMER_EXPIRY]: 'Recovery on timer expiry',
  [CauseValue.PROTOCOL_ERROR]: 'Protocol error',
  [CauseValue.INTERWORKING_UNSPECIFIED]: 'Interworking, unspecified',
  [CauseValue.ACCESS_CLASS_DENIED]: 'Access class denied',
  [CauseValue.CONGESTION]: 'Congestion',
  [CauseValue.SERVICE_OPTION_NOT_SUPPORTED]: 'Service option not supported',
  [CauseValue.REQUESTED_SERVICE_NOT_IMPLEMENTED]: 'Requested service not implemented',
  [CauseValue.USER_NOT_MEMBER_OF_QSG]: 'User not member of QSG',
  [CauseValue.ERROR_IN_QSG]: 'Error in QSG',
  [CauseValue.ACL_FAILURE]: 'ACL failure',
  [CauseValue.REQUESTED_FACILITY_NOT_IMPLEMENTED]: 'Requested facility not implemented',
  [CauseValue.INVALID_IE_CONTENTS]: 'Invalid IE contents',
  [CauseValue.WRONG_MESSAGE]: 'Wrong message',
  [CauseValue.NOT_CUG_MEMBER]: 'Not CUG member',
  [CauseValue.EXISTING_CUG_MEMBERSHIP]: 'Existing CUG membership',
  [CauseValue.NON_SELECTED_USER_CLEARING]: 'Non-selected user clearing',
  [CauseValue.DESTINATION_OUT_OF_ORDER_ALT]: 'Destination out of order (alt)',
  [CauseValue.NUMBER_PORTABILITY_NOT_ALLOWED]: 'Number portability not allowed',
};

// ============================================================
// M3UA (MTP Level 3 User Adaptation) MESSAGE TYPES
// ============================================================

export enum M3UAMessageType {
  // Transfer Messages
  TRANSFER = 0x01,        // Payload Data
  
  // SS7 Signalling Network Management (SSNM)
  DAVA = 0x03,            // Destination Available
  DAUD = 0x04,            // Destination State Audit
  SCON = 0x05,            // Congestion Indication
  DUPU = 0x06,            // Destination User Part Unavailable
  DRST = 0x07,            // Destination Restricted
  
  // ASP State Maintenance (ASPSM)
  ASPUP = 0x01,           // ASP Up
  ASPDN = 0x02,           // ASP Down
  BEAT = 0x03,            // Heartbeat
  ASPUP_ACK = 0x04,       // ASP Up Ack
  ASPDN_ACK = 0x05,       // ASP Down Ack
  BEAT_ACK = 0x06,        // Heartbeat Ack
  
  // ASP Traffic Maintenance (ASPTM)
  ACTIVE = 0x01,          // Active
  INACTIVE = 0x02,        // Inactive
  ACTIVE_ACK = 0x03,      // Active Ack
  INACTIVE_ACK = 0x04,    // Inactive Ack
  
  // Routing Key Management (RKM)
  REG_REQ = 0x01,         // Registration Request
  REG_RSP = 0x02,         // Registration Response
  DEREG_REQ = 0x03,       // Deregistration Request
  DEREG_RSP = 0x04,       // Deregistration Response
}

export const M3UA_MESSAGE_NAMES: Record<M3UAMessageType, string> = {
  [M3UAMessageType.TRANSFER]: 'Payload Data (TRANSFER)',
  [M3UAMessageType.DAVA]: 'Destination Available (DAVA)',
  [M3UAMessageType.DAUD]: 'Destination State Audit (DAUD)',
  [M3UAMessageType.SCON]: 'Congestion Indication (SCON)',
  [M3UAMessageType.DUPU]: 'Destination User Part Unavailable (DUPU)',
  [M3UAMessageType.DRST]: 'Destination Restricted (DRST)',
  [M3UAMessageType.ASPUP]: 'ASP Up (ASPUP)',
  [M3UAMessageType.ASPDN]: 'ASP Down (ASPDN)',
  [M3UAMessageType.BEAT]: 'Heartbeat (BEAT)',
  [M3UAMessageType.ASPUP_ACK]: 'ASP Up Ack (ASPUP_ACK)',
  [M3UAMessageType.ASPDN_ACK]: 'ASP Down Ack (ASPDN_ACK)',
  [M3UAMessageType.BEAT_ACK]: 'Heartbeat Ack (BEAT_ACK)',
  [M3UAMessageType.ACTIVE]: 'Active (ACTIVE)',
  [M3UAMessageType.INACTIVE]: 'Inactive (INACTIVE)',
  [M3UAMessageType.ACTIVE_ACK]: 'Active Ack (ACTIVE_ACK)',
  [M3UAMessageType.INACTIVE_ACK]: 'Inactive Ack (INACTIVE_ACK)',
  [M3UAMessageType.REG_REQ]: 'Registration Request (REG_REQ)',
  [M3UAMessageType.REG_RSP]: 'Registration Response (REG_RSP)',
  [M3UAMessageType.DEREG_REQ]: 'Deregistration Request (DEREG_REQ)',
  [M3UAMessageType.DEREG_RSP]: 'Deregistration Response (DEREG_RSP)',
};

// ============================================================
// SCTP (Stream Control Transmission Protocol) CHUNK TYPES
// ============================================================

export enum SCTPChunkType {
  DATA = 0x00,             // Payload data
  INIT = 0x01,             // Initiation
  INIT_ACK = 0x02,         // Initiation Ack
  SACK = 0x03,             // Selective Acknowledgment
  HEARTBEAT = 0x04,        // Heartbeat
  HEARTBEAT_ACK = 0x05,    // Heartbeat Ack
  ABORT = 0x06,            // Abort
  SHUTDOWN = 0x07,         // Shutdown
  SHUTDOWN_ACK = 0x08,     // Shutdown Ack
  ERROR = 0x09,            // Operation Error
  COOKIE_ECHO = 0x0a,      // Cookie Echo
  COOKIE_ACK = 0x0b,       // Cookie Ack
  ECNE = 0x80,             // ECN Echo
  CWR = 0x81,              // Congestion Window Reduced
  SHUTDOWN_COMPLETE = 0x84, // Shutdown Complete
  AUTH = 0x0f,             // Authentication Chunk
  ASCONF = 0xc1,           // Address Stream Configuration Change
  ASCONF_ACK = 0x80,       // ASCONF Ack
  FORWARD_TSN = 0xc0,      // Forward TSN
  I_FORWARD_TSN = 0xc1,    // I-Forward TSN
  RE_CONFIG = 0x82,        // Re-configuration
  PAD = 0x84,              // Padding
  IDATA = 0x40,            // I-Data
  I_DONT_KNOW = 0xa0,      // I Don't Know
}

export const SCTP_CHUNK_NAMES: Record<SCTPChunkType, string> = {
  [SCTPChunkType.DATA]: 'DATA',
  [SCTPChunkType.INIT]: 'INIT',
  [SCTPChunkType.INIT_ACK]: 'INIT ACK',
  [SCTPChunkType.SACK]: 'SACK',
  [SCTPChunkType.HEARTBEAT]: 'HEARTBEAT',
  [SCTPChunkType.HEARTBEAT_ACK]: 'HEARTBEAT ACK',
  [SCTPChunkType.ABORT]: 'ABORT',
  [SCTPChunkType.SHUTDOWN]: 'SHUTDOWN',
  [SCTPChunkType.SHUTDOWN_ACK]: 'SHUTDOWN ACK',
  [SCTPChunkType.ERROR]: 'ERROR',
  [SCTPChunkType.COOKIE_ECHO]: 'COOKIE ECHO',
  [SCTPChunkType.COOKIE_ACK]: 'COOKIE ACK',
  [SCTPChunkType.ECNE]: 'ECN Echo',
  [SCTPChunkType.CWR]: 'Congestion Window Reduced',
  [SCTPChunkType.SHUTDOWN_COMPLETE]: 'SHUTDOWN COMPLETE',
  [SCTPChunkType.AUTH]: 'AUTH',
  [SCTPChunkType.ASCONF]: 'ASCONF',
  [SCTPChunkType.ASCONF_ACK]: 'ASCONF ACK',
  [SCTPChunkType.FORWARD_TSN]: 'FORWARD TSN',
  [SCTPChunkType.I_FORWARD_TSN]: 'I-FORWARD TSN',
  [SCTPChunkType.RE_CONFIG]: 'RE-CONFIG',
  [SCTPChunkType.PAD]: 'PAD',
  [SCTPChunkType.IDATA]: 'I-DATA',
  [SCTPChunkType.I_DONT_KNOW]: "I DON'T KNOW",
};

// ============================================================
// MAIN SS7 MESSAGE TYPE ENUMERATION
// ============================================================

export enum SS7ProtocolLayer {
  MTP1 = 'MTP1',           // Physical Layer
  MTP2 = 'MTP2',           // Data Link Layer
  MTP3 = 'MTP3',           // Network Layer
  SCCP = 'SCCP',           // Signaling Connection Control Part
  TCAP = 'TCAP',           // Transaction Capabilities Application Part
  MAP = 'MAP',             // Mobile Application Part
  CAP = 'CAP',             // CAMEL Application Part
  ISUP = 'ISUP',           // ISDN User Part
  M3UA = 'M3UA',           // MTP3 User Adaptation
  SCTP = 'SCTP',           // Stream Control Transmission Protocol
  SIGTRAN = 'SIGTRAN',     // SIGTRAN (umbrella)
  Diameter = 'Diameter',   // Diameter Protocol
}

export const PROTOCOL_COLORS: Record<SS7ProtocolLayer, string> = {
  [SS7ProtocolLayer.MTP1]: '#6b7280',
  [SS7ProtocolLayer.MTP2]: '#8b5cf6',
  [SS7ProtocolLayer.MTP3]: '#ec4899',
  [SS7ProtocolLayer.SCCP]: '#f59e0b',
  [SS7ProtocolLayer.TCAP]: '#10b981',
  [SS7ProtocolLayer.MAP]: '#3b82f6',
  [SS7ProtocolLayer.CAP]: '#ef4444',
  [SS7ProtocolLayer.ISUP]: '#06b6d4',
  [SS7ProtocolLayer.M3UA]: '#8b5cf6',
  [SS7ProtocolLayer.SCTP]: '#f97316',
  [SS7ProtocolLayer.SIGTRAN]: '#14b8a6',
  [SS7ProtocolLayer.Diameter]: '#6366f1',
};

// ============================================================
// CORE SS7 MESSAGE INTERFACE
// ============================================================

export interface SS7Message {
  id: string;
  timestamp: Date;
  protocol: SS7ProtocolLayer;
  direction: 'inbound' | 'outbound';
  
  // Routing information
  opc: PointCode;          // Originating Point Code
  dpc: PointCode;          // Destination Point Code
  sls?: number;            // Signaling Link Selection
  slc?: number;            // Signaling Link Code
  
  // SCCP layer
  sccp?: {
    messageType: SCCPMessageType;
    sourceGlobalTitle?: GlobalTitle;
    destinationGlobalTitle?: GlobalTitle;
    sourceSSN?: SubsystemNumber;
    destinationSSN?: SubsystemNumber;
    sequenceControl?: number;
    returnOption?: boolean;
    segmentation?: boolean;
    hopCounter?: number;
  };
  
  // TCAP layer
  tcap?: {
    transactionId: string;
    origTransactionId?: string;
    messageType: TCAPMessageType;
    dialoguePortion?: any;
  };
  
  // Application layer
  mapOperation?: MAPOperationCode;
  capOperation?: CAPOperationCode;
  isupMessage?: ISUPMessageType;
  
  // Decoded fields
  decodedFields?: Record<string, any>;
  
  // Raw data
  rawData?: Buffer;
  hexDump?: string;
  packetLength?: number;
  
  // Metadata
  sourceIP?: string;
  destIP?: string;
  sourcePort?: number;
  destPort?: number;
  linksetName?: string;
  fraudIndicators?: FraudIndicator[];
  riskScore?: number;
}

// ============================================================
// FRAUD INDICATORS
// ============================================================

export enum FraudIndicator {
  IRSF_SUSPICIOUS_PATTERN = 'irsf_suspicious_pattern',
  IRSF_HIGH_VOLUME_INTERNATIONAL = 'irsf_high_volume_international',
  IRSF_PREMIUM_RATE_TARGET = 'irsf_premium_rate_target',
  SIM_SWAP_MULTIPLE_ATTEMPTS = 'sim_swap_multiple_attempts',
  SIM_SWAP_PROVISIONING_ANOMALY = 'sim_swap_provisioning_anomaly',
  SIM_SWAP_AUTH_FAILURE_BURST = 'sim_swap_auth_failure_burst',
  WANGIRI_ONE_RING = 'wangiri_one_ring',
  WANGIRI_SHORT_DURATION = 'wangiri_short_duration',
  BYPASS_FRAUD_GSM_GATEWAY = 'bypass_fraud_gsm_gateway',
  BYPASS_FRAUD_SIMBOX = 'bypass_fraud_simbox',
  PREMIUM_RATE_ABUSE = 'premium_rate_abuse',
  ROAMING_ANOMALY_FAST_TRAVEL = 'roaming_anomaly_fast_travel',
  ROAMING_ANOMALY_IMPOSSIBLE = 'roaming_anomaly_impossible',
  LOCATION_UPDATE_WHILE_ACTIVE_CALL = 'location_update_while_active_call',
  INTERCEPT_SUSPICIOUS = 'intercept_suspicious',
  CLONING_DETECTED = 'cloning_detected',
  IMEI_MISMATCH = 'imei_mismatch',
  SUPPLIES_FRAUD = 'supplies_fraud',
  TRAFFIC_PUMPING = 'traffic_pumping',
}

export const FRAUD_INDICATOR_DETAILS: Record<FraudIndicator, {
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
}> = {
  [FraudIndicator.IRSF_SUSPICIOUS_PATTERN]: {
    name: 'IRSF Suspicious Pattern',
    severity: 'high',
    category: 'IRSF',
    description: 'International Revenue Share Fraud pattern detected'
  },
  [FraudIndicator.IRSF_HIGH_VOLUME_INTERNATIONAL]: {
    name: 'High Volume International Calls',
    severity: 'critical',
    category: 'IRSF',
    description: 'Unusual volume of international calls to premium destinations'
  },
  [FraudIndicator.IRSF_PREMIUM_RATE_TARGET]: {
    name: 'Premium Rate Target',
    severity: 'high',
    category: 'IRSF',
    description: 'Calls to known IRSF premium rate numbers'
  },
  [FraudIndicator.SIM_SWAP_MULTIPLE_ATTEMPTS]: {
    name: 'Multiple SIM Swap Attempts',
    severity: 'critical',
    category: 'SIM Swap',
    description: 'Multiple provisioning attempts for same subscriber'
  },
  [FraudIndicator.SIM_SWAP_PROVISIONING_ANOMALY]: {
    name: 'Provisioning Anomaly',
    severity: 'high',
    category: 'SIM Swap',
    description: 'Unusual SIM provisioning pattern'
  },
  [FraudIndicator.SIM_SWAP_AUTH_FAILURE_BURST]: {
    name: 'Authentication Failure Burst',
    severity: 'high',
    category: 'SIM Swap',
    description: 'Burst of authentication failures indicating potential SIM swap'
  },
  [FraudIndicator.WANGIRI_ONE_RING]: {
    name: 'Wangiri One-Ring Pattern',
    severity: 'medium',
    category: 'Wangiri',
    description: 'One-ring call pattern detected'
  },
  [FraudIndicator.WANGIRI_SHORT_DURATION]: {
    name: 'Short Duration Calls',
    severity: 'medium',
    category: 'Wangiri',
    description: 'Multiple very short duration calls (Wangiri indicator)'
  },
  [FraudIndicator.BYPASS_FRAUD_GSM_GATEWAY]: {
    name: 'GSM Gateway Detection',
    severity: 'high',
    category: 'Bypass Fraud',
    description: 'Traffic patterns consistent with GSM gateway bypass'
  },
  [FraudIndicator.BYPASS_FRAUD_SIMBOX]: {
    name: 'Simbox Detection',
    severity: 'high',
    category: 'Bypass Fraud',
    description: 'Multiple SIMs from single device (Simbox)'
  },
  [FraudIndicator.PREMIUM_RATE_ABUSE]: {
    name: 'Premium Rate Abuse',
    severity: 'medium',
    category: 'Premium Rate',
    description: 'Abnormal calls to premium rate services'
  },
  [FraudIndicator.ROAMING_ANOMALY_FAST_TRAVEL]: {
    name: 'Fast Travel Anomaly',
    severity: 'high',
    category: 'Roaming',
    description: 'Impossible roaming speed between locations'
  },
  [FraudIndicator.ROAMING_ANOMALY_IMPOSSIBLE]: {
    name: 'Impossible Roaming',
    severity: 'critical',
    category: 'Roaming',
    description: 'Subscriber appeared in two distant locations simultaneously'
  },
  [FraudIndicator.LOCATION_UPDATE_WHILE_ACTIVE_CALL]: {
    name: 'Location Update During Call',
    severity: 'high',
    category: 'Anomaly',
    description: 'Location update received while call is active'
  },
  [FraudIndicator.INTERCEPT_SUSPICIOUS]: {
    name: 'Suspicious Intercept Activity',
    severity: 'critical',
    category: 'Security',
    description: 'Potential lawful interception abuse or unauthorized access'
  },
  [FraudIndicator.CLONING_DETECTED]: {
    name: 'IMEI Cloning Detected',
    severity: 'critical',
    category: 'Cloning',
    description: 'Same IMEI registered from multiple locations'
  },
  [FraudIndicator.IMEI_MISMATCH]: {
    name: 'IMEI Mismatch',
    severity: 'medium',
    category: 'Anomaly',
    description: 'IMEI mismatch between expected and actual device'
  },
  [FraudIndicator.SUPPLIES_FRAUD]: {
    name: 'Supplies Fraud',
    severity: 'medium',
    category: 'Other',
    description: 'Potential supplies/reseller fraud'
  },
  [FraudIndicator.TRAFFIC_PUMPING]: {
    name: 'Traffic Pumping',
    severity: 'high',
    category: 'Other',
    description: 'Artificial traffic generation to inflate revenue share'
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Parse a point code based on format
 */
export function parsePointCode(raw: number, format: PointCodeFormat = PointCodeFormat.ITU_14BIT): PointCode {
  switch (format) {
    case PointCodeFormat.ITU_14BIT:
      // 3-8-3 format
      return {
        raw,
        format,
        network: (raw >> 11) & 0x07,
        cluster: (raw >> 3) & 0xFF,
        member: raw & 0x07,
        display: `${(raw >> 11) & 0x07}-${((raw >> 3) & 0xFF).toString().padStart(3, '0')}-${(raw & 0x07).toString()}`,
      };
    
    case PointCodeFormat.ANSI_24BIT:
      // 8-8-8 format
      return {
        raw,
        format,
        network: (raw >> 16) & 0xFF,
        cluster: (raw >> 8) & 0xFF,
        member: raw & 0xFF,
        display: `${((raw >> 16) & 0xFF).toString().padStart(3, '0')}-${((raw >> 8) & 0xFF).toString().padStart(3, '0')}-${(raw & 0xFF).toString().padStart(3, '0')}`,
      };
    
    case PointCodeFormat.JAPAN_16BIT:
      // 4-4-8 format
      return {
        raw,
        format,
        network: (raw >> 12) & 0x0F,
        cluster: (raw >> 8) & 0x0F,
        member: raw & 0xFF,
        display: `${((raw >> 12) & 0x0F).toString()}-${((raw >> 8) & 0x0F).toString()}-${(raw & 0xFF).toString().padStart(3, '0')}`,
      };
    
    default:
      return {
        raw,
        format,
        network: 0,
        cluster: 0,
        member: raw,
        display: raw.toString(),
      };
  }
}

/**
 * Parse global title from digits
 */
export function parseGlobalTitle(
  digits: string,
  type: GlobalTitleType = GlobalTitleType.E164,
  tt: number = 0,
  np: number = 1,
  enc: number = 3
): GlobalTitle {
  return {
    type,
    translationType: tt,
    numberingPlan: np,
    encodingScheme: enc,
    natureOfAddressIndicator: getNAIFromGT(type),
    digits,
    masked: maskMSISDN(digits),
  };
}

/**
 * Get Nature of Address Indicator from GT type
 */
function getNAIFromGT(type: GlobalTitleType): number {
  switch (type) {
    case GlobalTitleType.E164:
      return 4; // International number
    case GlobalTitleType.E212:
    case GlobalTitleType.E214:
      return 4; // Mobile number
    default:
      return 0; // Unknown
  }
}

/**
 * Mask MSISDN for privacy compliance (GDPR/ARTP)
 * Format: +213XXXXXXXXX -> +213XXX***XX
 */
export function maskMSISDN(msisdn: string): string {
  if (!msisdn || msisdn.length < 6) return msisdn.replace(/\d/g, '*');
  
  // Keep country code and first 2 digits, mask the rest except last 2
  const cleaned = msisdn.replace(/[^+\d]/g, '');
  if (cleaned.startsWith('+213')) {
    return '+213' + cleaned.slice(4, 6) + '****' + cleaned.slice(-2);
  }
  
  // Generic masking for non-Algerian numbers
  if (cleaned.startsWith('+')) {
    return cleaned.substring(0, 4) + '****' + cleaned.slice(-2);
  }
  
  return cleaned.substring(0, 3) + '****' + cleaned.slice(-2);
}

/**
 * Mask IMSI for privacy compliance
 * Format: 60301XXXXXXXXX -> 60301********
 */
export function maskIMSI(imsi: string): string {
  if (!imsi || imsi.length < 5) return imsi.replace(/\d/g, '*');
  // Keep MCC+MNC (5 digits), mask MSIN
  return imsi.substring(0, 5) + '********';
}

/**
 * Get wilaya name from area code
 */
export function getWilayaFromAreaCode(areaCode: number): string | undefined {
  return ALGERIA_NUMBERING.WILAYA_CODES[areaCode];
}

/**
 * Check if point code belongs to Djezzy network
 */
export function isDjezzyPointCode(pc: PointCode): boolean {
  const raw = pc.raw;
  return (
    (raw >= DJEZZY_POINT_CODES.HLR_POOL_START && raw <= DJEZZY_POINT_CODES.SMSC_POOL_END) ||
    raw === DJEZZY_POINT_CODES.STP_PRIMARY.value ||
    raw === DJEZZY_POINT_CODES.STP_SECONDARY.value
  );
}

/**
 * Format bytes as hex dump
 */
export function hexDump(buffer: Buffer, bytesPerLine: number = 16): string {
  const lines: string[] = [];
  for (let offset = 0; offset < buffer.length; offset += bytesPerLine) {
    const chunk = buffer.slice(offset, Math.min(offset + bytesPerLine, buffer.length));
    const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(chunk).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('');
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${hex.padEnd(bytesPerLine * 3)} |${ascii}|`);
  }
  return lines.join('\n');
}

/**
 * Convert hex string to Buffer
 */
export function hexToBuffer(hex: string): Buffer {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  return Buffer.from(cleanHex, 'hex');
}

/**
 * Convert Buffer to hex string
 */
export function bufferToHex(buffer: Buffer): string {
  return buffer.toString('hex').toUpperCase();
}