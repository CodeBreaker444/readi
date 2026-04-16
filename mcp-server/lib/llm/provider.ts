import { getGroq } from "../groq";
import { LLMProvider, LLMConfig } from "../types";
import { PROVIDERS } from "../constants";

export function getLLMClient(provider: LLMProvider = "groq") {
    return getGroq();
}

export function getModelId(provider: LLMProvider, defaultModel?: string) {
    return defaultModel || PROVIDERS.groq.model;
}

export function safeGetContent(res: any): string | null {
    if (!res?.choices || !Array.isArray(res.choices) || res.choices.length === 0) {
        console.warn("[provider] LLM response missing choices:", JSON.stringify(res));
        return null;
    }

    const message = res.choices[0]?.message;
    if (!message) {
        console.warn("[provider] LLM choice missing message");
        return null;
    }

    const content = message.content?.trim() || "";
    const reasoning = message.reasoning?.trim() || "";

    if (content) return content;
    if (reasoning) {
        console.log("[provider] Content empty, using reasoning instead");
        return reasoning;
    }

    console.warn("[provider] Both content and reasoning are empty");
    return null;
}
