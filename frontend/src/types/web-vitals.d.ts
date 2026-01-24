// Type declarations for web-vitals
// This module provides Core Web Vitals metrics

declare module 'web-vitals' {
  export interface Metric {
    name: string;
    value: number;
    delta: number;
    id: string;
    entries: PerformanceEntry[];
  }

  export type ReportHandler = (metric: Metric) => void;

  export function getCLS(onReport: ReportHandler): void;
  export function getFID(onReport: ReportHandler): void;
  export function getFCP(onReport: ReportHandler): void;
  export function getLCP(onReport: ReportHandler): void;
  export function getTTFB(onReport: ReportHandler): void;
}
