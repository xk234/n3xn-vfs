/**
 * n3xn cloak presets — education + productivity + general
 * Favicons via Google faviconV2 (no proxy required)
 */
export function gFav(url, size = 64) {
  const u = encodeURIComponent(url.startsWith("http") ? url : "https://" + url);
  return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${u}&size=${size}`;
}

/** @type {{id:string,label:string,title:string,site:string,group:string}[]} */
export const CLOAK_PRESETS = [
  { id: "g-classroom", label: "Google Classroom", title: "Classes", site: "https://classroom.google.com/", group: "Google" },
  { id: "g-drive", label: "Google Drive", title: "My Drive - Google Drive", site: "https://drive.google.com/", group: "Google" },
  { id: "g-docs", label: "Google Docs", title: "Google Docs", site: "https://docs.google.com/document/", group: "Google" },
  { id: "g-sheets", label: "Google Sheets", title: "Google Sheets", site: "https://docs.google.com/spreadsheets/", group: "Google" },
  { id: "g-slides", label: "Google Slides", title: "Google Slides", site: "https://docs.google.com/presentation/", group: "Google" },
  { id: "g-forms", label: "Google Forms", title: "Google Forms", site: "https://docs.google.com/forms/", group: "Google" },
  { id: "g-mail", label: "Gmail", title: "Inbox - Gmail", site: "https://mail.google.com/", group: "Google" },
  { id: "g-calendar", label: "Google Calendar", title: "Google Calendar", site: "https://calendar.google.com/", group: "Google" },
  { id: "g-meet", label: "Google Meet", title: "Meet - Google Meet", site: "https://meet.google.com/", group: "Google" },
  { id: "g-sites", label: "Google Sites", title: "Google Sites", site: "https://sites.google.com/", group: "Google" },
  { id: "g-translate", label: "Google Translate", title: "Google Translate", site: "https://translate.google.com/", group: "Google" },
  { id: "g-search", label: "Google Search", title: "Google", site: "https://www.google.com/", group: "Google" },
  { id: "g-scholar", label: "Google Scholar", title: "Google Scholar", site: "https://scholar.google.com/", group: "Google" },
  { id: "g-books", label: "Google Books", title: "Google Books", site: "https://books.google.com/", group: "Google" },
  { id: "g-earth", label: "Google Earth", title: "Google Earth", site: "https://earth.google.com/", group: "Google" },
  { id: "g-maps", label: "Google Maps", title: "Google Maps", site: "https://maps.google.com/", group: "Google" },
  { id: "g-photos", label: "Google Photos", title: "Google Photos", site: "https://photos.google.com/", group: "Google" },
  { id: "g-keep", label: "Google Keep", title: "Google Keep", site: "https://keep.google.com/", group: "Google" },
  { id: "g-jamboard", label: "Jamboard", title: "Jamboard", site: "https://jamboard.google.com/", group: "Google" },
  { id: "g-chat", label: "Google Chat", title: "Chat", site: "https://chat.google.com/", group: "Google" },
  { id: "canvas", label: "Canvas", title: "Canvas", site: "https://canvas.instructure.com/", group: "LMS" },
  { id: "schoology", label: "Schoology", title: "Schoology", site: "https://app.schoology.com/", group: "LMS" },
  { id: "blackboard", label: "Blackboard", title: "Blackboard Learn", site: "https://www.blackboard.com/", group: "LMS" },
  { id: "moodle", label: "Moodle", title: "Moodle", site: "https://moodle.org/", group: "LMS" },
  { id: "brightspace", label: "Brightspace / D2L", title: "Brightspace", site: "https://www.d2l.com/", group: "LMS" },
  { id: "itslearning", label: "itslearning", title: "itslearning", site: "https://www.itslearning.com/", group: "LMS" },
  { id: "powerschool", label: "PowerSchool", title: "PowerSchool", site: "https://www.powerschool.com/", group: "LMS" },
  { id: "infinite-campus", label: "Infinite Campus", title: "Infinite Campus", site: "https://www.infinitecampus.com/", group: "LMS" },
  { id: "skyward", label: "Skyward", title: "Skyward", site: "https://www.skyward.com/", group: "LMS" },
  { id: "aeries", label: "Aeries", title: "Aeries", site: "https://www.aeries.com/", group: "LMS" },
  { id: "clever", label: "Clever", title: "Clever | Portal", site: "https://clever.com/", group: "LMS" },
  { id: "classlink", label: "ClassLink", title: "ClassLink", site: "https://www.classlink.com/", group: "LMS" },
  { id: "edmodo", label: "Edmodo", title: "Edmodo", site: "https://www.edmodo.com/", group: "LMS" },
  { id: "seesaw", label: "Seesaw", title: "Seesaw", site: "https://app.seesaw.me/", group: "LMS" },
  { id: "google-workspace-edu", label: "Workspace for Education", title: "Google Workspace for Education", site: "https://edu.google.com/", group: "LMS" },
  { id: "khan", label: "Khan Academy", title: "Khan Academy", site: "https://www.khanacademy.org/", group: "Learning" },
  { id: "ixl", label: "IXL", title: "IXL | Math, Language Arts, Science…", site: "https://www.ixl.com/", group: "Learning" },
  { id: "edgenuity", label: "Edgenuity", title: "Edgenuity", site: "https://www.edgenuity.com/", group: "Learning" },
  { id: "apex", label: "Apex Learning", title: "Apex Learning", site: "https://www.apexlearning.com/", group: "Learning" },
  { id: "pearson", label: "Pearson", title: "Pearson", site: "https://www.pearson.com/", group: "Learning" },
  { id: "mh", label: "McGraw Hill", title: "McGraw Hill", site: "https://www.mheducation.com/", group: "Learning" },
  { id: "cengage", label: "Cengage", title: "Cengage", site: "https://www.cengage.com/", group: "Learning" },
  { id: "ck12", label: "CK-12", title: "CK-12 Foundation", site: "https://www.ck12.org/", group: "Learning" },
  { id: "brainpop", label: "BrainPOP", title: "BrainPOP", site: "https://www.brainpop.com/", group: "Learning" },
  { id: "newsela", label: "Newsela", title: "Newsela", site: "https://newsela.com/", group: "Learning" },
  { id: "commonlit", label: "CommonLit", title: "CommonLit", site: "https://www.commonlit.org/", group: "Learning" },
  { id: "readworks", label: "ReadWorks", title: "ReadWorks", site: "https://www.readworks.org/", group: "Learning" },
  { id: "quizlet", label: "Quizlet", title: "Quizlet", site: "https://quizlet.com/", group: "Learning" },
  { id: "kahoot", label: "Kahoot!", title: "Kahoot!", site: "https://kahoot.com/", group: "Learning" },
  { id: "blooket", label: "Blooket", title: "Blooket", site: "https://www.blooket.com/", group: "Learning" },
  { id: "gimkit", label: "Gimkit", title: "Gimkit", site: "https://www.gimkit.com/", group: "Learning" },
  { id: "quizizz", label: "Quizizz", title: "Quizizz", site: "https://quizizz.com/", group: "Learning" },
  { id: "desmos", label: "Desmos", title: "Desmos | Graphing Calculator", site: "https://www.desmos.com/", group: "Learning" },
  { id: "geogebra", label: "GeoGebra", title: "GeoGebra", site: "https://www.geogebra.org/", group: "Learning" },
  { id: "wolfram", label: "Wolfram Alpha", title: "Wolfram|Alpha", site: "https://www.wolframalpha.com/", group: "Learning" },
  { id: "duolingo", label: "Duolingo", title: "Duolingo", site: "https://www.duolingo.com/", group: "Learning" },
  { id: "prodigy", label: "Prodigy", title: "Prodigy Math", site: "https://www.prodigygame.com/", group: "Learning" },
  { id: "abcya", label: "ABCya", title: "ABCya", site: "https://www.abcya.com/", group: "Learning" },
  { id: "pbskids", label: "PBS Kids", title: "PBS Kids", site: "https://pbskids.org/", group: "Learning" },
  { id: "codeorg", label: "Code.org", title: "Code.org", site: "https://code.org/", group: "Learning" },
  { id: "scratch", label: "Scratch", title: "Scratch - Imagine, Program, Share", site: "https://scratch.mit.edu/", group: "Learning" },
  { id: "replit-edu", label: "Replit", title: "Replit", site: "https://replit.com/", group: "Learning" },
  { id: "codecademy", label: "Codecademy", title: "Codecademy", site: "https://www.codecademy.com/", group: "Learning" },
  { id: "coursera", label: "Coursera", title: "Coursera", site: "https://www.coursera.org/", group: "Learning" },
  { id: "edx", label: "edX", title: "edX", site: "https://www.edx.org/", group: "Learning" },
  { id: "khanmigo", label: "Khanmigo", title: "Khanmigo", site: "https://www.khanmigo.ai/", group: "Learning" },
  { id: "turnitin", label: "Turnitin", title: "Turnitin", site: "https://www.turnitin.com/", group: "Learning" },
  { id: "grammarly", label: "Grammarly", title: "Grammarly", site: "https://www.grammarly.com/", group: "Learning" },
  { id: "notion", label: "Notion", title: "Notion", site: "https://www.notion.so/", group: "Learning" },
  { id: "teams", label: "Microsoft Teams", title: "Microsoft Teams", site: "https://teams.microsoft.com/", group: "Microsoft" },
  { id: "outlook", label: "Outlook", title: "Mail - Outlook", site: "https://outlook.office.com/", group: "Microsoft" },
  { id: "onedrive", label: "OneDrive", title: "My files - OneDrive", site: "https://onedrive.live.com/", group: "Microsoft" },
  { id: "word-online", label: "Word Online", title: "Microsoft Word", site: "https://www.office.com/launch/word", group: "Microsoft" },
  { id: "excel-online", label: "Excel Online", title: "Microsoft Excel", site: "https://www.office.com/launch/excel", group: "Microsoft" },
  { id: "powerpoint", label: "PowerPoint Online", title: "Microsoft PowerPoint", site: "https://www.office.com/launch/powerpoint", group: "Microsoft" },
  { id: "onenote", label: "OneNote", title: "OneNote", site: "https://www.onenote.com/", group: "Microsoft" },
  { id: "forms-ms", label: "Microsoft Forms", title: "Forms", site: "https://forms.office.com/", group: "Microsoft" },
  { id: "flipgrid", label: "Flip (Flipgrid)", title: "Flip", site: "https://info.flip.com/", group: "Microsoft" },
  { id: "wikipedia", label: "Wikipedia", title: "Wikipedia", site: "https://en.wikipedia.org/", group: "Research" },
  { id: "britannica", label: "Britannica", title: "Encyclopedia Britannica", site: "https://www.britannica.com/", group: "Research" },
  { id: "jstor", label: "JSTOR", title: "JSTOR", site: "https://www.jstor.org/", group: "Research" },
  { id: "pubmed", label: "PubMed", title: "PubMed", site: "https://pubmed.ncbi.nlm.nih.gov/", group: "Research" },
  { id: "archive", label: "Internet Archive", title: "Internet Archive", site: "https://archive.org/", group: "Research" },
  { id: "project-gutenberg", label: "Project Gutenberg", title: "Project Gutenberg", site: "https://www.gutenberg.org/", group: "Research" },
  { id: "owl-purdue", label: "Purdue OWL", title: "Purdue OWL", site: "https://owl.purdue.edu/", group: "Research" },
  { id: "cite-this", label: "Citation Machine", title: "Citation Machine", site: "https://www.citationmachine.net/", group: "Research" },
  { id: "zoom", label: "Zoom", title: "Zoom", site: "https://zoom.us/", group: "Collab" },
  { id: "webex", label: "Webex", title: "Cisco Webex", site: "https://www.webex.com/", group: "Collab" },
  { id: "canva", label: "Canva", title: "Home - Canva", site: "https://www.canva.com/", group: "Collab" },
  { id: "figma", label: "Figma", title: "Figma", site: "https://www.figma.com/", group: "Collab" },
  { id: "miro", label: "Miro", title: "Miro", site: "https://miro.com/", group: "Collab" },
  { id: "padlet", label: "Padlet", title: "Padlet", site: "https://padlet.com/", group: "Collab" },
  { id: "nearpod", label: "Nearpod", title: "Nearpod", site: "https://nearpod.com/", group: "Collab" },
  { id: "pear-deck", label: "Pear Deck", title: "Pear Deck", site: "https://www.peardeck.com/", group: "Collab" },
  { id: "github", label: "GitHub", title: "GitHub", site: "https://github.com/", group: "Dev" },
  { id: "gitlab", label: "GitLab", title: "GitLab", site: "https://gitlab.com/", group: "Dev" },
  { id: "stackoverflow", label: "Stack Overflow", title: "Stack Overflow", site: "https://stackoverflow.com/", group: "Dev" },
  { id: "mdn", label: "MDN Web Docs", title: "MDN Web Docs", site: "https://developer.mozilla.org/", group: "Dev" },
  { id: "w3schools", label: "W3Schools", title: "W3Schools Online Web Tutorials", site: "https://www.w3schools.com/", group: "Dev" },
  { id: "codepen", label: "CodePen", title: "CodePen", site: "https://codepen.io/", group: "Dev" },
  { id: "n3xn-vfs", label: "n3xn VFS (honest)", title: "n3xn Virtual FileSystem", site: "/", group: "n3xn" },
  { id: "n3xn-settings", label: "n3xn Settings", title: "n3xn Settings", site: "/settings/", group: "n3xn" },
  { id: "n3xn-mc", label: "n3xn Minecraft", title: "n3xn · Minecraft", site: "/mc/index.html", group: "n3xn" },
];

export function enrichPreset(p) {
  return {
    ...p,
    favicon: gFav(p.site, 64),
    favicon128: gFav(p.site, 128),
  };
}

export function listGroups() {
  const g = new Set(CLOAK_PRESETS.map((p) => p.group));
  return [...g];
}

export function presetsByGroup() {
  const map = {};
  CLOAK_PRESETS.forEach((p) => {
    if (!map[p.group]) map[p.group] = [];
    map[p.group].push(enrichPreset(p));
  });
  return map;
}
