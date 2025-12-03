const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get user's cart
router.get('/', protect, authorize(['buyer']), async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

        if (!cart) {
            return res.status(200).json({ items: [] });
        }

        res.status(200).json(cart);
    } catch (error) {
        console.error('Error fetching cart:', error.message);
        res.status(500).send('Server error fetching cart');
    }
});

// Add item to cart
router.post('/add', protect, authorize(['buyer']), async (req, res) => {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
    }

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (!product.isAvailable) {
            return res.status(400).json({ message: 'Product is not available' });
        }

        let cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            cart = new Cart({
                user: req.user.id,
                items: [{ product: productId, quantity }]
            });
        } else {
            const existingItemIndex = cart.items.findIndex(
                item => item.product.toString() === productId
            );

            if (existingItemIndex > -1) {
                cart.items[existingItemIndex].quantity += quantity;
            } else {
                cart.items.push({ product: productId, quantity });
            }
        }

        cart.updatedAt = Date.now();
        await cart.save();

        const populatedCart = await Cart.findById(cart._id).populate('items.product');
        res.status(200).json({ message: 'Item added to cart', cart: populatedCart });
    } catch (error) {
        console.error('Error adding to cart:', error.message);
        res.status(500).send('Server error adding to cart');
    }
});

// Remove item from cart
router.delete('/remove/:productId', protect, authorize(['buyer']), async (req, res) => {
    const { productId } = req.params;

    try {
        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        cart.updatedAt = Date.now();
        await cart.save();

        const populatedCart = await Cart.findById(cart._id).populate('items.product');
        res.status(200).json({ message: 'Item removed from cart', cart: populatedCart });
    } catch (error) {
        console.error('Error removing from cart:', error.message);
        res.status(500).send('Server error removing from cart');
    }
});

// Clear cart
router.post('/clear', protect, authorize(['buyer']), async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = [];
        cart.updatedAt = Date.now();
        await cart.save();

        res.status(200).json({ message: 'Cart cleared', cart });
    } catch (error) {
        console.error('Error clearing cart:', error.message);
        res.status(500).send('Server error clearing cart');
    }
});

module.exports = router;
