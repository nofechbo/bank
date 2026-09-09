export type ServiceResult = {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string | number>;
};
