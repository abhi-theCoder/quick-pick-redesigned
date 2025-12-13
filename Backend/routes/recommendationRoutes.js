const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');

let fetch;
(async () => {
    fetch = (await import('node-fetch')).default;
})();

const GEMINI_API_KEY_FOR_Recommendation = process.env.GEMINI_API_KEY_FOR_Recommendation || "";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY_FOR_Recommendation}`;

router.post(
    '/product',
    protect,
    authorize(['buyer']),
    [
        check('productName', 'Product name is required').not().isEmpty()
    ],
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation errors',
                errors: errors.array().map(err => err.msg)
            });
        }

        const { productName } = req.body;

        if (!fetch) {
            return res.status(503).json({ message: 'Service temporarily unavailable. Try again.' });
        }

        try {
            const today = new Date();
            const formattedDate = today.toISOString().split("T")[0];

            const prompt = `
You are a product buying expert.

            Provide a concise and helpful buying recommendation for the product: "${productName}". Today's date is ${formattedDate}. 
                I want to buy a ${productName}. Should I buy it now or wait?
                - If it's the right time to buy, reply with: 'Buy now' and 1-2 reasons (e.g., demand, price drop, or seasonal factors).
                - If waiting is better, reply with: 'Wait X months' and 1-2 reasons (e.g., upcoming discounts, new models, or festival offers).
                - Your recommendation must be based on real-world timing (festivals, seasons, or sales events).
                - Example: 'Wait x months. Holi sales are in March, offering discounts on electronics.' Keep it under 100 words.
                Dont tell everytime to wait , sometimes it may be the best time to buy product, so tell me to buy the product now if ${formattedDate} is the best time to buy ${productName}
                - Example: 'Don't wait more it's the best time to buy ${productName}, the price may increase in x months' Keep it under 100 words.
                `;
                
//             const prompt = `
// You are a product buying expert.

//             Before giving any recommendation, you MUST first determine:
//             1. Whether the product is currently being produced.
//             2. Whether it is discontinued, legacy, vintage, or no longer sold in the mainstream market.

//             RULES:
//             - If the product is discontinued, vintage, or no longer officially produced:
//                 → Reply ONLY with:
//                 "This product is discontinued. It is not recommended for regular buying unless you're purchasing a used or collector item."
//                 → Do NOT give 'Buy now' or 'Wait X months' advice.

//             - If the product is currently available in the market:
            
//             → Then and only then follow the normal recommendation rules:
//             Provide a concise and helpful buying recommendation for the product: "${productName}". Today's date is ${formattedDate}. 
//                 I want to buy a ${productName}. Should I buy it now or wait?
//                 - If it's the right time to buy, reply with: 'Buy now' and 1-2 reasons (e.g., demand, price drop, or seasonal factors).
//                 - If waiting is better, reply with: 'Wait X months' and 1-2 reasons (e.g., upcoming discounts, new models, or festival offers).
//                 - Your recommendation must be based on real-world timing (festivals, seasons, or sales events).
//                 - Example: 'Wait x months. Holi sales are in March, offering discounts on electronics.' Keep it under 100 words.
//                 Dont tell everytime to wait , sometimes it may be the best time to buy product, so tell me to buy the product now if ${formattedDate} is the best time to buy ${productName}
//                 - Example: 'Don't wait more it's the best time to buy ${productName}, the price may increase in x months' Keep it under 100 words.
//                 `;

            const payload = {
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 2048
                }
            };

            console.log(`Requesting Gemini (Model: ${GEMINI_URL.split('models/')[1].split(':')[0]}) with maxOutputTokens: 2048`);

            const response = await fetch(GEMINI_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            const recommendation =
                result?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (recommendation) {
                return res.status(200).json({ recommendation });
            } else {
                console.error("Gemini response unexpected:", result);
                return res.status(500).json({ message: "AI could not generate recommendation." });
            }

        } catch (error) {
            console.error("Error calling Gemini API:", error.message);
            return res.status(500).json({
                message: "Failed to fetch AI recommendation. Try again later."
            });
        }
    }
);

module.exports = router;
