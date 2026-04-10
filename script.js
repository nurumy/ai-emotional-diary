// Frontend Script for AI Emotional Diary
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase Configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const diaryInput = document.getElementById('diary-input');
    const aiText = document.getElementById('ai-text');
    const responseBox = document.getElementById('ai-response-box');
    const historyList = document.getElementById('history-list');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    // Auth Elements
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');

    // Modal Elements
    const customModal = document.getElementById('custom-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    const showModal = (msg) => {
        modalMessage.textContent = msg;
        customModal.style.display = 'flex';
    };

    modalCloseBtn.addEventListener('click', () => {
        customModal.style.display = 'none';
    });




    // Initialize Data
    let diaries = [];
    let emotionChart = null;



    // Cloud History Logic
    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/history');
            if (res.ok) {
                const data = await res.json();
                diaries = data.history.map(item => ({
                    ...item,
                    // Redis 데이터 형식 호환을 위해 날짜 처리
                    date: new Date(item.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }),
                    timestamp: new Date(item.createdAt).getTime(),
                    emotion: item.aiResponse.match(/감정:\s*([^\n]+)/)?.[1]?.trim() || '평온'
                }));

                renderHistory();
            }
        } catch (error) {
            console.error('History Fetch Error:', error);
        }
    };


    const deleteDiary = (id) => {
        // 현재는 Redis 삭제 API가 없으므로 로컬 UI에서만 필터링 (다음 단계에서 API 추가 권장)
        if (confirm('이 일기 기록을 목록에서 숨길까요? (서버 데이터는 유지됩니다)')) {
            diaries = diaries.filter(d => d.id !== id);
            renderHistory();
        }
    };


    const renderHistory = () => {
        historyList.innerHTML = '';

        if (diaries.length === 0) {
            historyList.innerHTML = '<p class="empty-msg">아직 기록된 일기가 없습니다. 첫 일기를 작성해 보세요!</p>';
            return;
        }

        // Sort by timestamp descending
        const sortedDiaries = [...diaries].sort((a, b) => b.timestamp - a.timestamp);

        sortedDiaries.forEach(diary => {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-header">
                    <span class="history-date">${diary.date}</span>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="history-emotion">${diary.emotion}</span>
                        <button class="delete-btn" data-id="${diary.id}">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                </div>
                <p class="history-content">${diary.content}</p>
                <div class="history-ai-response">${diary.aiResponse}</div>
            `;

            const delBtn = card.querySelector('.delete-btn');
            delBtn.addEventListener('click', () => deleteDiary(diary.id));

            historyList.appendChild(card);
        });

        lucide.createIcons();
        renderChart();
    };

    const renderChart = () => {
        const ctx = document.getElementById('emotion-chart').getContext('2d');
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        if (diaries.length === 0) {
            if (emotionChart) emotionChart.destroy();
            return;
        }

        const emotionCounts = diaries.reduce((acc, d) => {
            acc[d.emotion] = (acc[d.emotion] || 0) + 1;
            return acc;
        }, {});

        const labels = Object.keys(emotionCounts);
        const data = Object.values(emotionCounts);
        const colors = [
            '#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'
        ];

        if (emotionChart) {
            emotionChart.destroy();
        }

        emotionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: isDark ? '#1e293b' : '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: isDark ? '#f8fafc' : '#1f2937',
                            font: {
                                family: 'Noto Sans KR',
                                size: 14
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const value = context.raw;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return ` ${context.label}: ${value}회 (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    };


    // Theme Management
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('diary-theme', theme);

        themeToggle.innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" id="theme-icon"></i>`;
        lucide.createIcons();
        if (emotionChart) renderChart();
    };
    const savedTheme = localStorage.getItem('diary-theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(savedTheme || systemTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    });


    // --- Auth Logic ---
    const updateUIForAuth = (session) => {
        if (session) {
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            userInfo.style.display = 'flex';
            userEmailSpan.textContent = session.user.email;
            fetchHistory();
        } else {
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            userInfo.style.display = 'none';
        }
    };

    // Listen for Auth State Changes
    supabase.auth.onAuthStateChange((_event, session) => {
        updateUIForAuth(session);
    });

    // Email/Password Signup
    signupBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (!email || !password) return showModal('이메일과 비밀번호를 입력해주세요.');

        const { error } = await supabase.auth.signUp({ email, password });
        if (error) showModal(`회원가입 오류: ${error.message}`);
        else showModal('가입 확인 이메일을 확인해주세요!');
    });

    // Email/Password Login
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (!email || !password) return showModal('이메일과 비밀번호를 입력해주세요.');

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) showModal(`로그인 오류: ${error.message}`);
    });

    // Google Login
    googleLoginBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) showModal(`Google 로그인 오류: ${error.message}`);
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) showModal(`로그아웃 오류: ${error.message}`);
    });








    // Analysis Logic with Gemini
    analyzeBtn.addEventListener('click', async () => {
        const text = diaryInput.value.trim();

        if (!text) {
            alert('오늘의 하루를 먼저 기록해주세요!');
            return;
        }

        // Show loading state
        aiText.innerText = 'AI가 당신의 마음을 읽고 있어요... 잠시만 기다려주세요.';
        aiText.style.opacity = '0.5';
        responseBox.style.background = 'rgba(0,0,0,0.05)';
        analyzeBtn.disabled = true;

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || '서버 응답 오류');
            }

            const data = await res.json();
            const aiResponse = data.response;

            aiText.innerText = aiResponse;
            aiText.style.opacity = '1';
            aiText.style.color = 'var(--text-main)';
            responseBox.style.background = 'var(--input-bg)';


            // Save to history
            const emotionMatch = aiResponse.match(/감정:\s*([^\n]+)/);
            const emotion = emotionMatch ? emotionMatch[1].trim() : '평온';

            const newEntry = {
                id: Date.now(),
                date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }),
                content: text,
                emotion: emotion,
                aiResponse: aiResponse,
                timestamp: Date.now()
            };

            // Refresh from Cloud to get synced data (or manually update for speed)
            await fetchHistory();


        } catch (error) {
            console.error('Gemini API 오류:', error);
            aiText.innerText = `분석 중에 문제가 발생했습니다: ${error.message || '알 수 없는 오류'}\n다시 한 번 시도해 주세요.`;
            aiText.style.color = '#ef4444';
        } finally {

            analyzeBtn.disabled = false;
        }

    });

    // Real Voice Recognition (Web Speech API)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        voiceBtn.style.display = 'none';
        console.warn('이 브라우저는 음성 인식을 지원하지 않습니다.');
    } else {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.continuous = true;
        recognition.interimResults = true;

        let isListening = false;

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                const currentText = diaryInput.value.trim();
                diaryInput.value = currentText ? `${currentText} ${finalTranscript}` : finalTranscript;
                diaryInput.scrollTop = diaryInput.scrollHeight;
            }
        };

        recognition.onstart = () => {
            isListening = true;
            voiceBtn.innerHTML = '<i data-lucide="mic-off"></i> 음성 인식 중...';
            voiceBtn.classList.add('recording');
            lucide.createIcons();
            diaryInput.placeholder = '말씀하시는 내용을 텍스트로 변환하고 있습니다...';
        };

        recognition.onend = () => {
            isListening = false;
            voiceBtn.innerHTML = '<i data-lucide="mic"></i> 음성으로 입력하기';
            voiceBtn.classList.remove('recording');
            lucide.createIcons();
            diaryInput.placeholder = '이곳에 오늘 있었던 일과 느꼈던 마음을 자유롭게 적어보세요...';
        };

        recognition.onerror = (event) => {
            console.error('음성 인식 오류:', event.error);
            isListening = false;
            recognition.stop();
        };

        voiceBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    }

    // Visual feedback for textarea
    diaryInput.addEventListener('focus', () => {
        responseBox.style.transform = 'scale(0.99)';
    });
    diaryInput.addEventListener('blur', () => {
        responseBox.style.transform = 'scale(1)';
    });
});
