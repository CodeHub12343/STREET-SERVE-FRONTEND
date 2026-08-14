export { ShelterManagement } from './ShelterManagement';
export { ResidentClaim } from './components/ResidentClaim';
export { ResidentTraining } from './components/ResidentTraining';
export { ResidentWallet } from './components/ResidentWallet';
export { ResidentStatus } from './components/ResidentStatus';
export { ShelterConsole } from './components/ShelterConsole';
export {
  useResidentCapabilities,
  useClaimEnrollment,
  useTrainingCourse,
  useTrainingStatus,
  useSubmitTraining,
  useMyCustody,
  useAcknowledgeCustody,
  useEnrollResident,
  useCustodyLedger,
  useDisburseCustody,
  useShelterReport,
  resetDemoShelter,
} from './hooks/useShelter';
export type {
  ResidentCapabilities,
  ClaimResult,
  TrainingCourse,
  TrainingStatus,
  TrainingResult,
  MyCustody,
  MyCustodyEntry,
  CustodyLedger,
  CustodyLedgerEntry,
  EnrollResult,
  ShelterReport,
} from './types';
