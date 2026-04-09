import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const keyMatch = envFile.match(/GEMINI_API_KEY=(.*)/);
const API_KEY = keyMatch ? keyMatch[1].trim() : '';


const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
    try {
        console.log("Listing models...");
        // the listModels endpoint
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY.trim()}`);
        const data = await response.json();
        console.log(data.models.map(m => m.name).join("\n"));
    } catch (e) {
        console.log("Error: " + e.message);
    }
}
listModels();
