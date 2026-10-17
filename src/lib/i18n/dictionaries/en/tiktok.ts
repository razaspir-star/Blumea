const picker = {
  title: "Add your TikTok numbers",
  step1: "In TikTok, open the video {profile} (not from a link) and tap {more}.",
  step1Profile: "from your Profile",
  step1More: "More insights",
  step2: "Take 3 screenshots in {video}:",
  step2Video: "Video analysis",
  shot1: "Overview, top of the screen",
  shot2: "Overview, scrolled down to the graph",
  shot3: "Viewers tab, top of the screen",
  step3: "Back here, choose them all together.",
  note: "Two are enough. Blumea reads the numbers and deletes the pictures right after.",
  choose: "Choose the screenshots",
  chosen_one: "{count} screenshot chosen",
  chosen_other: "{count} screenshots chosen",
  videoLabel: "Short animation: how to take the three screenshots in TikTok",
};

const tiktokUpload = {
  phoneOpenedTitle: "Your phone opened the page",
  phoneOpenedBody: "Choose the saved video there, and tap Send to Blumea.",
  phoneUploadingTitle: "Uploading from your phone",
  phoneUploadingBody: "Keep the page open on your phone. This can take a little, depending on the connection.",
  phoneReadingTitle: "Blumea is reading your video",
  phoneReadingBody: "About a minute. This window moves on by itself when it is done.",
  uploadingTitle: "Uploading your video",
  readingTitle: "Reading your video",
  uploadingBody: "Keep this window open. The file is only held for the analysis and deleted right after.",
  readingBody: "This takes about a minute.",
  qrAlt: "QR code to upload from your phone",
  easier: "Easier from your phone",
  qrBody:
    "Scan this with your phone camera. On the page that opens you can open the video in TikTok to save it, then pick it. This window shows what your phone is doing and moves on by itself when it's done.",
  drop: "Or drop the saved video here",
  chooseFile: "Choose file",
  optional: "Optional: how people watched it",
  screensHave: "This video already has numbers from your screenshots. Open to update them (optional).",
  phoneFailed: "Something went wrong with the upload from your phone.",
  analyze: "Analyze video",
};

const viewerCard = {
  readMine: "Read my screenshots",
  addSummary: "Add numbers from my TikTok screenshots (optional)",
  reading: "Reading your screenshots…",
  avg: "Average watch",
  ofVideo: "of a {dur} s video{pct}",
  full: "Watched to the end",
  mostStopped: "Most stopped at",
  newFollowers: "New followers",
  saves: "Saves",
  seconds: "{n} s",
  fromScreens: "From your TikTok screenshots, read on {date}.",
  where: "Where viewers came from",
  followersOthers: "Followers and others",
  followersLine: "{a} followers · {b} not following you",
  newReturning: "New and returning viewers",
  newLine: "{a} new · {b} returning",
  update: "Update with new screenshots",
  missingTitle: "Want the full picture?",
  missingBody: "Blumea didn't find numbers from these screens yet. Take a screenshot of each and add it below:",
};

const handoff = {
  expiredTitle: "This link has expired",
  expiredBody: "Open Blumea on your computer and scan a new code.",
  doneTitle: "Done",
  doneBody:
    "Your video was read. Go back to your computer, where Blumea shows what it understood. The files have been deleted.",
  keepPage: "Keep this page open.",
  takes: "This takes about a minute.",
  heading: "Upload your TikTok video",
  forVideo: "For: {title}",
  loading: "Loading…",
  step1: "Step 1 · Get the video",
  openIn: "Open the video in TikTok",
  step1Body:
    "In TikTok tap Share, then Save video. Then come back to this page. If the video is already saved on your phone, skip to step 2. (The analytics in step 3 are found from your Profile, not from this link.)",
  step2: "Step 2 · Choose the video",
  chooseSaved: "Choose the saved video",
  step3: "Step 3 · TikTok's numbers (optional)",
  send: "Send to Blumea",
  heldNote: "The video is only held while Blumea reads it, and deleted right after.",
};

const uploadErrors = {
  tooBig: "{name} is {mb} MB. The limit is {limit} MB.",
  aFile: "A file",
  couldNotStart: "Could not start the upload.",
  uploadFailed: "The upload didn't go through. Please try again.",
  notSignedIn: "Not signed in.",
  analysisFailed: "Analysis failed.",
  screensFailed: "Blumea couldn't read the screenshots.",
};

const analyzeModal = {
  kicker: "ANALYZE",
  title: "Analyze a video",
  description: "Blumea reads the video, how viewers watched it, and what to try next.",
  step0: "Reading video content",
  step1: "Understanding text & subtitles",
  step2: "Identifying hooks and key moments",
  step3: "Analyzing viewer behavior",
  step4: "Finding useful patterns",
  failed: "Analysis failed",
  back: "← Back",
  analyzingTitle: "Analyzing your video",
  analyzingBody: "Blumea is understanding your content and how viewers responded to it.",
  choosePlatform: "Choose a platform",
  wherePlatform: "Where is the video you want to analyze?",
  chooseVideo: "Choose a video",
  saveUpload: "Save and upload",
  capYoutube: "Full analysis, automatically.",
  capTiktok: "Upload a video you saved from TikTok for a full analysis.",
  chooseDifferent: "← Choose a different video",
  tiktokNoShare:
    "TikTok doesn't share the video file with us directly. {phone} - its Save video option (if you've enabled it for this video) isn't available on desktop.",
  tiktokPhone: "Open this on your phone, in the TikTok app",
  openToSave: "Open in TikTok to save",
  computerNote:
    "Working from a computer? Get the saved video onto it however's easiest for you - AirDrop, your phone's cloud photo backup, or sending it to yourself - then upload it below.",
  noVideosTiktok: "No videos found on this account.",
  noVideosYoutube: "No videos found on this channel.",
  notSignedIn: "Not signed in.",
  couldNotLoad: "Could not load your videos.",
  couldNotLoadTiktok: "Could not load your TikTok videos.",
  analysisFailed: "Analysis failed.",
};

const modalCommon = { close: "Close" };

const tiktokTexts = { picker, tiktokUpload, viewerCard, handoff, uploadErrors, analyzeModal, modalCommon };
export default tiktokTexts;
