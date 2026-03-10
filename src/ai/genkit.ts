import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({ apiKey: 'AIzaSyBkUWow9ndiQj8pv39tNZTyzXm6lPCC9v8' })],
  model: 'googleai/gemini-2.5-flash',
});
