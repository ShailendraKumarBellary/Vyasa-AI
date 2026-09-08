import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']
});

export default async function handler(req: any, res: any) {

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages are required'
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.75,
      max_tokens: 250
    });

    const reply =
      response.choices[0]?.message?.content ||
      'I missed that for a moment. Could you repeat that?';

    return res.status(200).json({
      reply
    });

  } catch (error) {

    console.error('OpenAI API Error:', error);

    return res.status(500).json({
      error: 'Failed to communicate with OpenAI'
    });
  }
}