/**
 * TOOL: Weather
 *
 * This file does two things:
 *   1. Defines the "tool definition" — the JSON schema description we send to
 *      Ollama so the model knows this tool exists and how to call it.
 *   2. Implements the actual function that runs when the model decides to use it.
 *
 * HOW TOOL CALLING WORKS (high level):
 *   We send the model a list of available tools with each chat request.
 *   If the model decides it needs weather data to answer, it returns a special
 *   response saying "call the get_weather tool with these arguments" instead of
 *   returning a text answer. Our backend then runs this function, sends the
 *   result back to the model, and the model uses it to write the final answer.
 *
 * This is like giving a coworker a phone book — they can look up a number
 * themselves instead of you doing it for them first.
 */

/**
 * The tool definition tells Ollama:
 *   - The tool's name (what the model uses to call it)
 *   - A description (what the model reads to decide WHEN to use it)
 *   - The parameters the model must provide when calling it
 *
 * This follows the OpenAI tool-calling format, which Ollama also supports.
 */
export const weatherToolDefinition = {
  type: "function",
  function: {
    name: "get_weather",
    description:
      "Get the current weather for a city. Use this when the user asks about weather conditions.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "The city name, e.g. 'London' or 'New York'",
        },
      },
      required: ["city"],
    },
  },
};

/**
 * Fetches current weather for a city using wttr.in — a free weather service
 * that requires no API key.
 *
 * API docs: https://wttr.in/:help
 * We use the JSON format: https://wttr.in/{city}?format=j1
 *
 * @param {string} city - The city name to look up
 * @returns {Promise<string>} A human-readable weather summary
 */
export async function getWeather(city) {
  const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();

  // wttr.in returns nested JSON. We pull out the bits we care about.
  const current = data.current_condition[0];
  const tempC = current.temp_C;
  const tempF = current.temp_F;
  const description = current.weatherDesc[0].value;
  const humidity = current.humidity;
  const feelsLikeC = current.FeelsLikeC;

  return `Weather in ${city}: ${description}. Temperature: ${tempC}°C (${tempF}°F), feels like ${feelsLikeC}°C. Humidity: ${humidity}%.`;
}
