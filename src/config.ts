import path from 'path';
import os from 'os';

const CONFIG = {
  BROWSER_PATH: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  PROFILE_DIR: "C:\\temp\\icecow_profile",
  PORT: 9222,
  URLS: { 
    site: "https://imerit.icecow.org/dashboard"
  },
  CLIP_SERVER_URL: "http://127.0.0.1:8000/evaluate",
  // Temporary paths for individual image crops
  PATH_A: path.resolve(os.tmpdir(), "option_a.png"),
  PATH_B: path.resolve(os.tmpdir(), "option_b.png"),
  TARGET_TASK_TIME_MS: 45000,
};

export default CONFIG;