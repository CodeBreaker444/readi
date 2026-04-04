import { GoogleGenerativeAI } from "@google/generative-ai";

let _genAI: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
    if (!_genAI) {
        if (!process.env.GEMINI_API_KEY)
            throw new Error("Missing GEMINI_API_KEY environment variable");

        _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return _genAI;
}
