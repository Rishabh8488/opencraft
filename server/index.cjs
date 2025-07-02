// app.js

import dotenv from 'dotenv'; // Change 'require' to 'import'
dotenv.config();
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Fastify
const fastify = Fastify({ logger: true });

// Register CORS plugin
fastify.register(cors, {
    origin: '*', // Allow all origins for now, but remember to specify for production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});

// Initialize Gemini API with your API key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Keep flash for now, but pro is an option

// SQLite Database Setup
let db;

async function connectDb() {
    db = await open({
        filename: './cache.db',
        driver: sqlite3.Database
    });
    // Create cache table if it doesn't exist
    await db.exec(`
        CREATE TABLE IF NOT EXISTS combinations (
            first_element TEXT NOT NULL,
            second_element TEXT NOT NULL,
            result TEXT NOT NULL,
            PRIMARY KEY (first_element, second_element)
        );
    `);
    console.log("Database connected and cache table ensured.");
}

// Function to get from cache
async function getCachedWord(first, second) {
    const sorted = [first, second].sort();
    const row = await db.get(
        'SELECT result FROM combinations WHERE first_element = ? AND second_element = ?',
        sorted[0], sorted[1]
    );
    return row ? row.result : null;
}

// Function to add to cache
async function cacheNewWord(first, second, result) {
    const sorted = [first, second].sort();
    await db.run(
        'INSERT OR REPLACE INTO combinations (first_element, second_element, result) VALUES (?, ?, ?)',
        sorted[0], sorted[1], result
    );
}

// MODIFIED: craftNewWord function to handle multiple results
async function craftNewWord(firstWord, secondWord) {
    // Check cache first
    const cachedResult = await getCachedWord(firstWord, secondWord);
    if (cachedResult) {
        console.log(`[Cache Hit] for ${firstWord} + ${secondWord}: ${cachedResult}`);
        // Return cached result as an array (split by ' + ')
        return { result: cachedResult.split(' + ').map(p => p.trim()).filter(p => p !== '') };
    }

    console.log(`Calling Gemini API for: ${firstWord} and ${secondWord}`);

    try {
        // --- UPDATED GEMINI PROMPT ---
        const prompt = `You are an expert chemist and a chemical reaction simulator for a fun crafting game.
        Your task is to predict the *simplest and most plausible chemical product(s)* when two chemical elements or very simple compounds are combined.
        Provide ONLY the resulting chemical formula(s). If there are multiple products, separate them with " + ". Do NOT include any additional text, explanations, or balancing numbers.
        If the combination does not form any common, stable, simple chemical products under typical game-like conditions, respond with "No reaction".

        Examples:
        Input: "H" and "O" -> Output: "H2O"
        Input: "Na" and "Cl" -> Output: "NaCl"
        Input: "C" and "O" -> Output: "CO2"
        Input: "Fe" and "O" -> Output: "Fe2O3"
        Input: "N" and "H" -> Output: "NH3"
        Input: "He" and "Ne" -> Output: "No reaction"
        Input: "H2O" and "C" -> Output: "CO + H2"
        Input: "CH4" and "O2" -> Output: "CO2 + H2O"
        Input: "CO2" and "H2O" -> Output: "H2CO3"
        Input: "NaCl" and "H2O" -> Output: "No reaction"
        Input: "H2O2" and "MnO2" -> Output: "H2O + O2"

        What are the primary chemical product(s) or "No reaction" when you combine "${firstWord}" and "${secondWord}"?
        Provide ONLY the chemical formula(s) separated by " + ". If no reaction, provide "No reaction".`;
        // --- END UPDATED GEMINI PROMPT ---

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let answer = response.text().trim();

        let products = [];
        if (answer.toLowerCase() === "no reaction") {
            products = ["No reaction"];
        } else {
            // Split the answer by " + " to get multiple products
            products = answer.split(' + ').map(p => p.trim()).filter(p => p !== '');

            // Basic validation/cleanup for each product
            products = products.filter(p => /^(?:[A-Z][a-z]?\d*)+$/.test(p) || p === "No reaction");
            if (products.length === 0) {
                products = ["???"]; // Fallback if parsing fails or invalid products
            }
        }

        // Cache the result as a single string (joined by ' + ')
        await cacheNewWord(firstWord, secondWord, products.join(' + '));

        return {
            result: products // Return an array of products
        };

    } catch (err) {
        console.error("Error calling Gemini API:", err);
        return {
            result: ["???"] // Return an array with "???" on error
        };
    }
}

// Define routes
fastify.post('/', async (request, reply) => {
    const { first, second } = request.body;
    if (!first || !second) {
        reply.code(400).send({ error: 'Missing first or second element' });
        return;
    }
    return await craftNewWord(first, second);
});

// Start the server
const start = async () => {
    try {
        await connectDb(); // Connect to database before starting server
        await fastify.listen({ port: 3000, host: '0.0.0.0' }); // Listen on 0.0.0.0 for external access
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();