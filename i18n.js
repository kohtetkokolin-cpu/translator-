/* ==========================================================
   Walkie-Talkie Translator — UI string table (i18n)
   Covers the app's own interface chrome (buttons, labels, home
   screen) — NOT the chat translation feature, which is separate.
   Load this before app.js (same as data.js).
========================================================== */
const UI_STRINGS = {
  en: {
    appTitle: "Walkie-Talkie Translator",
    homeSubtitle: "What would you like to do?",
    cardConversationTitle: "💬 Conversation",
    cardConversationDesc: "Face-to-face walkie-talkie style, two people, rotated panel",
    cardQuickTitle: "🔍 Quick Translate",
    cardQuickDesc: "Paste text, scan a photo, or speak — translate for yourself",
    cardLiveTitle: "⚡ Live",
    cardLiveDesc: "Real-time simultaneous interpretation — no taps needed",
    cardSettingsTitle: "⚙️ Settings",
    cardSettingsDesc: "API key, voice, appearance, and more",
    tabAccount: "🔑 Account",
    tabVoice: "🔊 Voice",
    tabTranslate: "🌐 Translation",
    tabAppearance: "🎨 Appearance",
    tabData: "💾 Data",
  },
  zh: {
    appTitle: "对讲翻译器",
    homeSubtitle: "您想做什么？",
    cardConversationTitle: "💬 对话",
    cardConversationDesc: "面对面对讲机模式，两人使用，屏幕旋转显示",
    cardQuickTitle: "🔍 快速翻译",
    cardQuickDesc: "粘贴文字、扫描照片或说话 — 为自己翻译",
    cardLiveTitle: "⚡ 实时",
    cardLiveDesc: "实时同声传译 — 无需点击",
    cardSettingsTitle: "⚙️ 设置",
    cardSettingsDesc: "API密钥、语音、外观等",
    tabAccount: "🔑 账户",
    tabVoice: "🔊 语音",
    tabTranslate: "🌐 翻译",
    tabAppearance: "🎨 外观",
    tabData: "💾 数据",
  },
  th: {
    appTitle: "วอล์กี้ทอล์กี้ แปลภาษา",
    homeSubtitle: "คุณต้องการทำอะไร?",
    cardConversationTitle: "💬 บทสนทนา",
    cardConversationDesc: "โหมดวอล์กี้ทอล์กี้แบบเห็นหน้ากัน สำหรับสองคน หมุนหน้าจอ",
    cardQuickTitle: "🔍 แปลด่วน",
    cardQuickDesc: "วางข้อความ สแกนรูปภาพ หรือพูด — แปลสำหรับตัวคุณเอง",
    cardLiveTitle: "⚡ เรียลไทม์",
    cardLiveDesc: "ล่ามพร้อมกันแบบเรียลไทม์ — ไม่ต้องแตะ",
    cardSettingsTitle: "⚙️ การตั้งค่า",
    cardSettingsDesc: "คีย์ API, เสียง, รูปลักษณ์ และอื่นๆ",
    tabAccount: "🔑 บัญชี",
    tabVoice: "🔊 เสียง",
    tabTranslate: "🌐 การแปล",
    tabAppearance: "🎨 รูปลักษณ์",
    tabData: "💾 ข้อมูล",
  },
  my: {
    appTitle: "Walkie-Talkie Translator",
    homeSubtitle: "ဘယ်လို သုံးချင်ပါသလဲ?",
    cardConversationTitle: "💬 စကားပြောခြင်း",
    cardConversationDesc: "မျက်နှာချင်းဆိုင် walkie-talkie ပုံစံ၊ နှစ်ယောက်စာ၊ panel လှည့်ပြထားတယ်",
    cardQuickTitle: "🔍 လျင်မြန်စွာ ဘာသာပြန်ခြင်း",
    cardQuickDesc: "စာသားကူးထည့်၊ ဓာတ်ပုံ scan၊ ဒါမှမဟုတ် ပြောပြီး ကိုယ့်အတွက် ဘာသာပြန်ပါ",
    cardLiveTitle: "⚡ တိုက်ရိုက်",
    cardLiveDesc: "တစ်ပြိုင်နက် တိုက်ရိုက် စကားပြန် — နှိပ်စရာမလို",
    cardSettingsTitle: "⚙️ ဆက်တင်",
    cardSettingsDesc: "API key၊ အသံ၊ appearance နှင့် အခြား",
    tabAccount: "🔑 အကောင့်",
    tabVoice: "🔊 အသံ",
    tabTranslate: "🌐 ဘာသာပြန်",
    tabAppearance: "🎨 appearance",
    tabData: "💾 Data",
  },
};

// Falls back to English, then to the key itself, if a string is missing
// for the current UI language — the interface never shows a blank label.
function t(key){
  const lang = (typeof state !== 'undefined' && state.uiLanguage) || 'my';
  return (UI_STRINGS[lang] && UI_STRINGS[lang][key]) || UI_STRINGS.en[key] || key;
}
