import { Page } from "puppeteer-core";
import CONFIG from "./config.js";
import funcAsStr from "./EventManager.js";
import { log } from "./utils.js";

export class SiteController {
  constructor(public page: Page) {}

  /**
   * Initializes the site controller and injects the event manager stealth script.
   */
  async init() {
    await this.page.evaluate((code: string) => window.eval(code), funcAsStr as string);
    log("SiteController initialized.");
  }

  /**
   * Brings the IceCow tab to the foreground.
   */
  async bringToFront() {
    await this.page.bringToFront();
  }

  /**
   * Navigates back to the main dashboard.
   */
  async goToDashboard() {
    await this.page.goto(CONFIG.URLS.site, { waitUntil: "networkidle2" });
  }

  /**
   * Clicks the labeling start button and waits for the radar loading screen to clear.
   */
  async startLabeling() {
    log("Looking for 'Start Labeling' button...");
    await this.page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.includes('Start Labeling'));
    }, { timeout: 30000 });

    await this.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.innerText.includes('Start Labeling'));
      startBtn?.click();
    });

    log("Waiting for radar/loading screen to clear...");
    // Specifically waits for the "Finding next task" radar to disappear and images to load
    await this.page.waitForFunction(() => {
        const isFinding = document.body.innerText.includes("Finding next task");
        const hasImages = !!document.querySelector('img[alt="Option A"]');
        return !isFinding && hasImages;
    }, { timeout: 60000 });
  }

  /**
   * Captures the prompt text and individual images for CLIP evaluation.
   */
  async captureTaskForClip(): Promise<string> {
    log("Capturing task data for CLIP...");
    
    // Ensure images are visible and fully loaded
    await this.page.waitForSelector('img[alt="Option A"]', { visible: true, timeout: 50000 });
    await this.page.waitForFunction(() => {
      const imgs = Array.from(document.querySelectorAll('img')).filter(img => img.src.includes('proj-icecow'));
      return imgs.length >= 2 && imgs.every(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalHeight > 0);
    }, { timeout: 40000 });

    // 1. Extract the prompt text from the H2 header
    const promptText = await this.page.evaluate(() => {
      const h2s = Array.from(document.querySelectorAll('h2'));
      if (h2s.length === 0) return "Analyze images.";
      // Finds the longest H2 which usually contains the descriptive prompt
      const mainHeader = h2s.reduce((prev, current) => (prev.innerText.length > current.innerText.length) ? prev : current);
      return mainHeader?.innerText?.trim() || "Analyze images.";
    });

    // 2. Capture individual element screenshots for CLIP comparison
    const imgA = await this.page.$('img[alt="Option A"]');
    const imgB = await this.page.$('img[alt="Option B"]');

    if (imgA && imgB) {
      // Saves specifically to the paths defined in your updated config
      await imgA.screenshot({ path: CONFIG.PATH_A });
      await imgB.screenshot({ path: CONFIG.PATH_B });
      log("Option A and B images captured successfully.");
    } else {
      throw new Error("Failed to locate Option A or Option B for screenshot.");
    }

    return promptText;
  }

  /**
   * Selects an option and waits for the on-screen timer before submitting.
   */
  async submit(choice: string) {
    log(`Selecting Option ${choice}. Waiting for timer to reach trigger threshold...`);
    
    await this.page.evaluate(async (c) => {
      // 1. Find and click the chosen image container
      const images = Array.from(document.querySelectorAll('img'));
      const targetImg = images.find(img => img.alt === `Option ${c}`);
      const targetButton = targetImg?.closest('button') as HTMLElement;

      if (targetButton) {
        targetButton.click();
      } else {
        throw new Error(`Option ${c} button not found.`);
      }

      // 2. MONITOR TIMER: Mimic human behavior by waiting for specific random targets
      await new Promise<void>((resolve, reject) => {
        const timeoutLimit = 60000;
        const start = Date.now();
        
        // Target times to mimic human hesitation (e.g., 0:02 to 0:05 remaining)
        const possibleTimes = ["0:02", "0:03", "0:04", "0:05"];
        const targetTimes = possibleTimes.sort(() => Math.random() - 0.5).slice(0, 3);

        const interval = setInterval(() => {
          const bodyText = document.body.innerText;
          const timerMatch = bodyText.match(/\d:\d{2}/);
          
          if (timerMatch) {
            const currentTime = timerMatch[0];
            if (targetTimes.includes(currentTime)) {
              clearInterval(interval);
              resolve();
            }
          }

          if (Date.now() - start > timeoutLimit) {
            clearInterval(interval);
            reject(new Error("Timer polling timed out."));
          }
        }, 100);
      });

      // 3. Click the Submit Label button once enabled
      const buttons = Array.from(document.querySelectorAll('button[data-slot="button"]'));
      const submitBtn = buttons.find(b => b.textContent?.includes('Submit Label')) as HTMLButtonElement;

      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
      } else {
        throw new Error("Submit button remained disabled or was not found.");
      }
    }, choice);
  }
}