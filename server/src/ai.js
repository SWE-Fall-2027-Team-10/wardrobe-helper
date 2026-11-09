const express = require('express');
const OpenAI = require('openai');

const router = express.Router();
const { requireAuth } = require('./auth');router.use(requireAuth)

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('The server is missing OPENAI_API_KEY in server/.env.');
    error.status = 503;
    throw error;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

router.post('/advice', async (req, res, next) => {
  try {
    const { message, wardrobeItems = [] } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Please enter a fashion question.' });
    }
    if (!Array.isArray(wardrobeItems) || wardrobeItems.length > 100) {
      return res.status(400).json({ error: 'wardrobeItems must be a list of up to 100 clothing items.' });
    }

    const wardrobe = wardrobeItems.map((item) => String(item).slice(0, 120)).join(', ') || 'The user has not listed any clothing items yet.';
    const client = getOpenAI();
    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-5.5',
      instructions: [
        'You are Wardrobe Maker, a helpful and inclusive fashion assistant.',
        'Give practical, friendly advice based on the user\'s question and the clothes they list.',
        'First suggest combinations using clothing the user already owns when possible.',
        'Also suggest optional new clothing purchases when useful, clearly separating them from items already owned.',
        'Do not claim that the user owns an item unless it appears in their wardrobe list.',
        'Ask a brief follow-up if the occasion, weather, or style preference is essential and missing.',
        'Avoid body shaming and do not judge the user\'s body or appearance.'
      ].join(' '),
      input: `User's wardrobe items: ${wardrobe}\n\nUser's question: ${message.trim()}`,
    });

    res.json({ reply: response.output_text || 'I could not create a suggestion this time. Please try again.' });
  } catch (error) {
    next(error);
  }
});

router.post('/preview', async (req, res, next) => {
  try {
    const { photoDataUrl, outfit } = req.body || {};
    if (typeof photoDataUrl !== 'string' || !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(photoDataUrl)) {
      return res.status(400).json({ error: 'Please upload a PNG, JPEG, or WebP photo.' });
    }
    if (photoDataUrl.length > 10_000_000) {
      return res.status(413).json({ error: 'Photo is too large. Choose a smaller image.' });
    }
    if (typeof outfit !== 'string' || !outfit.trim() || outfit.length > 1000) {
      return res.status(400).json({ error: 'Enter an outfit description under 1,000 characters.' });
    }

    const client = getOpenAI();
    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-5.5',
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Create a realistic fashion try-on style preview using the uploaded photo as the person reference. Change the clothing to this outfit: ${outfit.trim()}. Preserve the person's general identity, pose, and background as much as possible. Show a tasteful, everyday outfit. This is a visual estimate, not a guarantee of exact fit or appearance.`
          },
          { type: 'input_image', image_url: photoDataUrl, detail: 'auto' }
        ]
      }],
      tools: [{ type: 'image_generation', model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst', action: 'edit' }],
    });

    const imageCall = response.output.find((item) => item.type === 'image_generation_call' && item.result);
    if (!imageCall) {
      return res.status(502).json({ error: response.output_text || 'The image service did not return a preview. Try again.' });
    }
    res.json({ imageBase64: imageCall.result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
