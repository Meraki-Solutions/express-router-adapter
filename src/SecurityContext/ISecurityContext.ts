export interface ISecurityContext {
  toLogSafeString(): string;
  principal?: any;
}
