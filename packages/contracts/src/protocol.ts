import type { ProcessTarget } from "./automations";

export interface NativeRequest<T = unknown> {
  type: "request";
  id: string;
  method: string;
  params?: T;
}

export interface NativeResponseSuccess<T = unknown> {
  type: "response";
  id: string;
  ok: true;
  result: T;
}

export interface NativeResponseError {
  type: "response";
  id: string;
  ok: false;
  error: {
    code: string;
    message: string;
    nativeCode?: number;
  };
}

export type NativeResponse<T = unknown> = NativeResponseSuccess<T> | NativeResponseError;

export interface NativeEvent<T = unknown> {
  type: "event";
  event: string;
  data: T;
}

export type NativeMessage = NativeRequest | NativeResponse | NativeEvent;

export interface HelloParams {
  protocolVersion: number;
}

export interface HelloResult {
  protocolVersion: number;
  hostVersion: string;
}

export interface SetActiveSchemeParams {
  schemeId: string;
}

export interface SetActiveSchemeResult {
  success: boolean;
  schemeId: string;
}

export interface GetBrightnessParams {
  displayId?: string;
}

export interface SetBrightnessParams {
  displayId?: string;
  value: number;
}

export interface BrightnessResult {
  displayId: string;
  value: number;
}

export interface TurnOffDisplayResult {
  success: boolean;
}

export interface SetWatchTargetsParams {
  targets: ProcessTarget[];
}

export interface SetWatchTargetsResult {
  targetsCount: number;
}

export interface PingResult {
  pong: number;
}

export interface ActiveSchemeChangedData {
  schemeId: string;
  name?: string;
}

export interface PowerSourceChangedData {
  isOnAc: boolean;
}

export interface DisplayStateChangedData {
  state: "on" | "dimmed" | "off" | "unknown";
}

export interface LidStateChangedData {
  state: "open" | "closed" | "unknown";
}

export interface ProcessEventData {
  pid: number;
  path: string;
  name: string;
}

export interface BrightnessChangedData {
  displayId: string;
  value: number;
}
