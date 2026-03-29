import CONFIG from "./config.js";
import { log } from "./utils.js";
export default class ChatController {
    page;
    // We keep the name for index.ts compatibility, but it's now an API client
    constructor(page) {
        this.page = page;
    }
    async askForEvaluation(promptText) {
        log("Requesting CLIP evaluation...");
        const response = await fetch(CONFIG.CLIP_SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: promptText,
                path_a: CONFIG.PATH_A,
                path_b: CONFIG.PATH_B
            })
        });
        if (!response.ok) {
            throw new Error(`CLIP Server error: ${response.statusText}`);
        }
        const data = await response.json();
        log(`CLIP Decision: ${data.best} (Scores: A=${data.scores.A.toFixed(2)}, B=${data.scores.B.toFixed(2)})`);
        return { best: data.best };
    }
}
