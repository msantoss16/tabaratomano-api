import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';

const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET || '';

const client = new TwitterApi({
  appKey: TWITTER_API_KEY,
  appSecret: TWITTER_API_SECRET,
  accessToken: TWITTER_ACCESS_TOKEN,
  accessSecret: TWITTER_ACCESS_SECRET,
});

// v1 client is explicitly for media uploads
const rwClient = client.readWrite;

interface TweetPayload {
  title: string;
  body: string;
  link: string;
  image_url: string;
}

export async function sendTweet(payload: TweetPayload): Promise<void> {
  const { title, body, link, image_url } = payload;

  // Build tweet text with real newlines (not escaped \n literals)
  // The body from WhatsApp already contains the link embedded, so only
  // append the link as a suffix if it's not already present in the body.
  const bodyHasLink = link && body.includes(link);
  const linkSuffix = link && !bodyHasLink ? `\n\n${link}` : '';
  const text = `${body}${linkSuffix}`;

  let mediaId: string | undefined;

  // Try to download and upload the image first if provided
  if (image_url) {
    try {
      console.log(`[Twitter] Baixando imagem: ${image_url}`);
      const response = await axios.get(image_url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');

      const mimeType = String(response.headers['content-type'] || 'image/jpeg');
      // MimeType provided by Twitter requires specific types

      console.log(`[Twitter] Fazendo upload da mídia pro X...`);
      mediaId = await rwClient.v1.uploadMedia(buffer, { mimeType });
      console.log(`[Twitter] Mídia enviada. ID: ${mediaId}`);
    } catch (error) {
      // If we fail to upload media, we still want to send the tweet (just without the media)
      console.error(`[Twitter] Falha ao processar e enviar mídia:`, error);
    }
  }

  // Post Tweet (v2 API)
  try {
    const postPayload: any = { text };

    if (mediaId) {
      postPayload.media = { media_ids: [mediaId] };
    }

    console.log(`[Twitter] Enviando tweet...`);
    const tweet = await rwClient.v2.tweet(postPayload);
    console.log(`[Twitter] Tweet enviado com sucesso! ID: ${tweet.data.id}`);
  } catch (error) {
    console.error(`[Twitter] Erro ao enviar tweet:`, error);
    throw error;
  }
}
