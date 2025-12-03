document.addEventListener('DOMContentLoaded', function() {
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Animate elements when they come into view
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.feature-card, .step-card, .seller-card, .testimonial-card');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.2;
            
            if (elementPosition < screenPosition) {
                element.classList.add('animate__animated', 'animate__fadeInUp');
            }
        });
    };

    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Run once on page load

    // Testimonial slider navigation
    const testimonialSlider = document.querySelector('.testimonial-slider');
    let isDown = false;
    let startX;
    let scrollLeft;

    testimonialSlider.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - testimonialSlider.offsetLeft;
        scrollLeft = testimonialSlider.scrollLeft;
    });

    testimonialSlider.addEventListener('mouseleave', () => {
        isDown = false;
    });

    testimonialSlider.addEventListener('mouseup', () => {
        isDown = false;
    });

    testimonialSlider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - testimonialSlider.offsetLeft;
        const walk = (x - startX) * 2;
        testimonialSlider.scrollLeft = scrollLeft - walk;
    });

    // Floating chat button interaction
    // Floating chat button interaction with AI integration
    const chatBtn = document.querySelector('.floating-chat-btn');
    const chatbox = document.querySelector('.chatbox-container');
    const closeChat = document.querySelector('.close-chat');
    const sendBtn = document.querySelector('.send-btn');
    const input = document.querySelector('.chatbox-footer input');
    const chatBody = document.querySelector('.chatbox-body');

    // Open chatbox with animation
    chatBtn.addEventListener('click', () => {
        chatbox.classList.remove('hidden', 'animate__fadeOutDown');
        chatbox.classList.add('animate__fadeInUp');
    });

    // Close chatbox
    closeChat.addEventListener('click', () => {
        chatbox.classList.remove('animate__fadeInUp');
        chatbox.classList.add('animate__fadeOutDown');
        setTimeout(() => chatbox.classList.add('hidden'), 500);
    });

    // Handle sending message
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
    });

    function appendMessage(text, type) {
    const msg = document.createElement('div');
    msg.classList.add('message', type);
    msg.textContent = text;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    }

    async function sendMessage() {
    const userMsg = input.value.trim();
    if (!userMsg) return;

    appendMessage(userMsg, 'user');
    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    // Show typing animation
    const loadingMsg = document.createElement('div');
    loadingMsg.classList.add('message', 'bot');
    loadingMsg.innerHTML = "🤖 <em>Typing...</em>";
    chatBody.appendChild(loadingMsg);
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        // Send message to backend via Axios
        const response = await axios.post(`${BACKEND_URL}/api/ai-chat`, { message: userMsg });

        // Remove typing animation
        loadingMsg.remove();

        // Display AI reply
        const botReply = response.data.reply || "Sorry, I couldn’t understand that.";
        appendMessage(botReply, 'bot');

    } catch (error) {
        loadingMsg.remove();
        appendMessage("⚠️ Error contacting AI server.", 'bot');
        console.error(error);
    }
    }


    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // GSAP animations
    if (typeof gsap !== 'undefined') {
        gsap.from('.navbar-brand', {
            duration: 1,
            y: -50,
            opacity: 0,
            delay: 0.2
        });
        
        gsap.from('.nav-item', {
            duration: 1,
            y: -50,
            opacity: 0,
            delay: 0.4,
            stagger: 0.1
        });
        
        gsap.from('.hero-section h1', {
            duration: 1,
            y: 50,
            opacity: 0,
            delay: 0.6
        });
        
        gsap.from('.hero-section p', {
            duration: 1,
            y: 50,
            opacity: 0,
            delay: 0.8
        });
        
        gsap.from('.hero-section .btn', {
            duration: 1,
            y: 50,
            opacity: 0,
            delay: 1,
            stagger: 0.1
        });
        
        gsap.from('.hero-image', {
            duration: 1,
            x: 50,
            opacity: 0,
            delay: 0.8
        });
    }
});