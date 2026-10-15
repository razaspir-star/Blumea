const formats = {
  title: "Your formats",
  intro: "How your own YouTube videos compare by format. Typical (median) values, with the number of videos behind each.",
  colFormat: "Format",
  colVideos: "Videos",
  colViews: "Views",
  colLikes: "Likes",
  colStayed: "Stayed to watch ≈",
  colStayedTitle: "Estimate, see the video page",
  colWatched: "Watched of the video",
  colLength: "Typical length",
  seconds: "{n} s",
  none: "No format has {min} analyzed videos yet, so there is nothing to compare.",
  bestTitle: "Formats that work for you",
  bestBody:
    "Your {format} videos usually do better than your other videos: a median of {median} {metric} vs {rest}, and {beating} of {count} of them beat your other videos' median.",
  bestKeep: "Worth keeping in the mix.",
  bestConfounded:
    "They also differ a lot in length from your other videos, so some of it may be the length rather than the format.",
  bestNote: "A pattern in your {count} videos; it doesn't prove the format is the reason.",
  metricViews: "views",
  metricLikes: "likes",
  gapPattern:
    "In your videos, {better} got more {metric} than {worse}: a median of {a} vs {b} ({ac} vs {bc} videos). This is a pattern in your videos; it doesn't prove the format is the reason.",
  gapConfounded:
    "{better} videos got more {metric} than {worse} videos (median {a} vs {b}), but they are also very different in length (typically {la} vs {lb}). Blumea can't tell whether the format or the length is behind the gap, so it won't say.",
  withinTitle: "Length inside a format",
  withinText:
    "{format}: your {half} shorter videos (up to {upTo} s) were watched for a median {sw} s ({sp}% of the video); your {half} longer ones (from {from} s), {lw} s ({lp}%).",
  withinStay: "Viewers stay longer on the longer ones, so length doesn't look like what's limiting them.",
  withinSame:
    "Viewers stop at about the same point either way, so the longer ones lose a bigger share — a tighter cut of the same piece may be worth a try.",
  withinNone: "Length doesn't clearly change how people watch this format.",
  notEnoughOne:
    "Your videos share one format, {format} — a consistent style. Blumea compares formats only when you use more than one, and never asks you to change yours.",
  notEnoughMany:
    "Blumea compares formats once it has {total} analyzed videos ({have} so far) and at least two formats with {per} videos each. Nothing here is a problem to fix.",
  noGap: "No clear difference between your formats yet.",
  tooFew: "Too few videos to compare yet: {list}.",
  basedOn: "Based on {total} analyzed YouTube videos. Small groups are noisy — take the numbers loosely.",
  nicheTitle: "Formats in your niche",
  nicheBody:
    "Coming later. To say which formats suit your niche, Blumea needs data from other creators in it, and won't guess in the meantime.",
};

const insightsPage = {
  title: "Insights",
  subtitle: "Patterns Blumea found across your content, and how sure it is about each one.",
  toneFact: "Worth knowing",
  emptyTitle: "No insights yet",
  emptyBody:
    "Analyze a few of your videos and Blumea will look for patterns across them. Each insight says how many videos it rests on, and Blumea stays quiet when there is not enough to say. Small samples are noisy, so it won't guess.",
  analyzeLink: "Analyze a video →",
  trendsTitle: "Trends",
  trendsBody:
    "No confirmed trends yet. Blumea only shows a trend when there is real data behind it, and there is no official trend source for these platforms today. Trends will appear here when they can be backed up.",
};

const experimentsBox = {
  title: "Try in your next video",
  subtitle: "Ideas to test, drawn from your own videos. Nothing here is a promise.",
  emptyTitle: "Nothing to suggest yet.",
  emptyBody:
    "Blumea suggests an experiment only when your own videos show something specific to test. With more videos read, suggestions will appear here.",
  worthTesting: "Worth testing",
  howKnow: "How you'll know: ",
};

const insightsUi = { formats, insightsPage, experimentsBox };
export default insightsUi;
