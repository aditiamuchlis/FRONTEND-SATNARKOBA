export interface AppEnvironment {
  production: boolean;
  apiBaseUrl: string;
  useMockApi: boolean;
  idleTimeoutMinutes: number;
  backgroundLockMinutes: number;
}

export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl: 'http://localhost:3000/api/v1',
  useMockApi: false,
  idleTimeoutMinutes: 10,
  backgroundLockMinutes: 5
};
