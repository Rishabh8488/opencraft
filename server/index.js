import Fastify from 'fastify';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from "url";
import path from "path";
import cors from '@fastify/cors';
import dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

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

initializeDatabase();

const fastify = Fastify({
    logger: true,
    requestTimeout: 60 * 1000
});

// ✅ Allow only your frontend
await fastify.register(cors, {
  origin: (origin, cb) => {
    const allowedOrigins = ["https://opencraft-teal.vercel.app"];
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
});

// Removed the old `fastify.options('/*')` block to prevent `FST_ERR_DUPLICATED_ROUTE`

async function craftNewWordFromCache(firstWord, secondWord) {
    let cachedResult = await db.get('SELECT result FROM word_cache WHERE first_word = ? AND second_word = ?', [firstWord, secondWord]);
    if (cachedResult) return cachedResult;
    cachedResult = await db.get('SELECT result FROM word_cache WHERE first_word = ? AND second_word = ?', [secondWord, firstWord]);
    return cachedResult;
}

async function cacheNewWord(firstWord, secondWord, result) {
    await db.run('INSERT INTO word_cache (first_word, second_word, result) VALUES (?, ?, ?)', [firstWord, secondWord, result]);
}

async function craftNewWord(firstWord, secondWord) {
    const cachedResult = await craftNewWordFromCache(firstWord, secondWord);
    if (cachedResult) return cachedResult;

    console.log(`Calling Gemini API for: ${firstWord} and ${secondWord}`);

    try {
        const prompt = `You are an expert chemist and a chemical reaction simulator for a simple crafting game. Your task is to predict the *simplest and most plausible chemical formula* that results from combining two chemical elements or very simple compounds. Provide ONLY the resulting chemical formula. Do NOT include any additional text, explanations, or balancing numbers. If the combination does not form a *single, common, stable, simple compound* under typical game-like conditions, respond with "NoRxn" as a single word.

What is the primary chemical formula when you combine "${firstWord}" and "${secondWord}"? Provide only the chemical formula or "NoRxn".`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let answer = response.text().trim();

        const formulaRegex = /^(?:[A-Z][a-z]?\d*)+|NoRxn$/;
        const match = answer.match(formulaRegex);
        answer = match && match[0] ? match[0] : "???";

        await cacheNewWord(firstWord, secondWord, answer);

        return { result: answer };

    } catch (err) {
        console.error("Error calling Gemini API:", err);
        return { result: "???" };
    }
}

function capitalizeFirstLetter(string) {
    if (!string) return '';
    const trimmedString = string.trim();
    return trimmedString.length === 0 ? '' : trimmedString.charAt(0).toUpperCase() + trimmedString.slice(1);
}

// --- ROUTES ---

fastify.get('/', async (request, reply) => {
    return {
        'H + O': await craftNewWord('H', 'O'),
        'Na + Cl': await craftNewWord('Na', 'Cl'),
        'C + O': await craftNewWord('C', 'O'),
        'Fe + O': await craftNewWord('Fe', 'O'),
        'Si + O': await craftNewWord('Si', 'O'),
        'N + H': await craftNewWord('N', 'H')
    };
});

fastify.post('/', async (request, reply) => {
    const { first, second } = request.body;
    if (!first || !second) {
        reply.code(400).send({ message: 'Missing "first" or "second" element in request body.' });
        return;
    }

    const firstWord = capitalizeFirstLetter(first);
    const secondWord = capitalizeFirstLetter(second);

    return await craftNewWord(firstWord, secondWord);
});

// --- SERVER STARTUP ---
try {
    const PORT = process.env.PORT || 3000;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
