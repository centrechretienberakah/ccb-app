export async function GET() {
  const API_KEY = process.env.YOUTUBE_API_KEY
  const CHANNEL_ID = "UCFwp158Jrg_AKlYm6Wdg4kw"

  const url =
    "https://www.googleapis.com/youtube/v3/search" +
    "?key=" + API_KEY +
    "&channelId=" + CHANNEL_ID +
    "&part=snippet,id" +
    "&order=date" +
    "&maxResults=10"

  const res = await fetch(url)
  const data = await res.json()

  return Response.json(data)
}
