import { Browser, Page } from "puppeteer-core";

/**
 * Updated BrowserSession: 
 * Since we are moving to CLIP, we only strictly need the 'site' page info.
 * The 'chat' property can be kept for backward compatibility or removed.
 */
export interface BrowserSession {
  browser: Browser;
  site: pageInfo;
  port: number;
}

export interface IEventManager {
  goal: number;
  active: number;
  inactive: number;
  rem: number;
  nowMS: number;

  clear: () => void;
  formatEvents(): string;
  isTabInactive(): boolean;
  displayEvents(forHowLong: number): void;
  stopFocusEvents(): void;
}

export interface pageInfo {
  readonly url: string;
  page: Page;
}

/**
 * Optional: Define the CLIP API response structure for better type safety
 */
export interface CLIPResponse {
  best: "A" | "B";
  scores: {
    A: number;
    B: number;
  };
}