const axios = require('axios');
const Flashcard = require('../models/Flashcard');

exports.generateFlashcards = async (req, res) => {
  try {
    const { topic, amount, deckId } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // ENDPOINT DE SEGURANÇA: gemini-1.5-pro no v1beta (o mais resiliente para chaves Free)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

    const prompt = `Gere exatamente ${amount || 5} flashcards sobre o tema "${topic}". 
    Responda APENAS com um array JSON puro, sem markdown, no formato:
    [{"front": "pergunta", "back": "resposta"}]`;

    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }]
    });

    // Extração do texto
    let text = response.data.candidates[0].content.parts[0].text;
    text = text.replace(/```json|```/g, "").trim();

    const cardsArray = JSON.parse(text);

    const preparedCards = cardsArray.map(card => ({
      front: card.front,
      back: card.back,
      userId: req.user.id,
      deckId: deckId
    }));

    const savedCards = await Flashcard.insertMany(preparedCards);
    res.status(201).json(savedCards);

  } catch (error) {
    console.error("ERRO FINAL IA:", error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Erro na IA Gratuita', 
      error: error.response?.data || error.message 
    });
  }
};