import { addExtra } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import puppeteerVanilla from 'puppeteer-core';
// Initialize the stealth plugin
const puppeteer = addExtra(puppeteerVanilla);
puppeteer.use(StealthPlugin());
export default puppeteer;
