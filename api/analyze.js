// Vercel Serverless Function for Diary Analysis (Updated model and reporting)
import { GoogleGenerativeAI } from "@google/generative-ai";
import Redis from "ioredis";

// Vercel Serverless Function 환경에서 Redis 연결 재사용을 위해 전역에 선언
let redis = null;
if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
}

export default async function handler(req, res) {
    // GET 요청 방지
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests allowed' });
    }

    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ message: 'Server configuration error: API Key missing' });
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });



        const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해줘. 답변 형식은 반드시 '감정: [요약된 감정]\n\n[응원 메시지]'와 같이 줄바꿈을 포함해서 보내줘.

일기 내용: "${content}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiResponse = response.text();

        // Redis에 저장 (고유 ID 생성: diary-YYYYMMDDHHMMSS)
        if (redis) {
            const now = new Date();
            const timestamp = now.getFullYear() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0') +
                String(now.getHours()).padStart(2, '0') +
                String(now.getMinutes()).padStart(2, '0') +
                String(now.getSeconds()).padStart(2, '0');

            const diaryId = `diary-${timestamp}`;
            const diaryData = {
                id: diaryId,
                content: content,
                aiResponse: aiResponse,
                createdAt: now.toISOString()
            };

            await redis.set(diaryId, JSON.stringify(diaryData));
            console.log(`Successfully saved to Redis with key: ${diaryId}`);
        }

        return res.status(200).json({ response: aiResponse });
    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({
            message: `AI 분석 중 오류가 발생했습니다: ${error.message}`,
            detail: error.stack
        });
    }
}


