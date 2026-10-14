const fieldLabel = {
  categories: "Category",
  format: "Format",
  layout: "How it's shown",
  hook_style: "Style",
  hook_type: "Opening",
  familiar_moment: "Familiar moment",
  topic: "Content",
  subtitles_detected: "Subtitles",
  on_screen_texts: "On-screen text",
  spoken_hook_text: "Spoken hook",
  sung_hook_lyrics: "Sung hook",
  call_to_action: "Asks viewers to",
  visual_hook: "Visual hook",
  sound_kind: "Sound",
  speech_language: "Language",
  music_description: "Music",
  sound_candidate: "Possible sound",
  known_format_or_trend: "Trend",
  subject_specific: "Subject",
};

const cta = {
  comment_question: "Comment (opinion)",
  comment_invite: "Comment (personal promise)",
  follow: "Follow",
  like_or_share: "Like or share",
  tag_friend: "Tag someone",
  link_or_buy: "Visit a link",
  other: "Other ask",
  generic: "Ask",
};

const analysis = {
  fieldLabel,
  cta,
  back: "Content",
  loading: "Loading…",
  secondsShort: "{count} sec",
  alsoFits: "{base} (also: {also})",
  maybe: "Maybe: {text}",
  yes: "Yes",
  no: "No",
  likely: "Likely",
  notSure: "Not sure",
  howViewersWatched: "How viewers watched",
  needsDays: "{platform} usually needs 2–3 days after posting before it reports how people watched. Check back later.",
  notReported: "{platform} hasn't reported viewer behavior for this video.",
  vsUsual: "vs your usual {median}",
  vsCohort: "vs your usual {label} videos: {median}",
  cohortNoun: "{label} videos",
  cohortNounAll: "analyzed videos",
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saves: "Saves",
  reposts: "Reposts",
  notAvailableOn: "Not available on {platform}",
  viewerBehavior: "Viewer behavior",
  onlyYou: "From YouTube Analytics — only you can see this, not public.",
  averageWatch: "Average watch",
  ofVideo: "of a {count} sec video",
  biggestDrop: "Biggest drop",
  around: "Around {time}",
  notEnough: "Not enough data yet",
  stayed: "Stayed to watch (estimate)",
  stayedNote:
    "Viewers who watched past the first frame instead of swiping away. YouTube Studio's own figure can differ by a couple of points.",
  howFound: "How viewers found this video",
  subsVsNew: "Subscribers vs. new viewers",
  subscribers: "Subscribers",
  notSubscribed: "Not subscribed",
  avgWatchShort: "{time} avg watch",
  keepAndTest: "What to keep and what to test",
  smallNumbers: " Small numbers (under 1,000 views) — take this loosely.",
  payoffDisclaimer:
    "Based on this one video. Not a pattern yet — Blumea needs more of your analyzed history before it can say this usually helps.",
  payoffBody:
    "The payoff ({what}) comes at {at} of a {duration} sec video. The average viewer watched {avg}, so many viewers may leave before it.",
  payoffAction:
    "Worth testing: showing it about {sec} seconds earlier. No way to know yet if that changes anything for you, but it's a concrete, testable change.",
  commentDisclaimer:
    "Comment rate compared with your other {count} videos; the text is as the AI read it. One video, so no proof the text was the reason.",
  commentBody:
    "This video drew {comments} comments — about {per100} per 100 views vs your usual {usual} (about {multiple}×).",
  commentQuote: "Its on-screen text: “{quote}”",
  commentAction: "Worth trying a similar direct invitation again and seeing if comments repeat.",
  strongDisclaimer:
    "Keep: estimate from YouTube's engaged views (Studio's own figure can differ by a couple of points). Compared with your other {count} {noun}; the quote is as the AI read it.{small}",
  strongBody: "Your hook, “{quote}”, comes with a strong opening: about {pct} stayed to watch {vs}.",
  strongAction: "Keep opening with a clear promise.",
  weakDisclaimer:
    "Estimate from YouTube's engaged views (Studio's own figure can differ by a couple of points). Compared with your other {count} {noun}.{small}",
  weakBody:
    "More viewers than usual left in the opening: about {pct} stayed to watch {vs}. The first seconds have no text on screen.",
  weakAction:
    "Worth testing: a short text on screen in the first second. You don't have data yet on whether that helps you, but it's specific enough to try.",
  dropDisclaimer: "Based on this one video's retention curve.",
  dropBody: "Most viewers leave around {at} — a {points}-point drop at that single point.",
  dropMoment: "At that point: {what}",
  dropAction: "This may contribute to why fewer viewers stay past this point.",
  experimentDisclaimer: "A concrete, testable change — not a claim that it helps.",
  understood: "What Blumea understood",
  understoodNote:
    "Read directly from the video by AI. Recommendations need more of your history before Blumea will show them here.",
  noAnalysis: "No analysis yet for this video.",
  soundFromTiktok: "Sound (from TikTok)",
};

const analysisTexts = { analysis };
export default analysisTexts;
