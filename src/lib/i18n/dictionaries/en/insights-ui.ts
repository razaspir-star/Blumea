const formats = {
  title: "Your formats on {platform}",
  intro: "How your own videos compare by format: what a typical video of each format got (the middle value, so one viral video does not distort it), with the number of videos behind each.",
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
  bestBody: "{format} videos do better for you than your other videos: they typically get {median} {metric}, against {rest} for the rest. {beating} of {count} {format} videos got more than {rest} {metric}.",
  bestKeep: "Worth making more of these.",
  bestConfounded: "These videos also differ a lot in length from your others, so part of their success may come from the length and not the format.",
  bestNote: "Based on {count} of your videos.",
  metricViews: "views",
  metricLikes: "likes",
  gapPattern: "In your videos, {better} got more {metric} than {worse}: typically {a} against {b} ({ac} vs {bc} videos).",
  gapConfounded: "{better} videos got more {metric} than {worse} videos (typically {a} against {b}), but they also differ a lot in length (typically {la} against {lb}). Try the same format at the other length to see which one matters.",
  withinTitle: "Length inside a format",
  withinText: "{format}: in your {half} shorter videos (up to {upTo} s) people typically watched {sw} s ({sp}% of the video), against {lw} s ({lp}% of the video) in your {half} longer videos ({from} s and up).",
  withinStay: "Viewers stay longer in the longer videos, so length does not look like what holds them back.",
  withinSame: "People leave at about the same moment in both, so the longer videos lose a bigger share of the video. Try a shorter version of the same idea.",
  withinNone: "Length does not clearly change how people watch this format.",
  notEnoughOne:
    "Your videos share one format, {format} - a consistent style. Blumea compares formats only when you use more than one, and never asks you to change yours.",
  notEnoughMany:
    "Blumea compares formats once it has {total} analyzed videos ({have} so far) and at least two formats with {per} videos each. Nothing here is a problem to fix.",
  noGap: "No clear difference between your formats yet.",
  tooFew: "Too few videos to compare yet: {list}.",
  basedOn: "Based on {total} analyzed {platform} videos. Small groups are noisy - take the numbers loosely.",
  nicheTitle: "Formats in your niche",
  nicheBody:
    "Coming later. To say which formats suit your niche, Blumea needs data from other creators in it, and won't guess in the meantime.",
};

const insightsPage = {
  title: "Insights",
  subtitle: "Patterns Blumea found across your content, and how sure it is about each one.",
  toneFact: "Worth knowing",
  emptyTitle: "No insights yet",
  emptyBody: "Analyze a few of your videos and Blumea will look for patterns across them. Each insight says how many videos it is based on.",
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
