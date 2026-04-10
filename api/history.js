import Redis from "ioredis";
import { supabase } from "./lib/supabase.js";

let redis = null;
if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests allowed' });
    }

    if (!redis) {
        return res.status(500).json({ message: 'Redis connection not available' });
    }

    try {
        // Authorization 헤더 확인 및 사용자 검증
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        const userId = user.id;

        // 사용자별 diary-* 키 가져오기
        const keys = await redis.keys(`user:${userId}:diary-*`);

        if (keys.length === 0) {
            return res.status(200).json({ history: [] });
        }

        // 키들에 해당하는 모든 데이터 가져오기
        const values = await redis.mget(keys);

        // JSON 파싱 및 데이터 정제
        let history = values.map(val => JSON.parse(val));

        // 최신순 정렬 (ID 또는 createdAt 기준)
        history.sort((a, b) => b.id.localeCompare(a.id));

        return res.status(200).json({ history });
    } catch (error) {
        console.error('Redis History Error:', error);
        return res.status(500).json({ message: '보관함 데이터를 가져오는데 실패했습니다.', error: error.message });
    }
}

