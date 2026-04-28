import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const OLLAMA_BASE_URL = "http://127.0.0.1:11434"; // Connect to local Ollama
const MODEL_NAME = "llama3";
const PORT = 3000;

let vectorStore;
let llm;
let prompt;
let isReady = false; // We added a flag to track if the AI is ready

// --- INITIALIZE AI AND DATA ---
async function setupAI() {
    try {
        console.log("Connecting to Ollama and preparing tourism data...");
        
        const embeddings = new OllamaEmbeddings({ model: MODEL_NAME, baseUrl: OLLAMA_BASE_URL });
        llm = new ChatOllama({ model: MODEL_NAME, baseUrl: OLLAMA_BASE_URL, temperature: 0.2 });

        console.log("Reading data from knowledge.txt...");
        const rawText = fs.readFileSync("knowledge.txt", "utf-8");
        
        const paragraphs = rawText.split("\n\n");
        const tourismData = paragraphs
            .filter(text => text.trim().length > 0)
            .map(text => new Document({ pageContent: text.trim() }));

        // This is the part that takes a few seconds!
        vectorStore = await MemoryVectorStore.fromDocuments(tourismData, embeddings);
        
        prompt = ChatPromptTemplate.fromTemplate(`
            You are a friendly, helpful local tour guide. 
            Use the following pieces of retrieved context to answer the tourist's question.
            also give the data of their local businesses, guide etc. and also warn user for don'n throw garbage and etc warinings. 
            If you don't know the answer based on the context, say "I don't have that info, but ask me about local spots!"

            Context: {context}
            Tourist's Question: {input}
            Answer:
        `);

        isReady = true; // Tell the server it is safe to answer questions now
        console.log("✅ AI is fully ready to answer questions!");

    } catch (error) {
        console.error("❌ Failed to setup AI.", error);
    }
}

// --- CREATE THE API ENDPOINT ---
app.post('/api/chat', async (req, res) => {
    try {
        // SAFETY CHECK: If AI is still loading, tell the frontend
        if (!isReady || !vectorStore) {
            return res.json({ answer: "I am currently reading the city guides and warming up! Please try asking again in a few seconds." });
        }

        const userMessage = req.body.message;
        
        if (!userMessage) {
            return res.status(400).json({ error: "Please provide a message." });
        }

        const relevantDocs = await vectorStore.similaritySearch(userMessage, 3);
        const contextText = relevantDocs.map(doc => doc.pageContent).join("\n\n");

        const formattedPrompt = await prompt.format({
            context: contextText,
            input: userMessage
        });

        const response = await llm.invoke(formattedPrompt);
        res.json({ answer: response.content });

    } catch (error) {
        console.error("Error generating response:", error);
        res.status(500).json({ error: "Failed to connect to the local guide bot." });
    }
});

// --- START THE SERVER ---
app.listen(PORT, async () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    await setupAI(); 
});