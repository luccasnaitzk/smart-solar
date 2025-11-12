// Menu mobile toggle - Versão atualizada para submenus
document.addEventListener('DOMContentLoaded', function() {
    const PERF_LITE = document.documentElement.getAttribute('data-perf-lite') === '1';
    const navToggle = document.querySelector('.nav-toggle');
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            const navList = document.getElementById('nav_list');
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            
            this.setAttribute('aria-expanded', !isExpanded);
            navList.classList.toggle('open');
            
            // Alterar ícone
            const icon = this.querySelector('i');
            if (navList.classList.contains('open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
    
    // Fechar menu ao clicar em um link (mobile)
    document.querySelectorAll('.nav_item a').forEach(link => {
        link.addEventListener('click', () => {
            const navList = document.getElementById('nav_list');
            const toggle = document.querySelector('.nav-toggle');
            
            if (navList && navList.classList.contains('open') && toggle) {
                navList.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
                
                const icon = toggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });
    
    // Header scroll effect
    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Animação de elementos ao scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    if (!PERF_LITE && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // CSS espera a classe 'in-view' para revelar
                    entry.target.classList.add('in-view');
                    // Parar de observar após revelar
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        // Revelar cabeçalhos de seção e cards quando entram na viewport
        document.querySelectorAll('.section-header').forEach(el => observer.observe(el));
        document.querySelectorAll('.card').forEach(el => observer.observe(el));
    } else {
        // Fallback: revela imediatamente em navegadores antigos
        document.querySelectorAll('.section-header, .card').forEach(el => el.classList.add('in-view'));
    }
    
    // Contador de estatísticas
    const stats = document.querySelectorAll('.stat-number');
    const statsSection = document.querySelector('.stats');
    
    if (statsSection && stats.length) {
        const animateStats = (light=false) => {
            stats.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-count'));
                if (isNaN(target)) return;
                if (light) { // modo leve: incremento em steps maiores e duração curta
                    const duration = 800;
                    const step = Math.max(1, Math.round(target / (duration / 50))); // ~20 frames
                    let current = 0;
                    const timer = setInterval(() => {
                        current += step;
                        if (current >= target) { current = target; clearInterval(timer); stat.textContent = current + '+'; }
                        else stat.textContent = current;
                    }, 50);
                } else {
                    const duration = 2000;
                    const step = target / (duration / 16);
                    let current = 0;
                    const timer = setInterval(() => {
                        current += step;
                        if (current >= target) {
                            clearInterval(timer);
                            stat.textContent = target + '+';
                        } else {
                            stat.textContent = Math.floor(current);
                        }
                    }, 16);
                }
            });
        };
        if (!PERF_LITE && 'IntersectionObserver' in window) {
            const statsObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        animateStats(false);
                        statsObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            statsObserver.observe(statsSection);
        } else {
            // Modo performance-lite ou sem IntersectionObserver: dispara após pequeno delay para garantir layout pronto
            setTimeout(() => animateStats(true), 300);
        }
    }
    
    // Adicionar classe de animação aos elementos quando eles aparecem na tela
    const animatedElements = document.querySelectorAll('.fade-in');
    
    function checkAnimation() {
        animatedElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.style.opacity = 1;
                element.style.transform = 'translateY(0)';
            }
        });
    }
    
    // Verificar animações ao rolar e ao carregar a página
    window.addEventListener('scroll', checkAnimation);
    checkAnimation();

    // Hero Slider functionality
    const heroSlider = document.querySelector('.hero-slider');
    if (heroSlider) {
        const slides = document.querySelectorAll('.slide');
        const prevBtn = document.querySelector('.slider-prev');
        const nextBtn = document.querySelector('.slider-next');
        const dotsContainer = document.querySelector('.slider-dots');
        let currentSlide = 0;
        
        // Create dots
        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.classList.add('slider-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        });
        
        const dots = document.querySelectorAll('.slider-dot');
        
        function goToSlide(n) {
            slides[currentSlide].classList.remove('active');
            dots[currentSlide].classList.remove('active');
            
            currentSlide = (n + slides.length) % slides.length;
            
            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
        }
        
        function nextSlide() {
            goToSlide(currentSlide + 1);
        }
        
        function prevSlide() {
            goToSlide(currentSlide - 1);
        }
        
        // Event listeners
        if (nextBtn) nextBtn.addEventListener('click', nextSlide);
        if (prevBtn) prevBtn.addEventListener('click', prevSlide);
        
        // Auto slide
        if (!PERF_LITE) setInterval(nextSlide, 5000);
    }
    
    // Testimonial Slider functionality
    const testimonialSlider = document.querySelector('.testimonial-slider');
    if (testimonialSlider) {
        const testimonials = document.querySelectorAll('.testimonial');
        const testimonialPrevBtn = document.querySelector('.testimonial-prev');
        const testimonialNextBtn = document.querySelector('.testimonial-next');
        const testimonialDotsContainer = document.querySelector('.testimonial-dots');
        let currentTestimonial = 0;
        
        // Create dots
        testimonials.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.classList.add('testimonial-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToTestimonial(i));
            testimonialDotsContainer.appendChild(dot);
        });
        
        const testimonialDots = document.querySelectorAll('.testimonial-dot');
        
        function goToTestimonial(n) {
            testimonials[currentTestimonial].classList.remove('active');
            testimonialDots[currentTestimonial].classList.remove('active');
            
            currentTestimonial = (n + testimonials.length) % testimonials.length;
            
            testimonials[currentTestimonial].classList.add('active');
            testimonialDots[currentTestimonial].classList.add('active');
        }
        
        function nextTestimonial() {
            goToTestimonial(currentTestimonial + 1);
        }
        
        function prevTestimonial() {
            goToTestimonial(currentTestimonial - 1);
        }
        
        // Event listeners
        if (testimonialNextBtn) testimonialNextBtn.addEventListener('click', nextTestimonial);
        if (testimonialPrevBtn) testimonialPrevBtn.addEventListener('click', prevTestimonial);
        // Evita timers contínuos em máquinas lentas
        if (!PERF_LITE) setInterval(nextTestimonial, 6500);
    }
    
    // Form submission handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simulate form submission
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Enviando...';
            submitBtn.disabled = true;
            
            setTimeout(() => {
                alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
                contactForm.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 1500);
        });
    }
    
    // Newsletter form
    const newsletterForms = document.querySelectorAll('.newsletter-form');
    newsletterForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const input = this.querySelector('input[type="email"]');
            const button = this.querySelector('button[type="submit"]');
            const email = (input.value || '').trim().toLowerCase();
            const feedbackId = 'newsletter-feedback';

            // remove previous feedback element if any
            let feedback = this.querySelector('#' + feedbackId);
            if (feedback) feedback.remove();

            if (!email) return;

            // load saved emails
            const stored = localStorage.getItem('newsletterEmails');
            let emails = [];
            try { emails = stored ? JSON.parse(stored) : []; } catch(err) { emails = []; }

            // check duplicate
            if (emails.includes(email)) {
                feedback = document.createElement('div');
                feedback.id = feedbackId;
                feedback.className = 'form-feedback feedback-error show';
                feedback.textContent = 'E-mail já cadastrado. Verifique se digitou corretamente ou use outro e-mail.';
                this.appendChild(feedback);
                input.focus();
                return;
            }

            // save and show success
            emails.push(email);
            localStorage.setItem('newsletterEmails', JSON.stringify(emails));

            feedback = document.createElement('div');
            feedback.id = feedbackId;
            feedback.className = 'form-feedback feedback-success show';
            feedback.textContent = 'Obrigado por se inscrever! Você receberá novidades no seu e-mail.';
            this.appendChild(feedback);

            const originalHtml = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.disabled = true;

            setTimeout(() => {
                input.value = '';
                button.innerHTML = originalHtml;
                button.disabled = false;
            }, 1200);
        });
    });

    // Footer dynamic year (homepage)
    const yearHome = document.getElementById('yearHome');
    if (yearHome) {
        yearHome.textContent = String(new Date().getFullYear());
    }
});