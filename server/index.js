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

// --- PERIODIC TABLE ELEMENTS LIST ---
// This list is available within your backend file.
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
// --- END PERIODIC TABLE ELEMENTS LIST ---


// Helper for __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db; // Database instance

/**
 * Initializes the SQLite database, creating the 'cache.db' file
 * and the 'word_cache' table if they don't already exist.
 * The 'emoji' column has been removed from the table definition.
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
            -- emoji TEXT -- Removed emoji column
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
await fastify.register(cors, {
    // You can specify more restrictive CORS options here if needed,
    // e.g., 'origin: "http://localhost:3001"'
});

/**
 * Checks the local SQLite cache for a pre-existing combination of two words.
 * It searches for both (word1, word2) and (word2, word1) order to ensure cache hit.
 * The 'emoji' field is no longer selected.
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
 * The 'emoji' parameter and column are no longer used.
 * @param {string} firstWord - The first word of the combination.
 * @param {string} secondWord - The second word of the combination.
 * @param {string} result - The crafted word/result from the AI.
 * @returns {Promise<void>}
 */
async function cacheNewWord(firstWord, secondWord, result) { // Removed emoji parameter
    await db.run('INSERT INTO word_cache (first_word, second_word, result) VALUES (?, ?, ?)', [firstWord, secondWord, result]); // Removed emoji column
}

/**
 * Crafts a new word by combining two input words/elements using the Gemini API.
 * It prioritizes fetching from the cache to reduce API calls and improve performance.
 * If not in cache, it calls Gemini and then stores the result in cache.
 * The returned object no longer includes an 'emoji' field.
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
        // Construct the prompt for the Gemini model
        const prompt = `You are a chemistry simulation assistant. When given two chemical elements or compounds, return a plausible resulting compound or concept in a fun chemistry crafting game.
        What do you get when you combine "${firstWord}" and "${secondWord}"?
        Give me a **one-word answer**, do not reply to me using a paragraph. I just need one word from you.`
        ;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text().trim();
        // const emoji = ""; // Emoji generation is removed

        // Cache the new result before returning (removed emoji from cache call)
        await cacheNewWord(firstWord, secondWord, answer);

        return {
            result: answer
            // emoji: emoji // Removed emoji from return
        };

    } catch (err) {
        console.error("Error calling Gemini API:", err);
        // Return a default error response if the API call fails
        return {
            result: "???"
            // emoji: "" // Removed emoji from error return
        };
    }
}

/**
 * Helper function to capitalize the first letter of a string.
 * Ensures consistent casing for element names, especially for cache lookups.
 * @param {string} string - The input string.
 * @returns {string} The string with its first letter capitalized, or an empty string if input is null/empty.
 */
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// --- API Routes ---

/**
 * GET /
 * This route returns pre-selected combinations of periodic table elements.
 * IMPORTANT: If your frontend expects specific keys like "Water + Fire",
 * you WILL need to update your frontend to handle the new keys (e.g., "Hydrogen + Oxygen")
 * and to no longer expect an 'emoji' property.
 */
fastify.route({
    method: 'GET',
    url: '/',
    schema: {
        response: {
            200: {
                type: 'object',
                // This allows any string as a key, and ensures the value matches the { result } structure
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

        // New combinations using common periodic table elements
        return {
            'Hydrogen + Oxygen': (await craftNewWord('Hydrogen', 'Oxygen')),
            'Sodium + Chlorine': (await craftNewWord('Sodium', 'Chlorine')),
            'Carbon + Oxygen': (await craftNewWord('Carbon', 'Oxygen')),
            'Iron + Oxygen': (await craftNewWord('Iron', 'Oxygen')),
            'Silicon + Oxygen': (await craftNewWord('Silicon', 'Oxygen')),
            'Nitrogen + Hydrogen': (await craftNewWord('Nitrogen', 'Hydrogen'))
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

        const firstWord = capitalizeFirstLetter(request.body.first.trim().toLowerCase());
        const secondWord = capitalizeFirstLetter(request.body.second.trim().toLowerCase());
        reply.type('application/json').code(200);

        return await craftNewWord(firstWord, secondWord);
    }
});

// --- Server Initialization ---
try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`Server listening on http://0.0.0.0:3000`);
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}