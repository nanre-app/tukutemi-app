import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PROMPT, GEMINI_MODELS, calcSpeed, calcTotal } from '../../../lib/scoring';

// 列名・バケット名(schema.sql に合わせてある)
const POST_IMAGE_COLUMN = 'image_path';
const THEME_IMAGE_COLUMN = 'image_path';
const POST_BUCKET = 'post-images';
const THEME_BUCKET = 'theme-images';
export const maxDuration = 60; // Geminiの応答待ちで途中で切れないようにする(秒)

const clamp = (n) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));

async function downloadAsBase64(admin, bucket, path) {
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`画像の取得に失敗: ${bucket}/${path}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  return { mime: data.type || 'image/png', base64: buffer.toString('base64') };
}

// モデルを順番に試す。混雑(503)・上限(429)・廃止(404)などは次のモデルへ
async function askGemini(parts) {
  let lastStatus = 0;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(20000),
        }
      );
      if (res.ok) {
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { text, model, status: 200 };
        lastStatus = 0;
        continue;
      }
      lastStatus = res.status;
      console.error('gemini error', model, res.status, await res.text());
    } catch (e) {
      console.error('gemini request failed', model, e?.name);
    }
  }
  return { text: null, model: null, status: lastStatus };
}

export async function POST(request) {
  try {
    const { postId } = await request.json();
    const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
    if (!postId || !token) {
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 呼び出したのが本人か確認
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { data: post } = await admin.from('posts').select('*').eq('id', postId).single();
    if (!post || post.user_id !== userData.user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    // 採点済みなら再採点しない
    if (post.score_detail) {
      return NextResponse.json({ ok: true, already: true, score: post.score });
    }

    const { data: theme } = await admin.from('themes').select('*').eq('id', post.theme_id).single();
    if (!theme) {
      return NextResponse.json({ error: 'theme not found' }, { status: 400 });
    }

    const themeImg = await downloadAsBase64(admin, THEME_BUCKET, theme[THEME_IMAGE_COLUMN]);
    const postImg = await downloadAsBase64(admin, POST_BUCKET, post[POST_IMAGE_COLUMN]);

    const { text, model, status } = await askGemini([
      { text: PROMPT },
      { text: '1枚目: お題画像' },
      { inline_data: { mime_type: themeImg.mime, data: themeImg.base64 } },
      { text: '2枚目: 投稿画像' },
      { inline_data: { mime_type: postImg.mime, data: postImg.base64 } },
    ]);

    if (!text) {
      // どのモデルも使えなかった。採点は空のままにして、後で再試行できる
      return NextResponse.json({ error: 'gemini unavailable', status }, { status: 503 });
    }

    const ai = JSON.parse(text.replace(/```json|```/g, '').trim());

    const match = clamp(ai.match);
    const quality = clamp(ai.quality);
    const flagged = ai.flagged === true;
    const speed = calcSpeed(theme.starts_at, post.created_at, theme.post_window_minutes);
    const { total, appliedSpeed } = calcTotal({ match, quality, speed });
    const score = flagged ? 0 : total;

    const detail = {
      match,
      quality,
      speed,
      speed_applied: appliedSpeed,
      flagged,
      comment: String(ai.comment || '').slice(0, 40),
      model,
    };

    const { error: updErr } = await admin
      .from('posts')
      .update({ score, score_detail: detail })
      .eq('id', postId);
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, score, detail });
  } catch (e) {
    console.error('score error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}