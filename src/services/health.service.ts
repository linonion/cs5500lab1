export interface HealthStatus {
  status: 'ok';
  service: 'campushub-api';
}

export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    service: 'campushub-api',
  };
}
