import { AppEnvironment } from './environment';

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api/v1',
  useMockApi: false,
  idleTimeoutMinutes: 10,
  backgroundLockMinutes: 5
};
