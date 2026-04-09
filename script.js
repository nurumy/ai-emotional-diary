import { GoogleGenerativeAI } from "@google/generative-ai";

document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const diaryInput = document.getElementById('diary-input');
    const aiText = document.getElementById('ai-text');
    const responseBox = document.getElementById('ai-response-box');
    const historyList = document.getElementById('history-list');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');


    // Initialize Gemini API
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    let model = null;
    let diaries = JSON.parse(localStorage.getItem('diaries') || '[]');
    let emotionChart = null;


    if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.warn('GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    } else {
        const genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    // Storage and Rendering Logic
    const saveToLocalStorage = () => {
        localStorage.setItem('diaries', JSON.stringify(diaries));
    };

    const deleteDiary = (id) => {
        if (confirm('이 일기 기록을 삭제할까요?')) {
            diaries = diaries.filter(d => d.id !== id);
            saveToLocalStorage();
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


    // Initial Render
    renderHistory();



    // Analysis Logic with Gemini
    analyzeBtn.addEventListener('click', async () => {
        const text = diaryInput.value.trim();

        if (!text) {
            alert('오늘의 하루를 먼저 기록해주세요!');
            return;
        }

        if (!model) {
            alert('API 키가 올바르게 설정되지 않았습니다. .env 파일을 확인해 주세요.');
            return;
        }

        // Show loading state
        aiText.innerText = 'AI가 당신의 마음을 읽고 있어요... 잠시만 기다려주세요.';
        aiText.style.opacity = '0.5';
        responseBox.style.background = '#e5e7eb';
        analyzeBtn.disabled = true;

        try {
            const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해줘. 답변 형식은 반드시 '감정: [요약된 감정]\n\n[응원 메시지]'와 같이 줄바꿈을 포함해서 보내줘.

일기 내용: "${text}"`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const aiResponse = response.text();

            aiText.innerText = aiResponse;
            aiText.style.color = '#1f2937';
            responseBox.style.background = '#f3f4f6';

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

            diaries.push(newEntry);
            saveToLocalStorage();
            renderHistory();

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
