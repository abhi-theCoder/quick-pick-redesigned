const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');

let fetch;
(async () => {
  fetch = (await import('node-fetch')).default;
})();

const CHATGPT_QuickPick_Recommendation_API_KEY = process.env.CHATGPT_QuickPick_Recommendation_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

router.post('/product', protect, authorize(['buyer']), [
    check('productName', 'Product name is required').not().isEmpty()
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation errors',
            errors: errors.array().map(err => err.msg)
        });
    }

    const { productName } = req.body;

    if (!fetch) {
        console.error('node-fetch not yet loaded.');
        return res.status(503).json({ message: 'Service temporarily unavailable. Try again.' });
    }

    try {
        const today = new Date();
        const formattedDate = today.toISOString().split("T")[0];

        const prompt = `
        You are a product buying expert.

            Before giving any recommendation, you MUST first determine:
            1. Whether the product is currently being produced.
            2. Whether it is discontinued, legacy, vintage, or no longer sold in the mainstream market.

            RULES:
            - If the product is discontinued, vintage, or no longer officially produced:
                → Reply ONLY with:
                "This product is discontinued. It is not recommended for regular buying unless you're purchasing a used or collector item."
                → Do NOT give 'Buy now' or 'Wait X months' advice.

            - If the product is currently available in the market:
            
            → Then and only then follow the normal recommendation rules:
            Provide a concise and helpful buying recommendation for the product: "${productName}". Include typical uses, key features to look for, and a general opinion on whether it's a good time to buy or if there are alternatives.Today's date is ${formattedDate}. 
                I want to buy a ${productName}. Should I buy it now or wait?
                - If it's the right time to buy, reply with: 'Buy now' and 1-2 reasons (e.g., demand, price drop, or seasonal factors).
                - If waiting is better, reply with: 'Wait X months' and 1-2 reasons (e.g., upcoming discounts, new models, or festival offers).
                - Your recommendation must be based on real-world timing (festivals, seasons, or sales events).
                - Example: 'Wait x months. Holi sales are in March, offering discounts on electronics.' Keep it under 100 words.
                Dont tell everytime to wait , sometimes it may be the best time to buy product, so tell me to buy the product now if ${formattedDate} is the best time to buy ${productName}
                - Example: 'Don't wait more it's the best time to buy ${productName}, the price may increase in x months' Keep it under 100 words.
                `;

        const payload = {
            model: "gpt-4.1-mini",   // You can change model from OpenRouter models
            messages: [
                { role: "user", content: prompt }
            ]
        };

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${CHATGPT_QuickPick_Recommendation_API_KEY}`,
                "HTTP-Referer": "https://yourwebsite.com",
                "X-Title": "QuickPick Product Recommendation"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        const recommendation = result?.choices?.[0]?.message?.content;

        if (recommendation) {
            return res.status(200).json({ recommendation });
        } else {
            console.error("OpenRouter response unexpected:", result);
            return res.status(500).json({ message: "AI could not generate recommendation." });
        }

    } catch (error) {
        console.error("Error calling OpenRouter:", error.message);
        return res.status(500).json({
            message: "Failed to fetch AI recommendation. Try again later."
        });
    }
});

module.exports = router;