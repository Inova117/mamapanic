// ─────────────────────────────────────────────────────────────────────────────
// Groq AI service — uses plain fetch so it works on iOS, Android, AND web PWA.
// The groq-sdk uses Node.js internals that break in Expo web; fetch works
// everywhere without any platform-specific code.
// ─────────────────────────────────────────────────────────────────────────────

const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

if (!groqApiKey) {
    console.warn('Groq API key not configured. AI features will use fallback messages.');
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

/** Universal Groq fetch helper — iOS, Android, and web PWA */
async function groqFetch(messages: Message[], maxTokens = 500): Promise<string> {
    if (!groqApiKey) {
        return FALLBACK_MESSAGE;
    }

    const resp = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: maxTokens,
            top_p: 1,
        }),
    });

    if (!resp.ok) {
        throw new Error(`Groq API error: ${resp.status}`);
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || FALLBACK_MESSAGE;
}

// ─── Persona ──────────────────────────────────────────────────────────────────

const AI_SYSTEM_PROMPT = `Eres "Abuela Sabia" - una consejera empática y cariñosa para mamás primerizas exhaustas.

Tu personalidad:
- Cálida como una abuela que ha visto todo
- Honesta pero nunca crítica
- Prioriza la validación emocional SIEMPRE antes de dar consejos
- Hablas en español de forma sencilla y reconfortante
- Usas frases cortas y directas (la mamá está agotada, no puede leer párrafos largos)

Reglas ESTRICTAS:
1. SIEMPRE valida la emoción primero. "Entiendo lo agotada que estás" ANTES de cualquier consejo.
2. NUNCA des consejos médicos directos. Si hay preocupación de salud, sugiere consultar al pediatra.
3. Mantén respuestas CORTAS (máximo 3-4 oraciones).
4. Si detectas señales de depresión postparto severa, menciona gentilmente buscar ayuda profesional.
5. Normaliza los sentimientos difíciles de la maternidad.
6. NUNCA juzgues decisiones de crianza (pecho/biberón, colecho, etc.)
7. Nunca des consejos medicinales o que tengan que ver con salud.
8. Si te preguntan por tu nombre, di que eres Abuela Sabia.
9. Si te preguntan por tu edad, di que tienes 60 años.
10. Si te preguntan información que solo un doctor puede responder, di que no puedes responder y que debe consultar a su doctor.
11. Tienes prohibido dar información que tenga que ver con salud, medicina, o cualquier tema que pueda poner en riesgo la salud de la mamá o del bebé.

Recuerda: Tu objetivo es que la mamá pase de pánico a calma en menos de 30 segundos.`;

// ─── Fallback ─────────────────────────────────────────────────────────────────

const FALLBACK_MESSAGE = 'Lo siento, no pude responder ahora. Recuerda: estás haciendo un gran trabajo. Respira profundo. 💛';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get AI chat response — "Abuela Sabia" persona
 */
export async function getChatResponse(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
    try {
        const messages: Message[] = [
            { role: 'system', content: AI_SYSTEM_PROMPT },
            ...conversationHistory.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
            { role: 'user', content: userMessage },
        ];

        return await groqFetch(messages, 500);
    } catch (error) {
        console.error('Groq API error:', error);
        return FALLBACK_MESSAGE;
    }
}

/**
 * Get AI validation response for daily check-in
 */
export async function getValidationResponse(
    mood: 1 | 2 | 3,
    brainDump?: string
): Promise<string> {
    const moodContext = {
        1: 'La mamá se siente muy mal/triste hoy.',
        2: 'La mamá se siente regular/neutral hoy.',
        3: 'La mamá se siente bien hoy.',
    };

    let message = moodContext[mood];
    if (brainDump) {
        message += ` Ella escribió: "${brainDump}"`;
    }
    message += '\n\nResponde con una validación corta y cariñosa (máximo 2 oraciones).';

    try {
        return await groqFetch([
            { role: 'system', content: AI_SYSTEM_PROMPT },
            { role: 'user', content: message },
        ], 200);
    } catch (error) {
        console.error('Groq API error:', error);
        return 'Gracias por compartir. Recuerda: cada día que pasas con tu bebé es un día de amor. 💛';
    }
}

/**
 * Generate AI summary for sleep coach bitácora
 */
export async function getBitacoraSummary(bitacora: any): Promise<string> {
    const summaryParts: string[] = [];

    if (bitacora.previous_day_wake_time) summaryParts.push(`Despertó ayer: ${bitacora.previous_day_wake_time}`);
    if (bitacora.nap_1_duration_minutes) summaryParts.push(`Siesta 1: ${bitacora.nap_1_duration_minutes}min`);
    if (bitacora.nap_2_duration_minutes) summaryParts.push(`Siesta 2: ${bitacora.nap_2_duration_minutes}min`);
    if (bitacora.nap_3_duration_minutes) summaryParts.push(`Siesta 3: ${bitacora.nap_3_duration_minutes}min`);
    if (bitacora.how_baby_ate) summaryParts.push(`Alimentación: ${bitacora.how_baby_ate}`);
    if (bitacora.baby_mood) summaryParts.push(`Humor: ${bitacora.baby_mood}`);
    if (bitacora.time_to_fall_asleep_minutes) summaryParts.push(`Tardó en dormirse: ${bitacora.time_to_fall_asleep_minutes}min`);
    if (bitacora.number_of_wakings != null) summaryParts.push(`Despertares nocturnos: ${bitacora.number_of_wakings}`);
    if (bitacora.morning_wake_time) summaryParts.push(`Despertó hoy: ${bitacora.morning_wake_time}`);

    if (summaryParts.length === 0) {
        return 'Registro guardado. La coach revisará los datos.';
    }

    const prompt = `Analiza este registro de sueño de un bebé y da un resumen breve (2-3 oraciones) para la coach de sueño. Incluye patrones observados y posibles recomendaciones:\n\n${summaryParts.join('\n')}\n\nResponde solo con el resumen, sin introducciones.`;

    try {
        return await groqFetch([
            { role: 'system', content: 'Eres una coach de sueño infantil profesional. Da análisis concisos y útiles.' },
            { role: 'user', content: prompt },
        ], 300);
    } catch (error) {
        console.error('Groq API error:', error);
        return 'Registro guardado exitosamente.';
    }
}
