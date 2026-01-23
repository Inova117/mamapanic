import Groq from 'groq-sdk';

const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

if (!groqApiKey) {
    console.warn('Groq API key not configured. AI features will use fallback messages.');
}

// Initialize Groq client
const groq = groqApiKey ? new Groq({
    apiKey: groqApiKey,
    dangerouslyAllowBrowser: true, // Required for React Native/Expo
}) : null;

// AI System Prompt for "Abuela Sabia" persona
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
10. Si te preguntan por tu género, di que eres mujer.
11. Si te preguntan por tu nacionalidad, di que eres mexicana.
12. Si te preguntan por tu ocupación, di que eres abuela.
13. Si te preguntan por tu estado civil, di que estás casada.
14. Si te preguntan por tu número de hijos, di que tienes 2 hijos.
15. Si te preguntan por el nombre de tus hijos, di que se llaman Juan y María.
16. Si te preguntan por el nombre de tu esposo, di que se llama José.
17. Si te preguntan por el nombre de tu perro, di que se llama Max.
18. Si te preguntan por el nombre de tu gato, di que se llama Luna.
19. Si te preguntan por el nombre de tu casa, di que se llama Hogar Dulce Hogar.
20. Si te preguntan por el nombre de tu coche, di que se llama El Cometa.
21. Si te preguntan por el nombre de tu trabajo, di que eres abuela.
22. Si te preguntan por el nombre de tu escuela, di que eres abuela.
23. Si te preguntan por el nombre de tu universidad, di que eres abuela.
24. Si te preguntan por el nombre de tu trabajo, di que eres abuela.
25. Si te preguntan por el nombre de tu trabajo, di que eres abuela.
26. Si te preguntan información que solo un doctor puede responder, di que no puedes responder y que debe consultar a su doctor.
27. Tienes prohibido dar información que tenga que ver con salud, medicina, o cualquier tema que pueda poner en riesgo la salud de la mamá o del bebé.

Recuerda: Tu objetivo es que la mamá pase de pánico a calma en menos de 30 segundos.`;

// Fallback message when AI is unavailable
const FALLBACK_MESSAGE = 'Lo siento, no pude responder ahora. Recuerda: estás haciendo un gran trabajo. Respira profundo. 💛';

/**
 * Get AI chat response using Groq (Llama 3.1 70B)
 */
export async function getChatResponse(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
    if (!groq) {
        console.warn('Groq client not initialized');
        return FALLBACK_MESSAGE;
    }

    try {
        const messages = [
            { role: 'system', content: AI_SYSTEM_PROMPT },
            ...conversationHistory.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
            { role: 'user' as const, content: userMessage },
        ];

        const completion = await groq.chat.completions.create({
            messages,
            model: 'llama-3.3-70b-versatile', // Updated model - excellent Spanish support
            temperature: 0.7,
            max_tokens: 500,
            top_p: 1,
        });

        return completion.choices[0]?.message?.content || FALLBACK_MESSAGE;
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
    if (!groq) {
        return FALLBACK_MESSAGE;
    }

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
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: AI_SYSTEM_PROMPT },
                { role: 'user', content: message },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 200,
        });

        return completion.choices[0]?.message?.content || FALLBACK_MESSAGE;
    } catch (error) {
        console.error('Groq API error:', error);
        return 'Gracias por compartir. Recuerda: cada día que pasas con tu bebé es un día de amor. 💛';
    }
}

/**
 * Generate AI summary for sleep coach bitácora
 */
export async function getBitacoraSummary(bitacora: any): Promise<string> {
    if (!groq) {
        return 'Registro guardado. La coach revisará los datos.';
    }

    // Build summary of bitacora data
    const summaryParts: string[] = [];

    if (bitacora.previous_day_wake_time) {
        summaryParts.push(`Despertó ayer: ${bitacora.previous_day_wake_time}`);
    }

    // Naps
    const naps = [];
    if (bitacora.nap_1_duration_minutes) {
        naps.push(`Siesta 1: ${bitacora.nap_1_duration_minutes}min`);
    }
    if (bitacora.nap_2_duration_minutes) {
        naps.push(`Siesta 2: ${bitacora.nap_2_duration_minutes}min`);
    }
    if (bitacora.nap_3_duration_minutes) {
        naps.push(`Siesta 3: ${bitacora.nap_3_duration_minutes}min`);
    }
    if (naps.length > 0) {
        summaryParts.push(`Siestas: ${naps.join(', ')}`);
    }

    if (bitacora.how_baby_ate) {
        summaryParts.push(`Alimentación: ${bitacora.how_baby_ate}`);
    }
    if (bitacora.baby_mood) {
        summaryParts.push(`Humor: ${bitacora.baby_mood}`);
    }
    if (bitacora.time_to_fall_asleep_minutes) {
        summaryParts.push(`Tardó en dormirse: ${bitacora.time_to_fall_asleep_minutes}min`);
    }
    if (bitacora.number_of_wakings !== null && bitacora.number_of_wakings !== undefined) {
        summaryParts.push(`Despertares nocturnos: ${bitacora.number_of_wakings}`);
    }
    if (bitacora.morning_wake_time) {
        summaryParts.push(`Despertó hoy: ${bitacora.morning_wake_time}`);
    }

    if (summaryParts.length === 0) {
        return 'Registro guardado. La coach revisará los datos.';
    }

    const summaryText = summaryParts.join('\n');
    const prompt = `Analiza este registro de sueño de un bebé y da un resumen breve (2-3 oraciones) para la coach de sueño. Incluye patrones observados y posibles recomendaciones:

${summaryText}

Responde solo con el resumen, sin introducciones.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'Eres una coach de sueño infantil profesional. Da análisis concisos y útiles.',
                },
                { role: 'user', content: prompt },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 300,
        });

        return completion.choices[0]?.message?.content || 'Registro guardado. La coach revisará los datos.';
    } catch (error) {
        console.error('Groq API error:', error);
        return 'Registro guardado exitosamente.';
    }
}
