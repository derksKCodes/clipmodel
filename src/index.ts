import BrowserMan from "./BrowserMan.js";
import ChatController from "./ChatController.js"; // This is now your CLIP API client
import { SiteController } from "./SiteController.js";
import CONFIG from "./config.js";
import Utils, { log } from "./utils.js";
import * as fs from "fs";
import path from "path";

const LOG_FILE_PATH = path.join(process.cwd(), "task_logs.txt");
const CSV_FILE_PATH = path.join(process.cwd(), "tasks.csv");

let totalTasks = 0;
let totalSessionTime = 0; // Total seconds across all tasks

function saveToLogFile(message: string) {
  const timestamp = new Date().toLocaleString();
  fs.appendFileSync(LOG_FILE_PATH, `[${timestamp}] ${message}\n`);
}

function initializeCSV() {
  const header = "Timestamp,TaskNumber,TaskTimeSeconds,TotalTasks,TotalTimeSeconds,FormattedTotalTime,AvgTaskTime,TasksPerHour\n";
  if (!fs.existsSync(CSV_FILE_PATH)) {
    fs.writeFileSync(CSV_FILE_PATH, header);
  }
}

function saveToCSV(taskTime: number) {
  const timestamp = new Date().toLocaleString();
  totalTasks++;
  totalSessionTime += taskTime;

  const avgTaskTime = totalSessionTime / totalTasks;
  const tasksPerHour = 3600 / avgTaskTime;
  
  const minutes = Math.floor(totalSessionTime / 60);
  const seconds = (totalSessionTime % 60).toFixed(0);
  const formattedTotalTime = `${minutes}m ${seconds}s`;

  const row = `${timestamp},${totalTasks},${taskTime},${totalTasks},${totalSessionTime.toFixed(1)},${formattedTotalTime},${avgTaskTime.toFixed(2)},${tasksPerHour.toFixed(2)}\n`;
  
  fs.appendFileSync(CSV_FILE_PATH, row);
}

async function main() {
  initializeCSV();

  await BrowserMan.startBrowser();
  const browser = await BrowserMan.connect();
  const bm = new BrowserMan(browser);
  await bm.init();

  const aiClient = new ChatController(null); // CLIP logic
  const sc = new SiteController(bm.getPage("site"));
  await sc.init();

  log("🚀 CLIP Automation Started. Monitoring IceCow...");
  await sc.startLabeling();

  while (true) {
    try {
      await sc.bringToFront();
      const taskStartTime = Date.now();
      
      log(`--- Task #${totalTasks + 1} ---`);

      // Capture images and prompt
      const promptText = await sc.captureTaskForClip();

      // Get CLIP decision
      const aiResponse = await aiClient.askForEvaluation(promptText);

      // Submit based on CLIP decision
      await sc.submit(aiResponse.best);

      const durationSeconds = parseFloat(((Date.now() - taskStartTime) / 1000).toFixed(1));
      
      saveToCSV(durationSeconds);

      const statusMsg = `✅ Task #${totalTasks} | Best: ${aiResponse.best} | Time: ${durationSeconds}s | Total: ${totalSessionTime.toFixed(1)}s`;
      log(statusMsg);
      saveToLogFile(statusMsg);

      // Wait for the next task to load (Radar screen check)
      await sc.page.waitForFunction(
        () => document.body.innerText.includes("Finding next task") || !document.querySelector('img[alt="Option A"]'),
        { timeout: 15000 }
      ).catch(() => {});

    } catch (err: any) {
      log(`⚠️ Error: ${err.message}`);
      saveToLogFile(`Error: ${err.message}`);
      await Utils.sleep(5000);
      await sc.goToDashboard();
      await sc.startLabeling();
    }
  }
}

main().catch((e) => saveToLogFile(`FATAL ERROR: ${e.message}`));