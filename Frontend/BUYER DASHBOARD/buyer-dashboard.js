document.addEventListener('DOMContentLoaded', function () {
    // const BACKEND_URL = 'http://localhost:5001';
    // const SOCKET_IO_URL = 'http://localhost:5001';
    
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const contentSections = document.querySelectorAll('.content-section');
    const logoutBtn = document.getElementById('logout-btn');

    const allProductsGrid = document.getElementById('all-products-grid');
    const noAllProductsMessage = document.getElementById('no-all-products-message');
    const recommendationProductNameInput = document.getElementById('recommendation-product-name');
    const getRecommendationBtn = document.getElementById('get-recommendation-btn');
    const recommendationResultDiv = document.getElementById('recommendation-result');
    const recommendationLoadingDiv = document.getElementById('recommendation-loading');
    const recommendationMessageContainer = document.getElementById('recommendation-message-container');

    const messagesSidebarLink = document.getElementById('messages-sidebar-link');
    const totalUnreadMessagesBadge = document.getElementById('total-unread-messages');
    const chatList = document.getElementById('chat-list');
    const noChatsMessage = document.getElementById('no-chats-message');
    const chatHeaderName = document.getElementById('chat-header-name');
    const chatHeaderProduct = document.getElementById('chat-header-product');
    const chatMessagesDiv = document.getElementById('chat-messages');
    const chatMessageInput = document.getElementById('chat-message-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessageContainer = document.getElementById('chat-message-container');

    // Cart elements
    const cartItemCount = document.getElementById('cart-item-count');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartSummary = document.getElementById('cart-summary');
    const cartTotal = document.getElementById('cart-total');
    const shippingAddress = document.getElementById('shipping-address');
    const checkoutBtn = document.getElementById('checkout-btn');
    const ordersContainer = document.getElementById('orders-container');

    let currentUserId = null;
    let currentUserRole = null;
    let activeChatId = null;
    let socket = null;

    function getToken() {
        return localStorage.getItem('quickpickToken');
    }

    function getUserData() {
        const userString = localStorage.getItem('quickpickUser');
        if (userString) {
            try {
                return JSON.parse(userString);
            } catch (e) {
                console.error('Error parsing user data from localStorage:', e);
                return null;
            }
        }
        return null;
    }

    function showTemporaryMessage(targetElement, message, type = 'info', duration = 3000) {
        targetElement.innerHTML = '';

        const alertDiv = document.createElement('div');
        const typeClasses = {
            'success': 'alert alert-success',
            'danger': 'alert alert-danger',
            'warning': 'alert alert-warning',
            'info': 'alert alert-info'
        };
        alertDiv.className = `${typeClasses[type]} alert-dismissible fade show`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        targetElement.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.classList.contains('show')) {
                const bsAlert = bootstrap.Alert.getInstance(alertDiv) || new bootstrap.Alert(alertDiv);
                bsAlert.close();
            }
        }, duration);
    }

    async function fetchData(endpoint, method = 'GET', body = null) {
        const token = getToken();
        if (!token) {
            console.error('No authentication token found. Redirecting to login.');
            window.location.href = `${window.origin}/Frontend/Register-login/register-login.html`;
            return null;
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const options = {
            method,
            headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${BACKEND_URL}${endpoint}`, options);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    console.error('Unauthorized or forbidden access. Redirecting to login.');
                    localStorage.removeItem('quickpickToken');
                    localStorage.removeItem('quickpickUser');
                    window.location.href = `${window.origin}/Frontend/Register-login/register-login.html`;
                    return null;
                }
                throw new Error(data.message || `API Error: ${response.statusText}`);
            }
            return data;
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error.message);
            showTemporaryMessage(document.querySelector('.dashboard-content'), `Error: ${error.message}`, 'danger', 5000);
            return null;
        }
    }

    function checkBuyerStatus() {
        const user = getUserData();
        if (!user || user.role !== 'buyer') {
            console.error('User is not a buyer or not logged in. Redirecting.');
            window.location.href = `${window.origin}/Frontend/Register-login/register-login.html`;
            return false;
        }
        currentUserId = user.id;
        currentUserRole = user.role;
        return true;
    }

    function showSection(targetId) {
        if (activeChatId && socket) {
            socket.emit('leaveChat', activeChatId);
            activeChatId = null;
        }

        contentSections.forEach(section => {
            section.classList.add('d-none');
        });

        sidebarLinks.forEach(link => {
            link.classList.remove('active');
        });

        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('d-none');
            const correspondingLink = document.querySelector(`.sidebar-link[data-target="${targetId}"]`);
            if (correspondingLink) {
                correspondingLink.classList.add('active');
            }

            switch (targetId) {
                case 'overview-section':
                    loadOverview();
                    break;
                case 'all-products-section':
                    loadAllProducts();
                    break;
                case 'cart-section':
                    loadCart();
                    break;
                case 'my-orders-section':
                    loadOrders();
                    break;
                case 'messages-section':
                    loadChatList();
                    chatMessagesDiv.innerHTML = '<p class="text-center text-muted">Select a chat to view messages.</p>';
                    chatHeaderName.textContent = 'Select a Chat';
                    chatHeaderProduct.textContent = '';
                    break;
            }
        } else {
            console.warn(`Section with ID "${targetId}" not found.`);
        }
    }

    async function loadOverview() {
        // Fetch dynamic data for overview
        const orders = await fetchData('/api/orders/history');
        const cart = await fetchData('/api/cart');

        if (orders) {
            // Update total orders
            const totalOrdersElement = document.querySelector('#overview-section .row .col-md-4:nth-child(1) span');
            if (totalOrdersElement) {
                totalOrdersElement.textContent = orders.length;
            }

            // Calculate total spent
            const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
            const totalSpentElement = document.querySelector('#overview-section .row .col-md-4:nth-child(2) span');
            if (totalSpentElement) {
                totalSpentElement.textContent = `₹${totalSpent.toFixed(2)}`;
            }

            // Update recent purchases table
            const tbody = document.querySelector('#overview-section tbody');
            if (tbody && orders.length > 0) {
                tbody.innerHTML = '';
                orders.slice(0, 5).forEach(order => {
                    const orderDate = new Date(order.createdAt).toLocaleDateString();
                    const statusBadge = {
                        'Pending': 'bg-warning',
                        'Processing': 'bg-info',
                        'Shipped': 'bg-primary',
                        'Delivered': 'bg-success',
                        'Cancelled': 'bg-danger'
                    }[order.status] || 'bg-secondary';

                    const productNames = order.items.map(item =>
                        item.product ? item.product.name : 'Unknown'
                    ).join(', ');

                    const row = `
                        <tr>
                            <td>#${order._id.substring(0, 8)}</td>
                            <td>${productNames}</td>
                            <td>${orderDate}</td>
                            <td>₹${order.totalAmount.toFixed(2)}</td>
                            <td><span class="badge ${statusBadge}">${order.status}</span></td>
                        </tr>
                    `;
                    tbody.insertAdjacentHTML('beforeend', row);
                });
            }
        }

        // Update cart count in overview
        if (cart && cart.items) {
            const cartCountElement = document.querySelector('#overview-section .row .col-md-4:nth-child(3) span');
            if (cartCountElement) {
                cartCountElement.textContent = cart.items.length;
            }
        }
    }

    async function loadAllProducts() {
        allProductsGrid.innerHTML = '<div class="col-12 text-center text-muted">Loading products...</div>';
        noAllProductsMessage.classList.add('d-none');

        const products = await fetchData('/api/products');
        allProductsGrid.innerHTML = '';
        if (products && products.length > 0) {
            products.forEach(product => {
                const statusBadge = product.isAvailable ?
                    '<span class="badge bg-success">In Stock</span>' :
                    '<span class="badge bg-danger">Out of Stock</span>';

                const imageUrl = product.imageUrl || `https://placehold.co/400x300/E0E0E0/333333?text=${encodeURIComponent(product.category.replace(/ /g, '+'))}`;

                const productCard = `
                    <div class="col">
                        <div class="product-card">
                            <img src="${imageUrl}" class="card-img-top" alt="${product.name}" onerror="this.onerror=null;this.src='https://placehold.co/400x300/E0E0E0/333333?text=No+Image';">
                            <div class="product-card-body">
                                <h5 class="product-card-title">${product.name}</h5>
                                <p class="product-card-category">${product.category}</p>
                                <p class="product-card-price">₹${product.price.toFixed(2)}</p>
                                <p class="product-card-seller">Sold by: ${product.seller ? product.seller.shopName : 'N/A'}</p>
                                <div class="product-card-status">${statusBadge}</div>
                                <div class="product-card-footer mt-auto">
                                    <button class="btn btn-sm btn-primary w-100 btn-add-to-cart" data-product-id="${product._id}">Add to Cart</button>
                                    ${product.seller ?
                        `<button class="btn btn-sm btn-outline-info w-100 mt-2 btn-chat-with-seller" data-seller-id="${product.seller._id}" data-product-id="${product._id}" data-seller-name="${product.seller.shopName || product.seller.firstName}">Chat with Seller</button>` :
                        `<button class="btn btn-sm btn-outline-secondary w-100 mt-2" disabled>Seller Unavailable</button>`
                    }
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                allProductsGrid.insertAdjacentHTML('beforeend', productCard);

            });
            noAllProductsMessage.classList.add('d-none');
        } else {
            allProductsGrid.innerHTML = '';
            noAllProductsMessage.classList.remove('d-none');
        }
    }

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

    async function getRecommendation() {
        const productName = recommendationProductNameInput.value.trim();
        if (!productName) {
            showTemporaryMessage(recommendationMessageContainer, 'Please enter a product name to get a recommendation.', 'warning');
            recommendationResultDiv.classList.add('hidden');
            return;
        }

        recommendationResultDiv.classList.add('hidden');
        recommendationMessageContainer.innerHTML = '';
        recommendationLoadingDiv.style.display = 'block';

        try {
            const data = await fetchData('/api/recommendations/product', 'POST', { productName });

            if (data && data.recommendation) {
                recommendationResultDiv.innerHTML = `<strong>AI Recommendation for "${productName}":</strong><br>${data.recommendation}`;
                recommendationResultDiv.classList.remove('hidden');
            } else {
                showTemporaryMessage(recommendationMessageContainer, 'Could not get a recommendation at this time. Please try again.', 'danger');
            }
        } catch (error) {
            console.error('Error fetching AI recommendation from backend:', error);
            showTemporaryMessage(recommendationMessageContainer, 'Failed to fetch AI recommendation. Network error or backend issue.', 'danger');
        } finally {
            recommendationLoadingDiv.style.display = 'none';
        }
    }

    async function initiateChat(participantId, productId = null, participantName) {
        const payload = {
            participantId: participantId,
            productId: productId
        };
        const data = await fetchData('/api/chat/initiate', 'POST', payload);
        if (data && data.chatId) {
            if (socket && socket.connected) {
                socket.emit('joinChat', data.chatId);
            }
            showTemporaryMessage(chatMessageContainer, `Chat with ${participantName} opened!`, 'success');
            return data.chatId;
        } else {
            showTemporaryMessage(chatMessageContainer, 'Failed to open chat.', 'danger');
            return null;
        }
    }

    async function loadChatList() {
        chatList.innerHTML = '<p class="text-center text-muted mt-3">Loading chats...</p>';
        noChatsMessage.classList.add('d-none');
        totalUnreadMessagesBadge.classList.add('d-none');

        const chats = await fetchData('/api/chat/list');
        chatList.innerHTML = '';
        let totalUnread = 0;

        if (chats && chats.length > 0) {
            chats.forEach(chat => {
                const lastMsgTime = chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp).toLocaleString() : 'No messages';
                const unreadBadge = chat.unreadCount > 0 ?
                    `<span class="badge bg-danger rounded-pill unread-badge">${chat.unreadCount}</span>` : '';

                const chatItem = document.createElement('a');
                chatItem.href = '#';
                chatItem.classList.add('list-group-item', 'list-group-item-action', 'chat-list-item');
                chatItem.setAttribute('data-chat-id', chat.chatId);
                chatItem.setAttribute('data-other-participant-id', chat.otherParticipantId);
                chatItem.setAttribute('data-other-participant-name', chat.otherParticipantName);
                chatItem.setAttribute('data-product-id', chat.productId);
                chatItem.setAttribute('data-product-name', chat.productName || '');
                chatItem.innerHTML = `
                    <div class="d-flex w-100 justify-content-between align-items-center">
                        <h6 class="mb-0">${chat.otherParticipantName}</h6>
                        ${unreadBadge}
                    </div>
                    ${chat.productName ? `<small class="text-info">${chat.productName}</small><br>` : ''}
                    <p class="mb-1 text-truncate" style="font-size: 0.9em;">${chat.lastMessageText || 'Start a conversation!'}</p>
                    <small class="text-muted">${lastMsgTime}</small>
                `;
                chatList.appendChild(chatItem);

                totalUnread += chat.unreadCount;
            });
            noChatsMessage.classList.add('d-none');
            if (totalUnread > 0) {
                totalUnreadMessagesBadge.textContent = totalUnread;
                totalUnreadMessagesBadge.classList.remove('d-none');
            }
        } else {
            noChatsMessage.classList.remove('d-none');
            totalUnreadMessagesBadge.classList.add('d-none');
        }
    }

    async function loadMessages(chatId) {
        if (!chatId) {
            chatMessagesDiv.innerHTML = '<p class="text-center text-muted">Select a chat to view messages.</p>';
            chatHeaderName.textContent = 'Select a Chat';
            chatHeaderProduct.textContent = '';
            activeChatId = null;
            return;
        }

        if (activeChatId && activeChatId !== chatId && socket && socket.connected) {
            socket.emit('leaveChat', activeChatId);
        }
        if (socket && socket.connected) {
            socket.emit('joinChat', chatId);
        }
        activeChatId = chatId;

        chatMessagesDiv.innerHTML = '<p class="text-center text-muted">Loading messages...</p>';
        chatMessageInput.value = '';

        const messages = await fetchData(`/api/chat/messages/${chatId}`);

        chatMessagesDiv.innerHTML = '';
        if (messages && messages.length > 0) {
            messages.forEach(msg => {
                appendMessageToUI(msg);
            });
            chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
        } else {
            chatMessagesDiv.innerHTML = '<p class="text-center text-muted">No messages yet. Start typing!</p>';
        }

        await fetchData(`/api/chat/${chatId}/mark-read`, 'POST');
        loadChatList();
    }

    function appendMessageToUI(msg) {
        const messageClass = msg.sender === currentUserId ? 'sent' : 'received';
        const msgDate = new Date(msg.timestamp);
        const msgTime = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const messageHtml = `
        <div class="message ${messageClass}">
            <div class="message-text">${msg.text}</div>
            <div class="message-timestamp">${msgTime}</div>
        </div>
        `;
        chatMessagesDiv.insertAdjacentHTML('beforeend', messageHtml);
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }

    async function sendMessage() {
        if (!activeChatId) {
            showTemporaryMessage(chatMessageContainer, 'No chat selected.', 'danger');
            return;
        }

        const messageText = chatMessageInput.value.trim();
        if (!messageText) {
            showTemporaryMessage(chatMessageContainer, 'Message cannot be empty.', 'warning');
            return;
        }

        socket.emit('sendMessage', {
            chatId: activeChatId,
            senderId: currentUserId,
            senderRole: currentUserRole,
            text: messageText
        });

        const optimisticMessage = {
            sender: currentUserId,
            text: messageText,
            timestamp: new Date()
        };
        appendMessageToUI(optimisticMessage);
        chatMessageInput.value = '';

        loadChatList();
    }

    function setupSocketListeners() {
        if (!socket) {
            const token = getToken();
            const user = getUserData();
            if (!token || !user) {
                console.error('Cannot establish socket connection: User not authenticated.');
                return;
            }

            socket = io(SOCKET_IO_URL, {
                query: {
                    token: token,
                    userId: user.id,
                    userRole: user.role
                }
            });

            socket.on('connect', () => {
                console.log('Connected to Socket.IO server:', socket.id);
            });

            socket.on('disconnect', () => {
                console.log('Disconnected from Socket.IO server.');
            });

            socket.on('connect_error', (err) => {
                console.error('Socket.IO connection error:', err.message);
                showTemporaryMessage(document.querySelector('.dashboard-content'), 'Chat service unavailable. Please try again later.', 'danger');
            });

            socket.on('receiveMessage', (message) => {
                console.log('Received message:', message);

                if (message.chatRoom === activeChatId && message.sender !== currentUserId) {
                    appendMessageToUI(message);
                    fetchData(`/api/chat/${activeChatId}/mark-read`, 'POST').then(() => {
                        loadChatList();
                    });
                } else if (message.chatRoom !== activeChatId) {
                    loadChatList();
                }

            });

            socket.on('messageFailed', (data) => {
                console.error('Message failed to send:', data.error);
                showTemporaryMessage(chatMessageContainer, `Failed to send message: ${data.error}`, 'danger');

            });
        }
    }

    // Event Listeners
    logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.removeItem('quickpickToken');
        localStorage.removeItem('quickpickUser');
        if (socket) {
            socket.disconnect();
        }
        window.location.href = `${window.origin}/Frontend/Register-login/register-login.html`;
    });

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const targetId = this.dataset.target;
            if (targetId) {
                showSection(targetId);
            }
        });
    });

    getRecommendationBtn.addEventListener('click', getRecommendation);

    // Cart event listeners
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }

    // Event delegation for cart item removal
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', function (event) {
            if (event.target.classList.contains('btn-remove-from-cart')) {
                const productId = event.target.dataset.productId;
                removeFromCart(productId);
            }
        });
    }

    allProductsGrid.addEventListener('click', async function (event) {
        const target = event.target;
        const productId = target.dataset.productId;
        const sellerId = target.dataset.sellerId;
        const sellerName = target.dataset.sellerName;

        if (target.classList.contains('btn-add-to-cart')) {
            addToCart(productId);
        } else if (target.classList.contains('btn-chat-with-seller')) {
            if (!sellerId) {
                showTemporaryMessage(document.querySelector('.dashboard-content'), 'Seller ID not found for chat.', 'danger');
                return;
            }
            const chatId = await initiateChat(sellerId, productId, sellerName);
            if (chatId) {
                showSection('messages-section');
                chatHeaderName.textContent = sellerName;
                chatHeaderProduct.textContent = productId ? `(Product: ${productId.substring(0, 8)}...)` : '';
                loadMessages(chatId);
            }
        }
    });

    chatList.addEventListener('click', function (event) {
        const target = event.target.closest('.chat-list-item');
        if (target) {
            const chatId = target.dataset.chatId;
            const otherParticipantName = target.dataset.otherParticipantName;
            const productName = target.dataset.productName;

            chatList.querySelectorAll('.chat-list-item').forEach(item => item.classList.remove('active'));
            target.classList.add('active');

            chatHeaderName.textContent = otherParticipantName;
            chatHeaderProduct.textContent = productName ? `(Product: ${productName})` : '';
            loadMessages(chatId);
        }
    });

    chatSendBtn.addEventListener('click', sendMessage);

    chatMessageInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });

    // Initialize dashboard
    async function initializeBuyerDashboard() {
        if (checkBuyerStatus()) {
            setupSocketListeners();
            showSection('overview-section');
            // Load cart count on initialization
            const cart = await fetchData('/api/cart');
            if (cart && cart.items) {
                updateCartBadge(cart.items.length);
            }
        }
    }

    initializeBuyerDashboard();
});
