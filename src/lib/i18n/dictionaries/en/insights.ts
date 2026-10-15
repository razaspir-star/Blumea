const cards = {
  evidenceYoutube: "Based on {count} YouTube videos",
  lengthSharedTitle: "Your {format} videos hold viewers better.",
  lengthSharedBody:
    "In your {betterCount} videos {side} — {domCount} of them {format} — viewers watched a median {betterPct}% of the video. In your {worseCount} {other} ones, {worsePct}%. Length and format go together in your videos, so Blumea can't tell which one it is.",
  sideUpTo: "up to {sec} sec",
  sideOver: "over {sec} sec",
  otherLonger: "longer",
  otherShorter: "shorter",
  lengthShortTitle: "Your shorter videos hold viewers better.",
  lengthLongTitle: "Your longer videos hold viewers better.",
  lengthBody:
    "In your {shortCount} videos up to {cutoff} sec, viewers watched a median {shortPct}% of the video. In your {longCount} longer ones, {longPct}%. A pattern in your videos — it doesn't prove length is the reason.",
  consistentTitle: "Your videos are consistent.",
  consistentBody:
    "A typical video of yours runs about {dur} sec and viewers watch about {pct}% of it. Shorter and longer ones don't differ clearly yet — a normal answer, not a missing one. Best at holding viewers: “{title}” ({bestPct}%).",
  notEnoughTitle: "Not enough videos yet.",
  notEnoughBody:
    "Blumea compares your videos with each other once {min} are analyzed — any mix of lengths is fine, and a consistent style is not a problem.",
  notEnoughEvidence: "{count} analyzed with watch data so far",
  payoffTitle: "The payoff often comes after viewers have left.",
  payoffBody:
    "In {fires} of your {of} videos with watch data, the key moment arrives after the average viewer has already stopped watching. Worth testing showing it earlier.",
  payoffEvidence: "Seen in {fires} analyzed videos",
  noFlagTitle: "Nothing to flag here yet.",
  noFlagBody:
    "Blumea calls out a pattern in your key moments only when at least {min} of your videos show it. Staying quiet is a normal answer.",
  dropsTitle: "There's often a sharp drop early on.",
  dropsBody:
    "In {count} of your {of} videos with retention data, the single biggest drop (8+ points at once) comes around {time}.",
  dropsEvidence: "Seen in {count} videos",
  noWatchTitle: "Nothing to watch out for yet.",
  noWatchBody: "No sharp drop shows up in at least {min} of your videos. Blumea stays quiet rather than invent a concern.",
  followersTitle: "Follower retention",
  followersTypical:
    "In a typical video about {pct} of the views come from people who already follow you — normal on a platform where most viewing is scrolling the feed.",
  followersTop: "The video your followers carried most: “{title}” ({pct} of its views{extra}).",
  followersTopExtra: ", about {n} views from followers per 100 followers",
  followersReach:
    "Your {higherCount} videos with more followers watching got a median {higher} views vs {lower} for the other {lowerCount}{tail}. A pattern in your videos; it doesn't prove followers are the reason.",
  followersReachSimilar: ", at a similar length",
  followersReachDiffers: " — but their lengths differ a lot, so it may be the length",
  followersGained:
    "New followers per 1,000 views: about {median} in a typical video; “{title}” won {gained} ({per1000} per 1,000 views).",
  followersLeftOut_one:
    "{count} video under {views} views is left out: a few followers can be most of a small audience, which says little about how well they were kept.",
  followersLeftOut_other:
    "{count} videos under {views} views are left out: a few followers can be most of a small audience, which says little about how well they were kept.",
  followersEvidence: "Based on {eligible} videos with {views}+ views",
  askTitle: "What your videos ask viewers to do",
  askNone: "Comments per 100 views: {rate} in your {count} videos that ask nothing.",
  askGroup: "{rate} in your {count} videos {ask}{same}.",
  askSame: " — about the same",
  askStandout: "One video, “{title}”, was {ask} (“{text}”) and got {rate} ({comments} comments){mult}.",
  askStandoutMult: " — about {x}× the videos that ask nothing",
  askStandoutNote:
    "Each of those is one video, not a pattern. Worth trying the same kind of ask again and seeing whether the comments repeat.",
  leftOutShort_one: "{count} video under {views} views left out.",
  leftOutShort_other: "{count} videos under {views} views left out.",
  askEvidence: "Based on {eligible} videos with {views}+ views; asks are read by AI from the video",
  rewatchTitle: "Rewatches",
  rewatchTypical:
    "In a typical video, YouTube's data shows the start being watched about {ratio} times per view{tail}.",
  rewatchSome: ", so some people watch again",
  rewatchFew: ", so few people watch again",
  rewatchLength: "Your {which} videos are watched again more ({a} vs {b}).",
  rewatchShorter: "shorter",
  rewatchLonger: "longer",
  rewatchStandout:
    "“{title}” ({dur} sec) stands out: {ratio} per view, while your other videos of similar length get about {usual}. Worth watching it again to see what is different — Blumea can't tell from the numbers whether it is the ending, the song or something else.",
  postSameTitle: "You post at the same time.",
  postSameBody:
    "{count} of your {of} videos went out {window}{hours}. With no variation there is nothing to compare, so Blumea can't say whether another time would work better for you. Worth testing a different time once.",
  postSameAround: " (around {h}:00)",
  postSameBetween: ", between {a}:00 and {b}:59",
  postSameEvidence: "Based on {count} videos",
  postPatternTitle: "When you post may matter.",
  postPatternBody:
    "Your {betterCount} videos posted {better} got a median {betterViews} views vs {worseViews} for your {worseCount} posted {worse}. A pattern in your videos; it doesn't prove the time is the reason.",
};

const exp = {
  askAgainTitle: "Invite a comment with a personal promise again",
  askAgainWhy:
    "{title} asked for comments and promised something back ({text}). It got {per100} comments per 100 views, about {x}× the {usual} of your videos that ask nothing. One video, not a pattern.",
  askAgainHow: "Look at comments per 100 views after a few days, and compare with that video and with your usual.",
  askAgainEvidence: "1 video, against {count} that ask nothing",
  askAgainExtra: "It also drew {comments} comments.",
  repeatTitle: "Make another video like {title}",
  repeatWhy:
    "It is your most-viewed: {views} views, {x}× the usual {usual} across your {count} videos with 1K+ views{format}. A second one shows whether it was the idea or a lucky post.",
  repeatFormat: ". It is a {format} video",
  repeatHow: "Compare its views after a few days with the usual, and with that video.",
  repeatEvidence: "{count} videos with 1K+ views",
  repeatExtra: "It is also your most-viewed: {views} views, {x}× your usual.",
  followersTitle: "Try a video in the style of {title}",
  followersWhy:
    "It won {gained} new followers, {per1000} per 1,000 views, while a typical video of yours wins about {median}.",
  followersHow: "Look at new followers per 1,000 views after a few days.",
  followersEvidence: "{count} videos with 1K+ views",
  followersExtra:
    "It also won {gained} new followers, {per1000} per 1,000 views, against about {median} for a typical video.",
  dropTitle: "Change something just before {time}",
  dropWhy:
    "In {count} of your {of} videos with retention data, the single biggest drop (8+ points at once) comes around {time}. Blumea can't tell what causes it.",
  dropHow: "Watch the retention curve of the new video around that second.",
  dropEvidence: "{count} of {of} videos",
  timeTitle: "Post one video at a different time",
  timeWhy:
    "{count} of your {of} videos went out {window}. With no variation, Blumea can't say whether another time would work better for you.",
  timeHow: "Compare the new video's views after three days with your usual, remembering it is one video.",
  timeEvidence: "{of} videos, all at about the same time",
  rewatchTitle: "Find what made {title} get rewatched",
  rewatchWhy:
    "Its start was watched {ratio} times per view, while your other videos of a similar length get about {usual}. Watch it again and note what is different, then try that in your next video.",
  rewatchHow: "Look at rewatches (how often the start is watched per view) of the new video.",
  rewatchEvidence: "{count} videos with 1K+ views",
  rewatchExtra: "It was also rewatched more than your other videos of its length ({ratio} starts per view).",
};

const insightTexts = { cards, exp };
export default insightTexts;
