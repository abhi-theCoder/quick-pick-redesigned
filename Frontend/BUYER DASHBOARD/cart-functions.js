// ============================================
// CART AND CHECKOUT FUNCTIONS
// Add these to buyer-dashboard.js
// ============================================

// Add these DOM element references after line 26 (after chatMessageContainer):
/*
const cartItemCount = document.getElementById('cart-item-count');
const cartItemsContainer = document.getElementById('cart-items-container');
const emptyCartMessage = document.getElementById('empty-cart-message');
const cartSummary = document.getElementById('cart-summary');
const cartTotal = document.getElementById('cart-total');
const shippingAddress = document.getElementById('shipping-address');
const checkoutBtn = document.getElementById('checkout-btn');
const ordersContainer = document.getElementById('orders-container');
*/

// Add these cases to the showSection switch statement (around line 155):
/*
case 'cart-section':
    loadCart();
    break;
case 'my-orders-section':
    loadOrders();
    break;
*/

// Add these functions before the event listeners section (around line 450):

async function loadCart() {
    if (!cartItemsContainer) return;
    
    cartItemsContainer.innerHTML = '<p class="text-center text-muted">Loading cart...</p>';
    
    const cart = await fetchData('/api/cart');
    
    if (!cart || !cart.items || cart.items.length === 0) {
        cartItemsContainer.innerHTML = '';
        emptyCartMessage.classList.remove('d-none');
        cartSummary.classList.add('d-none');
        updateCartBadge(0);
        return;
    }
    
    emptyCartMessage.classList.add('d-none');
    cartItemsContainer.innerHTML = '';
    
    let total = 0;
    cart.items.forEach(item => {
        if (!item.product) return;
        
        const itemTotal = item.product.price * item.quantity;
        total += itemTotal;
        
        const cartItemHtml = `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <img src="${item.product.imageUrl || 'https://placehold.co/100x100'}" class="img-fluid rounded" alt="${item.product.name}">
                        </div>
                        <div class="col-md-4">
                            <h5 class="mb-1">${item.product.name}</h5>
                            <p class="text-muted mb-0">${item.product.category}</p>
                        </div>
                        <div class="col-md-2">
                            <p class="mb-0">₹${item.product.price.toFixed(2)}</p>
                        </div>
                        <div class="col-md-2">
                            <p class="mb-0">Qty: ${item.quantity}</p>
                        </div>
                        <div class="col-md-2 text-end">
                            <p class="mb-2"><strong>₹${itemTotal.toFixed(2)}</strong></p>
                            <button class="btn btn-sm btn-danger btn-remove-from-cart" data-product-id="${item.product._id}">Remove</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        cartItemsContainer.insertAdjacentHTML('beforeend', cartItemHtml);
    });
    
    cartTotal.textContent = `₹${total.toFixed(2)}`;
    cartSummary.classList.remove('d-none');
    updateCartBadge(cart.items.length);
}

async function addToCart(productId) {
    const result = await fetchData('/api/cart/add', 'POST', { productId, quantity: 1 });
    
    if (result) {
        showTemporaryMessage(document.querySelector('.dashboard-content'), 'Product added to cart!', 'success');
        updateCartBadge(result.cart.items.length);
    }
}

async function removeFromCart(productId) {
    const result = await fetchData(`/api/cart/remove/${productId}`, 'DELETE');
    
    if (result) {
        showTemporaryMessage(document.querySelector('.dashboard-content'), 'Product removed from cart', 'info');
        loadCart();
    }
}

function updateCartBadge(count) {
    if (!cartItemCount) return;
    
    if (count > 0) {
        cartItemCount.textContent = count;
        cartItemCount.classList.remove('d-none');
    } else {
        cartItemCount.classList.add('d-none');
    }
}

async function checkout() {
    const address = shippingAddress.value.trim();
    
    if (!address) {
        showTemporaryMessage(document.querySelector('.dashboard-content'), 'Please enter a shipping address', 'warning');
        return;
    }
    
    const order = await fetchData('/api/orders/create', 'POST', { shippingAddress: address });
    
    if (order) {
        showTemporaryMessage(document.querySelector('.dashboard-content'), 'Order placed successfully!', 'success');
        shippingAddress.value = '';
        loadCart();
        showSection('my-orders-section');
    }
}

async function loadOrders() {
    if (!ordersContainer) return;
    
    ordersContainer.innerHTML = '<p class="text-center text-muted">Loading orders...</p>';
    
    const orders = await fetchData('/api/orders/history');
    
    if (!orders || orders.length === 0) {
        ordersContainer.innerHTML = '<p class="text-center text-muted">No orders yet.</p>';
        return;
    }
    
    ordersContainer.innerHTML = '';
    
    orders.forEach(order => {
        const orderDate = new Date(order.createdAt).toLocaleDateString();
        const statusBadge = {
            'Pending': 'bg-warning',
            'Processing': 'bg-info',
            'Shipped': 'bg-primary',
            'Delivered': 'bg-success',
            'Cancelled': 'bg-danger'
        }[order.status] || 'bg-secondary';
        
        let itemsList = '';
        order.items.forEach(item => {
            if (item.product) {
                itemsList += `<li>${item.product.name} x ${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}</li>`;
            }
        });
        
        const orderHtml = `
            <div class="card mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>Order #${order._id.substring(0, 8)}</strong></span>
                    <span class="badge ${statusBadge}">${order.status}</span>
                </div>
                <div class="card-body">
                    <p><strong>Date:</strong> ${orderDate}</p>
                    <p><strong>Total:</strong> ₹${order.totalAmount.toFixed(2)}</p>
                    <p><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
                    <p><strong>Items:</strong></p>
                    <ul>${itemsList}</ul>
                </div>
            </div>
        `;
        ordersContainer.insertAdjacentHTML('beforeend', orderHtml);
    });
}

// Add these event listeners at the end of the DOMContentLoaded function (around line 510):

/*
// Cart event listeners
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', checkout);
}

// Event delegation for cart item removal
if (cartItemsContainer) {
    cartItemsContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-remove-from-cart')) {
            const productId = event.target.dataset.productId;
            removeFromCart(productId);
        }
    });
}

// Update the existing allProductsGrid event listener to handle Add to Cart
// Modify the existing click handler to include:
if (target.classList.contains('btn-add-to-cart')) {
    const productId = target.dataset.productId;
    addToCart(productId);
}
*/
