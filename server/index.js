// app.js
import Fastify from 'fastify';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from "url";
import path from "path";
import cors from '@fastify/cors';
import dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API with your API key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Using gemini-1.5-flash for balanced performance and availability
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- PERIODIC TABLE ELEMENTS LIST (Commented out as not directly used in new logic, but kept for reference) ---
/*
const periodicTableElements = [
    "Hydrogen", "Helium", "Lithium", "Beryllium", "Boron", "Carbon", "Nitrogen", "Oxygen", "Fluorine", "Neon",
    "Sodium", "Magnesium", "Aluminum", "Silicon", "Phosphorus", "Sulfur", "Chlorine", "Argon", "Potassium", "Calcium",
    "Scandium", "Titanium", "Vanadium", "Chromium", "Manganese", "Iron", "Cobalt", "Nickel", "Copper", "Zinc",
    "Gallium", "Germanium", "Arsenic", "Selenium", "Bromine", "Krypton", "Rubidium", "Strontium", "Yttrium", "Zirconium",
    "Niobium", "Molybdenum", "Technetium", "Ruthenium", "Rhodium", "Palladium", "Silver", "Cadmium", "Indium", "Tin",
    "Antimony", "Tellurium", "Iodine", "Xenon", "Cesium", "Barium", "Lanthanum", "Cerium", "Praseodymium", "Neodymium",
    "Promethium", "Samarium", "Europium", "Gadolinium", "Terbium", "Dysprosium", "Holmium", "Erbium", "Thulium", "Ytterbium",
    "Lutetium", "Hafnium", "Tantalum", "Tungsten", "Rhenium", "Osmium", "Iridium", "Platinum", "Gold", "Mercury",
    "Thallium", "Lead", "Bismuth", "Polonium", "Astatine", "Radon", "Francium", "Radium", "Actinium", "Thorium",
    "Protactinium", "Uranium", "Neptunium", "Plutonium", "Americium", "Curium", "Berkelium", "Californium", "Einsteinium", "Fermium",
    "Mendelevium", "Nobelium", "Lawrencium", "Rutherfordium", "Dubnium", "Seaborgium", "Bohrium", "Hassium", "Meitnerium", "Darmstadtium",
    "Roentgenium", "Copernicium", "Nihonium", "Flerovium", "Moscovium", "Livermorium", "Tennessine", "Oganesson"
];
*/
// --- END PERIODIC TABLE ELEMENTS LIST ---


// Helper for __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db; // Database instance

/**
 * Initializes the SQLite database, creating the 'cache.db' file
 * and the 'word_cache' table if they don't already exist.
 */
async function initializeDatabase() {
    db = await open({
        filename: path.join(__dirname, 'cache.db'),
        driver: sqlite3.Database
    });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS word_cache (
            id INTEGER PRIMARY KEY,
            first_word TEXT,
            second_word TEXT,
            result TEXT
        )
    `);
}

initializeDatabase(); // Call to set up the database when the server starts

// Initialize Fastify server instance
const fastify = Fastify({
    logger: true, // Enable logging for debugging
    requestTimeout: 60 * 1000 // Set a generous timeout for API calls (60 seconds)
});

// Register CORS plugin to allow cross-origin requests from your frontend
// await fastify.register(cors, {
//     // You can specify more restrictive CORS options here if needed,
//     // e.g., 'origin: "http://localhost:3001"'
// });
await fastify.register(cors, {
  origin: ["https://opencraft-teal.vercel.app"], // allow your deployed Vue app
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false
});

/**
 * Checks the local SQLite cache for a pre-existing combination of two words.
 * It searches for both (word1, word2) and (word2, word1) order to ensure cache hit.
 * @param {string} firstWord - The first word (element) to check.
 * @param {string} secondWord - The second word (element) to check.
 * @returns {Promise<object | undefined>} Cached result with 'result' property, or undefined if not found.
 */
async function craftNewWordFromCache(firstWord, secondWord) {
    let cachedResult = await db.get('SELECT result FROM word_cache WHERE first_word = ? AND second_word = ?', [firstWord, secondWord]);

    if (cachedResult) {
        return cachedResult;
    }

    // Check the reverse order if not found in the first order
    cachedResult = await db.get('SELECT result FROM word_cache WHERE first_word = ? AND second_word = ?', [secondWord, firstWord]);

    return cachedResult;
}

/**
 * Caches a new word combination along with its result.
 * @param {string} firstWord - The first word of the combination.
 * @param {string} secondWord - The second word of the combination.
 * @param {string} result - The crafted word/result from the AI.
 * @returns {Promise<void>}
 */
async function cacheNewWord(firstWord, secondWord, result) {
    await db.run('INSERT INTO word_cache (first_word, second_word, result) VALUES (?, ?, ?)', [firstWord, secondWord, result]);
}

/**
 * Crafts a new word by combining two input words/elements using the Gemini API.
 * It prioritizes fetching from the cache to reduce API calls and improve performance.
 * If not in cache, it calls Gemini and then stores the result in cache.
 * @param {string} firstWord - The first word (element) to combine.
 * @param {string} secondWord - The second word (element) to combine.
 * @returns {Promise<object>} An object containing only the 'result'. Returns '???' if an error occurs.
 */
async function craftNewWord(firstWord, secondWord) {
    // Attempt to retrieve result from cache first
    const cachedResult = await craftNewWordFromCache(firstWord, secondWord);
    if (cachedResult) {
        return cachedResult;
    }

    // If not in cache, call the Gemini API
    console.log(`Calling Gemini API for: ${firstWord} and ${secondWord}`);

    try {
        // MODIFIED: New prompt to guide Gemini for chemical formulas
       const prompt = `You are an expert chemist and a chemical reaction simulator for a simple crafting game.
        Your task is to predict the *simplest and most plausible chemical formula* that results from combining two chemical elements or very simple compounds.
        Provide ONLY the resulting chemical formula. Do NOT include any additional text, explanations, or balancing numbers.
        If the combination does not form a *single, common, stable, simple compound* under typical game-like conditions, respond with "NoRxn" as a single word. Avoid predicting complex, multi-product, or high-energy reactions for this game.

        Examples:
        Input: "H" and "O" -> Output: "H2O"
        Input: "Na" and "Cl" -> Output: "NaCl"
        Input: "C" and "O" -> Output: "CO2"
        Input: "Fe" and "O" -> Output: "Fe2O3"
        Input: "N" and "H" -> Output: "NH3"
        Input: "He" and "Ne" -> Output: "NoRxn"
        Input: "H2O" and "C" -> Output: "NoRxn"
        Input: "CO2" and "H2O" -> Output: "H2CO3"
        Input: "NaCl" and "H2O" -> Output: "NoRxn"

        What is the primary chemical formula when you combine "${firstWord}" and "${secondWord}"?
        Provide only the chemical formula or "NoRxn".`;


        const result = await model.generateContent(prompt);
        const response = await result.response;
        let answer = response.text().trim();

        // Optional: Further clean-up to ensure only the formula remains
        // This regex tries to capture common formula patterns or "No reaction"
        // It's a best effort, Gemini should mostly follow the prompt.
        const formulaRegex = /^(?:[A-Z][a-z]?\d*)+|\bNo reaction\b/g;
        const match = answer.match(formulaRegex);
        if (match && match[0]) {
            answer = match[0];
        } else {
            // Fallback if Gemini gives something unexpected despite the prompt
            answer = "???";
        }

        // Cache the new result
        await cacheNewWord(firstWord, secondWord, answer);

        return {
            result: answer
        };

    } catch (err) {
        console.error("Error calling Gemini API:", err);
        // Return a default error response if the API call fails
        return {
            result: "???"
        };
    }
}

/**
 * Helper function to ensure consistent casing for chemical symbols/compounds.
 * Capitalizes the first letter and leaves the rest as is (e.g., "h" -> "H", "fe" -> "Fe", "H2O" -> "H2O").
 * @param {string} string - The input string.
 * @returns {string} The string with its first letter capitalized, or an empty string if input is null/empty.
 */
function capitalizeFirstLetter(string) {
    if (!string) return '';
    const trimmedString = string.trim();
    if (trimmedString.length === 0) return '';
    return trimmedString.charAt(0).toUpperCase() + trimmedString.slice(1);
}

// --- API Routes ---

/**
 * GET /
 * This route returns pre-selected combinations using element symbols.
 * This is primarily for demonstration or initial data if needed elsewhere.
 */
fastify.route({
    method: 'GET',
    url: '/',
    schema: {
        response: {
            200: {
                type: 'object',
                additionalProperties: {
                    type: 'object',
                    properties: {
                        result: { type: 'string' }
                    },
                    required: ['result']
                }
            }
        },
    },
    preHandler: async (request, reply) => {
        // Your authentication logic or other pre-processing could go here
    },
    handler: async (request, reply) => {
        reply.type('application/json').code(200);

        // MODIFIED: Changed combinations to use element symbols for consistency
        return {
            'H + O': (await craftNewWord('H', 'O')),
            'Na + Cl': (await craftNewWord('Na', 'Cl')),
            'C + O': (await craftNewWord('C', 'O')),
            'Fe + O': (await craftNewWord('Fe', 'O')),
            'Si + O': (await craftNewWord('Si', 'O')),
            'N + H': (await craftNewWord('N', 'H'))
        };
    }
});

/**
 * POST /
 * This route allows combining any two elements (or words) provided in the request body.
 * The response will contain the 'result' only.
 */
fastify.route({
    method: 'POST',
    url: '/',
    schema: {
        body: {
            type: 'object',
            required: ['first', 'second'],
            properties: {
                first: {type: 'string'},
                second: {type: 'string'}
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    result: {type: 'string'}
                }
            }
        }
    },
    preHandler: async (request, reply) => {
        // Your authentication logic or other pre-processing could go here
    },
    handler: async (request, reply) => {
        if (!request?.body?.first || !request?.body?.second) {
            reply.code(400).send({ message: 'Missing "first" or "second" element in request body.' });
            return;
        }

        // Apply capitalizeFirstLetter to ensure consistent casing for symbols
        // e.g., 'h' becomes 'H', 'fe' becomes 'Fe', 'cl' becomes 'Cl'
        const firstWord = capitalizeFirstLetter(request.body.first);
        const secondWord = capitalizeFirstLetter(request.body.second);
        reply.type('application/json').code(200);

        return await craftNewWord(firstWord, secondWord);
    }
});

// --- Server Initialization ---
try {
    const PORT = process.env.PORT || 3000;
    // fastify.listen({ port: PORT, host: '0.0.0.0' });
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server listening on http://0.0.0.0:3000`);
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}