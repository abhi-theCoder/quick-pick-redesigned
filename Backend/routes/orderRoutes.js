const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Create order from cart
router.post('/create', protect, authorize(['buyer']), async (req, res) => {
    const { shippingAddress } = req.body;

    if (!shippingAddress) {
        return res.status(400).json({ message: 'Shipping address is required' });
    }

    try {
        const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Calculate total and prepare order items
        let totalAmount = 0;
        const orderItems = [];

        for (const item of cart.items) {
            if (!item.product) {
                continue; // Skip if product was deleted
            }

            if (!item.product.isAvailable) {
                return res.status(400).json({
                    message: `Product "${item.product.name}" is no longer available`
                });
            }

            const itemTotal = item.product.price * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.price
            });
        }

        // Create order
        const order = new Order({
            user: req.user.id,
            items: orderItems,
            totalAmount,
            shippingAddress,
            status: 'Pending'
        });

        await order.save();

        // Clear cart after successful order
        cart.items = [];
        cart.updatedAt = Date.now();
        await cart.save();

        const populatedOrder = await Order.findById(order._id).populate('items.product');
        res.status(201).json({
            message: 'Order created successfully',
            order: populatedOrder
        });
    } catch (error) {
        console.error('Error creating order:', error.message);
        res.status(500).send('Server error creating order');
    }
});

// Get order history
router.get('/history', protect, authorize(['buyer']), async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .populate('items.product')
            .sort({ createdAt: -1 });

        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching order history:', error.message);
        res.status(500).send('Server error fetching order history');
    }
});

// Get single order
router.get('/:orderId', protect, authorize(['buyer']), async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId).populate('items.product');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view this order' });
        }

        res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching order:', error.message);
        res.status(500).send('Server error fetching order');
    }
});

module.exports = router;
